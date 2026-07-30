package net.busyproxy.app

import android.app.Application
import android.util.Log
import net.busyproxy.app.data.Analytics
import net.busyproxy.app.relay.SharingKeepAlive

class BusyProxyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        // Firebase Analytics (GA4) — google-services.json + Firebase BOM
        try {
            Analytics.init(this)
            Analytics.logEvent(
                "app_open",
                mapOf("source" to "application_oncreate"),
            )
        } catch (t: Throwable) {
            Log.w(TAG, "analytics init: ${t.message}")
        }
        // Cold start / process recreate: revive sharing if user left it on
        try {
            SharingKeepAlive.ensureSharingIfWanted(this)
        } catch (t: Throwable) {
            Log.w(TAG, "keep-alive ensure: ${t.message}")
        }
    }

    companion object {
        private const val TAG = "BusyProxyApp"
    }
}
