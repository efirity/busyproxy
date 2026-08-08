# App Store Connect & Developer Portal setup (one-time)

Do this once per Apple Developer team. Afterward, day-to-day is **Fastlane beta** → TestFlight.

## 1. Accounts & roles

| Role | Who | Why |
|------|-----|-----|
| **Account Holder / Admin** | e.g. `mr.serebano@gmail.com` | Create apps, manage keys, agreements |
| **Admin** (also) | e.g. `bitsoft.1991@gmail.com` | App + TestFlight management |
| **Build Mac** | `mm_ser` (local LAN) | Xcode archive + upload |

### App Store Connect API key (CI / Fastlane)

Stored on the build Mac (never commit):

```text
~/.config/appstoreconnect/key.p8
~/.config/appstoreconnect/env   # KEY_ID, ISSUER_ID, API_KEY_PATH
```

```bash
# env shape (example — values live only on mm_ser)
export APP_STORE_CONNECT_KEY_ID=…
export APP_STORE_CONNECT_ISSUER_ID=…
export APP_STORE_CONNECT_API_KEY_PATH=~/.config/appstoreconnect/key.p8
```

**Known limitation (current key):**  
`POST /v1/apps` returns:

```text
The resource 'apps' does not allow 'CREATE'.
Allowed operations are: GET_COLLECTION, GET_INSTANCE, UPDATE
```

So this key can **upload builds**, manage testers (if permitted), and read apps — but **cannot create the ASC app record**.

**Fix (pick one):**

1. **Preferred:** In ASC → Users and Access → Integrations → App Store Connect API → ensure the key’s access is **Admin** (or create a new Admin key and replace `key.p8` + env on `mm_ser`).  
2. **One-time UI:** Account Holder/Admin creates the app in the web UI (section 3 below).  
3. **Session auth:** `fastlane spaceauth` / Spaceship login with 2FA OTP (interactive; session cookie).

Portal **Identifiers** (bundle IDs) **can** be created with the current key — those already exist.

---

## 2. Developer Portal — Identifiers & capabilities

[developer.apple.com → Certificates, Identifiers & Profiles → Identifiers](https://developer.apple.com/account/resources/identifiers/list)

### App IDs

| Type | Bundle ID | Name | Portal resource id |
|------|-----------|------|--------------------|
| App | `net.busyproxy.app.ios` | BusyProxy | `P33PZD74K2` |
| App (extension) | `net.busyproxy.app.ios.tunnel` | BusyProxy Tunnel | `S5QXR97CJP` |

### Required capabilities (both IDs)

| Capability | Setting |
|------------|---------|
| **App Groups** | Enable → include `group.net.busyproxy.app.ios` |
| **Network Extensions** | Enable → **Packet Tunnel** (and only what you need) |

Optional / default: In-App Purchase (often auto-present; unused today).

### App Group container

| Identifier | Used by |
|------------|---------|
| `group.net.busyproxy.app.ios` | Main app + Packet Tunnel extension (session, stats) |

If the group is missing under **Identifiers → App Groups**, create it, then assign it on **both** App IDs.

### Certificates (on mm_ser)

```bash
security find-identity -v -p codesigning
# Expect:
#  "Apple Development: …"
#  "Apple Distribution: SERGIU TODERASCU, AI (RA9PQ9434F)"
```

Fastlane `beta` uses **Apple Distribution** + automatic signing with:

```text
-allowProvisioningUpdates
-authenticationKeyPath / -authenticationKeyID / -authenticationKeyIssuerID
```

---

## 3. Create the ASC app record (blocking until done)

### Option A — Web UI (fastest if API key cannot CREATE)

1. Open [appstoreconnect.apple.com](https://appstoreconnect.apple.com) as **Admin / Account Holder**.  
2. **Apps → + → New App**.  
3. Fill:

| Field | Value |
|-------|--------|
| Platforms | **iOS** |
| Name | `BusyProxy` |
| Primary language | English (U.S.) |
| Bundle ID | `net.busyproxy.app.ios` (select from list) |
| SKU | `busyproxy-ios` |
| User Access | Full Access (or restricted as you prefer) |

4. Save. Confirm the app appears under My Apps.  
5. Optional: **TestFlight → Internal Testing** — Internal group auto-includes ASC users with access.

### Option B — Spaceship (Admin API key)

```ruby
# platforms: ["IOS"] is required (nil → NoMethodError on .each)
Spaceship::ConnectAPI::App.create(
  name: "BusyProxy",
  version_string: "1.0.0",
  sku: "busyproxy-ios-#{Time.now.to_i}",
  primary_locale: "en-US",
  bundle_id: "net.busyproxy.app.ios",
  platforms: ["IOS"],
)
```

Or:

```bash
cd ~/dev/busyproxy/ios
source ~/.config/appstoreconnect/env
export PATH="/opt/homebrew/bin:/opt/homebrew/opt/ruby/bin:/opt/homebrew/lib/ruby/gems/4.0.0/bin:$PATH"
export APPLE_TEAM_ID=RA9PQ9434F
fastlane register_ids
```

(`register_ids` also re-enables capabilities via `fastlane/scripts/enable_capabilities.rb`.)

### Verify

```bash
# On mm_ser
source ~/.config/appstoreconnect/env
# spaceship App.find("net.busyproxy.app.ios") should return non-nil
```

---

## 4. Xcode project alignment

| Setting | Value |
|---------|--------|
| Project | `ios/BusyProxy.xcodeproj` |
| Scheme | `BusyProxy` |
| Targets | `BusyProxy`, `BusyProxyTunnel` |
| Team | `RA9PQ9434F` |
| Signing | Automatic |
| Entitlements | App Groups + packet-tunnel-provider |

Source: `ios/BusyProxy/*.entitlements`, `ios/BusyProxyTunnel/*.entitlements`.

---

## 5. Paid agreements

ASC → **Business → Agreements, Tax, and Banking** (or **Agreements**):

- [ ] Free Apps Agreement active  
- [ ] Paid Apps / bank / tax if you will charge (not required for free + TestFlight internal)

Without an active Free Apps agreement, uploads can fail.

---

## 6. After app exists

Continue with [TESTFLIGHT.md](./TESTFLIGHT.md) and [FASTLANE.md](./FASTLANE.md).
