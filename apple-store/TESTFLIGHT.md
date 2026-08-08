# TestFlight — BusyProxy iOS

## Current status (2026-08-08)

| Item | Value |
|------|--------|
| ASC app | **BusyProxy** · `net.busyproxy.app.ios` · id `6799410525` |
| Version / build | **1.0.0 (1)** |
| Processing | **VALID** |
| Internal TestFlight | **READY_FOR_BETA_TESTING** |
| Encryption | Uses non-exempt encryption = **false** |
| App icon | Embedded in binary; Apple CDN has extracted AppIcon |

## Internal testing (any iPhone)

**Internal** testers = people who are **App Store Connect users** on team `RA9PQ9434F` (Admin / App Manager / Developer / Marketing / Customer Support with app access).

1. Open [App Store Connect → BusyProxy → TestFlight](https://appstoreconnect.apple.com/apps/6799410525/testflight/ios).  
2. Confirm build **1.0.0 (1)** is available for **Internal Testing**.  
3. On the iPhone: install **TestFlight** from the App Store.  
4. Sign in with the **same Apple ID** that is on the ASC team.  
5. BusyProxy appears under **Apps** in TestFlight → **Install**.

No public link needed for internal. For friends/devices **not** on the ASC team, use **External** testing (requires Beta App Review once).

## App icon

- Source assets: `ios/BusyProxy/Assets.xcassets/AppIcon.appiconset/`  
- 1024 marketing + iPhone/iPad sizes (see `apple-store/assets/AppIcon-1024.png`)  
- After a **VALID** build, ASC My Apps list uses the icon extracted from the IPA (may need browser refresh).  
- Placeholder grid icon only shows when **no processed build** exists yet.

## Redeploy (build Mac `mm_ser`)

```bash
bash ~/.config/busymate/unlock-signing-keychain.sh
export PATH="/opt/homebrew/bin:/opt/homebrew/opt/ruby/bin:/opt/homebrew/lib/ruby/gems/4.0.0/bin:$PATH"
source ~/.config/appstoreconnect/env
export APPLE_TEAM_ID=RA9PQ9434F SKIP_WAIT=1
# Bump build number for each new upload:
# BUMP_BUILD=1  or edit CURRENT_PROJECT_VERSION in Xcode project
cd ~/dev/busyproxy/ios
fastlane beta
```

## Fastlane: TestFlight vs full App Store

| Lane / action | What it does |
|---------------|--------------|
| `fastlane beta` → `upload_to_testflight` | Archive + upload IPA → **TestFlight** (internal by default) |
| `upload_to_app_store` / `deliver` | Metadata, screenshots, binary → **App Store** version + optional **Submit for Review** |

So yes: Fastlane can ship all the way to the App Store, but **public App Store** still needs listing copy, screenshots, privacy questionnaire, and Apple review. **TestFlight internal** is the easy multi-iPhone path and is what we use first.
