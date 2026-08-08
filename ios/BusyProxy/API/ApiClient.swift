import Foundation

enum ApiError: LocalizedError {
    case http(Int, String)
    case decode
    case message(String)

    var errorDescription: String? {
        switch self {
        case let .http(code, body): return "HTTP \(code): \(body)"
        case .decode: return "Bad response"
        case let .message(m): return m
        }
    }
}

struct ApiClient {
    var baseURL: String = AppConfig.apiBase

    /// Country dial prefix from visitor IP (same as Android `phoneHint()`).
    func phoneHint() async throws -> PhoneHint {
        try await get("/api/auth/phone-hint", token: nil)
    }

    func startOtp(phone: String, displayName: String) async throws {
        struct Body: Encodable {
            let phone: String
            let displayName: String
        }
        let normalized = PhoneInput.normalizeE164(phone)
        let _: Empty = try await post(
            "/api/auth/otp/start",
            body: Body(phone: normalized, displayName: displayName),
            token: nil,
        )
    }

    func verifyOtp(phone: String, code: String) async throws -> AuthSession {
        struct Body: Encodable {
            let phone: String
            let code: String
        }
        let normalized = PhoneInput.normalizeE164(phone)
        return try await post(
            "/api/auth/otp/verify",
            body: Body(phone: normalized, code: code),
            token: nil,
        )
    }

    func enroll(
        token: String,
        deviceId: String?,
        name: String,
        network: String,
        userId: String?,
        installId: String?,
        publicIp: String?,
        deviceSecret: String?,
    ) async throws -> DeviceEnrollment {
        struct Body: Encodable {
            let deviceId: String?
            let name: String
            let platform: String
            let network: String
            let country: String
            let publicIp: String?
            let deviceSecret: String?
            let userId: String?
            let installId: String?
        }
        return try await post(
            "/api/edge/agent/hello",
            body: Body(
                deviceId: deviceId,
                name: name,
                platform: "ios",
                network: network,
                country: countryCode(from: publicIp),
                publicIp: publicIp,
                deviceSecret: deviceSecret,
                userId: userId,
                installId: installId,
            ),
            token: token,
        )
    }

    /// Ask edge to geo-enrich the device from last public IP (city / ISP / lat-lon).
    func refreshDeviceGeo(token: String, deviceId: String) async {
        var req = URLRequest(url: url("/api/edge/devices/\(deviceId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? deviceId)/geo"))
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = Data("{}".utf8)
        _ = try? await URLSession.shared.data(for: req)
    }

    private func countryCode(from publicIp: String?) -> String {
        // Server geo enrich fills city/country from IP; keep XX until then.
        _ = publicIp
        return "XX"
    }

    func wallet(token: String) async throws -> WalletSnapshot {
        try await get("/api/stripe/wallet", token: token)
    }

    /// PATCH display name / email (server validates name length).
    func updateProfile(token: String, displayName: String) async throws -> AuthUser {
        struct Body: Encodable {
            let displayName: String
        }
        struct Resp: Decodable {
            let user: AuthUser?
        }
        let r: Resp = try await patch(
            "/api/auth/profile",
            body: Body(displayName: displayName),
            token: token,
        )
        guard let user = r.user else { throw ApiError.message("No user in response") }
        return user
    }

    /// Stripe Connect onboarding URL (open in Safari). Returns to app via deep link.
    func stripeConnectOnboard(token: String) async throws -> StripeOnboardResult {
        struct Body: Encodable {
            let origin: String
            let mobile: Bool
        }
        return try await post(
            "/api/stripe/connect/onboard",
            body: Body(origin: AppConfig.apiBase, mobile: true),
            token: token,
        )
    }

    func stripeConnectRefresh(token: String) async throws -> WalletSnapshot {
        struct EmptyBody: Encodable {}
        return try await post(
            "/api/stripe/connect/refresh",
            body: EmptyBody(),
            token: token,
        )
    }

    /// Android-parity funnel events → POST /api/events/batch
    func postEventsBatch(
        installId: String,
        deviceId: String?,
        events: [[String: Any]],
        token: String?,
        appVersion: String?,
        deviceModel: String?,
        osVersion: String?,
    ) async throws {
        var body: [String: Any] = [
            "installId": installId,
            "events": events,
            "platform": "ios",
        ]
        if let deviceId, !deviceId.isEmpty { body["deviceId"] = deviceId }
        if let appVersion { body["appVersion"] = appVersion }
        if let deviceModel { body["deviceModel"] = deviceModel }
        if let osVersion { body["osVersion"] = osVersion }

        let data = try JSONSerialization.data(withJSONObject: body)
        var req = URLRequest(url: url("/api/events/batch"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        req.httpBody = data
        let (_, resp) = try await URLSession.shared.data(for: req)
        let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
        if code < 200 || code >= 300 {
            throw ApiError.http(code, "events batch failed")
        }
    }

    // MARK: - HTTP

    private func get<T: Decodable>(_ path: String, token: String?) async throws -> T {
        var req = URLRequest(url: url(path))
        req.httpMethod = "GET"
        if let token { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        return try await send(req)
    }

    private func post<B: Encodable, T: Decodable>(
        _ path: String,
        body: B,
        token: String?,
    ) async throws -> T {
        var req = URLRequest(url: url(path))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        req.httpBody = try JSONEncoder().encode(body)
        return try await send(req)
    }

    private func patch<B: Encodable, T: Decodable>(
        _ path: String,
        body: B,
        token: String?,
    ) async throws -> T {
        var req = URLRequest(url: url(path))
        req.httpMethod = "PATCH"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        req.httpBody = try JSONEncoder().encode(body)
        return try await send(req)
    }

    private func send<T: Decodable>(_ req: URLRequest) async throws -> T {
        let (data, resp) = try await URLSession.shared.data(for: req)
        let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
        if code < 200 || code >= 300 {
            let text = String(data: data, encoding: .utf8) ?? ""
            if let err = try? JSONDecoder().decode(ErrorBody.self, from: data),
               let msg = err.error
            {
                throw ApiError.message(msg)
            }
            throw ApiError.http(code, text.prefix(200).description)
        }
        if T.self == Empty.self {
            return Empty() as! T
        }
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw ApiError.decode
        }
    }

    private func url(_ path: String) -> URL {
        URL(string: baseURL.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + path)!
    }
}

private struct Empty: Decodable {}
private struct ErrorBody: Decodable {
    let error: String?
}

struct PhoneHint: Decodable {
    let ok: Bool?
    let prefix: String?
    let dialCode: String?
    let countryCode: String?
    let country: String?
    let city: String?
    let source: String?
}

struct AuthSession: Decodable {
    let token: String?
    let sessionToken: String?
    let user: AuthUser?

    var bearer: String? { token ?? sessionToken }
}

struct AuthUser: Decodable {
    let id: String?
    let phone: String?
    let displayName: String?
}

struct DeviceEnrollment: Decodable {
    let deviceId: String
    let deviceSecret: String?
    let tunnelId: String?
    let agentUrl: String?
}

struct WalletSnapshot: Decodable {
    let availableCents: Int?
    let lifetimeEarnCents: Int?
    let payoutsEnabled: Bool?
    let detailsSubmitted: Bool?
    let stripeAccountId: String?
    let minWithdrawCents: Int?
    let canWithdraw: Bool?
}

struct StripeOnboardResult: Decodable {
    let url: String
    let accountId: String?
    let wallet: WalletSnapshot?
}
