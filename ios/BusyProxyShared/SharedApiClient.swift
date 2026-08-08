import Foundation

public struct SharedEnrollResult: Sendable {
    public let deviceId: String
    public let deviceSecret: String?
    public let agentUrl: String?
}

public enum SharedApiError: Error, LocalizedError {
    case http(Int, String)
    case decode

    public var errorDescription: String? {
        switch self {
        case let .http(code, msg): return "HTTP \(code): \(msg)"
        case .decode: return "Bad response"
        }
    }
}

public final class SharedApiClient: @unchecked Sendable {
    private let base: String
    private let session: URLSession

    public init(base: String = SharedConfig.apiBase) {
        self.base = base
        let cfg = URLSessionConfiguration.ephemeral
        cfg.timeoutIntervalForRequest = 30
        session = URLSession(configuration: cfg)
    }

    public func enroll(
        token: String,
        deviceId: String?,
        name: String,
        network: String,
        userId: String?,
        installId: String?,
        publicIp: String?,
        deviceSecret: String?,
    ) async throws -> SharedEnrollResult {
        var body: [String: Any] = [
            "name": name,
            "platform": "ios",
            "network": network == "wifi" ? "wifi" : "cellular",
            "country": "XX",
        ]
        if let deviceId { body["deviceId"] = deviceId }
        if let userId { body["userId"] = userId }
        if let installId { body["installId"] = installId }
        if let publicIp {
            body["publicIp"] = publicIp
        }
        if let deviceSecret { body["deviceSecret"] = deviceSecret }

        let data = try JSONSerialization.data(withJSONObject: body)
        var req = URLRequest(url: URL(string: "\(base)/api/edge/agent/hello")!)
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = data

        let (respData, resp) = try await session.data(for: req)
        let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
        guard (200 ..< 300).contains(code) else {
            let msg = String(data: respData, encoding: .utf8) ?? ""
            throw SharedApiError.http(code, msg)
        }
        guard let obj = try JSONSerialization.jsonObject(with: respData) as? [String: Any],
              let did = obj["deviceId"] as? String
        else { throw SharedApiError.decode }
        return SharedEnrollResult(
            deviceId: did,
            deviceSecret: obj["deviceSecret"] as? String,
            agentUrl: obj["agentUrl"] as? String,
        )
    }
}
