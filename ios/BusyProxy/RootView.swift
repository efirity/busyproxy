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
        .environment(\.locale, Locale(identifier: model.prefs.languageCode))
        // Language id only on outer shell — do NOT put .id on TabView (remounts → jumps to Home).
        .id(model.prefs.languageCode)
    }
}

private enum MainTab: Hashable {
    case home, wallet, account
}

struct MainTabView: View {
    @EnvironmentObject var model: AppModel
    /// Explicit selection so parent re-renders (wallet refresh, etc.) never reset the tab.
    @State private var tab: MainTab = .home

    var body: some View {
        TabView(selection: $tab) {
            HomeView(relay: model.relay)
                .tabItem { Label(L10n.t("tab_home"), systemImage: "antenna.radiowaves.left.and.right") }
                .tag(MainTab.home)
            WalletView()
                .tabItem { Label(L10n.t("tab_wallet"), systemImage: "dollarsign.circle") }
                .tag(MainTab.wallet)
            AccountView()
                .tabItem { Label(L10n.t("tab_account"), systemImage: "person.circle") }
                .tag(MainTab.account)
        }
        .task { await model.refreshWallet() }
    }
}
