package net.busyproxy.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.LaunchedEffect
import androidx.core.content.ContextCompat
import net.busyproxy.app.ui.BusyProxyAppRoot
import net.busyproxy.app.ui.theme.BusyProxyTheme

class MainActivity : ComponentActivity() {
    private val notifPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { /* handled in UI */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            BusyProxyTheme {
                LaunchedEffect(Unit) {
                    if (Build.VERSION.SDK_INT >= 33) {
                        val ok =
                            ContextCompat.checkSelfPermission(
                                this@MainActivity,
                                Manifest.permission.POST_NOTIFICATIONS,
                            ) == PackageManager.PERMISSION_GRANTED
                        if (!ok) notifPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
                    }
                }
                BusyProxyAppRoot()
            }
        }
    }
}
