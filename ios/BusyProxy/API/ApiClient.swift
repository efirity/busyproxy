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

    func startOtp(phone: String, displayName: String) async throws {
        struct Body: Encodable {
            let phone: String
            let displayName: String
        }
        let _: Empty = try await post(
            "/api/auth/otp/start",
            body: Body(phone: phone, displayName: displayName),
            token: nil,
        )
    }

    func verifyOtp(phone: String, code: String) async throws -> AuthSession {
        struct Body: Encodable {
            let phone: String
            let code: String
        }
        return try await post(
            "/api/auth/otp/verify",
            body: Body(phone: phone, code: code),
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
                country: "XX",
                publicIp: publicIp,
                deviceSecret: deviceSecret,
                userId: userId,
                installId: installId,
            ),
            token: token,
        )
    }

    func wallet(token: String) async throws -> WalletSnapshot {
        try await get("/api/stripe/wallet", token: token)
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
    let stripeAccountId: String?
    let minWithdrawCents: Int?
}
