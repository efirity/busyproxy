import Foundation
import UIKit

/// Android-parity funnel analytics → POST /api/events/batch
/// Journey: install → open → consent → login → OTP → home → share → online
@MainActor
final class EventLogger {
    static let shared = EventLogger()

    private let api = ApiClient()
    private var queue: [[String: Any]] = []
    private var flushTask: Task<Void, Never>?
    private var fullyFunctionalLogged = false
    private weak var prefs: Prefs?

    private init() {}

    func attach(prefs: Prefs) {
        self.prefs = prefs
        // First launch once per install
        if !prefs.firstOpenLogged {
            log("app_installed", message: "App installed / first launch", journeyStep: 1)
            log("app_first_open", message: "First launch after install", journeyStep: 1)
            prefs.firstOpenLogged = true
        }
        log("app_open", message: "App process started", journeyStep: 2)
        startPeriodicFlush()
        flushSoon()
    }

    func log(
        _ type: String,
        message: String? = nil,
        props: [String: Any] = [:],
        journeyStep: Int? = nil,
    ) {
        var p = props
        if let journeyStep {
            p["journey_step"] = journeyStep
        }
        var event: [String: Any] = [
            "type": type,
            "at": Int(Date().timeIntervalSince1970 * 1000),
        ]
        if let message, !message.isEmpty {
            event["message"] = message
        }
        if !p.isEmpty {
            event["props"] = p
        }
        queue.append(event)
        if type == "fully_functional" || type == "tunnel_online" {
            markFullyFunctional(detail: message)
        }
        if queue.count >= 8 {
            flushSoon()
        }
    }

    func markFullyFunctional(detail: String?) {
        guard !fullyFunctionalLogged else { return }
        guard prefs?.sessionToken != nil else { return }
        fullyFunctionalLogged = true
        var p: [String: Any] = ["journey_step": 9]
        if let detail, !detail.isEmpty { p["egressIp"] = detail }
        if queue.last?["type"] as? String != "fully_functional" {
            queue.append([
                "type": "fully_functional",
                "at": Int(Date().timeIntervalSince1970 * 1000),
                "message": "User completed funnel: signed in + sharing online",
                "props": p,
            ])
        }
        flushSoon()
    }

    func onForeground() {
        log("app_foreground", journeyStep: 2)
        flushSoon()
    }

    func onBackground() {
        log("app_background", journeyStep: 2)
        flushSoon()
    }

    func flushSoon() {
        Task { await flush() }
    }

    private func startPeriodicFlush() {
        flushTask?.cancel()
        flushTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 6_000_000_000)
                await self?.flush()
            }
        }
    }

    private func flush() async {
        guard let prefs else { return }
        guard !queue.isEmpty else { return }
        let batch = queue
        queue.removeAll(keepingCapacity: true)
        do {
            try await api.postEventsBatch(
                installId: prefs.installId,
                deviceId: prefs.deviceId,
                events: batch,
                token: prefs.sessionToken,
                appVersion: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String
                    ?? "1.0.0",
                deviceModel: UIDevice.current.model,
                osVersion: "iOS \(UIDevice.current.systemVersion)",
            )
        } catch {
            // Re-queue limited so we don't drop the funnel permanently
            if queue.count < 80 {
                queue.insert(contentsOf: batch.prefix(40), at: 0)
            }
            #if DEBUG
            print("[BpEvents] flush failed: \(error.localizedDescription)")
            #endif
        }
    }
}
