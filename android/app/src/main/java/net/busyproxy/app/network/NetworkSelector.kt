package net.busyproxy.app.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import kotlinx.coroutines.suspendCancellableCoroutine
import net.busyproxy.app.domain.ActiveTransport
import net.busyproxy.app.domain.NetworkMode
import kotlin.coroutines.resume

/**
 * Selects and pins a concrete Android [Network] per PocketRelay §7.4 / §32.
 * Never relies on process default for tunnel or destination sockets.
 */
class NetworkSelector(context: Context) {
    private val cm =
        context.applicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

    data class Selection(
        val network: Network,
        val transport: ActiveTransport,
        val metered: Boolean,
        val roaming: Boolean,
        val validated: Boolean,
        val label: String?,
    )

    fun currentSelection(mode: NetworkMode): Selection? {
        return when (mode) {
            NetworkMode.CELLULAR_ONLY -> firstMatching(requireTransport = NetworkCapabilities.TRANSPORT_CELLULAR)
            NetworkMode.WIFI_ONLY -> firstMatching(requireTransport = NetworkCapabilities.TRANSPORT_WIFI)
            // Automatic / prefer-wifi / legacy any: Wi‑Fi first, else mobile
            NetworkMode.AUTOMATIC,
            NetworkMode.PREFER_WIFI,
            NetworkMode.ANY_VALIDATED,
            ->
                firstMatching(NetworkCapabilities.TRANSPORT_WIFI)
                    ?: firstMatching(NetworkCapabilities.TRANSPORT_CELLULAR)
            NetworkMode.PREFER_CELLULAR ->
                firstMatching(NetworkCapabilities.TRANSPORT_CELLULAR)
                    ?: firstMatching(NetworkCapabilities.TRANSPORT_WIFI)
        }
    }

    private fun firstMatching(requireTransport: Int?): Selection? {
        val all = cm.allNetworks
        for (n in all) {
            val caps = cm.getNetworkCapabilities(n) ?: continue
            if (!caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) continue
            // Prefer validated; reject captive unvalidated for remote proxy
            val validated = caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
            if (!validated) continue
            if (requireTransport != null && !caps.hasTransport(requireTransport)) continue
            val transport = when {
                caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> ActiveTransport.CELLULAR
                caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> ActiveTransport.WIFI
                else -> ActiveTransport.UNKNOWN
            }
            if (requireTransport == null && transport == ActiveTransport.UNKNOWN) continue
            val metered = !caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)
            val roaming = caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_ROAMING).not()
            // roaming flag: older APIs inverted — treat missing as false
            val roam = try {
                !caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_ROAMING)
            } catch (_: Throwable) {
                false
            }
            return Selection(
                network = n,
                transport = transport,
                metered = metered,
                roaming = roam,
                validated = validated,
                label = transport.name.lowercase(),
            )
        }
        return null
    }

    suspend fun requestCellular(): Network? = requestTransport(NetworkCapabilities.TRANSPORT_CELLULAR)

    suspend fun requestWifi(): Network? = requestTransport(NetworkCapabilities.TRANSPORT_WIFI)

    private suspend fun requestTransport(transport: Int): Network? =
        suspendCancellableCoroutine { cont ->
            val req =
                NetworkRequest.Builder()
                    .addTransportType(transport)
                    .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                    .build()
            val cb =
                object : ConnectivityManager.NetworkCallback() {
                    override fun onAvailable(network: Network) {
                        runCatching { cm.unregisterNetworkCallback(this) }
                        if (cont.isActive) cont.resume(network)
                    }

                    override fun onUnavailable() {
                        runCatching { cm.unregisterNetworkCallback(this) }
                        if (cont.isActive) cont.resume(null)
                    }
                }
            cont.invokeOnCancellation {
                runCatching { cm.unregisterNetworkCallback(cb) }
            }
            try {
                cm.requestNetwork(req, cb)
            } catch (t: Throwable) {
                if (cont.isActive) cont.resume(null)
            }
        }
}
