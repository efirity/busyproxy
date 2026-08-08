import SwiftUI

@main
struct BusyProxyApp: App {
    @StateObject private var model = AppModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(model)
                .preferredColorScheme(.dark)
                .onOpenURL { url in
                    Task { await model.handleStripeDeepLink(url) }
                }
        }
    }
}
