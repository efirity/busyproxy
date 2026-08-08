import ActivityKit
import Foundation

/// Lock-screen / Dynamic Island live status while sharing (Android FGS notification parity).
public struct SharingActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var statusText: String
        public var bytesUp: Int64
        public var bytesDown: Int64
        public var streams: Int
        public var egressIp: String?
        public var networkLabel: String

        public init(
            statusText: String,
            bytesUp: Int64,
            bytesDown: Int64,
            streams: Int,
            egressIp: String?,
            networkLabel: String,
        ) {
            self.statusText = statusText
            self.bytesUp = bytesUp
            self.bytesDown = bytesDown
            self.streams = streams
            self.egressIp = egressIp
            self.networkLabel = networkLabel
        }

        public var totalBytes: Int64 { bytesUp + bytesDown }

        public var totalFormatted: String {
            Self.formatBytes(totalBytes)
        }

        public var upFormatted: String { Self.formatBytes(bytesUp) }
        public var downFormatted: String { Self.formatBytes(bytesDown) }

        public static func formatBytes(_ n: Int64) -> String {
            if n < 1024 { return "\(n) B" }
            let kb = Double(n) / 1024
            if kb < 1024 { return String(format: "%.1f KB", kb) }
            let mb = kb / 1024
            if mb < 1024 { return String(format: "%.2f MB", mb) }
            return String(format: "%.2f GB", mb / 1024)
        }
    }

    public var startedAt: Date

    public init(startedAt: Date = Date()) {
        self.startedAt = startedAt
    }
}
