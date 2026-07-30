package net.busyproxy.app.domain

/**
 * BusyProxy earner agent models.
 * Aligns with PocketRelay network contract + BusyProxy control plane.
 */
enum class NetworkMode(val apiValue: String) {
    /** Use Wi‑Fi or mobile automatically (default). Prefers Wi‑Fi when both are up. */
    AUTOMATIC("automatic"),
    CELLULAR_ONLY("cellular_only"),
    WIFI_ONLY("wifi_only"),
    PREFER_CELLULAR("prefer_cellular"),
    PREFER_WIFI("prefer_wifi"),
    /** @deprecated prefer [AUTOMATIC] — kept for prefs migration */
    ANY_VALIDATED("any_validated_network");

    companion object {
        fun fromApi(v: String?): NetworkMode =
            when (v) {
                null, "" -> AUTOMATIC
                // Legacy modes collapse to Automatic (Wi‑Fi + mobile)
                "any_validated_network",
                "auto",
                "both",
                "prefer_wifi",
                "prefer_cellular",
                -> AUTOMATIC
                else -> entries.find { it.apiValue == v } ?: AUTOMATIC
            }
    }
}

enum class ActiveTransport {
    CELLULAR,
    WIFI,
    UNKNOWN,
}

/**
 * Single source of truth for UI + notification + agent loop.
 * PocketRelay §32.4 states, simplified for earner product.
 */
enum class RelayState {
    OFFLINE,
    PREPARING,
    WAITING_FOR_NETWORK,
    CAPTIVE_PORTAL,
    CONNECTING_TUNNEL,
    VERIFYING_EGRESS,
    ONLINE,
    RECONNECTING,
    PAUSED_ROAMING,
    PAUSED_DATA_CAP,
    STOPPING,
    ERROR,
}

data class RelayStatus(
    val state: RelayState = RelayState.OFFLINE,
    val networkMode: NetworkMode = NetworkMode.AUTOMATIC,
    val activeTransport: ActiveTransport = ActiveTransport.UNKNOWN,
    val fallbackActive: Boolean = false,
    val validated: Boolean = false,
    val metered: Boolean = false,
    val roaming: Boolean = false,
    val egressIp: String? = null,
    val networkGeneration: Long = 0,
    val carrierOrSsid: String? = null,
    val bytesUp: Long = 0,
    val bytesDown: Long = 0,
    val activeStreams: Int = 0,
    val message: String? = null,
    val connectedAtMs: Long? = null,
)

data class AuthUser(
    val id: String,
    val phone: String,
    val displayName: String?,
    val email: String?,
)

data class SessionTokens(
    val sessionToken: String,
    val user: AuthUser,
)

data class DeviceEnrollment(
    val deviceId: String,
    val deviceSecret: String,
    val tunnelId: String?,
    val agentUrl: String,
)

data class WalletSnapshot(
    val availableCents: Int = 0,
    val lifetimeCents: Int = 0,
    val wifiCentsPerGb: Int = 20,
    val mobileCentsPerGb: Int = 12,
    val minWithdrawCents: Int = 2000,
)

/** Pricing mirror of web `src/data/pricing.ts` */
object Pricing {
    const val WIFI_CENTS_PER_GB = 20
    const val MOBILE_CENTS_PER_GB = 12
    const val MIN_WITHDRAW_CENTS = 2000
    const val WELCOME_BONUS_CENTS = 50
}
