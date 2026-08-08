# App Store / TestFlight — BusyProxy iOS submission package

This folder is the **single source of truth** for App Store Connect, TestFlight,
signing IDs, store listing, privacy answers, and remaining work before iOS ship.

Mirror of [`google-play/`](../google-play/) for Apple.

**Code:** [`ios/`](../ios/) · **Architecture:** [`docs/IOS_APP.md`](../docs/IOS_APP.md) ·  
**Fastlane lanes:** [`ios/fastlane/Fastfile`](../ios/fastlane/Fastfile) · **Secrets:** [`ios/SECRETS.md`](../ios/SECRETS.md)

---

## Start here

| Doc | Purpose |
|-----|---------|
| **[TESTFLIGHT.md](./TESTFLIGHT.md)** | Internal testing + current build status |
| **[METADATA_STATUS.md](./METADATA_STATUS.md)** | **What Fastlane filled vs still open in ASC** |
| **[STORE_LISTING.md](./STORE_LISTING.md)** | Listing copy + Fastlane metadata map |
| **[ASC_SETUP.md](./ASC_SETUP.md)** | Bundle IDs, capabilities, API key, create app (one-time) |

### Fastlane lanes (on build Mac)

```bash
cd ios && source ~/.config/appstoreconnect/env
fastlane store_metadata   # listing text, URLs, categories (no binary)
fastlane beta             # archive + TestFlight upload
```

Metadata files: `ios/fastlane/metadata/`

## Reference

| Doc | Purpose |
|-----|---------|
| [STORE_LISTING.md](./STORE_LISTING.md) | Name, subtitle, description, category, keywords |
| [APP_PRIVACY.md](./APP_PRIVACY.md) | App Privacy (“nutrition labels”) answers |
| [APP_ACCESS_REVIEWERS.md](./APP_ACCESS_REVIEWERS.md) | Demo phone + fixed OTP for App Review / TestFlight notes |
| [APP_REVIEW_INFO.md](./APP_REVIEW_INFO.md) | Reviewer steps, VPN / Network Extension narrative |
| [ASSETS_CHECKLIST.md](./ASSETS_CHECKLIST.md) | Icon + screenshot sizes |
| [PRIVACY_AND_LEGAL.md](./PRIVACY_AND_LEGAL.md) | Public legal URLs |
| [GUIDELINES_AND_GAPS.md](./GUIDELINES_AND_GAPS.md) | Policy risks + **what is still blocked** |
| [assets/](./assets/) | Exported graphics / screenshots |
| [releases/](./releases/) | Optional archived IPAs (gitignored binaries except README) |

---

## Live identifiers (source of truth)

| Item | Value |
|------|--------|
| **App display name** | BusyProxy |
| **Main bundle ID** | `net.busyproxy.app.ios` |
| **Tunnel extension ID** | `net.busyproxy.app.ios.tunnel` |
| **App Group** | `group.net.busyproxy.app.ios` |
| **Team ID** | `RA9PQ9434F` (SERGIU TODERASCU, AI) |
| **Marketing version** | `1.0.0` (`MARKETING_VERSION`) |
| **Build number** | `1` (`CURRENT_PROJECT_VERSION`) — bump every TestFlight upload |
| **SKU (suggested)** | `busyproxy-ios` |
| **Primary locale** | `en-US` |

### Developer Portal (Identifiers) — already created

| Bundle ID | Portal ID | Capabilities (as of last check) |
|-----------|-----------|----------------------------------|
| `net.busyproxy.app.ios` | `P33PZD74K2` | App Groups, Network Extensions, In-App Purchase |
| `net.busyproxy.app.ios.tunnel` | `S5QXR97CJP` | App Groups, Network Extensions, In-App Purchase |

### App Store Connect app record

| Status | Notes |
|--------|--------|
| **Not created yet** | API key can list/update apps but **cannot CREATE** (`apps` → GET/UPDATE only). Create once in [App Store Connect → My Apps → +](https://appstoreconnect.apple.com/apps) **or** raise the API key role to **Admin** and re-run register (see [ASC_SETUP.md](./ASC_SETUP.md)). |

---

## Legal URLs (same as Android)

- Privacy: https://busyproxy.net/privacy  
- Terms: https://busyproxy.net/terms  
- Account deletion: https://busyproxy.net/account-deletion  
- Support: support@busyproxy.net  

---

## How this relates to `google-play/`

| Concern | Android | iOS |
|---------|---------|-----|
| Store console | Play Console | App Store Connect |
| Package id | `net.busyproxy.app` | `net.busyproxy.app.ios` |
| Binary | AAB | IPA (App Store export) |
| Private testing | Internal / closed track | **TestFlight internal** (ASC users) |
| Background | FGS `specialUse` | Packet Tunnel Network Extension |
| Reviewer login | Phone + fixed OTP | **Same** demo accounts |
| Build host | any CI with JDK | **macOS + Xcode** (`mm_ser`) |
| Secrets | `android/secrets/` | `ios/secrets/` + `~/.config/appstoreconnect/` on build Mac |
