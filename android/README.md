# BusyProxy Android (earner agent)

Native Android app that turns a consenting user’s phone into a **reverse-tunnel egress** for BusyProxy.

Takes the hard requirements from the PocketRelay spec (network pin, foreground service, destination policy, no open proxy) and maps them onto **BusyProxy** product rules (OTP login, earn $/GB, **no proxy URLs for earners**, operators manage access separately).

**Project docs index:** [docs/README.md](../docs/README.md) · **Security / pinning:** [docs/SECURITY.md](../docs/SECURITY.md) · **Auth:** [docs/AUTH_AND_ACCOUNTS.md](../docs/AUTH_AND_ACCOUNTS.md)

---

## Product behaviour

| Area | Behaviour |
|------|-----------|
| Auth | Display name + phone OTP (Twilio); SMS autofill supported |
| Consent | Explicit disclosure before sharing |
| Share | Start/stop; FGS notification |
| Network | **Automatic** (default), **Wi‑Fi**, **Mobile** |
| Account | Icon → profile, support, Terms/Privacy, delete (with **reason**), **← Home** |
| Home UI | Balance, rates, agent status — **no** proxy URIs, **no** internal codes like `tunnel_open` |
| Delete | Soft-delete + reason; phone cannot re-login until support reactivates |
| Support | support@busyproxy.net |

Package:

| Build | Application id |
|-------|----------------|
| Debug | `net.busyproxy.app.debug` |
| Release | `net.busyproxy.app` |

Points at production: `https://busyproxy.net` · `wss://busyproxy.net/v1/tunnel`

---

## What we took from PocketRelay

| PocketRelay idea | BusyProxy Android |
|---|---|
| Reverse tunnel (not inbound to phone) | Yes — WSS agent → edge |
| Bind sockets to selected `Network` | `NetworkSelector` + `StreamDialer` |
| Cellular / Wi‑Fi modes | `NetworkMode` + UI chips |
| Foreground service + Stop | `RelayForegroundService` |
| Destination policy | `DestinationPolicy` |
| Explicit consent | Consent screen |
| No payload logging | Stats only |
| Strong device auth later | Device secret today; mTLS optional later |

---

## Module layout

```text
android/
  app/src/main/java/net/busyproxy/app/
    domain/          Models, pricing, relay states
    network/         NetworkSelector, DestinationPolicy, SecureOkHttp (pinning)
    relay/           TunnelClient, StreamDialer, RelayEngine, FGS
    data/            Prefs (DataStore), ApiClient
    ui/              Compose: consent, OTP, home, account
  scripts/           build-apk, wifi-deploy, wifi-adb-discover, print-ssl-pins, …
```

---

## Build a shareable APK

```bash
./android/scripts/build-apk.sh
```

| Output | Path |
|---|---|
| **Latest** | `artifacts/apk/BusyProxy-latest-debug.apk` |
| Versioned | `artifacts/apk/BusyProxy-0.1.0-beta-debug.apk` |
| Local copy | `android/dist/BusyProxy-latest-debug.apk` |

### Install (USB)

```bash
adb install -r artifacts/apk/BusyProxy-latest-debug.apk
adb shell am start -n net.busyproxy.app.debug/net.busyproxy.app.MainActivity
```

### Install (no computer)

Copy the APK to the phone and open it (allow install from that source).  
Or: `./android/scripts/publish-debug-apk.sh` → HTTPS download on the phone.

---

## TLS certificate pinning

API + WSS use OkHttp **SPKI pinning** (`network/SecureOkHttp.kt`).

| Goal | How |
|------|-----|
| MITM resistance | Pins on chain public keys |
| **No app update on every LE leaf renew** | Pin **ISRG roots + LE intermediates** (leaf pin is extra only) |

If Let’s Encrypt introduces a **new intermediate/root** not in the pin list:

```bash
./android/scripts/print-ssl-pins.sh busyproxy.net
```

Add new `sha256/…` pins to `SecureOkHttp.kt` and ship an update **before** server cutover.

Full write-up: [docs/SECURITY.md](../docs/SECURITY.md).

---

## Wi‑Fi / any-network deploy

### Same LAN + auto port rediscover (recommended)

Phone: **Developer options → Wireless debugging ON** (same Wi‑Fi as Mac).  
Port can change — **you do not need to read it** if mDNS works:

```bash
./android/scripts/wifi-adb-discover.sh --oneplus   # finds IP:port
./android/scripts/wifi-deploy.sh                   # rediscover + install
```

Or pass an explicit target when you have it:

```bash
./android/scripts/wifi-deploy.sh 192.168.88.74:32977
```

### Same LAN fixed port

```bash
./android/scripts/wifi-adb-fixed.sh setup   # USB once → always :5555
```

### Any network (cellular / other Wi‑Fi)

- [Tailscale](https://tailscale.com) + `scripts/tailscale-adb.sh` — see [scripts/ANY_NETWORK_ADB.md](scripts/ANY_NETWORK_ADB.md)  
- Or HTTPS APK publish (install only, no logcat)

---

## Manual Gradle

```bash
cd android
./gradlew :app:assembleDebug
# app/build/outputs/apk/debug/app-debug.apk
```

Release / Play: see [google-play/RELEASE_CHECKLIST.md](../google-play/RELEASE_CHECKLIST.md).

---

## Related docs

| Doc | Topic |
|-----|--------|
| [docs/android/ANDROID_AGENT.md](../docs/android/ANDROID_AGENT.md) | Agent design depth |
| [docs/AUTH_AND_ACCOUNTS.md](../docs/AUTH_AND_ACCOUNTS.md) | OTP, delete reasons |
| [docs/API_REFERENCE.md](../docs/API_REFERENCE.md) | Endpoints the app calls |
| [docs/NETWORK_ARCHITECTURE.md](../docs/NETWORK_ARCHITECTURE.md) | Tunnel / gate |
| [google-play/](../google-play/) | Store submission |
