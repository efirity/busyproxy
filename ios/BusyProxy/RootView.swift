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
        .id(model.prefs.languageCode)
    }
}

struct MainTabView: View {
    @EnvironmentObject var model: AppModel

    var body: some View {
        TabView {
            HomeView()
                .tabItem { Label(L10n.t("tab_home"), systemImage: "antenna.radiowaves.left.and.right") }
            WalletView()
                .tabItem { Label(L10n.t("tab_wallet"), systemImage: "dollarsign.circle") }
            AccountView()
                .tabItem { Label(L10n.t("tab_account"), systemImage: "person.circle") }
        }
        .task { await model.refreshWallet() }
        .id(model.prefs.languageCode)
    }
}
