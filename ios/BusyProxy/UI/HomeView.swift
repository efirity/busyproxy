import SwiftUI

struct HomeView: View {
    @EnvironmentObject var model: AppModel
    private var relay: RelayEngine { model.relay }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    statusCard
                    networkPicker
                    shareButton
                    sessionStats
                    Text(
                        "Phase 1: keep the app open while sharing. Always-on background needs a Network Extension (see docs/IOS_APP.md).",
                    )
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }
                .padding(20)
            }
            .background(Color.black.ignoresSafeArea())
            .navigationTitle("BusyProxy")
        }
    }

    private var statusCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Circle()
                    .fill(statusColor)
                    .frame(width: 10, height: 10)
                Text(relay.state.rawValue.replacingOccurrences(of: "_", with: " ").uppercased())
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            Text(relay.message)
                .font(.headline)
            if let ip = relay.egressIp {
                Text("Exit IP \(ip)")
                    .font(.caption.monospaced())
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color.white.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var networkPicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Network")
                .font(.subheadline.weight(.semibold))
            Picker("Network", selection: Binding(
                get: { model.prefs.networkMode },
                set: { model.prefs.networkMode = $0 },
            )) {
                ForEach(NetworkMode.allCases) { m in
                    Text(m.title).tag(m)
                }
            }
            .pickerStyle(.segmented)
            .disabled(relay.state == .online || relay.state == .connecting)
        }
    }

    private var shareButton: some View {
        Button {
            if relay.state == .online || relay.state == .connecting || relay.state == .reconnecting
                || relay.state == .preparing
            {
                relay.stop()
            } else {
                relay.start()
            }
        } label: {
            Text(isSharing ? "Stop sharing" : "Start sharing")
                .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .tint(isSharing ? .red : Color(red: 0.23, green: 0.51, blue: 0.96))
        .controlSize(.large)
    }

    private var isSharing: Bool {
        switch relay.state {
        case .online, .connecting, .reconnecting, .preparing, .waitingForNetwork:
            return true
        default:
            return false
        }
    }

    private var sessionStats: some View {
        HStack {
            stat(title: "Up", value: formatBytes(relay.bytesUp))
            stat(title: "Down", value: formatBytes(relay.bytesDown))
            stat(title: "Streams", value: "\(relay.activeStreams)")
        }
    }

    private func stat(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.caption).foregroundStyle(.secondary)
            Text(value).font(.subheadline.monospaced())
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color.white.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var statusColor: Color {
        switch relay.state {
        case .online: return .green
        case .error: return .red
        case .reconnecting, .connecting, .preparing, .waitingForNetwork: return .yellow
        default: return .gray
        }
    }

    private func formatBytes(_ n: Int64) -> String {
        if n < 1024 { return "\(n) B" }
        if n < 1024 * 1024 { return String(format: "%.1f KB", Double(n) / 1024) }
        return String(format: "%.2f MB", Double(n) / 1024 / 1024)
    }
}
