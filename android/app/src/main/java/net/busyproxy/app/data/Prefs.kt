package net.busyproxy.app.data

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import net.busyproxy.app.domain.NetworkMode

private val Context.dataStore by preferencesDataStore("busyproxy")

class Prefs(private val context: Context) {
    private object Keys {
        val sessionToken = stringPreferencesKey("session_token")
        val userJson = stringPreferencesKey("user_json")
        val deviceId = stringPreferencesKey("device_id")
        val deviceSecret = stringPreferencesKey("device_secret")
        val consent = booleanPreferencesKey("consent_accepted")
        val networkMode = stringPreferencesKey("network_mode")
        val dailyCapMb = longPreferencesKey("daily_cap_mb")
        val allowRoaming = booleanPreferencesKey("allow_roaming")
        val bytesUpToday = longPreferencesKey("bytes_up_today")
        val bytesDownToday = longPreferencesKey("bytes_down_today")
        val dayKey = stringPreferencesKey("day_key")
        /** Last phone used on login form (faster re-login; kept after logout). */
        val lastLoginPhone = stringPreferencesKey("last_login_phone")
        val lastLoginDisplayName = stringPreferencesKey("last_login_display_name")
        val installId = stringPreferencesKey("install_id")
        val firstOpenLogged = booleanPreferencesKey("first_open_logged")
        /**
         * User wants sharing ON. Survives process death / reboot so we can
         * restart the foreground service until they explicitly stop.
         */
        val sharingWanted = booleanPreferencesKey("sharing_wanted")
        val batteryOptPrompted = booleanPreferencesKey("battery_opt_prompted")
    }

    val sessionToken: Flow<String?> =
        context.dataStore.data.map { it[Keys.sessionToken] }

    val consentAccepted: Flow<Boolean> =
        context.dataStore.data.map { it[Keys.consent] == true }

    val networkMode: Flow<NetworkMode> =
        context.dataStore.data.map {
            NetworkMode.fromApi(it[Keys.networkMode])
        }

    val deviceId: Flow<String?> = context.dataStore.data.map { it[Keys.deviceId] }
    val deviceSecret: Flow<String?> = context.dataStore.data.map { it[Keys.deviceSecret] }

    suspend fun setSession(token: String, userJson: String) {
        context.dataStore.edit {
            it[Keys.sessionToken] = token
            it[Keys.userJson] = userJson
        }
    }

    suspend fun clearSession() {
        context.dataStore.edit {
            it.remove(Keys.sessionToken)
            it.remove(Keys.userJson)
            it[Keys.sharingWanted] = false
        }
    }

    /** Wipe local account-linked prefs after account deletion. */
    suspend fun clearAccountLocalData() {
        context.dataStore.edit {
            it.remove(Keys.sessionToken)
            it.remove(Keys.userJson)
            it.remove(Keys.deviceId)
            it.remove(Keys.deviceSecret)
            it.remove(Keys.bytesUpToday)
            it.remove(Keys.bytesDownToday)
            it.remove(Keys.dayKey)
            it[Keys.sharingWanted] = false
            // Keep consent so user is not forced through disclosure again
        }
    }

    suspend fun setConsent(accepted: Boolean) {
        context.dataStore.edit { it[Keys.consent] = accepted }
    }

    suspend fun setNetworkMode(mode: NetworkMode) {
        context.dataStore.edit { it[Keys.networkMode] = mode.apiValue }
    }

    suspend fun setDevice(deviceId: String, secret: String) {
        context.dataStore.edit {
            it[Keys.deviceId] = deviceId
            it[Keys.deviceSecret] = secret
        }
    }

    suspend fun setDailyCapMb(mb: Long) {
        context.dataStore.edit { it[Keys.dailyCapMb] = mb }
    }

    suspend fun setAllowRoaming(v: Boolean) {
        context.dataStore.edit { it[Keys.allowRoaming] = v }
    }

    suspend fun addBytes(up: Long, down: Long) {
        val today = java.time.LocalDate.now().toString()
        context.dataStore.edit {
            val day = it[Keys.dayKey]
            if (day != today) {
                it[Keys.dayKey] = today
                it[Keys.bytesUpToday] = 0L
                it[Keys.bytesDownToday] = 0L
            }
            it[Keys.bytesUpToday] = (it[Keys.bytesUpToday] ?: 0L) + up
            it[Keys.bytesDownToday] = (it[Keys.bytesDownToday] ?: 0L) + down
        }
    }

    val usageToday: Flow<Pair<Long, Long>> =
        context.dataStore.data.map {
            val today = java.time.LocalDate.now().toString()
            if (it[Keys.dayKey] != today) 0L to 0L
            else (it[Keys.bytesUpToday] ?: 0L) to (it[Keys.bytesDownToday] ?: 0L)
        }

    val dailyCapMb: Flow<Long> =
        context.dataStore.data.map { it[Keys.dailyCapMb] ?: 1024L }

    val allowRoaming: Flow<Boolean> =
        context.dataStore.data.map { it[Keys.allowRoaming] == true }

    suspend fun peekUserJson(): String? = context.dataStore.data.map { it[Keys.userJson] }.first()

    suspend fun peekLastLoginPhone(): String? =
        context.dataStore.data.map { it[Keys.lastLoginPhone] }.first()

    suspend fun peekLastLoginDisplayName(): String? =
        context.dataStore.data.map { it[Keys.lastLoginDisplayName] }.first()

    suspend fun setLastLoginHints(phone: String?, displayName: String?) {
        context.dataStore.edit {
            val p = phone?.trim().orEmpty()
            if (p.length >= 8) it[Keys.lastLoginPhone] = p
            val n = displayName?.trim().orEmpty()
            if (n.length >= 2) it[Keys.lastLoginDisplayName] = n
        }
    }

    suspend fun peekInstallId(): String? =
        context.dataStore.data.map { it[Keys.installId] }.first()

    suspend fun setInstallId(id: String) {
        context.dataStore.edit { it[Keys.installId] = id }
    }

    suspend fun peekFirstOpenLogged(): Boolean =
        context.dataStore.data.map { it[Keys.firstOpenLogged] == true }.first()

    suspend fun setFirstOpenLogged(v: Boolean) {
        context.dataStore.edit { it[Keys.firstOpenLogged] = v }
    }

    val sharingWanted: Flow<Boolean> =
        context.dataStore.data.map { it[Keys.sharingWanted] == true }

    suspend fun peekSharingWanted(): Boolean =
        context.dataStore.data.map { it[Keys.sharingWanted] == true }.first()

    suspend fun setSharingWanted(v: Boolean) {
        context.dataStore.edit { it[Keys.sharingWanted] = v }
    }

    suspend fun peekBatteryOptPrompted(): Boolean =
        context.dataStore.data.map { it[Keys.batteryOptPrompted] == true }.first()

    suspend fun setBatteryOptPrompted(v: Boolean) {
        context.dataStore.edit { it[Keys.batteryOptPrompted] = v }
    }
}
