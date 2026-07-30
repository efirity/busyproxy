# BusyProxy Android (earner agent)

Native Android app that turns a consenting user’s phone into a **reverse-tunnel egress** for BusyProxy.

Takes the hard requirements from the PocketRelay spec (network pin, foreground service, destination policy, no open proxy) and maps them onto **BusyProxy** product rules (OTP login, earn $/GB, **no proxy URLs for earners**, operators use portal credentials).

## What we took from PocketRelay

| PocketRelay idea | BusyProxy Android |
|---|---|
| Reverse tunnel (not inbound to phone) | Yes — WSS agent → edge |
| Bind sockets to selected `Network` | `NetworkSelector` + `StreamDialer` |
| Cellular / Wi‑Fi modes + no silent “only” fallback | `NetworkMode` enum + UI chips |
| Foreground service + Stop action | `RelayForegroundService` |
| Ports 80/443 + private CIDR block | `DestinationPolicy` |
| Explicit consent before start | Consent screen |
| No payload logging | Stats only |
| Keystore mTLS later | MVP: device secret from `/api/edge/agent/hello` |

## What we improved / product-aligned

- Branding & UX = **BusyProxy** earner (balance, rates, share toggle) — not operator proxy UI  
- Auth = existing **Twilio OTP** (`/api/auth/*`)  
- Enrollment = existing **edge control plane** (`/api/edge/agent/hello`)  
- Rates = web pricing (`$0.20` Wi‑Fi / `$0.12` mobile)  
- Operators still mint sticky/rotate URIs in **portal** (see `docs/PROXY_ACCESS.md`)

## Module layout

```text
android/
  app/src/main/java/net/busyproxy/app/
    domain/          Models, pricing, relay states
    network/         NetworkSelector, DestinationPolicy
    relay/           TunnelClient, StreamDialer, RelayEngine, FGS
    data/            Prefs (DataStore), ApiClient
    ui/              Compose screens (consent, OTP, home)
```

## Build (on a machine with Android SDK)

```bash
cd android
# need Android SDK + JDK 17
./gradlew :app:assembleDebug
# APK: app/build/outputs/apk/debug/app-debug.apk
```

If the Gradle wrapper jar is missing:

```bash
gradle wrapper --gradle-version 8.9
./gradlew :app:assembleDebug
```

### Configure API host

`app/build.gradle.kts` → `CONTROL_API_BASE` / `AGENT_WSS_BASE`  
Default: `https://busyproxy.net` and `wss://agent.busyproxy.net/v1/tunnel`

For local edge while developing: point control API at your allowlisted deploy.

## Runtime flow

1. Consent → OTP login  
2. User picks network mode  
3. **Start sharing** → FGS notification  
4. Pin validated Network → verify public IP via ipify on that network  
5. `POST /api/edge/agent/hello` enroll  
6. Open WSS tunnel; accept `open` frames → dial destination on pinned network  
7. Bytes counted for payroll (server ledger later)  

## Limits of this environment

No Android emulator/SDK in the Grok builder sandbox. Compile on Android Studio / CI; test on a real device with:

- Wi‑Fi connected + cellular-only mode → destination should see **mobile** IP (Phase 0 proof)  
- Stop from notification → tunnel dies immediately  

## Protocol (MVP JSON over WSS)

See `relay/TunnelProtocol.kt`. Production should move to length-prefixed binary / protobuf and QUIC.

## Next engineering tasks (PocketRelay §28 order)

1. Real-device Phase 0 cellular-bind IP proof  
2. Edge WSS data plane that multiplexes CONNECT → phone streams (P1)  
3. Keystore-bound device key  
4. Play `specialUse` FGS declaration package  
5. Instrumentation tests + open-proxy scan  

## Docs

- [docs/android/ANDROID_AGENT.md](../docs/android/ANDROID_AGENT.md)  
- [docs/PROXY_ACCESS.md](../docs/PROXY_ACCESS.md)  
- [docs/NETWORK_ARCHITECTURE.md](../docs/NETWORK_ARCHITECTURE.md)  
