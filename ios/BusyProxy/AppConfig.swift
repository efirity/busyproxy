import Foundation

enum AppConfig {
    static let apiBase = "https://busyproxy.net"
    static let agentWss = "wss://busyproxy.net/v1/tunnel"
    static let minWithdrawCents = 2000
    static let privacyURL = URL(string: "https://busyproxy.net/privacy")!
    static let termsURL = URL(string: "https://busyproxy.net/terms")!
    static let supportEmail = "support@busyproxy.net"
}
