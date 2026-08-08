# BusyProxy iOS (earner)

Native SwiftUI client that talks to the **same** BusyProxy APIs and reverse-tunnel edge as Android.

## Feasibility

Read **[docs/IOS_APP.md](../docs/IOS_APP.md)** first. Summary:

- **Yes** for OTP, wallet, start/stop share, reverse WSS tunnel, Wi‑Fi/cellular path selection  
- **Not full Android parity** for multi-hour background without a **Network Extension** (Phase 2)  
- This folder is **Phase 1** (app-process tunnel)

## Requirements

- macOS + Xcode 16+  
- **Fastlane** (Homebrew): already on this machine — `fastlane 2.237.x`  
- For **device** install: Apple ID (can be a **second** account) + Team  
- Edge: `https://busyproxy.net` + `wss://busyproxy.net/v1/tunnel`

## Fastlane + another Apple account

See **[SECRETS.md](./SECRETS.md)** for env vars and 2FA.

```bash
# 1) Optional env file (gitignored)
cp ios/secrets/fastlane.env.example ios/secrets/fastlane.env
# edit FASTLANE_USER + APPLE_TEAM_ID

# 2) Add that Apple ID in Xcode once
cd ios && fastlane open_xcode
# Xcode → Settings → Accounts → + → Apple ID

# 3) Lanes
cd ios
fastlane ios_whoami      # user / team / certs
fastlane build_sim       # simulator (no Apple ID)
fastlane certs_dev       # after Team is set
fastlane build_device    # device / development export
```

## Open in Xcode

```bash
open ios/BusyProxy.xcodeproj
# or: cd ios && fastlane open_xcode
```

1. Select target **BusyProxy**  
2. **Signing & Capabilities** → Team (the other Apple account)  
3. Run on Simulator or paired iPhone  

## CLI build (simulator)

```bash
cd ios
fastlane build_sim
# or:
xcodebuild -scheme BusyProxy -destination 'platform=iOS Simulator,name=iPhone 17' -configuration Debug build
```

## Project layout

```text
ios/
  BusyProxy.xcodeproj
  BusyProxy/
    BusyProxyApp.swift
    RootView.swift
    API/ApiClient.swift
    Auth/…
    Relay/          # tunnel protocol + engine
    Network/        # path selector
    Storage/Prefs.swift
    UI/             # screens
```

## Config

Defaults in `AppConfig.swift`:

| Key | Default |
|-----|---------|
| API base | `https://busyproxy.net` |
| Agent WSS | `wss://busyproxy.net/v1/tunnel` |
| Min withdraw | $20 |

## Languages (same set as Android)

In-app languages via **Account → Language** (compact menu picker):

| Code | Language |
|------|----------|
| `en` | English |
| `es` | Español |
| `zh-Hans` | 简体中文 |
| `hi` | हिन्दी |
| `pt-BR` | Português |

Strings live in `BusyProxy/Localization/L10n.swift` (table-based; easy to extend).

## Phase 2 — Packet Tunnel (Network Extension)

| Piece | Path |
|-------|------|
| Extension target | `BusyProxyTunnel` (`net.busyproxy.app.ios.tunnel`) |
| Provider | `PacketTunnelProvider` — hosts reverse WSS tunnel |
| Shared session | App Group `group.net.busyproxy.app.ios` |
| App control | `VPN/VPNManager.swift` + `Start sharing` |

**Device:** Start sharing installs a system VPN profile **BusyProxy Sharing** and runs the tunnel in the extension (background-capable).  
**Simulator:** Packet Tunnel is not reliable — app **falls back to in-process** relay automatically (caption explains this).

Entitlements require an Apple Developer Team with Network Extension capability for device installs.

## Known limits (Phase 1 / 2)


- Tunnel may disconnect when app is suspended  
- No boot auto-start  
- Cellular/Wi‑Fi pin uses `NWParameters.requiredInterfaceType` (best-effort)  
- Stripe Connect uses Safari / system browser for onboarding  

## Phase 2 (later)

Packet Tunnel Network Extension hosting `RelayEngine` for always-on share + system VPN UI.  
