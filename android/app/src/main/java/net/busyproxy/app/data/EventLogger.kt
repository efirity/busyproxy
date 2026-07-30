package net.busyproxy.app.data

import android.content.Context
import android.os.Build
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import net.busyproxy.app.BuildConfig
import org.json.JSONObject
import java.util.UUID

/**
 * Queues funnel events and batches them to POST /api/events/batch.
 * installId is stable for the app install lifetime.
 */
class EventLogger(
    context: Context,
    private val prefs: Prefs,
    private val api: ApiClient = ApiClient(),
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val mutex = Mutex()
    private val queue = ArrayList<JSONObject>()
    private var sessionToken: String? = null
    private var phone: String? = null

    init {
        scope.launch {
            ensureInstallId()
            // First open once per install
            if (!prefs.peekFirstOpenLogged()) {
                enqueue("app_first_open", "First launch after install", emptyMap())
                prefs.setFirstOpenLogged(true)
            }
            enqueue("app_open", "App process started", emptyMap())
            flush()
            while (true) {
                delay(8_000)
                flush()
            }
        }
    }

    fun setSession(token: String?, phone: String?) {
        sessionToken = token
        this.phone = phone
    }

    fun log(
        type: String,
        message: String? = null,
        props: Map<String, Any?> = emptyMap(),
    ) {
        scope.launch {
            enqueue(type, message, props)
            val installId = ensureInstallId()
            mutex.withLock {
                if (queue.size >= 12) flushLocked(installId)
            }
        }
    }

    private suspend fun enqueue(
        type: String,
        message: String?,
        props: Map<String, Any?>,
    ) {
        val event =
            JSONObject()
                .put("type", type)
                .put("at", System.currentTimeMillis())
                .put("message", message ?: JSONObject.NULL)
                .put(
                    "props",
                    JSONObject().apply {
                        props.forEach { (k, v) ->
                            when (v) {
                                null -> put(k, JSONObject.NULL)
                                is Number, is Boolean, is String -> put(k, v)
                                else -> put(k, v.toString())
                            }
                        }
                    },
                )
        mutex.withLock { queue.add(event) }
    }

    fun flushAsync() {
        scope.launch { flush() }
    }

    private suspend fun flush() {
        val installId = ensureInstallId()
        mutex.withLock { flushLocked(installId) }
    }

    private suspend fun flushLocked(installId: String) {
        if (queue.isEmpty()) return
        val batch = ArrayList(queue)
        queue.clear()
        try {
            withContext(Dispatchers.IO) {
                api.postEventsBatch(
                    installId = installId,
                    events = batch,
                    sessionToken = sessionToken,
                    appVersion = BuildConfig.VERSION_NAME,
                    deviceModel = "${Build.MANUFACTURER} ${Build.MODEL}",
                    osVersion = "Android ${Build.VERSION.RELEASE}",
                )
            }
        } catch (t: Throwable) {
            Log.w(TAG, "event flush failed: ${t.message}")
            // re-queue limited
            if (queue.size < 80) {
                queue.addAll(0, batch.take(40))
            }
        }
    }

    private suspend fun ensureInstallId(): String {
        val existing = prefs.peekInstallId()
        if (!existing.isNullOrBlank()) return existing
        val id = "inst_" + UUID.randomUUID().toString().replace("-", "")
        prefs.setInstallId(id)
        return id
    }

    companion object {
        private const val TAG = "BpEvents"
    }
}
