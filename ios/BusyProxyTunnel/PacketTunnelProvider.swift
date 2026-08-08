import Foundation
import NetworkExtension
import os.log

/// Hosts reverse tunnel in a long-lived Network Extension process.
///
/// We do **not** hijack device internet. We only need the NE process to stay
/// alive for outbound WSS + createTCPConnection egress. Empty includedRoutes
/// caused iOS to tear the provider down quickly (agent flaps → admin offline → 0 B).
class PacketTunnelProvider: NEPacketTunnelProvider {
    private let log = OSLog(subsystem: "net.busyproxy.app.ios.tunnel", category: "PacketTunnel")
    private var host: ExtensionRelayHost?

    override func startTunnel(options: [String: NSObject]?, completionHandler: @escaping (Error?) -> Void) {
        os_log("startTunnel", log: log, type: .info)

        let settings = NEPacketTunnelNetworkSettings(tunnelRemoteAddress: "127.0.0.1")

        // Keep a private /24 on the utun so the system treats this as a real tunnel
        // process, without claiming the default route (phone internet stays normal).
        let ipv4 = NEIPv4Settings(addresses: ["10.7.0.2"], subnetMasks: ["255.255.255.0"])
        // Only claim this dummy net — not 0.0.0.0/0. Real apps keep using Wi‑Fi/cell.
        ipv4.includedRoutes = [
            NEIPv4Route(destinationAddress: "10.7.0.0", subnetMask: "255.255.255.0"),
        ]
        // Explicitly do NOT set default route via tunnel.
        ipv4.excludedRoutes = [NEIPv4Route.default()]
        settings.ipv4Settings = ipv4
        settings.mtu = 1400

        // DNS: leave unset so system DNS is unchanged.

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
                let alive = host != nil
                completionHandler?(Data(alive ? "1".utf8 : "0".utf8))
                return
            }
        }
        completionHandler?(nil)
    }

    override func sleep(completionHandler: @escaping () -> Void) {
        // Stay alive — do not tear down the reverse tunnel on device sleep.
        os_log("sleep (keep tunnel)", log: log, type: .info)
        completionHandler()
    }

    override func wake() {
        os_log("wake", log: log, type: .info)
        // If host died while sleeping, restart it.
        if host == nil {
            startHost()
        }
    }
}
