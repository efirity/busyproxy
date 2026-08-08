import SwiftUI

struct AccountView: View {
    @EnvironmentObject var model: AppModel

    var body: some View {
        NavigationStack {
            List {
                Section(L10n.t("signed_in")) {
                    Text(model.prefs.displayName ?? L10n.t("earner"))
                    Text(model.prefs.phone ?? "—")
                        .font(.body.monospaced())
                        .foregroundStyle(.secondary)
                }
                Section {
                    Picker(L10n.t("language"), selection: Binding(
                        get: {
                            AppLanguage(rawValue: model.prefs.languageCode) ?? .en
                        },
                        set: { lang in
                            model.setLanguage(lang)
                        },
                    )) {
                        ForEach(AppLanguage.allCases) { lang in
                            Text(lang.menuTitle).tag(lang)
                        }
                    }
                    .pickerStyle(.menu)
                } header: {
                    Text(L10n.t("language"))
                } footer: {
                    Text(L10n.t("language_footer"))
                }
                Section(L10n.t("legal")) {
                    Link(L10n.t("privacy"), destination: AppConfig.privacyURL)
                    Link(L10n.t("terms"), destination: AppConfig.termsURL)
                    Link(
                        L10n.t("support"),
                        destination: URL(string: "mailto:\(AppConfig.supportEmail)")!,
                    )
                }
                Section {
                    Button(L10n.t("log_out"), role: .destructive) {
                        model.logout()
                    }
                }
                Section(L10n.t("about")) {
                    Text(L10n.t("about_phase1"))
                    Text(L10n.t("install_id", String(model.prefs.installId.prefix(16)) as CVarArg))
                        .font(.caption.monospaced())
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle(L10n.t("tab_account"))
        }
        .id(model.prefs.languageCode)
    }
}
