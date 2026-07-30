import Foundation

/// Shared phone ↔ edge frame protocol (same as Android TunnelProtocol).
enum TunnelProtocol {
    static func hello(
        deviceId: String,
        deviceSecret: String,
        network: String,
        generation: Int64,
        userId: String?,
        country: String?,
    ) -> String {
        var o: [String: Any] = [
            "type": "hello",
            "deviceId": deviceId,
            "deviceSecret": deviceSecret,
            "network": network,
            "generation": generation,
            "platform": "ios",
        ]
        if let userId { o["userId"] = userId }
        if let country { o["country"] = country }
        return json(o)
    }

    static func openOk(streamId: String) -> String {
        json(["type": "open_ok", "streamId": streamId])
    }

    static func openErr(streamId: String, code: String) -> String {
        json(["type": "open_err", "streamId": streamId, "code": code])
    }

    static func close(streamId: String, reason: String = "local") -> String {
        json(["type": "close", "streamId": streamId, "reason": reason])
    }

    static func data(streamId: String, b64: String) -> String {
        json(["type": "data", "streamId": streamId, "b64": b64])
    }

    static func stats(bytesUp: Int64, bytesDown: Int64, streams: Int, egressIp: String?) -> String {
        var o: [String: Any] = [
            "type": "stats",
            "bytesUp": bytesUp,
            "bytesDown": bytesDown,
            "streams": streams,
        ]
        if let egressIp { o["egressIp"] = egressIp }
        return json(o)
    }

    static func pong(t: Int64) -> String {
        json(["type": "pong", "t": t])
    }

    private static func json(_ obj: [String: Any]) -> String {
        guard let data = try? JSONSerialization.data(withJSONObject: obj),
              let s = String(data: data, encoding: .utf8)
        else { return "{}" }
        return s
    }

    static func parse(_ text: String) -> [String: Any]? {
        guard let data = text.data(using: .utf8),
              let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return nil }
        return obj
    }
}
