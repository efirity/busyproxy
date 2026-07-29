package net.busyproxy.app.data

import net.busyproxy.app.BuildConfig
import net.busyproxy.app.domain.AuthUser
import net.busyproxy.app.domain.DeviceEnrollment
import net.busyproxy.app.domain.SessionTokens
import net.busyproxy.app.domain.WalletSnapshot
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class ApiClient(
    private val baseUrl: String = BuildConfig.CONTROL_API_BASE,
) {
    private val json = "application/json; charset=utf-8".toMediaType()
    private val http =
        OkHttpClient.Builder()
            .connectTimeout(20, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()

    fun startOtp(phone: String): JSONObject {
        val body = JSONObject().put("phone", phone).toString()
        return post("/api/auth/otp/start", body)
    }

    fun verifyOtp(phone: String, code: String): SessionTokens {
        val body = JSONObject().put("phone", phone).put("code", code).toString()
        val o = post("/api/auth/otp/verify", body)
        val user = o.getJSONObject("user")
        return SessionTokens(
            sessionToken = o.getString("token"),
            user =
                AuthUser(
                    id = user.getString("id"),
                    phone = user.getString("phone"),
                    displayName = user.optString("displayName", null),
                    email = user.optString("email", null).takeIf { it.isNotBlank() },
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
                .toString()
        // Control plane edge enroll
        val o = post("/api/edge/agent/hello", body, bearer = sessionToken)
        return DeviceEnrollment(
            deviceId = o.getString("deviceId"),
            deviceSecret = o.optString("deviceSecret", deviceSecret ?: ""),
            tunnelId = o.optString("tunnelId", null),
            agentUrl = o.optString("agentUrl", BuildConfig.AGENT_WSS_BASE),
        )
    }

    fun wallet(sessionToken: String): WalletSnapshot {
        return try {
            val o = get("/api/stripe/wallet", bearer = sessionToken)
            WalletSnapshot(
                availableCents = o.optInt("availableCents", 0),
                lifetimeCents = o.optInt("lifetimeCents", 0),
            )
        } catch (_: Throwable) {
            WalletSnapshot()
        }
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
