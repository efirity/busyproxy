package net.busyproxy.app.data

import android.content.Context
import android.os.Bundle
import android.util.Log
import com.google.firebase.analytics.FirebaseAnalytics

/**
 * Thin Firebase Analytics (GA4) wrapper for the earner app.
 * Mirrors important funnel events so they show in Google Analytics / Firebase.
 */
object Analytics {
    private const val TAG = "BpAnalytics"

    @Volatile
    private var fa: FirebaseAnalytics? = null

    fun init(context: Context) {
        try {
            fa = FirebaseAnalytics.getInstance(context.applicationContext)
            fa?.setAnalyticsCollectionEnabled(true)
            Log.i(TAG, "Firebase Analytics ready")
        } catch (t: Throwable) {
            Log.w(TAG, "Analytics init failed: ${t.message}")
            fa = null
        }
    }

    fun setUserId(userId: String?) {
        try {
            fa?.setUserId(userId?.takeIf { it.isNotBlank() })
        } catch (t: Throwable) {
            Log.w(TAG, "setUserId: ${t.message}")
        }
    }

    fun setUserProperty(name: String, value: String?) {
        try {
            fa?.setUserProperty(sanitizeParamName(name), value?.take(36))
        } catch (t: Throwable) {
            Log.w(TAG, "setUserProperty: ${t.message}")
        }
    }

    /**
     * Log a custom event. Names/params follow GA4 limits
     * (40 char name, string values ≤ 100 chars).
     */
    fun logEvent(
        name: String,
        params: Map<String, Any?> = emptyMap(),
    ) {
        val analytics = fa ?: return
        try {
            val event = sanitizeEventName(name)
            val bundle = Bundle()
            params.forEach { (rawKey, value) ->
                val key = sanitizeParamName(rawKey)
                when (value) {
                    null -> Unit
                    is String -> bundle.putString(key, value.take(100))
                    is Int -> bundle.putLong(key, value.toLong())
                    is Long -> bundle.putLong(key, value)
                    is Double -> bundle.putDouble(key, value)
                    is Float -> bundle.putDouble(key, value.toDouble())
                    is Boolean -> bundle.putLong(key, if (value) 1L else 0L)
                    is Number -> bundle.putDouble(key, value.toDouble())
                    else -> bundle.putString(key, value.toString().take(100))
                }
            }
            analytics.logEvent(event, bundle)
        } catch (t: Throwable) {
            Log.w(TAG, "logEvent($name): ${t.message}")
        }
    }

    /** Screen view helper (Compose destinations). */
    fun logScreen(screenName: String, screenClass: String = "MainActivity") {
        logEvent(
            FirebaseAnalytics.Event.SCREEN_VIEW,
            mapOf(
                FirebaseAnalytics.Param.SCREEN_NAME to screenName,
                FirebaseAnalytics.Param.SCREEN_CLASS to screenClass,
            ),
        )
    }

    private fun sanitizeEventName(name: String): String {
        val cleaned =
            name
                .lowercase()
                .replace(Regex("[^a-z0-9_]"), "_")
                .trim('_')
                .ifBlank { "app_event" }
        return cleaned.take(40)
    }

    private fun sanitizeParamName(name: String): String {
        val cleaned =
            name
                .lowercase()
                .replace(Regex("[^a-z0-9_]"), "_")
                .trim('_')
                .ifBlank { "value" }
        return cleaned.take(40)
    }
}
