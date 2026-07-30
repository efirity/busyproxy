package net.busyproxy.app.ui

import android.content.Intent
import android.graphics.Color as AndroidColor
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.view.View
import android.widget.EditText
import androidx.activity.compose.BackHandler
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.CellTower
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.widget.doAfterTextChanged
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.launch
import net.busyproxy.app.domain.NetworkMode
import net.busyproxy.app.domain.Pricing
import net.busyproxy.app.domain.RelayState
import kotlin.math.abs

private const val SUPPORT_EMAIL = "support@busyproxy.net"

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
                    onDisplayName = vm::setDisplayName,
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
                    onDeleteAccount = { code, detail -> vm.deleteAccount(code, detail) },
                    onAccountOpen = vm::logAccountOpen,
                    onRefresh = vm::refreshHomeData,
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
                "By continuing you agree to the Terms and Privacy Policy (links below), " +
                "to use this only on networks you are allowed to share, " +
                "and not for illegal or abusive activity. You can delete your account anytime.",
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
        LegalLinksRow()
        SupportEmailRow()
    }
}

@Composable
private fun LoginScreen(
    ui: UiState,
    onDisplayName: (String) -> Unit,
    onPhone: (String) -> Unit,
    onCode: (String) -> Unit,
    onSend: () -> Unit,
    onVerify: () -> Unit,
) {
    val otpFocus = remember { FocusRequester() }

    LaunchedEffect(ui.otpStep) {
        if (ui.otpStep) {
            runCatching { otpFocus.requestFocus() }
        }
    }

    Column(
        Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("BusyProxy", fontWeight = FontWeight.SemiBold)
        Text(
            if (!ui.otpStep) "Create your account" else "Enter the code",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.SemiBold,
        )
        Text(
            if (!ui.otpStep) {
                "Pick a display name and phone. We’ll text a 6-digit code (Twilio test number for beta)."
            } else {
                "When the SMS arrives, tap Allow — the code autofills and signs you in."
            },
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        if (!ui.otpStep) {
            OutlinedTextField(
                value = ui.displayNameDraft,
                onValueChange = onDisplayName,
                label = { Text("Display name") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions =
                    KeyboardOptions(
                        keyboardType = KeyboardType.Text,
                        imeAction = ImeAction.Next,
                    ),
            )
            OutlinedTextField(
                value = ui.phoneDraft,
                onValueChange = onPhone,
                label = { Text("Phone") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                // System autofill / keyboard history for phone numbers
                keyboardOptions =
                    KeyboardOptions(
                        keyboardType = KeyboardType.Phone,
                        imeAction = ImeAction.Done,
                        autoCorrectEnabled = false,
                    ),
                keyboardActions = KeyboardActions(onDone = { onSend() }),
            )
            Button(
                onClick = onSend,
                enabled = !ui.busy && ui.displayNameDraft.trim().length >= 2,
                modifier = Modifier.fillMaxWidth().height(48.dp),
            ) {
                if (ui.busy) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                else Text("Send code")
            }
        } else {
            // Native EditText so Android AutofillHints.SMS_OTP works reliably
            SmsOtpAndroidField(
                value = ui.codeDraft,
                onValueChange = onCode,
                onDone = onVerify,
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .height(56.dp)
                        .focusRequester(otpFocus),
            )
            Button(
                onClick = onVerify,
                enabled = !ui.busy && ui.codeDraft.length == 6,
                modifier = Modifier.fillMaxWidth().height(48.dp),
            ) {
                if (ui.busy) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                else Text("Verify & sign in")
            }
            Text(
                "SMS autofill: one-tap Allow when the text arrives, then auto sign-in",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        ui.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        ui.info?.let { Text(it, color = MaterialTheme.colorScheme.secondary) }
        Spacer(Modifier.weight(1f, fill = true))
        LegalLinksRow()
        SupportEmailRow()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun HomeScreen(
    ui: UiState,
    onStart: () -> Unit,
    onStop: () -> Unit,
    onMode: (NetworkMode) -> Unit,
    onLogout: () -> Unit,
    onDeleteAccount: (reasonCode: String, reasonText: String?) -> Unit,
    onAccountOpen: () -> Unit,
    onRefresh: suspend () -> Unit,
) {
    var showAccount by remember { mutableStateOf(false) }
    var refreshing by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    if (showAccount) {
        AccountScreen(
            ui = ui,
            onBack = { showAccount = false },
            onLogout = onLogout,
            onDeleteAccount = onDeleteAccount,
        )
        return
    }

    PullToRefreshBox(
        isRefreshing = refreshing,
        onRefresh = {
            scope.launch {
                refreshing = true
                try {
                    onRefresh()
                } finally {
                    refreshing = false
                }
            }
        },
        modifier = Modifier.fillMaxSize(),
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
            Column(Modifier.weight(1f)) {
                Text("Home", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleLarge)
                Text(
                    ui.user?.displayName?.takeIf { it.isNotBlank() }
                        ?: ui.user?.phone
                        ?: "Signed in",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            // Account icon — profile, support, delete live here (not on home)
            Icon(
                Icons.Default.AccountCircle,
                contentDescription = "Account",
                tint = MaterialTheme.colorScheme.primary,
                modifier =
                    Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .clickable {
                            onAccountOpen()
                            showAccount = true
                        }
                        .padding(4.dp),
            )
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
                    "Network: Automatic uses Wi‑Fi or mobile (Wi‑Fi first when both are on)",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                // Only 3 earner options — keep it simple
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    ModeChip("Automatic", isAutomaticMode(ui.networkMode)) {
                        onMode(NetworkMode.AUTOMATIC)
                    }
                    ModeChip("Wi‑Fi", ui.networkMode == NetworkMode.WIFI_ONLY) {
                        onMode(NetworkMode.WIFI_ONLY)
                    }
                    ModeChip("Mobile", ui.networkMode == NetworkMode.CELLULAR_ONLY) {
                        onMode(NetworkMode.CELLULAR_ONLY)
                    }
                }

                if (ui.sharingRequested || ui.relayState != RelayState.OFFLINE) {
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

        SessionTrafficCard(ui = ui)

        ui.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        ui.info?.let {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.CheckCircle, null, tint = MaterialTheme.colorScheme.secondary)
                Spacer(Modifier.size(6.dp))
                Text(it, color = MaterialTheme.colorScheme.secondary)
            }
        }
    }
    } // PullToRefreshBox
}

@Composable
private fun AccountScreen(
    ui: UiState,
    onBack: () -> Unit,
    onLogout: () -> Unit,
    onDeleteAccount: (reasonCode: String, reasonText: String?) -> Unit,
) {
    // Device back / gesture also returns to home
    BackHandler(onBack = onBack)

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Row(
            Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            // Clear bordered back control → home
            Row(
                Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f), RoundedCornerShape(12.dp))
                    .clickable(onClick = onBack)
                    .padding(horizontal = 10.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back to home",
                    tint = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.size(20.dp),
                )
                Text(
                    "Home",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Medium,
                )
            }
            Text(
                "Account",
                fontWeight = FontWeight.SemiBold,
                style = MaterialTheme.typography.titleLarge,
            )
        }

        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                val name =
                    ui.user?.displayName
                        ?.takeIf { it.isNotBlank() && !it.equals("null", ignoreCase = true) }
                        ?: "Earner"
                val phone =
                    ui.user?.phone
                        ?.takeIf { it.isNotBlank() && !it.equals("null", ignoreCase = true) }
                        ?: "—"
                Text(
                    name,
                    fontWeight = FontWeight.SemiBold,
                    style = MaterialTheme.typography.titleMedium,
                )
                Text(
                    phone,
                    fontFamily = FontFamily.Monospace,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                // Email is optional — never show literal "null"
                ui.user?.email
                    ?.takeIf {
                        it.isNotBlank() &&
                            !it.equals("null", ignoreCase = true) &&
                            !it.equals("undefined", ignoreCase = true)
                    }
                    ?.let { Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                Text(
                    "Login: phone + SMS code",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        SupportCard()
        LegalLinksRow()

        OutlinedButton(
            onClick = onLogout,
            modifier = Modifier.fillMaxWidth().height(48.dp),
            shape = RoundedCornerShape(14.dp),
        ) {
            Text("Log out")
        }

        DeleteAccountCard(
            busy = ui.busy,
            onDelete = { code, detail -> onDeleteAccount(code, detail) },
        )

        ui.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        ui.info?.let { Text(it, color = MaterialTheme.colorScheme.secondary) }
    }
}

private const val TERMS_URL = "https://busyproxy.net/terms"
private const val PRIVACY_URL = "https://busyproxy.net/privacy"
private const val ACCOUNT_DELETION_URL = "https://busyproxy.net/account-deletion"

@Composable
private fun SupportEmailRow() {
    val context = LocalContext.current
    Text(
        "Support: $SUPPORT_EMAIL",
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.primary,
        modifier =
            Modifier
                .fillMaxWidth()
                .clickable { openSupportEmail(context) }
                .padding(vertical = 8.dp),
    )
}

@Composable
private fun LegalLinksRow() {
    val context = LocalContext.current
    Row(
        Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            "Terms",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.clickable { openUrl(context, TERMS_URL) },
        )
        Text(
            "Privacy",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.clickable { openUrl(context, PRIVACY_URL) },
        )
        Text(
            "Delete account (web)",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.clickable { openUrl(context, ACCOUNT_DELETION_URL) },
        )
    }
}

@Composable
private fun SupportCard() {
    val context = LocalContext.current
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(20.dp),
        modifier =
            Modifier
                .fillMaxWidth()
                .clickable { openSupportEmail(context) },
    ) {
        Row(
            Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Icon(
                Icons.Default.Email,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
            )
            Column {
                Text("Support", fontWeight = FontWeight.SemiBold)
                Text(
                    SUPPORT_EMAIL,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary,
                )
                Text(
                    "Tap to email us",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

private data class DeletionReasonOption(val code: String, val label: String)

private val DEFAULT_DELETION_REASONS =
    listOf(
        DeletionReasonOption("not_earning", "Not earning enough"),
        DeletionReasonOption("battery_data", "Battery or data usage concerns"),
        DeletionReasonOption("privacy", "Privacy or trust concerns"),
        DeletionReasonOption("technical", "App technical issues / bugs"),
        DeletionReasonOption("switching", "Switching to another service"),
        DeletionReasonOption("temporary", "Taking a break / temporary"),
        DeletionReasonOption("other", "Other (please describe)"),
    )

@Composable
private fun DeleteAccountCard(
    busy: Boolean,
    onDelete: (reasonCode: String, reasonText: String?) -> Unit,
) {
    var open by remember { mutableStateOf(false) }
    var reasonCode by remember { mutableStateOf("") }
    var detail by remember { mutableStateOf("") }
    val reasons = DEFAULT_DELETION_REASONS
    val other = reasonCode == "other"
    val canSubmit =
        reasonCode.isNotBlank() &&
            (!other || detail.trim().length >= 3)

    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(20.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Delete account", fontWeight = FontWeight.SemiBold)
            Text(
                "Choose a reason, then confirm. Your phone cannot sign in again until support reactivates it.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (!open) {
                OutlinedButton(
                    onClick = { open = true },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !busy,
                ) {
                    Text("Delete my account…")
                }
            } else {
                reasons.forEach { r ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clickable { reasonCode = r.code }
                            .padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        androidx.compose.material3.RadioButton(
                            selected = reasonCode == r.code,
                            onClick = { reasonCode = r.code },
                            enabled = !busy,
                        )
                        Text(r.label, style = MaterialTheme.typography.bodyMedium)
                    }
                }
                if (other) {
                    OutlinedTextField(
                        value = detail,
                        onValueChange = { detail = it.take(500) },
                        label = { Text("Please describe") },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !busy,
                        minLines = 2,
                    )
                }
                Text(
                    "This cannot be undone without contacting support.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = {
                            open = false
                            reasonCode = ""
                            detail = ""
                        },
                        enabled = !busy,
                    ) {
                        Text("Cancel")
                    }
                    Button(
                        onClick = {
                            onDelete(
                                reasonCode,
                                if (other) detail.trim() else null,
                            )
                        },
                        enabled = !busy && canSubmit,
                        colors =
                            ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.error,
                            ),
                    ) {
                        if (busy) {
                            CircularProgressIndicator(
                                Modifier.size(18.dp),
                                strokeWidth = 2.dp,
                                color = MaterialTheme.colorScheme.onError,
                            )
                        } else {
                            Text("Confirm delete")
                        }
                    }
                }
            }
        }
    }
}

private fun openSupportEmail(context: android.content.Context) {
    val intent =
        Intent(Intent.ACTION_SENDTO).apply {
            data = Uri.parse("mailto:$SUPPORT_EMAIL")
            putExtra(Intent.EXTRA_SUBJECT, "BusyProxy support")
        }
    runCatching { context.startActivity(intent) }
}

private fun openUrl(context: android.content.Context, url: String) {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
    runCatching { context.startActivity(intent) }
}

@Composable
private fun ModeChip(label: String, selected: Boolean, onClick: () -> Unit) {
    FilterChip(selected = selected, onClick = onClick, label = { Text(label) })
}

/** Treat legacy prefer_* / any_validated as Automatic in the UI. */
private fun isAutomaticMode(mode: NetworkMode): Boolean =
    when (mode) {
        NetworkMode.AUTOMATIC,
        NetworkMode.ANY_VALIDATED,
        NetworkMode.PREFER_WIFI,
        NetworkMode.PREFER_CELLULAR,
        -> true
        else -> false
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

/**
 * OTP field with platform SMS autofill hints (keyboard / Autofill service).
 * Paired with Play Services SMS User Consent in MainActivity.
 */
@Composable
private fun SmsOtpAndroidField(
    value: String,
    onValueChange: (String) -> Unit,
    onDone: () -> Unit,
    modifier: Modifier = Modifier,
) {
    AndroidView(
        modifier = modifier,
        factory = { ctx ->
            EditText(ctx).apply {
                hint = "6-digit OTP"
                inputType =
                    android.text.InputType.TYPE_CLASS_NUMBER or
                        android.text.InputType.TYPE_NUMBER_VARIATION_PASSWORD
                // "smsOTPCode" = View.AUTOFILL_HINT_SMS_OTP (API 28+); string works on min 26
                setAutofillHints("smsOTPCode")
                if (android.os.Build.VERSION.SDK_INT >= 26) {
                    importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_YES
                }
                setTextColor(AndroidColor.parseColor("#E7E7EA"))
                setHintTextColor(AndroidColor.parseColor("#A0A0AB"))
                background =
                    GradientDrawable().apply {
                        setColor(AndroidColor.parseColor("#16161D"))
                        cornerRadius = 28f
                        setStroke(2, AndroidColor.parseColor("#26262F"))
                    }
                setPadding(48, 36, 48, 36)
                textSize = 18f
                maxLines = 1
                isSingleLine = true
                imeOptions = android.view.inputmethod.EditorInfo.IME_ACTION_DONE
                setOnEditorActionListener { _, actionId, _ ->
                    if (actionId == android.view.inputmethod.EditorInfo.IME_ACTION_DONE) {
                        onDone()
                        true
                    } else {
                        false
                    }
                }
                doAfterTextChanged { editable ->
                    val v = editable?.toString().orEmpty()
                    if (v != value) onValueChange(v)
                }
            }
        },
        update = { edit ->
            if (edit.text?.toString() != value) {
                edit.setText(value)
                edit.setSelection(value.length.coerceAtMost(edit.text?.length ?: 0))
            }
        },
    )
}

/** Drop snake_case / internal engine tags from the earner home UI. */
private fun friendlyRelayMessage(raw: String?): String? {
    val m = raw?.trim().orEmpty()
    if (m.isEmpty()) return null
    if (m.contains('_') && m == m.lowercase()) return null
    if (m.equals("tunnel_open", ignoreCase = true)) return null
    if (m.equals("reconnecting", ignoreCase = true)) return "Reconnecting…"
    if (m.equals("retrying", ignoreCase = true)) return "Retrying…"
    return m
}

@Composable
private fun SessionTrafficCard(ui: UiState) {
    val online = ui.relayState == RelayState.ONLINE
    val active =
        ui.sharingRequested ||
            (ui.relayState != RelayState.OFFLINE && ui.relayState != RelayState.STOPPING)
    val (stateLabel, stateColor) = relayStateStyle(ui.relayState)

    val pulse = rememberInfiniteTransition(label = "sessionPulse")
    val pulseScale by pulse.animateFloat(
        initialValue = 1f,
        targetValue = if (online) 1.28f else 1f,
        animationSpec =
            infiniteRepeatable(
                animation = tween(1600, easing = FastOutSlowInEasing),
                repeatMode = RepeatMode.Reverse,
            ),
        label = "pulseScale",
    )
    val pulseAlpha by pulse.animateFloat(
        initialValue = 0.45f,
        targetValue = if (online) 0.12f else 0.3f,
        animationSpec =
            infiniteRepeatable(
                animation = tween(1600, easing = LinearEasing),
                repeatMode = RepeatMode.Reverse,
            ),
        label = "pulseAlpha",
    )
    val barColor by animateColorAsState(
        targetValue = if (online) stateColor else MaterialTheme.colorScheme.outline,
        animationSpec = tween(600),
        label = "barColor",
    )

    // Continuous exponential smoothing — never restarts mid-animation on each packet
    var displayTotal by remember { mutableFloatStateOf(0f) }
    var displayUp by remember { mutableFloatStateOf(0f) }
    var displayDown by remember { mutableFloatStateOf(0f) }
    var displayRate by remember { mutableFloatStateOf(0f) }
    var displayActivity by remember { mutableFloatStateOf(0.04f) }
    var targetTotal by remember { mutableFloatStateOf(0f) }
    var targetUp by remember { mutableFloatStateOf(0f) }
    var targetDown by remember { mutableFloatStateOf(0f) }
    var rateSampleBytes by remember { mutableLongStateOf(0L) }
    var rateSampleAt by remember { mutableLongStateOf(0L) }
    var smoothRate by remember { mutableFloatStateOf(0f) }

    LaunchedEffect(ui.bytesToday, ui.bytesUp, ui.bytesDown) {
        targetTotal = ui.bytesToday.toFloat().coerceAtLeast(0f)
        targetUp = ui.bytesUp.toFloat().coerceAtLeast(0f)
        targetDown = ui.bytesDown.toFloat().coerceAtLeast(0f)
        val now = System.currentTimeMillis()
        if (rateSampleAt > 0L && now - rateSampleAt >= 400L) {
            val dt = (now - rateSampleAt) / 1000f
            val db = (ui.bytesToday - rateSampleBytes).coerceAtLeast(0L).toFloat()
            val instant = if (dt > 0.2f) db / dt else 0f
            // Heavy smoothing so rate text doesn't flicker
            smoothRate = smoothRate * 0.82f + instant * 0.18f
            rateSampleBytes = ui.bytesToday
            rateSampleAt = now
        } else if (rateSampleAt == 0L) {
            rateSampleBytes = ui.bytesToday
            rateSampleAt = now
        }
        if (!online && !ui.sharingRequested) {
            smoothRate = 0f
        }
    }

    // Frame loop: ease display values toward targets (~slow follow)
    LaunchedEffect(Unit) {
        var lastFrame = 0L
        while (true) {
            withFrameNanos { frame ->
                if (lastFrame == 0L) {
                    lastFrame = frame
                    return@withFrameNanos
                }
                val dt = ((frame - lastFrame) / 1_000_000_000f).coerceIn(0f, 0.05f)
                lastFrame = frame
                // ~0.9s time-constant follow (slower = calmer)
                val alpha = 1f - kotlin.math.exp((-dt / 0.95f).toDouble()).toFloat()
                displayTotal += (targetTotal - displayTotal) * alpha
                displayUp += (targetUp - displayUp) * alpha
                displayDown += (targetDown - displayDown) * alpha
                displayRate += (smoothRate - displayRate) * (alpha * 0.7f)

                val activityTarget =
                    when {
                        !active -> 0.04f
                        online && smoothRate > 80_000f -> 0.88f
                        online && smoothRate > 12_000f -> 0.58f
                        online && ui.activeStreams > 0 -> 0.38f
                        online -> 0.18f
                        else -> 0.1f
                    }
                displayActivity += (activityTarget - displayActivity) * (alpha * 0.55f)

                // Snap when very close to avoid endless micro-updates
                if (abs(targetTotal - displayTotal) < 8f) displayTotal = targetTotal
            }
        }
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(22.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Session", fontWeight = FontWeight.SemiBold, fontSize = 17.sp)
                Row(
                    Modifier
                        .clip(RoundedCornerShape(999.dp))
                        .background(stateColor.copy(alpha = 0.14f))
                        .padding(horizontal = 10.dp, vertical = 5.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        if (online) {
                            Box(
                                Modifier
                                    .size(10.dp)
                                    .scale(pulseScale)
                                    .alpha(pulseAlpha)
                                    .clip(CircleShape)
                                    .background(stateColor),
                            )
                        }
                        Box(
                            Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(stateColor),
                        )
                    }
                    Spacer(Modifier.width(7.dp))
                    Text(
                        stateLabel,
                        color = stateColor,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 12.sp,
                    )
                }
            }

            Column {
                Text(
                    "Data this session",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    formatBytesSmooth(displayTotal.toLong()),
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 28.sp,
                    color = MaterialTheme.colorScheme.onSurface,
                    letterSpacing = (-0.5).sp,
                )
                if (online || displayRate > 256f) {
                    Text(
                        formatRate(displayRate),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary,
                        fontFamily = FontFamily.Monospace,
                    )
                }
            }

            LinearProgressIndicator(
                progress = { displayActivity.coerceIn(0f, 1f) },
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .clip(RoundedCornerShape(999.dp)),
                color = barColor,
                trackColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.35f),
                strokeCap = StrokeCap.Round,
            )

            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                TrafficStatChip(
                    label = "Sent",
                    value = formatBytesSmooth(displayUp.toLong()),
                    modifier = Modifier.weight(1f),
                )
                TrafficStatChip(
                    label = "Received",
                    value = formatBytesSmooth(displayDown.toLong()),
                    modifier = Modifier.weight(1f),
                )
                TrafficStatChip(
                    label = "Streams",
                    value = ui.activeStreams.toString(),
                    modifier = Modifier.weight(1f),
                )
            }

            if (!ui.egressIp.isNullOrBlank()) {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(MaterialTheme.colorScheme.background)
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "Exit IP",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        ui.egressIp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Medium,
                        fontSize = 13.sp,
                    )
                }
            }

            friendlyRelayMessage(ui.relayMessage)?.let {
                Text(
                    it,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun TrafficStatChip(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier
            .clip(RoundedCornerShape(14.dp))
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 10.dp, vertical = 10.dp),
    ) {
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(2.dp))
        Text(
            value,
            fontFamily = FontFamily.Monospace,
            fontWeight = FontWeight.SemiBold,
            fontSize = 13.sp,
        )
    }
}

private fun relayStateStyle(state: RelayState): Pair<String, Color> =
    when (state) {
        RelayState.ONLINE -> "Live" to Color(0xFF34D399)
        RelayState.RECONNECTING -> "Reconnecting" to Color(0xFFFBBF24)
        RelayState.CONNECTING_TUNNEL, RelayState.VERIFYING_EGRESS, RelayState.PREPARING ->
            "Connecting" to Color(0xFF60A5FA)
        RelayState.WAITING_FOR_NETWORK, RelayState.CAPTIVE_PORTAL ->
            "Waiting" to Color(0xFFFBBF24)
        RelayState.PAUSED_ROAMING, RelayState.PAUSED_DATA_CAP ->
            "Paused" to Color(0xFFF97316)
        RelayState.ERROR -> "Error" to Color(0xFFF87171)
        RelayState.STOPPING -> "Stopping" to Color(0xFFA0A0AB)
        RelayState.OFFLINE -> "Idle" to Color(0xFFA0A0AB)
    }

private fun money(cents: Int): String {
    val n = cents / 100.0
    return if (cents % 100 == 0) "$${cents / 100}" else "$" + String.format("%.2f", n)
}

private fun formatBytes(n: Long): String = formatBytesSmooth(n)

/** Fewer unit jumps while the number is animating (calmer display). */
private fun formatBytesSmooth(n: Long): String {
    val v = n.coerceAtLeast(0L)
    return when {
        v < 10 * 1024 -> if (v < 1024) "$v B" else String.format("%.0f KB", v / 1024.0)
        v < 1024 * 1024 -> String.format("%.1f KB", v / 1024.0)
        v < 100L * 1024 * 1024 -> String.format("%.1f MB", v / (1024.0 * 1024.0))
        v < 1024L * 1024 * 1024 -> String.format("%.2f MB", v / (1024.0 * 1024.0))
        else -> String.format("%.2f GB", v / (1024.0 * 1024.0 * 1024.0))
    }
}

private fun formatRate(bytesPerSec: Float): String {
    val b = bytesPerSec.coerceAtLeast(0f)
    return when {
        b < 800f -> "—"
        b < 1024f * 1024f -> String.format("%.0f KB/s", b / 1024f)
        else -> String.format("%.1f MB/s", b / (1024f * 1024f))
    }
}
