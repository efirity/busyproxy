import Foundation

public enum SharedEgressIpProbe {
    public static func fetch(timeout: TimeInterval = 8) async -> String? {
        guard let url = URL(string: "https://api.ipify.org") else { return nil }
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
                  text.count < 64
            else { return nil }
            return text
        } catch {
            return nil
        }
    }
}
