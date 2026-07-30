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
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong

/**
 * Coordinates network pin → egress IP verify → reverse tunnel → stream dial.
 *
 * After server restarts or WSS drops, the outer loop **always** retries with
 * backoff until the tunnel is ONLINE again (or the user stops sharing).
 * Never stays stuck in RECONNECTING without re-dialing.
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
    /** Throttle UI status pushes so session bytes don't jank on every packet. */
    private val lastBytesUiAt = AtomicLong(0)
    private val _status = MutableStateFlow(RelayStatus())
    val status: StateFlow<RelayStatus> = _status.asStateFlow()

    private var loopJob: Job? = null
    private var tunnel: TunnelClient? = null
    private var dialer: StreamDialer? = null
    private var generation = 0L

    /** Failures since last ONLINE — drives exponential backoff. */
    private var failStreak = 0

    /** User wants the relay loop running. Cleared immediately on stop(). */
    @Volatile
    private var wantRun = false

    fun start() {
        wantRun = true
        if (loopJob?.isActive == true) return
        failStreak = 0
        loopJob =
            scope.launch {
                setState(RelayState.PREPARING)
                runLoop()
            }
    }

    /**
     * Always returns immediately. Cancels reconnect delays and tears down WSS
     * without waiting for enroll/backoff to finish.
     */
    fun stop() {
        wantRun = false
        val job = loopJob
        loopJob = null
        job?.cancel()
        setState(RelayState.STOPPING)
        teardownSession("user_stop")
        setState(RelayState.OFFLINE, message = "Stopped")
    }

    private fun teardownSession(reason: String) {
        try {
            tunnel?.disconnect(reason)
        } catch (_: Throwable) {
        }
        try {
            dialer?.closeAll()
        } catch (_: Throwable) {
        }
        tunnel = null
        dialer = null
    }

    private suspend fun runLoop() {
        while (wantRun && scope.isActive && loopJob?.isActive == true) {
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
                            NetworkMode.PREFER_WIFI,
                            NetworkMode.AUTOMATIC,
                            NetworkMode.ANY_VALIDATED,
                            -> sel.transport == ActiveTransport.CELLULAR
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
                if (token == null) {
                    setState(RelayState.ERROR, message = "Sign in required")
                    delay(5_000)
                    continue
                }

                setState(
                    RelayState.CONNECTING_TUNNEL,
                    message = reconnectLabel(),
                    generation = generation,
                )

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

                // Fresh session objects each attempt
                teardownSession("loop_restart")

                val tunnelLive = AtomicBoolean(false)
                val needReconnect = AtomicBoolean(false)
                val connectStartedAt = System.currentTimeMillis()

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
                            val now = System.currentTimeMillis()
                            val last = lastBytesUiAt.get()
                            if (now - last >= 1_200L && lastBytesUiAt.compareAndSet(last, now)) {
                                update {
                                    it.copy(
                                        bytesUp = bytesUp.get(),
                                        bytesDown = bytesDown.get(),
                                        activeStreams = dialer?.activeCount() ?: 0,
                                    )
                                }
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

                val t =
                    TunnelClient(
                        scope = scope,
                        dialer = d,
                        onState = { connected, detail ->
                            if (connected) {
                                tunnelLive.set(true)
                                needReconnect.set(false)
                                failStreak = 0
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
                                Log.i(TAG, "tunnel ONLINE gen=$generation")
                            } else {
                                // Quiet teardown reasons — outer loop will reconnect
                                val quiet =
                                    detail == "user_stop" ||
                                        detail == "reconnect" ||
                                        detail == "loop_restart" ||
                                        detail == "session_end" ||
                                        detail == "network_change"
                                tunnelLive.set(false)
                                if (!quiet) {
                                    needReconnect.set(true)
                                    setState(
                                        RelayState.RECONNECTING,
                                        message = friendlyDrop(detail),
                                    )
                                    Log.w(TAG, "tunnel down: $detail — will reconnect")
                                }
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

                // Hold while healthy; break ASAP when WSS dies, user stops, or network changes
                val connectDeadlineMs = 28_000L
                while (wantRun && loopJob?.isActive == true) {
                    delay(1_200)

                    if (!wantRun) break

                    if (needReconnect.get()) {
                        Log.i(TAG, "reconnect signal — restarting tunnel session")
                        break
                    }

                    // Stuck in connecting (server restart mid-handshake, hung socket)
                    if (!tunnelLive.get()) {
                        val waited = System.currentTimeMillis() - connectStartedAt
                        if (waited > connectDeadlineMs) {
                            Log.w(TAG, "connect timeout ${waited}ms — retry")
                            setState(
                                RelayState.RECONNECTING,
                                message = "Connection timed out — retrying",
                            )
                            needReconnect.set(true)
                            break
                        }
                        // Still waiting for onOpen — keep CONNECTING / RECONNECTING UI
                        if (_status.value.state != RelayState.RECONNECTING) {
                            setState(
                                RelayState.CONNECTING_TUNNEL,
                                message = reconnectLabel(),
                            )
                        }
                        continue
                    }

                    val still = selector.currentSelection(mode)
                    if (still == null || still.network != sel.network) {
                        setState(RelayState.RECONNECTING, message = "Network changed")
                        needReconnect.set(true)
                        break
                    }

                    tunnel?.sendStats(
                        bytesUp.get(),
                        bytesDown.get(),
                        dialer?.activeCount() ?: 0,
                        egressIp,
                    )
                }

                // Drop session before next attempt (unless user stopped)
                teardownSession("session_end")
                if (!wantRun) break
                failStreak = (failStreak + 1).coerceAtMost(8)
                val backoff = backoffMs(failStreak)
                setState(
                    RelayState.RECONNECTING,
                    message = "Reconnecting in ${backoff / 1000}s…",
                )
                Log.i(TAG, "backoff ${backoff}ms (streak=$failStreak)")
                // Interruptible backoff — stop() cancels this immediately
                delay(backoff)
            } catch (t: Throwable) {
                if (!wantRun || t is kotlinx.coroutines.CancellationException) {
                    break
                }
                Log.w(TAG, "loop error", t)
                teardownSession("session_end")
                if (!wantRun) break
                failStreak = (failStreak + 1).coerceAtMost(8)
                setState(
                    RelayState.RECONNECTING,
                    message = friendlyDrop(t.message) ?: "retrying",
                )
                delay(backoffMs(failStreak))
            }
        }
        if (!wantRun) {
            setState(RelayState.OFFLINE, message = "Stopped")
        } else {
            setState(RelayState.OFFLINE)
        }
    }

    private fun backoffMs(streak: Int): Long {
        // 1s, 2s, 4s, 8s, 16s, 30s cap — keep trying forever while sharing is on
        val exp = (1L shl streak.coerceIn(0, 5)) * 1_000L
        return exp.coerceAtMost(30_000L)
    }

    private fun reconnectLabel(): String {
        return if (failStreak > 0) {
            "Reconnecting to edge… (try ${failStreak + 1})"
        } else {
            "Connecting tunnel…"
        }
    }

    private fun friendlyDrop(detail: String?): String {
        if (detail.isNullOrBlank()) return "Connection lost — reconnecting"
        val d = detail.lowercase()
        return when {
            d.contains("failed to connect") ||
                d.contains("connection refused") ||
                d.contains("econnrefused") ->
                "Edge offline — reconnecting"
            d.contains("timeout") || d.contains("timed out") ->
                "Timed out — reconnecting"
            d.contains("ssl") || d.contains("cert") || d.contains("handshake") ->
                "Secure link dropped — reconnecting"
            d.contains("closed") || d.contains("eof") || d.contains("reset") ->
                "Link closed — reconnecting"
            d.contains("unable to resolve") || d.contains("unknown host") ->
                "DNS issue — reconnecting"
            else -> "Connection lost — reconnecting"
        }
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

    companion object {
        private const val TAG = "RelayEngine"
    }
}
