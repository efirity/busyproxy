import Foundation
import UIKit

/// Credentials + live stats shared between app and Packet Tunnel extension via App Group.
public final class SharedSessionStore {
    public static let shared = SharedSessionStore()

    private let defaults: UserDefaults?

    private enum Key {
        static let sessionToken = "bp.shared.sessionToken"
        static let userId = "bp.shared.userId"
        static let deviceId = "bp.shared.deviceId"
        static let deviceSecret = "bp.shared.deviceSecret"
        static let installId = "bp.shared.installId"
        static let deviceName = "bp.shared.deviceName"
        static let networkMode = "bp.shared.networkMode"
        static let sharingWanted = "bp.shared.sharingWanted"
        static let state = "bp.shared.state"
        static let message = "bp.shared.message"
        static let bytesUp = "bp.shared.bytesUp"
        static let bytesDown = "bp.shared.bytesDown"
        static let streams = "bp.shared.streams"
        static let egressIp = "bp.shared.egressIp"
        static let lastUpdate = "bp.shared.lastUpdate"
    }

    public init(suiteName: String = SharedConfig.appGroupId) {
        defaults = UserDefaults(suiteName: suiteName)
    }

    public var isAvailable: Bool { defaults != nil }

    // MARK: Write from app (before starting VPN)

    public func saveCredentials(
        sessionToken: String,
        userId: String?,
        deviceId: String?,
        deviceSecret: String?,
        installId: String,
        networkMode: String,
        deviceName: String? = nil,
    ) {
        defaults?.set(sessionToken, forKey: Key.sessionToken)
        if let userId { defaults?.set(userId, forKey: Key.userId) }
        // Never wipe a known deviceId/secret with nil — that forced a new fleet
        // row on every Start sharing / TestFlight update.
        if let deviceId, !deviceId.isEmpty {
            defaults?.set(deviceId, forKey: Key.deviceId)
        }
        if let deviceSecret, !deviceSecret.isEmpty {
            defaults?.set(deviceSecret, forKey: Key.deviceSecret)
        }
        defaults?.set(installId, forKey: Key.installId)
        defaults?.set(networkMode, forKey: Key.networkMode)
        if let deviceName, !deviceName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            defaults?.set(deviceName, forKey: Key.deviceName)
        }
        defaults?.set(true, forKey: Key.sharingWanted)
        defaults?.synchronize()
    }

    public func setSharingWanted(_ v: Bool) {
        defaults?.set(v, forKey: Key.sharingWanted)
        defaults?.synchronize()
    }

    public func clearSharing() {
        defaults?.set(false, forKey: Key.sharingWanted)
        defaults?.set("offline", forKey: Key.state)
        defaults?.set("Stopped", forKey: Key.message)
        defaults?.synchronize()
    }

    // MARK: Read by extension

    public var sessionToken: String? { defaults?.string(forKey: Key.sessionToken) }
    public var userId: String? { defaults?.string(forKey: Key.userId) }
    public var deviceId: String? { defaults?.string(forKey: Key.deviceId) }
    public var deviceSecret: String? { defaults?.string(forKey: Key.deviceSecret) }
    public var installId: String? { defaults?.string(forKey: Key.installId) }
    /// iPhone Settings name written by the host app before VPN start.
    public var deviceName: String? { defaults?.string(forKey: Key.deviceName) }
    public var networkMode: String { defaults?.string(forKey: Key.networkMode) ?? "automatic" }
    public var sharingWanted: Bool { defaults?.bool(forKey: Key.sharingWanted) ?? false }

    /// Prefer Settings → General → About → Name (e.g. BMDEV10) for admin device list.
    /// Host app also writes App Group before VPN start; always prefer live UIDevice name.
    public func resolvedDeviceName() -> String {
        let live = UIDevice.current.name.trimmingCharacters(in: .whitespacesAndNewlines)
        if !live.isEmpty, live != "iOS-NE" { return live }
        if let n = deviceName?.trimmingCharacters(in: .whitespacesAndNewlines), !n.isEmpty,
           n != "iOS-NE", n != "iOS NE"
        {
            return n
        }
        return "iPhone"
    }

    public func updateDevice(deviceId: String, deviceSecret: String?) {
        defaults?.set(deviceId, forKey: Key.deviceId)
        if let deviceSecret, !deviceSecret.isEmpty {
            defaults?.set(deviceSecret, forKey: Key.deviceSecret)
        }
        defaults?.synchronize()
    }

    // MARK: Live stats (extension → app)

    public func publishStatus(
        state: String,
        message: String,
        bytesUp: Int64,
        bytesDown: Int64,
        streams: Int,
        egressIp: String?,
    ) {
        defaults?.set(state, forKey: Key.state)
        defaults?.set(message, forKey: Key.message)
        defaults?.set(NSNumber(value: bytesUp), forKey: Key.bytesUp)
        defaults?.set(NSNumber(value: bytesDown), forKey: Key.bytesDown)
        defaults?.set(streams, forKey: Key.streams)
        defaults?.set(egressIp, forKey: Key.egressIp)
        defaults?.set(Date().timeIntervalSince1970, forKey: Key.lastUpdate)
        // App Group notifications for app observers
        CFNotificationCenterPostNotification(
            CFNotificationCenterGetDarwinNotifyCenter(),
            CFNotificationName("net.busyproxy.app.ios.stats" as CFString),
            nil,
            nil,
            true,
        )
    }

    public func readStatus() -> (
        state: String,
        message: String,
        bytesUp: Int64,
        bytesDown: Int64,
        streams: Int,
        egressIp: String?,
        lastUpdate: TimeInterval
    ) {
        (
            defaults?.string(forKey: Key.state) ?? "offline",
            defaults?.string(forKey: Key.message) ?? "",
            (defaults?.object(forKey: Key.bytesUp) as? NSNumber)?.int64Value ?? 0,
            (defaults?.object(forKey: Key.bytesDown) as? NSNumber)?.int64Value ?? 0,
            defaults?.integer(forKey: Key.streams) ?? 0,
            defaults?.string(forKey: Key.egressIp),
            defaults?.double(forKey: Key.lastUpdate) ?? 0
        )
    }
}
