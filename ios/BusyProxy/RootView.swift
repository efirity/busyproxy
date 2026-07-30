import SwiftUI

struct RootView: View {
    @EnvironmentObject var model: AppModel

    var body: some View {
        Group {
            if !model.prefs.consentAccepted {
                ConsentView()
            } else if !model.isSignedIn {
                LoginView()
            } else {
                MainTabView()
            }
        }
        .tint(Color(red: 0.23, green: 0.51, blue: 0.96))
    }
}

struct MainTabView: View {
    @EnvironmentObject var model: AppModel

    var body: some View {
        TabView {
            HomeView()
                .tabItem { Label("Home", systemImage: "antenna.radiowaves.left.and.right") }
            WalletView()
                .tabItem { Label("Wallet", systemImage: "dollarsign.circle") }
            AccountView()
                .tabItem { Label("Account", systemImage: "person.circle") }
        }
        .task { await model.refreshWallet() }
    }
}
