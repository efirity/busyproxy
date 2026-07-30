package net.busyproxy.app

import android.app.Application
import android.util.Log
import net.busyproxy.app.relay.SharingKeepAlive

class BusyProxyApp : Application() {
    override fun onCreate() {
        super.onCreate()
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
