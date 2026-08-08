# iOS secrets & Apple account (Fastlane)

Fastlane is installed system-wide via Homebrew (`fastlane 2.237.x`).  
Use a **second Apple ID** here without changing the Mac login account.

## Dual-machine sync (dev laptop + build Mac `mm_ser`)

**Never commit secrets.** Keep the same files on both machines via secure copy:

| Secret | Path (both machines) | Notes |
|--------|----------------------|--------|
| Fastlane Apple ID env | `ios/secrets/fastlane.env` | `FASTLANE_USER`, app-specific password, team id |
| ASC API key | `~/.config/appstoreconnect/key.p8` | `.p8` private key |
| ASC API env | `~/.config/appstoreconnect/env` | `KEY_ID`, `ISSUER_ID`, `API_KEY_PATH` |
| Signing keychain (mm_ser) | `~/.config/busymate/signing-keychain.password` + unlock script | Build Mac only |

Example (from laptop):

```bash
# Repo code via git
git push && ssh mm_ser 'cd ~/dev/busyproxy && git pull --ff-only'

# Secrets (gitignored) — copy both ways as needed
scp ios/secrets/fastlane.env mm_ser:~/dev/busyproxy/ios/secrets/fastlane.env
scp -r ~/.config/appstoreconnect mm_ser:~/.config/   # or reverse if key lives on mm_ser first
```

## 1. Create local secrets (never commit)

```bash
mkdir -p ios/secrets
chmod 700 ios/secrets
```

Create `ios/secrets/fastlane.env` (gitignored):

```bash
# Apple ID for signing (can be different from Mac user)
FASTLANE_USER=your-other-apple-id@example.com

# App-specific password if 2FA is on:
# https://appleid.apple.com → Sign-In and Security → App-Specific Passwords
FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx

# Optional: password (prefer app-specific above)
# FASTLANE_PASSWORD=

# 10-character Team ID (developer.apple.com → Membership)
APPLE_TEAM_ID=XXXXXXXXXX

# Bundle id (matches Xcode project)
IOS_BUNDLE_ID=net.busyproxy.app.ios
```

```bash
chmod 600 ios/secrets/fastlane.env
```

## 2. Add the Apple ID in Xcode (required once)

```bash
cd ios && fastlane open_xcode
# or: open ios/BusyProxy.xcodeproj
```

1. **Xcode → Settings → Accounts**  
2. **+** → **Apple ID** → sign in with the **other** account  
3. Select target **BusyProxy** → **Signing & Capabilities**  
4. **Team** = that account’s Personal Team or paid team  
5. Ensure **Automatically manage signing** is on  

Until a Team is selected, `security find-identity -v -p codesigning` may show **0 identities**.

## 3. Fastlane commands

```bash
cd ios

fastlane ios_whoami          # user / team / certs
fastlane build_sim           # simulator — no Apple ID needed
fastlane certs_dev           # fetch/create dev cert + profile (needs login)
fastlane build_device        # device build with automatic signing
```

Or export env in the shell instead of `fastlane.env`:

```bash
export FASTLANE_USER=other@icloud.com
export APPLE_TEAM_ID=XXXXXXXXXX
export FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
cd ios && fastlane build_device
```

## 4. Free vs paid Apple Developer

| Account | What you can do |
|---------|-----------------|
| **Free Apple ID** | Run on **your** devices (7-day certs), Simulator |
| **Paid ($99/yr)** | TestFlight, App Store, longer profiles, Network Extension later |

## 5. Gitignore

`ios/secrets/` must stay out of git (see root `.gitignore`). Never commit:

- `fastlane.env`  
- `.p12` / certificates  
- provisioning profiles with private keys  

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| 0 signing identities | Add Apple ID in Xcode Accounts + pick Team |
| 2FA login loop | Use app-specific password env var |
| Wrong team | Set `APPLE_TEAM_ID` explicitly |
| Bundle id taken | Change `IOS_BUNDLE_ID` + Xcode product id |
