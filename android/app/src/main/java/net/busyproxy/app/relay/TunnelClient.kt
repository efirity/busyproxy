package net.busyproxy.app.relay

import android.net.Network
import android.util.Base64
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import net.busyproxy.app.network.SecureOkHttp
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicLong

/**
 * Outbound WebSocket reverse tunnel bound to selected [Network].
 */
class TunnelClient(
    private val scope: CoroutineScope,
    private val dialer: StreamDialer,
    private val onState: (connected: Boolean, detail: String?) -> Unit,
    private val onHelloAck: ((JSONObject) -> Unit)? = null,
) {
    private val logTag = "BpTunnel"
    private var ws: WebSocket? = null
    private var pingJob: Job? = null
    private val generation = AtomicLong(0)

    fun currentGeneration(): Long = generation.get()

    fun connect(
        agentUrl: String,
        deviceId: String,
        deviceSecret: String,
        network: Network,
        transportLabel: String,
        userId: String?,
        country: String?,
    ) {
        disconnect("reconnect")
        generation.incrementAndGet()
        val gen = generation.get()

        // Same SPKI pins as REST API — WSS is TLS under the hood
        val client =
            SecureOkHttp.pinnedBuilder()
                .socketFactory(network.socketFactory)
                .pingInterval(20, TimeUnit.SECONDS)
                .connectTimeout(20, TimeUnit.SECONDS)
                .readTimeout(0, TimeUnit.MILLISECONDS)
                .build()

        val req = Request.Builder().url(agentUrl).build()
        ws =
            client.newWebSocket(
                req,
                object : WebSocketListener() {
                    override fun onOpen(webSocket: WebSocket, response: Response) {
                        Log.i(logTag, "tunnel open gen=$gen")
                        // Keep logs technical; UI shows friendly agent state only
                        onState(true, null)
                        webSocket.send(
                            TunnelProtocol.hello(
                                deviceId = deviceId,
                                deviceSecret = deviceSecret,
                                network = transportLabel,
                                generation = gen,
                                country = country,
                                userId = userId,
                            ),
                        )
                        pingJob =
                            scope.launch {
                                while (isActive) {
                                    delay(25_000)
                                    webSocket.send(
                                        TunnelProtocol.stats(
                                            0,
                                            0,
                                            dialer.activeCount(),
                                            null,
                                        ),
                                    )
                                }
                            }
                    }

                    override fun onMessage(webSocket: WebSocket, text: String) {
                        handleFrame(webSocket, text, network, gen)
                    }

                    override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                        webSocket.close(1000, null)
                    }

                    override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                        onState(false, "closed:$code")
                        pingJob?.cancel()
                    }

                    override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                        Log.w(logTag, "tunnel fail: ${t.message}")
                        onState(false, t.message)
                        pingJob?.cancel()
                    }
                },
            )
    }

    fun sendOpenOk(streamId: String) {
        ws?.send(TunnelProtocol.openOk(streamId))
    }

    fun sendOpenErr(streamId: String, code: String) {
        ws?.send(TunnelProtocol.openErr(streamId, code))
    }

    fun sendData(streamId: String, payload: ByteArray) {
        val b64 = Base64.encodeToString(payload, Base64.NO_WRAP)
        ws?.send(TunnelProtocol.data(streamId, b64))
    }

    fun sendClose(streamId: String, reason: String) {
        ws?.send(TunnelProtocol.close(streamId, reason))
    }

    fun sendStats(up: Long, down: Long, streams: Int, egressIp: String?) {
        ws?.send(TunnelProtocol.stats(up, down, streams, egressIp))
    }

    fun disconnect(reason: String) {
        pingJob?.cancel()
        dialer.closeAll()
        ws?.close(1000, reason)
        ws = null
        onState(false, reason)
    }

    private fun handleFrame(webSocket: WebSocket, text: String, network: Network, gen: Long) {
        try {
            val o = JSONObject(text)
            when (o.optString("type")) {
                "hello_ok", "welcome" -> onHelloAck?.invoke(o)
                "ping" -> webSocket.send(TunnelProtocol.pong(o.optLong("t")))
                "open" -> {
                    val streamId = o.getString("streamId")
                    val host = o.getString("host")
                    val port = o.getInt("port")
                    if (generation.get() != gen) {
                        webSocket.send(TunnelProtocol.openErr(streamId, "stale_generation"))
                        return
                    }
                    // open_ok / open_err emitted by StreamDialer after TCP connect
                    dialer.open(streamId, host, port, network)
                }
                "data" -> {
                    val streamId = o.getString("streamId")
                    val b64 = o.getString("b64")
                    dialer.writeBase64(streamId, b64)
                }
                "close" -> {
                    val streamId = o.getString("streamId")
                    dialer.close(streamId, o.optString("reason", "remote"))
                }
                else -> Unit
            }
        } catch (t: Throwable) {
            Log.w(logTag, "bad frame: ${t.message}")
        }
    }
}
