import SwiftUI

struct HomeView: View {
    @EnvironmentObject var model: AppModel
    /// Observe relay here only — do not forward relay publishes to AppModel (that reset TabView).
    @ObservedObject var relay: RelayEngine

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    statusCard
                    networkPicker
                    shareButton
                    sessionStats
                    if !model.neStatusNote.isEmpty {
                        Text(model.neStatusNote)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Text(L10n.t("phase2_note"))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }
                .padding(20)
            }
            .background(Color.black.ignoresSafeArea())
            .navigationTitle(L10n.t("app_name"))
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
                Text(L10n.t("exit_ip", ip as CVarArg))
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
            Text(L10n.t("network"))
                .font(.subheadline.weight(.semibold))
            Picker(L10n.t("network"), selection: Binding(
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
            Task {
                if relay.isSharingActive || model.usingPacketTunnel || model.vpn.isConnected {
                    await model.stopSharing()
                } else {
                    await model.startSharing()
                }
            }
        } label: {
            let sharing = relay.isSharingActive || model.usingPacketTunnel || model.vpn.isConnected
            Text(sharing ? L10n.t("stop_sharing") : L10n.t("start_sharing"))
                .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .tint(
            (relay.isSharingActive || model.usingPacketTunnel || model.vpn.isConnected)
                ? .red
                : Color(red: 0.23, green: 0.51, blue: 0.96),
        )
        .controlSize(.large)
    }

    private var sessionStats: some View {
        HStack {
            stat(title: L10n.t("stat_up"), value: formatBytes(relay.bytesUp))
            stat(title: L10n.t("stat_down"), value: formatBytes(relay.bytesDown))
            stat(title: L10n.t("stat_streams"), value: "\(relay.activeStreams)")
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
