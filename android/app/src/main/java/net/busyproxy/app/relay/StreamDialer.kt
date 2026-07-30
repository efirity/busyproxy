package net.busyproxy.app.relay

import android.net.Network
import android.util.Base64
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import net.busyproxy.app.network.DestinationPolicy
import java.io.InputStream
import java.io.OutputStream
import java.net.InetSocketAddress
import java.net.Socket
import java.util.concurrent.ConcurrentHashMap

/**
 * Opens destination TCP sockets bound to the selected [Network].
 * open_ok is reported only after connect succeeds so the edge does not
 * start TLS before the phone socket is ready.
 */
class StreamDialer(
    private val scope: CoroutineScope,
    private val onUpstream: (streamId: String, payload: ByteArray) -> Unit,
    private val onClosed: (streamId: String, reason: String) -> Unit,
    private val onBytes: (up: Long, down: Long) -> Unit,
    private val onOpenOk: (streamId: String) -> Unit = {},
    private val onOpenErr: (streamId: String, code: String) -> Unit = { _, _ -> },
) {
    private data class Stream(
        val socket: Socket,
        val job: Job,
        val out: OutputStream,
    )

    private val streams = ConcurrentHashMap<String, Stream>()
    /** Buffer edge→phone bytes until TCP connect completes */
    private val pending = ConcurrentHashMap<String, ArrayList<ByteArray>>()

    fun open(streamId: String, host: String, port: Int, network: Network) {
        if (streams.containsKey(streamId)) return
        pending[streamId] = ArrayList()
        scope.launch(Dispatchers.IO) {
            try {
                val addrs = network.getAllByName(host).toList()
                DestinationPolicy.assertAllowed(host, port, addrs)
                val socket = network.socketFactory.createSocket()
                socket.tcpNoDelay = true
                socket.soTimeout = 0
                socket.connect(InetSocketAddress(addrs.first(), port), 12_000)
                val out = socket.getOutputStream()
                val job =
                    scope.launch(Dispatchers.IO) {
                        pumpDown(streamId, socket.getInputStream())
                    }
                streams[streamId] = Stream(socket, job, out)
                // Flush any bytes that arrived before open_ok
                val queued = pending.remove(streamId)
                if (queued != null) {
                    for (chunk in queued) {
                        try {
                            out.write(chunk)
                            out.flush()
                            onBytes(chunk.size.toLong(), 0)
                        } catch (t: Throwable) {
                            Log.w(TAG, "flush pending fail $streamId: ${t.message}")
                            close(streamId, "write_fail")
                            return@launch
                        }
                    }
                }
                onOpenOk(streamId)
            } catch (t: Throwable) {
                pending.remove(streamId)
                Log.w(TAG, "open fail $streamId $host:$port ${t.message}")
                onOpenErr(streamId, t.message ?: "open_failed")
                onClosed(streamId, t.message ?: "open_failed")
            }
        }
    }

    fun write(streamId: String, data: ByteArray) {
        val s = streams[streamId]
        if (s == null) {
            // Still connecting — queue (TLS ClientHello often arrives early)
            val q = pending[streamId]
            if (q != null) {
                synchronized(q) {
                    if (q.size < 64) q.add(data)
                }
            }
            return
        }
        scope.launch(Dispatchers.IO) {
            try {
                s.out.write(data)
                s.out.flush()
                onBytes(data.size.toLong(), 0)
            } catch (_: Throwable) {
                close(streamId, "write_fail")
            }
        }
    }

    fun writeBase64(streamId: String, b64: String) {
        val data = Base64.decode(b64, Base64.DEFAULT)
        write(streamId, data)
    }

    fun close(streamId: String, reason: String = "local") {
        pending.remove(streamId)
        val s = streams.remove(streamId) ?: return
        runCatching { s.job.cancel() }
        runCatching { s.socket.close() }
        onClosed(streamId, reason)
    }

    fun closeAll() {
        pending.clear()
        streams.keys.toList().forEach { close(it, "shutdown") }
    }

    fun activeCount(): Int = streams.size

    private fun pumpDown(streamId: String, input: InputStream) {
        val buf = ByteArray(32 * 1024)
        try {
            while (true) {
                val n = input.read(buf)
                if (n < 0) break
                if (n == 0) continue
                val chunk = buf.copyOf(n)
                onBytes(0, n.toLong())
                onUpstream(streamId, chunk)
            }
            close(streamId, "eof")
        } catch (_: Throwable) {
            close(streamId, "read_fail")
        }
    }

    companion object {
        private const val TAG = "BpDialer"
    }
}
