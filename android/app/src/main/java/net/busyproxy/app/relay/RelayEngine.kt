package net.busyproxy.app.relay

import android.content.Context
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import net.busyproxy.app.BuildConfig
import net.busyproxy.app.data.ApiClient
import net.busyproxy.app.data.Prefs
import net.busyproxy.app.domain.ActiveTransport
import net.busyproxy.app.domain.NetworkMode
import net.busyproxy.app.domain.RelayState
import net.busyproxy.app.domain.RelayStatus
import net.busyproxy.app.network.NetworkSelector
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicLong

/**
 * Coordinates network pin → egress IP verify → reverse tunnel → stream dial.
 * PocketRelay chain of trust without marketplace/open-proxy surface.
 */
class RelayEngine(
    private val appContext: Context,
    private val prefs: Prefs,
    private val api: ApiClient = ApiClient(),
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val selector = NetworkSelector(appContext)
    private val bytesUp = AtomicLong(0)
    private val bytesDown = AtomicLong(0)
    private val _status = MutableStateFlow(RelayStatus())
    val status: StateFlow<RelayStatus> = _status.asStateFlow()

    private var loopJob: Job? = null
    private var tunnel: TunnelClient? = null
    private var dialer: StreamDialer? = null
    private var generation = 0L

    fun start() {
        if (loopJob?.isActive == true) return
        loopJob =
            scope.launch {
                setState(RelayState.PREPARING)
                runLoop()
            }
    }

    fun stop() {
        loopJob?.cancel()
        loopJob = null
        setState(RelayState.STOPPING)
        tunnel?.disconnect("user_stop")
        dialer?.closeAll()
        tunnel = null
        dialer = null
        setState(RelayState.OFFLINE, message = "Stopped")
    }

    private suspend fun runLoop() {
        while (scope.isActive && loopJob?.isActive == true) {
            try {
                val consent = prefs.consentAccepted.first()
                if (!consent) {
                    setState(RelayState.ERROR, message = "Accept disclosure first")
                    delay(3_000)
                    continue
                }
                val mode = prefs.networkMode.first()
                val allowRoam = prefs.allowRoaming.first()
                val capMb = prefs.dailyCapMb.first()
                val (up, down) = prefs.usageToday.first()
                if ((up + down) > capMb * 1024L * 1024L) {
                    setState(RelayState.PAUSED_DATA_CAP, message = "Daily data cap reached")
                    delay(10_000)
                    continue
                }

                setState(RelayState.WAITING_FOR_NETWORK, networkMode = mode)
                val sel = selector.currentSelection(mode)
                if (sel == null) {
                    setState(
                        RelayState.WAITING_FOR_NETWORK,
                        message = "Waiting for ${mode.name.lowercase()} network",
                    )
                    delay(2_000)
                    continue
                }
                if (sel.roaming && !allowRoam && sel.transport == ActiveTransport.CELLULAR) {
                    setState(RelayState.PAUSED_ROAMING, message = "Roaming blocked")
                    delay(5_000)
                    continue
                }

                generation += 1
                setState(
                    RelayState.VERIFYING_EGRESS,
                    networkMode = mode,
                    transport = sel.transport,
                    metered = sel.metered,
                    roaming = sel.roaming,
                    validated = sel.validated,
                    generation = generation,
                    label = sel.label,
                    fallback =
                        when (mode) {
                            NetworkMode.PREFER_CELLULAR -> sel.transport == ActiveTransport.WIFI
                            NetworkMode.PREFER_WIFI -> sel.transport == ActiveTransport.CELLULAR
                            else -> false
                        },
                )

                val egressIp = verifyEgressIp(sel.network)
                update { it.copy(egressIp = egressIp) }

                val token = prefs.sessionToken.first()
                var deviceId = prefs.deviceId.first()
                var deviceSecret = prefs.deviceSecret.first()
                val userId =
                    prefs.peekUserJson()?.let { raw ->
                        runCatching { org.json.JSONObject(raw).optString("id", "") }
                            .getOrNull()
                            ?.takeIf { it.isNotBlank() }
                    }
                if (token != null) {
                    setState(RelayState.CONNECTING_TUNNEL, generation = generation)
                    val enroll =
                        api.enrollDevice(
                            sessionToken = token,
                            deviceId = deviceId,
                            name = android.os.Build.MODEL ?: "Android",
                            network =
                                if (sel.transport == ActiveTransport.WIFI) "wifi" else "cellular",
                            country = null,
                            publicIp = egressIp,
                            deviceSecret = deviceSecret,
                            userId = userId,
                        )
                    deviceId = enroll.deviceId
                    if (enroll.deviceSecret.isNotBlank()) {
                        deviceSecret = enroll.deviceSecret
                        prefs.setDevice(enroll.deviceId, enroll.deviceSecret)
                    }
                    val agentUrl = enroll.agentUrl.ifBlank { BuildConfig.AGENT_WSS_BASE }

                    // Dialer + tunnel share callbacks; open_ok only after TCP is up
                    lateinit var t: TunnelClient
                    val d =
                        StreamDialer(
                            scope = scope,
                            onUpstream = { streamId, payload ->
                                tunnel?.sendData(streamId, payload)
                            },
                            onClosed = { streamId, reason ->
                                tunnel?.sendClose(streamId, reason)
                                update {
                                    it.copy(activeStreams = dialer?.activeCount() ?: 0)
                                }
                            },
                            onBytes = { u, dn ->
                                bytesUp.addAndGet(u)
                                bytesDown.addAndGet(dn)
                                scope.launch { prefs.addBytes(u, dn) }
                                update {
                                    it.copy(
                                        bytesUp = bytesUp.get(),
                                        bytesDown = bytesDown.get(),
                                        activeStreams = dialer?.activeCount() ?: 0,
                                    )
                                }
                            },
                            onOpenOk = { streamId ->
                                tunnel?.sendOpenOk(streamId)
                            },
                            onOpenErr = { streamId, code ->
                                tunnel?.sendOpenErr(streamId, code)
                            },
                        )
                    dialer = d
                    t =
                        TunnelClient(
                            scope = scope,
                            dialer = d,
                            onState = { connected, detail ->
                                if (connected) {
                                    setState(
                                        RelayState.ONLINE,
                                        message = detail,
                                        generation = generation,
                                        transport = sel.transport,
                                    )
                                    update {
                                        it.copy(
                                            connectedAtMs = System.currentTimeMillis(),
                                            egressIp = egressIp,
                                        )
                                    }
                                } else {
                                    // Transient drop — reconnect loop, not permanent ERROR
                                    setState(
                                        RelayState.RECONNECTING,
                                        message = detail ?: "reconnecting",
                                    )
                                }
                            },
                        )
                    tunnel = t
                    t.connect(
                        agentUrl = agentUrl,
                        deviceId = deviceId ?: enroll.deviceId,
                        deviceSecret = deviceSecret ?: enroll.deviceSecret,
                        network = sel.network,
                        transportLabel =
                            if (sel.transport == ActiveTransport.WIFI) "wifi" else "cellular",
                        userId = userId,
                        country = null,
                    )

                    while (loopJob?.isActive == true) {
                        delay(3_000)
                        val still = selector.currentSelection(mode)
                        if (still == null || still.network != sel.network) {
                            setState(RelayState.RECONNECTING, message = "Network changed")
                            tunnel?.disconnect("network_change")
                            break
                        }
                        tunnel?.sendStats(
                            bytesUp.get(),
                            bytesDown.get(),
                            dialer?.activeCount() ?: 0,
                            egressIp,
                        )
                    }
                } else {
                    setState(RelayState.ERROR, message = "Sign in required")
                    delay(5_000)
                }
            } catch (t: Throwable) {
                Log.w("RelayEngine", "loop error", t)
                // Prefer RECONNECTING over sticky ERROR so UI recovers after blips
                setState(
                    RelayState.RECONNECTING,
                    message = t.message ?: "retrying",
                )
                delay(2_500)
            }
        }
        setState(RelayState.OFFLINE)
    }

    private fun verifyEgressIp(network: android.net.Network): String? {
        return try {
            val client =
                OkHttpClient.Builder()
                    .socketFactory(network.socketFactory)
                    .connectTimeout(12, TimeUnit.SECONDS)
                    .readTimeout(12, TimeUnit.SECONDS)
                    .build()
            val req = Request.Builder().url(BuildConfig.EGRESS_IP_CHECK).build()
            client.newCall(req).execute().use { res ->
                res.body?.string()?.trim()?.takeIf { it.isNotBlank() }
            }
        } catch (_: Throwable) {
            null
        }
    }

    private fun setState(
        state: RelayState,
        message: String? = null,
        networkMode: NetworkMode? = null,
        transport: ActiveTransport? = null,
        metered: Boolean? = null,
        roaming: Boolean? = null,
        validated: Boolean? = null,
        generation: Long? = null,
        label: String? = null,
        fallback: Boolean? = null,
    ) {
        update {
            it.copy(
                state = state,
                message = message ?: it.message,
                networkMode = networkMode ?: it.networkMode,
                activeTransport = transport ?: it.activeTransport,
                metered = metered ?: it.metered,
                roaming = roaming ?: it.roaming,
                validated = validated ?: it.validated,
                networkGeneration = generation ?: it.networkGeneration,
                carrierOrSsid = label ?: it.carrierOrSsid,
                fallbackActive = fallback ?: it.fallbackActive,
            )
        }
    }

    private fun update(fn: (RelayStatus) -> RelayStatus) {
        _status.value = fn(_status.value)
    }
}
