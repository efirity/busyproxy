import ActivityKit
import Foundation
import UserNotifications

/// Lock-screen presence while sharing:
/// 1) **Live Activity** (banner on Lock Screen / Dynamic Island) when ActivityKit is available
/// 2) **Updating local notification** (notification list / banners) — Android sticky-notif parity
@MainActor
final class SharingStatusPresenter {
    static let shared = SharingStatusPresenter()

    private let notifId = "net.busyproxy.app.ios.sharing"
    private let channelId = "sharing"
    private var activity: Activity<SharingActivityAttributes>?
    private var lastPush: Date = .distantPast
    private var permissionAsked = false

    private init() {}

    func prepare() async {
        guard !permissionAsked else { return }
        permissionAsked = true
        let center = UNUserNotificationCenter.current()
        _ = try? await center.requestAuthorization(options: [.alert, .sound, .badge])
    }

    func start(
        statusText: String,
        bytesUp: Int64,
        bytesDown: Int64,
        streams: Int,
        egressIp: String?,
        networkLabel: String,
    ) async {
        await prepare()
        let state = SharingActivityAttributes.ContentState(
            statusText: statusText,
            bytesUp: bytesUp,
            bytesDown: bytesDown,
            streams: streams,
            egressIp: egressIp,
            networkLabel: networkLabel,
        )
        await startLiveActivity(state: state)
        await pushNotification(state: state, force: true)
    }

    func update(
        statusText: String,
        bytesUp: Int64,
        bytesDown: Int64,
        streams: Int,
        egressIp: String?,
        networkLabel: String,
    ) async {
        let state = SharingActivityAttributes.ContentState(
            statusText: statusText,
            bytesUp: bytesUp,
            bytesDown: bytesDown,
            streams: streams,
            egressIp: egressIp,
            networkLabel: networkLabel,
        )
        // Throttle UI pushes (Live Activity + notif) to ~2/s max
        let now = Date()
        let force = now.timeIntervalSince(lastPush) >= 1.5
        if force {
            lastPush = now
            await updateLiveActivity(state: state)
            await pushNotification(state: state, force: false)
        }
    }

    func end() async {
        if let activity {
            let final = SharingActivityAttributes.ContentState(
                statusText: "Sharing off",
                bytesUp: activity.content.state.bytesUp,
                bytesDown: activity.content.state.bytesDown,
                streams: 0,
                egressIp: activity.content.state.egressIp,
                networkLabel: activity.content.state.networkLabel,
            )
            await activity.end(
                ActivityContent(state: final, staleDate: nil),
                dismissalPolicy: .immediate,
            )
            self.activity = nil
        }
        // End any orphaned activities
        for a in Activity<SharingActivityAttributes>.activities {
            await a.end(nil, dismissalPolicy: .immediate)
        }
        UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: [notifId])
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [notifId])
    }

    // MARK: Live Activity

    private func startLiveActivity(state: SharingActivityAttributes.ContentState) async {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        // Replace existing
        for a in Activity<SharingActivityAttributes>.activities {
            await a.end(nil, dismissalPolicy: .immediate)
        }
        let attrs = SharingActivityAttributes(startedAt: Date())
        let content = ActivityContent(state: state, staleDate: nil)
        do {
            activity = try Activity.request(
                attributes: attrs,
                content: content,
                pushType: nil,
            )
        } catch {
            // Live Activity may fail if widget extension missing / user disabled — notif still works
            activity = nil
        }
    }

    private func updateLiveActivity(state: SharingActivityAttributes.ContentState) async {
        let content = ActivityContent(state: state, staleDate: Date().addingTimeInterval(60))
        if let activity {
            await activity.update(content)
        } else if ActivityAuthorizationInfo().areActivitiesEnabled {
            await startLiveActivity(state: state)
        }
    }

    // MARK: Notification (shows on Lock Screen notification list)

    private func pushNotification(state: SharingActivityAttributes.ContentState, force: Bool) async {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        guard settings.authorizationStatus == .authorized
            || settings.authorizationStatus == .provisional
        else { return }

        let content = UNMutableNotificationContent()
        content.title = "BusyProxy · \(state.statusText)"
        var body = "↑ \(state.upFormatted)  ↓ \(state.downFormatted)"
        if state.streams > 0 {
            body += "  ·  \(state.streams) streams"
        }
        if let ip = state.egressIp, !ip.isEmpty {
            body += "\nExit \(ip)"
        }
        content.body = body
        content.sound = nil
        content.interruptionLevel = .passive
        // Same id → replace (sticky-style ongoing update)
        content.threadIdentifier = channelId
        content.categoryIdentifier = channelId

        let req = UNNotificationRequest(identifier: notifId, content: content, trigger: nil)
        try? await center.add(req)
    }
}
