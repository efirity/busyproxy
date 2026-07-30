package net.busyproxy.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.CellTower
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import net.busyproxy.app.domain.NetworkMode
import net.busyproxy.app.domain.Pricing

@Composable
fun BusyProxyAppRoot(vm: AppViewModel = viewModel()) {
    val ui by vm.ui.collectAsState()
    Box(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        when {
            !ui.ready -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            !ui.consent -> ConsentScreen(onAccept = vm::acceptConsent)
            ui.user == null && ui.sessionToken == null ->
                LoginScreen(
                    ui = ui,
                    onPhone = vm::setPhone,
                    onCode = vm::setCode,
                    onSend = vm::sendOtp,
                    onVerify = vm::verifyOtp,
                )
            else ->
                HomeScreen(
                    ui = ui,
                    onStart = vm::startSharing,
                    onStop = vm::stopSharing,
                    onMode = vm::setMode,
                    onLogout = vm::logout,
                    onRefresh = vm::refreshWallet,
                )
        }
    }
}

@Composable
private fun ConsentScreen(onAccept: () -> Unit) {
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            "How BusyProxy works",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.SemiBold,
        )
        Text(
            "When sharing is on, authorized BusyProxy clients may route internet traffic through " +
                "your phone’s selected network (Wi‑Fi or mobile). You earn per GB shared.\n\n" +
                "• You start and stop sharing — always visible in a notification\n" +
                "• You pick Wi‑Fi, mobile, or preference modes — no silent fallback in “only” modes\n" +
                "• You never see proxy passwords (operators manage access separately)\n" +
                "• Rates: $${Pricing.WIFI_CENTS_PER_GB / 100.0}/GB Wi‑Fi · " +
                "$${Pricing.MOBILE_CENTS_PER_GB / 100.0}/GB mobile · " +
                "min withdraw $${Pricing.MIN_WITHDRAW_CENTS / 100}\n\n" +
                "By continuing you agree to use this only on networks you are allowed to share " +
                "and not for illegal or abusive activity.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(12.dp))
        Button(
            onClick = onAccept,
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(14.dp),
        ) {
            Text("I understand — continue")
        }
    }
}

@Composable
private fun LoginScreen(
    ui: UiState,
    onPhone: (String) -> Unit,
    onCode: (String) -> Unit,
    onSend: () -> Unit,
    onVerify: () -> Unit,
) {
    Column(
        Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("BusyProxy", fontWeight = FontWeight.SemiBold)
        Text(
            if (!ui.otpStep) "Enter your phone" else "Enter the code",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.SemiBold,
        )
        Text(
            "We’ll text a one-time code. Beta uses the configured Twilio test number.",
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        if (!ui.otpStep) {
            OutlinedTextField(
                value = ui.phoneDraft,
                onValueChange = onPhone,
                label = { Text("Phone") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
            Button(
                onClick = onSend,
                enabled = !ui.busy,
                modifier = Modifier.fillMaxWidth().height(48.dp),
            ) {
                if (ui.busy) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                else Text("Send code")
            }
        } else {
            OutlinedTextField(
                value = ui.codeDraft,
                onValueChange = onCode,
                label = { Text("OTP code") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
            Button(
                onClick = onVerify,
                enabled = !ui.busy,
                modifier = Modifier.fillMaxWidth().height(48.dp),
            ) {
                if (ui.busy) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                else Text("Verify & sign in")
            }
        }
        ui.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        ui.info?.let { Text(it, color = MaterialTheme.colorScheme.secondary) }
    }
}

@Composable
private fun HomeScreen(
    ui: UiState,
    onStart: () -> Unit,
    onStop: () -> Unit,
    onMode: (NetworkMode) -> Unit,
    onLogout: () -> Unit,
    onRefresh: () -> Unit,
) {
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text("Home", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleLarge)
                Text(
                    ui.user?.phone ?: "Signed in",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            TextButton(onClick = onLogout) {
                Icon(Icons.Default.AccountCircle, contentDescription = null)
                Text("  Log out")
            }
        }

        // Balance card — earner never sees proxy URI
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(20.dp)) {
                Text("Available", color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(
                    money(ui.wallet.availableCents),
                    style = MaterialTheme.typography.displaySmall,
                    fontWeight = FontWeight.SemiBold,
                    fontFamily = FontFamily.Monospace,
                )
                Text(
                    "Lifetime ${money(ui.wallet.lifetimeCents)} · min withdraw ${money(Pricing.MIN_WITHDRAW_CENTS)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    RateChip("Wi‑Fi", money(Pricing.WIFI_CENTS_PER_GB) + "/GB", Icons.Default.Wifi)
                    RateChip("Mobile", money(Pricing.MOBILE_CENTS_PER_GB) + "/GB", Icons.Default.CellTower)
                }
            }
        }

        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(
                                if (ui.sharingRequested) MaterialTheme.colorScheme.secondary
                                else MaterialTheme.colorScheme.outline,
                            ),
                    )
                    Spacer(Modifier.size(8.dp))
                    Text(
                        if (ui.sharingRequested) "Sharing on" else "Sharing off",
                        fontWeight = FontWeight.SemiBold,
                    )
                }
                Text(
                    "Network mode (no silent fallback in “only” modes)",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    ModeChip("Wi‑Fi only", ui.networkMode == NetworkMode.WIFI_ONLY) {
                        onMode(NetworkMode.WIFI_ONLY)
                    }
                    ModeChip("Mobile only", ui.networkMode == NetworkMode.CELLULAR_ONLY) {
                        onMode(NetworkMode.CELLULAR_ONLY)
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    ModeChip("Prefer Wi‑Fi", ui.networkMode == NetworkMode.PREFER_WIFI) {
                        onMode(NetworkMode.PREFER_WIFI)
                    }
                    ModeChip("Prefer mobile", ui.networkMode == NetworkMode.PREFER_CELLULAR) {
                        onMode(NetworkMode.PREFER_CELLULAR)
                    }
                }

                if (ui.sharingRequested) {
                    OutlinedButton(
                        onClick = onStop,
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors =
                            ButtonDefaults.outlinedButtonColors(
                                contentColor = MaterialTheme.colorScheme.error,
                            ),
                    ) {
                        Text("Stop sharing")
                    }
                } else {
                    Button(
                        onClick = onStart,
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        shape = RoundedCornerShape(14.dp),
                    ) {
                        Text("Start sharing")
                    }
                }
            }
        }

        Text(
            "You don’t need proxy URLs — operators connect via BusyProxy edge. " +
                "A persistent notification stays while sharing is on.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        TextButton(onClick = onRefresh) { Text("Refresh balance") }

        ui.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        ui.info?.let {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.CheckCircle, null, tint = MaterialTheme.colorScheme.secondary)
                Spacer(Modifier.size(6.dp))
                Text(it, color = MaterialTheme.colorScheme.secondary)
            }
        }
    }
}

@Composable
private fun ModeChip(label: String, selected: Boolean, onClick: () -> Unit) {
    FilterChip(selected = selected, onClick = onClick, label = { Text(label) })
}

@Composable
private fun RateChip(title: String, rate: String, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.background),
        shape = RoundedCornerShape(12.dp),
    ) {
        Row(Modifier.padding(horizontal = 10.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
            Spacer(Modifier.size(6.dp))
            Column {
                Text(title, style = MaterialTheme.typography.labelSmall)
                Text(rate, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Medium)
            }
        }
    }
}

private fun money(cents: Int): String {
    val n = cents / 100.0
    return if (cents % 100 == 0) "$${cents / 100}" else "$" + String.format("%.2f", n)
}
