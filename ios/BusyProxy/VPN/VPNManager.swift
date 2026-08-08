import Combine
import Foundation
import NetworkExtension
import UIKit

/// Installs / starts / stops the BusyProxy Packet Tunnel provider.
@MainActor
final class VPNManager: ObservableObject {
    static let shared = VPNManager()

    @Published private(set) var status: NEVPNStatus = .invalid
    @Published private(set) var lastError: String?
    @Published private(set) var usingNetworkExtension = false

    private var manager: NETunnelProviderManager?
    private var statusObs: NSObjectProtocol?

    private init() {
        statusObs = NotificationCenter.default.addObserver(
            forName: .NEVPNStatusDidChange,
            object: nil,
            queue: .main,
        ) { [weak self] note in
            guard let session = note.object as? NEVPNConnection else { return }
            Task { @MainActor in
                self?.status = session.status
            }
        }
    }

    deinit {
        if let statusObs {
            NotificationCenter.default.removeObserver(statusObs)
        }
    }

    var isConnected: Bool {
        status == .connected || status == .connecting || status == .reasserting
    }

    /// Simulator / unsigned builds often cannot load NE — report availability.
    var isExtensionLikelyAvailable: Bool {
        #if targetEnvironment(simulator)
        // Packet tunnel is unreliable on Simulator; allow attempt but expect fallback.
        return false
        #else
        return true
        #endif
    }

    func prepare() async {
        do {
            let managers = try await NETunnelProviderManager.loadAllFromPreferences()
            if let existing = managers.first(where: {
                ($0.protocolConfiguration as? NETunnelProviderProtocol)?.providerBundleIdentifier
                    == SharedConfig.providerBundleId
            }) {
                manager = existing
            } else if let first = managers.first {
                manager = first
            } else {
                let m = NETunnelProviderManager()
                manager = m
            }
            status = manager?.connection.status ?? .invalid
        } catch {
            lastError = error.localizedDescription
        }
    }

    func startSharing(
        sessionToken: String,
        userId: String?,
        deviceId: String?,
        deviceSecret: String?,
        installId: String,
        networkMode: String,
    ) async throws {
        lastError = nil
        // Settings → General → About → Name (e.g. "bm10") for admin device list
        let deviceName = UIDevice.current.name.trimmingCharacters(in: .whitespacesAndNewlines)
        SharedSessionStore.shared.saveCredentials(
            sessionToken: sessionToken,
            userId: userId,
            deviceId: deviceId,
            deviceSecret: deviceSecret,
            installId: installId,
            networkMode: networkMode,
            deviceName: deviceName.isEmpty ? "iPhone" : deviceName,
        )

        #if targetEnvironment(simulator)
        // NE packet tunnel is not dependable on Simulator — signal caller to use in-process relay.
        throw VPNManagerError.simulatorUseInProcess
        #else
        try await ensureManagerInstalled()
        guard let manager else { throw VPNManagerError.notConfigured }

        if manager.connection.status == .connected {
            // VPN process is up but the reverse-tunnel WSS may have died.
            // Push credentials (already saved to App Group) and ask extension to re-bind.
            usingNetworkExtension = true
            if let session = manager.connection as? NETunnelProviderSession {
                try? session.sendProviderMessage(Data("restart".utf8)) { _ in }
            }
            status = manager.connection.status
            return
        }
        if manager.connection.status == .connecting {
            usingNetworkExtension = true
            status = manager.connection.status
            return
        }

        do {
            try manager.connection.startVPNTunnel(options: [
                "source": "BusyProxy" as NSString,
            ])
            usingNetworkExtension = true
            status = manager.connection.status
        } catch {
            lastError = error.localizedDescription
            usingNetworkExtension = false
            throw error
        }
        #endif
    }

    func stopSharing() async {
        SharedSessionStore.shared.clearSharing()
        if let manager, manager.connection.status != .disconnected {
            manager.connection.stopVPNTunnel()
        }
        usingNetworkExtension = false
        status = manager?.connection.status ?? .disconnected
    }

    private func ensureManagerInstalled() async throws {
        await prepare()
        let m = manager ?? NETunnelProviderManager()
        manager = m

        let proto = NETunnelProviderProtocol()
        proto.providerBundleIdentifier = SharedConfig.providerBundleId
        proto.serverAddress = "BusyProxy"
        proto.disconnectOnSleep = false

        m.protocolConfiguration = proto
        m.localizedDescription = "BusyProxy Sharing"
        m.isEnabled = true

        try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
            m.saveToPreferences { error in
                if let error {
                    cont.resume(throwing: error)
                } else {
                    m.loadFromPreferences { err in
                        if let err {
                            cont.resume(throwing: err)
                        } else {
                            cont.resume()
                        }
                    }
                }
            }
        }
    }
}

enum VPNManagerError: LocalizedError {
    case notConfigured
    case simulatorUseInProcess

    var errorDescription: String? {
        switch self {
        case .notConfigured: return "VPN profile not configured"
        case .simulatorUseInProcess: return "Simulator uses in-app tunnel (Network Extension needs a device)"
        }
    }
}
