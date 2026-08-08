import Foundation
import NetworkExtension
import os.log

/// Hosts reverse tunnel in a long-lived Network Extension process.
/// Minimal utun (no default-route hijack) so the phone keeps normal internet
/// while this process stays alive for outbound WSS + createTCPConnection.
class PacketTunnelProvider: NEPacketTunnelProvider {
    private let log = OSLog(subsystem: "net.busyproxy.app.ios.tunnel", category: "PacketTunnel")
    private var host: ExtensionRelayHost?

    override func startTunnel(options: [String: NSObject]?, completionHandler: @escaping (Error?) -> Void) {
        os_log("startTunnel", log: log, type: .info)

        let settings = NEPacketTunnelNetworkSettings(tunnelRemoteAddress: "127.0.0.1")
        let ipv4 = NEIPv4Settings(addresses: ["10.7.0.2"], subnetMasks: ["255.255.255.255"])
        // Claim only our own tunnel address — do not pull real internet into utun.
        // (Earlier empty includedRoutes + exclude-default caused flaky provider lifetime;
        // a single /32 host route is enough for the system to keep the process.)
        ipv4.includedRoutes = [
            NEIPv4Route(destinationAddress: "10.7.0.2", subnetMask: "255.255.255.255"),
        ]
        settings.ipv4Settings = ipv4
        settings.mtu = 1400

        setTunnelNetworkSettings(settings) { [weak self] error in
            if let error {
                os_log(
                    "setTunnelNetworkSettings error: %{public}@",
                    log: self?.log ?? .default,
                    type: .error,
                    error.localizedDescription,
                )
                completionHandler(error)
                return
            }
            self?.startHost()
            completionHandler(nil)
        }
    }

    private func startHost() {
        host?.stop()
        let host = ExtensionRelayHost()
        host.packetTunnelProvider = self
        self.host = host
        host.onBecameReady = { [weak self] in
            os_log("relay ready", log: self?.log ?? .default, type: .info)
        }
        host.onFailed = { [weak self] err in
            os_log(
                "relay failed: %{public}@",
                log: self?.log ?? .default,
                type: .error,
                err.localizedDescription,
            )
        }
        host.start()
        os_log("relay host started", log: log, type: .info)
    }

    override func stopTunnel(with reason: NEProviderStopReason, completionHandler: @escaping () -> Void) {
        os_log("stopTunnel reason=%{public}d", log: log, type: .info, reason.rawValue)
        host?.stop()
        host = nil
        completionHandler()
    }

    override func handleAppMessage(_ messageData: Data, completionHandler: ((Data?) -> Void)?) {
        if let s = String(data: messageData, encoding: .utf8) {
            if s == "stop" {
                host?.stop()
            } else if s == "restart" {
                os_log("restart relay host (app requested)", log: log, type: .info)
                startHost()
            } else if s == "ping" {
                completionHandler?(Data((host != nil ? "1" : "0").utf8))
                return
            }
        }
        completionHandler?(nil)
    }

    override func sleep(completionHandler: @escaping () -> Void) {
        completionHandler()
    }

    override func wake() {
        if host == nil {
            startHost()
        }
    }
}
