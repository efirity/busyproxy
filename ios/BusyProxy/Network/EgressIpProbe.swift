import Foundation

/// Resolve the phone’s public egress IP (same idea as Android `api.ipify.org`).
enum EgressIpProbe {
    static let defaultURL = URL(string: "https://api.ipify.org")!

    /// Best-effort public IP string, or nil on failure.
    static func fetch(url: URL = defaultURL, timeout: TimeInterval = 8) async -> String? {
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.timeoutInterval = timeout
        req.cachePolicy = .reloadIgnoringLocalCacheData
        do {
            let (data, resp) = try await URLSession.shared.data(for: req)
            let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
            guard (200 ..< 300).contains(code),
                  let text = String(data: data, encoding: .utf8)?
                  .trimmingCharacters(in: .whitespacesAndNewlines),
                  !text.isEmpty,
                  text.count < 64,
                  text.contains(".") || text.contains(":")
            else { return nil }
            return text
        } catch {
            return nil
        }
    }
}
