import SwiftUI

@main
struct BusyProxyApp: App {
    @StateObject private var model = AppModel()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(model)
                .preferredColorScheme(.dark)
                .onOpenURL { url in
                    Task { await model.handleStripeDeepLink(url) }
                }
                .onChange(of: scenePhase) { _, phase in
                    switch phase {
                    case .active:
                        model.onAppForeground()
                    case .background:
                        model.onAppBackground()
                    default:
                        break
                    }
                }
        }
    }
}
