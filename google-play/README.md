# Google Play — BusyProxy submission package

This folder is the **single source of truth** for Play Console store listing,
policy answers, reviewer access, and remaining engineering work before publish.

**Full project docs:** [docs/README.md](../docs/README.md) · **Security:** [docs/SECURITY.md](../docs/SECURITY.md) · **Accounts/deletion:** [docs/AUTH_AND_ACCOUNTS.md](../docs/AUTH_AND_ACCOUNTS.md) · **Fastlane upload:** [docs/PLAY_FASTLANE.md](../docs/PLAY_FASTLANE.md)

## Start here (first release)

| Doc | Purpose |
|-----|---------|
| **[CONSOLE_FORM_ANSWERS.md](./CONSOLE_FORM_ANSWERS.md)** | **Copy/paste answers for every Play Console form** still open after Fastlane (privacy, app access, Data safety, content rating, audience, FGS, ads, news, …) |
| **[MANUAL_REVIEW_AND_SUBMIT.md](./MANUAL_REVIEW_AND_SUBMIT.md)** | What’s already on Play via Fastlane + human review/rollout checklist |
| [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) | Full step-by-step before / during upload |

## Reference docs (detail)

| Doc | Purpose |
|-----|---------|
| [STORE_LISTING.md](./STORE_LISTING.md) | Title, short/full description, category, tags, contact |
| [DATA_SAFETY.md](./DATA_SAFETY.md) | Play Data safety form answers (detail; summarized in CONSOLE_FORM_ANSWERS) |
| [APP_CONTENT_DECLARATIONS.md](./APP_CONTENT_DECLARATIONS.md) | Ads, target audience, FGS, news, etc. |
| [APP_ACCESS_REVIEWERS.md](./APP_ACCESS_REVIEWERS.md) | **Two** demo accounts (phone + fixed OTP, no SMS) for App access |
| [ASSETS_CHECKLIST.md](./ASSETS_CHECKLIST.md) | Icons, screenshots, feature graphic sizes |
| [PRIVACY_AND_LEGAL.md](./PRIVACY_AND_LEGAL.md) | Public URLs for Terms / Privacy / Delete account |
| [GUIDELINES_AND_GAPS.md](./GUIDELINES_AND_GAPS.md) | Policy review + **what is still needed** |
| [assets/](./assets/) | Exported graphics (icon, feature graphic, phone screenshots) |

**Live legal URLs (required by Play):**

- Privacy: https://busyproxy.net/privacy  
- Terms: https://busyproxy.net/terms  
- Account deletion (web): https://busyproxy.net/account-deletion  
- Support: support@busyproxy.net  

**Package id:** `net.busyproxy.app` (release) · debug uses `.debug` suffix  
**Min / target SDK:** 26 / 35  
**Current versionName:** `1.0.0` · versionCode `1` (bump `versionCode` before every new AAB upload)
