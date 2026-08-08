import ActivityKit
import SwiftUI
import WidgetKit

/// Lock Screen + Dynamic Island UI for active sharing (Android FGS notification equivalent).
struct SharingLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SharingActivityAttributes.self) { context in
            // Lock Screen / Banner
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("BusyProxy")
                        .font(.headline)
                        .foregroundStyle(.white)
                    Text(context.state.statusText)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color(red: 0.4, green: 0.75, blue: 1.0))
                    Text("↑ \(context.state.upFormatted)  ·  ↓ \(context.state.downFormatted)")
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.white.opacity(0.85))
                    if let ip = context.state.egressIp, !ip.isEmpty {
                        Text("Exit \(ip)")
                            .font(.caption2.monospaced())
                            .foregroundStyle(.white.opacity(0.55))
                    }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text(context.state.totalFormatted)
                        .font(.title3.monospacedDigit().weight(.bold))
                        .foregroundStyle(.white)
                    Text(context.state.networkLabel)
                        .font(.caption2)
                        .foregroundStyle(.white.opacity(0.6))
                    if context.state.streams > 0 {
                        Text("\(context.state.streams) streams")
                            .font(.caption2)
                            .foregroundStyle(.white.opacity(0.6))
                    }
                }
            }
            .padding(16)
            .activityBackgroundTint(Color(red: 0.07, green: 0.09, blue: 0.14))
            .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text("BusyProxy")
                        .font(.caption.weight(.semibold))
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.totalFormatted)
                        .font(.caption.monospacedDigit().weight(.bold))
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Text("↑ \(context.state.upFormatted)")
                        Text("↓ \(context.state.downFormatted)")
                        if let ip = context.state.egressIp {
                            Text(ip).font(.caption2.monospaced())
                        }
                    }
                    .font(.caption)
                }
            } compactLeading: {
                Image(systemName: "shield.lefthalf.filled")
            } compactTrailing: {
                Text(context.state.totalFormatted)
                    .font(.caption2.monospacedDigit())
            } minimal: {
                Image(systemName: "shield.lefthalf.filled")
            }
        }
    }
}
