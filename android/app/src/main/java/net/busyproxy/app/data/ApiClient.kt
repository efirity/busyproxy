package net.busyproxy.app.data

import net.busyproxy.app.BuildConfig
import net.busyproxy.app.domain.AuthUser
import net.busyproxy.app.domain.DeviceEnrollment
import net.busyproxy.app.domain.SessionTokens
import net.busyproxy.app.domain.WalletSnapshot
import net.busyproxy.app.domain.cleanOptionalString
import net.busyproxy.app.network.SecureOkHttp
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

class ApiClient(
    private val baseUrl: String = BuildConfig.CONTROL_API_BASE,
) {
    private val json = "application/json; charset=utf-8".toMediaType()
    /** Pinned TLS to busyproxy.net (renewal-safe intermediate/root pins). */
    private val http: OkHttpClient = SecureOkHttp.apiClient()

    /** Country dial prefix from server IP geo, e.g. "+373". */
    fun phoneHint(): JSONObject {
        return get("/api/auth/phone-hint")
    }

    fun startOtp(phone: String, displayName: String? = null): JSONObject {
        val body =
            JSONObject()
                .put("phone", phone)
                .apply {
                    if (!displayName.isNullOrBlank()) put("displayName", displayName.trim())
                }
                .toString()
        return post("/api/auth/otp/start", body)
    }

    fun verifyOtp(phone: String, code: String, displayName: String? = null): SessionTokens {
        val body =
            JSONObject()
                .put("phone", phone)
                .put("code", code)
                .apply {
                    if (!displayName.isNullOrBlank()) put("displayName", displayName.trim())
                }
                .toString()
        val o = post("/api/auth/otp/verify", body)
        val user = o.getJSONObject("user")
        return SessionTokens(
            sessionToken = o.getString("token"),
            user =
                AuthUser(
                    id = user.getString("id"),
                    phone = cleanOptionalString(user.optString("phone", "")) ?: "",
                    displayName = cleanOptionalString(user.optString("displayName", "")),
                    email = cleanOptionalString(user.optString("email", "")),
                ),
        )
    }

    fun enrollDevice(
        sessionToken: String,
        deviceId: String?,
        name: String,
        network: String,
        country: String?,
        publicIp: String?,
        deviceSecret: String?,
        userId: String?,
        installId: String? = null,
    ): DeviceEnrollment {
        val body =
            JSONObject()
                .put("deviceId", deviceId ?: JSONObject.NULL)
                .put("name", name)
                .put("platform", "android")
                .put("network", if (network == "wifi") "wifi" else "cellular")
                .put("country", country ?: "XX")
                .put("publicIp", publicIp ?: JSONObject.NULL)
                .put("deviceSecret", deviceSecret ?: JSONObject.NULL)
                .put("userId", userId ?: JSONObject.NULL)
                .put("installId", installId ?: JSONObject.NULL)
                .toString()
        // Control plane edge enroll
        val o = post("/api/edge/agent/hello", body, bearer = sessionToken)
        return DeviceEnrollment(
            deviceId = o.getString("deviceId"),
            deviceSecret =
                o.optString("deviceSecret", "").ifBlank { deviceSecret.orEmpty() },
            tunnelId = o.optString("tunnelId", "").takeIf { it.isNotBlank() },
            agentUrl =
                o.optString("agentUrl", "").ifBlank { BuildConfig.AGENT_WSS_BASE },
        )
    }

    fun wallet(sessionToken: String): WalletSnapshot {
        return try {
            val o = get("/api/stripe/wallet", bearer = sessionToken)
            WalletSnapshot(
                availableCents = o.optInt("availableCents", 0),
                lifetimeCents =
                    o.optInt(
                        "lifetimeEarnCents",
                        o.optInt("lifetimeCents", 0),
                    ),
                minWithdrawCents = o.optInt("minWithdrawCents", 2000),
                payoutsEnabled = o.optBoolean("payoutsEnabled", false),
                stripeAccountId =
                    cleanOptionalString(o.optString("stripeAccountId", "")),
            )
        } catch (_: Throwable) {
            WalletSnapshot()
        }
    }

    fun updateProfile(sessionToken: String, displayName: String): AuthUser {
        val body = JSONObject().put("displayName", displayName.trim()).toString()
        val o = patch("/api/auth/profile", body, bearer = sessionToken)
        val user = o.optJSONObject("user") ?: o
        return AuthUser(
            id = user.optString("id", ""),
            phone = user.optString("phone", ""),
            displayName = cleanOptionalString(user.optString("displayName", "")),
            email = cleanOptionalString(user.optString("email", "")),
        )
    }

    /** Stripe Connect onboarding URL for in-app browser. */
    fun stripeConnectOnboard(sessionToken: String): String {
        val body =
            JSONObject()
                .put("origin", BuildConfig.CONTROL_API_BASE.trimEnd('/'))
                .put("mobile", true)
                .toString()
        val o = post("/api/stripe/connect/onboard", body, bearer = sessionToken)
        val url = o.optString("url", "")
        if (url.isBlank()) throw IllegalStateException("No Stripe URL")
        return url
    }

    fun stripeConnectRefresh(sessionToken: String): WalletSnapshot {
        val o = post("/api/stripe/connect/refresh", "{}", bearer = sessionToken)
        return WalletSnapshot(
            availableCents = o.optInt("availableCents", 0),
            lifetimeCents =
                o.optInt("lifetimeEarnCents", o.optInt("lifetimeCents", 0)),
            minWithdrawCents = o.optInt("minWithdrawCents", 2000),
            payoutsEnabled = o.optBoolean("payoutsEnabled", false),
            stripeAccountId =
                cleanOptionalString(o.optString("stripeAccountId", "")),
        )
    }

    fun deletionReasons(): JSONObject {
        return get("/api/auth/deletion-reasons")
    }

    fun postEventsBatch(
        installId: String,
        events: List<JSONObject>,
        sessionToken: String?,
        appVersion: String?,
        deviceModel: String?,
        osVersion: String?,
        deviceId: String? = null,
    ): JSONObject {
        val arr = org.json.JSONArray()
        events.forEach { arr.put(it) }
        val body =
            JSONObject()
                .put("installId", installId)
                .put("deviceId", deviceId ?: JSONObject.NULL)
                .put("events", arr)
                .put("platform", "android")
                .put("appVersion", appVersion ?: JSONObject.NULL)
                .put("deviceModel", deviceModel ?: JSONObject.NULL)
                .put("osVersion", osVersion ?: JSONObject.NULL)
                .toString()
        return post("/api/events/batch", body, bearer = sessionToken)
    }

    /** Soft-delete account with required reason. */
    fun deleteAccount(
        sessionToken: String,
        reasonCode: String,
        reasonText: String? = null,
    ): JSONObject {
        val body =
            JSONObject()
                .put("reasonCode", reasonCode)
                .apply {
                    if (!reasonText.isNullOrBlank()) put("reasonText", reasonText.trim())
                }
                .toString()
        return delete("/api/auth/account", jsonBody = body, bearer = sessionToken)
    }

    private fun get(path: String, bearer: String? = null): JSONObject {
        val b =
            Request.Builder().url(baseUrl.trimEnd('/') + path).get()
        if (bearer != null) b.header("Authorization", "Bearer $bearer")
        return exec(b.build())
    }

    private fun post(path: String, jsonBody: String, bearer: String? = null): JSONObject {
        val b =
            Request.Builder()
                .url(baseUrl.trimEnd('/') + path)
                .post(jsonBody.toRequestBody(json))
                .header("Content-Type", "application/json")
        if (bearer != null) b.header("Authorization", "Bearer $bearer")
        return exec(b.build())
    }

    private fun patch(path: String, jsonBody: String, bearer: String? = null): JSONObject {
        val b =
            Request.Builder()
                .url(baseUrl.trimEnd('/') + path)
                .patch(jsonBody.toRequestBody(json))
                .header("Content-Type", "application/json")
        if (bearer != null) b.header("Authorization", "Bearer $bearer")
        return exec(b.build())
    }

    private fun delete(
        path: String,
        jsonBody: String = "{}",
        bearer: String? = null,
    ): JSONObject {
        val b =
            Request.Builder()
                .url(baseUrl.trimEnd('/') + path)
                .delete(jsonBody.toRequestBody(json))
                .header("Content-Type", "application/json")
        if (bearer != null) b.header("Authorization", "Bearer $bearer")
        return exec(b.build())
    }

    private fun exec(req: Request): JSONObject {
        http.newCall(req).execute().use { res ->
            val text = res.body?.string().orEmpty()
            if (!res.isSuccessful) {
                val err =
                    runCatching { JSONObject(text).optString("error") }.getOrNull()
                throw IllegalStateException(err ?: "HTTP ${res.code}")
            }
            return if (text.isBlank()) JSONObject() else JSONObject(text)
        }
    }
}
