import Foundation
import NetworkExtension
import os.log

/// Phase 2: hosts reverse tunnel in a long-lived Network Extension process.
/// Uses a minimal tunnel interface (no full-device VPN routing) so the process
/// stays eligible for background while BusyProxy only egresses stream sockets.
class PacketTunnelProvider: NEPacketTunnelProvider {
    private let log = OSLog(subsystem: "net.busyproxy.app.ios.tunnel", category: "PacketTunnel")
    private var host: ExtensionRelayHost?

    override func startTunnel(options: [String: NSObject]?, completionHandler: @escaping (Error?) -> Void) {
        os_log("startTunnel", log: log, type: .info)

        let settings = NEPacketTunnelNetworkSettings(tunnelRemoteAddress: "127.0.0.1")
        // Intentionally do NOT set IPv4 default route — we only need the NE process alive.
        // A small excluded-only / link-local style settings keeps system happy without hijacking traffic.
        let ipv4 = NEIPv4Settings(addresses: ["10.7.0.2"], subnetMasks: ["255.255.255.0"])
        ipv4.includedRoutes = [] // no hijack of device internet
        ipv4.excludedRoutes = [NEIPv4Route.default()]
        settings.ipv4Settings = ipv4
        settings.mtu = 1400

        setTunnelNetworkSettings(settings) { [weak self] error in
            if let error {
                os_log("setTunnelNetworkSettings error: %{public}@", log: self?.log ?? .default, type: .error, error.localizedDescription)
                completionHandler(error)
                return
            }
            let host = ExtensionRelayHost()
            // Bind dialer to this provider so TCP egress uses the physical interface
            // (NWConnection alone would try the empty tunnel utun and all streams fail).
            host.packetTunnelProvider = self
            self?.host = host
            host.onBecameReady = {
                os_log("relay ready", log: self?.log ?? .default, type: .info)
            }
            host.onFailed = { err in
                os_log("relay failed: %{public}@", log: self?.log ?? .default, type: .error, err.localizedDescription)
            }
            host.start()
            completionHandler(nil)
        }
    }

    override func stopTunnel(with reason: NEProviderStopReason, completionHandler: @escaping () -> Void) {
        os_log("stopTunnel reason=%{public}d", log: log, type: .info, reason.rawValue)
        host?.stop()
        host = nil
        completionHandler()
    }

    override func handleAppMessage(_ messageData: Data, completionHandler: ((Data?) -> Void)?) {
        // Optional control plane from app
        if let s = String(data: messageData, encoding: .utf8), s == "stop" {
            host?.stop()
        }
        completionHandler?(nil)
    }

    override func sleep(completionHandler: @escaping () -> Void) {
        completionHandler()
    }

    override func wake() {}
}
