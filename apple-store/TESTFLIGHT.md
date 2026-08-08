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

**Internal** testers = **App Store Connect users** on team `RA9PQ9434F`  
(e.g. Admin `bitsoft.1991@gmail.com`).

### One-time ASC setup (done for BusyProxy)

- Internal group: **App Store Connect Users** (`hasAccessToAllBuilds`)
- Build **1** status: **READY_FOR_BETA_TESTING**

If TestFlight shows **no apps**, the usual cause was **missing Internal Testing group** — create it under TestFlight → Internal Testing → **+** if it ever disappears.

### On the iPhone (you)

1. **Settings → [your name]** → Apple ID must be **`bitsoft.1991@gmail.com`**  
   (not a different personal iCloud).
2. Install / open **TestFlight** (App Store).
3. In TestFlight: account avatar (top right) → confirm same Apple ID.
4. **Apps** tab → pull down to **refresh**.
5. Open **BusyProxy** → **Install** (1.0.0 build 1).

### If it still doesn’t appear

| Check | Action |
|-------|--------|
| Wrong Apple ID | Sign out of Media & Purchases / App Store if needed; TestFlight uses the device Apple ID |
| Group missing | ASC → BusyProxy → **TestFlight** → **Internal Testing** → group **App Store Connect Users** must exist |
| Build not testing-ready | Build should say **Ready to Submit** / ready for internal testing (not Processing / Missing Compliance) |
| Delay | Wait 2–10 minutes after group create, force-quit TestFlight, reopen |
| ASC web | On a Mac/PC: TestFlight → Internal Testing → open group → confirm **your email** is listed under testers (ASC users) |

### Optional: redeem from email

ASC sometimes emails “You’re invited to test …”. Open that mail **on the iPhone** → **View in TestFlight**.

No public link needed for internal. Friends **not** on the ASC team need **External** testing (Beta App Review).

## App icon

- Source assets: `ios/BusyProxy/Assets.xcassets/AppIcon.appiconset/`  
- 1024 marketing + iPhone/iPad sizes (see `apple-store/assets/AppIcon-1024.png`)  
- After a **VALID** build, ASC My Apps list uses the icon extracted from the IPA (may need browser refresh).  
- Placeholder grid icon only shows when **no processed build** exists yet.

## Redeploy (build Mac `mm_ser`)

**Code sync = git only** (commit + push from laptop, then pull on mm_ser). Do not rsync/scp app sources.

```bash
# Laptop (after commit)
git push origin main

# mm_ser
cd ~/dev/busyproxy
git pull --ff-only

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
