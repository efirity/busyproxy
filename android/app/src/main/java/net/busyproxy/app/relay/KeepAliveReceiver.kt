package net.busyproxy.app.relay

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Restarts the sharing foreground service after boot, app update, or
 * periodic watchdog if the user still wants to earn.
 */
class KeepAliveReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action ?: return
        Log.i(TAG, "onReceive $action")
        when (action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_LOCKED_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            ACTION_WATCHDOG,
            ACTION_RESTART_RELAY,
            -> {
                // goAsync for DataStore / start FGS
                val pending = goAsync()
                try {
                    // ensureSharingIfWanted schedules watchdog only if still wanted
                    SharingKeepAlive.ensureSharingIfWanted(context.applicationContext)
                } finally {
                    pending.finish()
                }
            }
        }
    }

    companion object {
        private const val TAG = "BpKeepAliveRx"
        const val ACTION_WATCHDOG = "net.busyproxy.app.KEEPALIVE_WATCHDOG"
        const val ACTION_RESTART_RELAY = "net.busyproxy.app.RESTART_RELAY"
    }
}
