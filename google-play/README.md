# Google Play — BusyProxy submission package

This folder is the **single source of truth** for Play Console store listing,
policy answers, reviewer access, and remaining engineering work before publish.

**Full project docs:** [docs/README.md](../docs/README.md) · **Security:** [docs/SECURITY.md](../docs/SECURITY.md) · **Accounts/deletion:** [docs/AUTH_AND_ACCOUNTS.md](../docs/AUTH_AND_ACCOUNTS.md)

| Doc | Purpose |
|-----|---------|
| [STORE_LISTING.md](./STORE_LISTING.md) | Title, short/full description, category, tags, contact |
| [DATA_SAFETY.md](./DATA_SAFETY.md) | Play Data safety form answers (copy into Console) |
| [APP_CONTENT_DECLARATIONS.md](./APP_CONTENT_DECLARATIONS.md) | Ads, target audience, FGS, news, etc. |
| [APP_ACCESS_REVIEWERS.md](./APP_ACCESS_REVIEWERS.md) | Demo / reviewer login (phone + fixed OTP) |
| [ASSETS_CHECKLIST.md](./ASSETS_CHECKLIST.md) | Icons, screenshots, feature graphic sizes |
| [PRIVACY_AND_LEGAL.md](./PRIVACY_AND_LEGAL.md) | Public URLs for Terms / Privacy / Delete account |
| [GUIDELINES_AND_GAPS.md](./GUIDELINES_AND_GAPS.md) | Policy review + **what is still needed** |
| [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) | Step-by-step before upload |
| [assets/](./assets/) | Place exported graphics here |

**Live legal URLs (required by Play):**

- Privacy: https://busyproxy.net/privacy  
- Terms: https://busyproxy.net/terms  
- Account deletion (web): https://busyproxy.net/account-deletion  
- Support: support@busyproxy.net  

**Package id:** `net.busyproxy.app` (release) · debug uses `.debug` suffix  
**Min / target SDK:** 26 / 35  
**Current versionName:** `0.1.0-beta` · versionCode `1` (bump before production)
