# BusyProxy iOS (earner)

Native SwiftUI client that talks to the **same** BusyProxy APIs and reverse-tunnel edge as Android.

## Feasibility

Read **[docs/IOS_APP.md](../docs/IOS_APP.md)** first. Summary:

- **Yes** for OTP, wallet, start/stop share, reverse WSS tunnel, Wi‑Fi/cellular path selection  
- **Not full Android parity** for multi-hour background without a **Network Extension** (Phase 2)  
- This folder is **Phase 1** (app-process tunnel)

## Requirements

- macOS + Xcode 16+  
- For **device** install: Apple ID with free or paid Developer team (Signing & Capabilities)  
- Edge: `https://busyproxy.net` + `wss://busyproxy.net/v1/tunnel`

## Open in Xcode

```bash
open ios/BusyProxy.xcodeproj
```

1. Select target **BusyProxy**  
2. **Signing & Capabilities** → Team  
3. Run on Simulator or paired iPhone  

## CLI build (simulator)

```bash
cd ios
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

## Known limits (Phase 1)

- Tunnel may disconnect when app is suspended  
- No boot auto-start  
- Cellular/Wi‑Fi pin uses `NWParameters.requiredInterfaceType` (best-effort)  
- Stripe Connect uses Safari / system browser for onboarding  

## Phase 2 (later)

Packet Tunnel Network Extension hosting `RelayEngine` for always-on share + system VPN UI.  
