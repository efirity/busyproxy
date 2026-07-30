# BusyProxy iOS earner app — feasibility & plan

**Last updated:** 2026-07-30  
**Status:** Feasible for **foreground / short-background** parity; **true always-on** like Android FGS needs **Network Extension** + Apple Developer Program + App Store review path.

---

## 1. What Android does today (must match on iOS)

| Piece | Android implementation | iOS equivalent |
|-------|------------------------|----------------|
| Auth | Phone OTP → Bearer session | Same REST `/api/auth/*` |
| Enroll | `POST /api/edge/agent/hello` | Same |
| Tunnel | Outbound **WSS** to `wss://busyproxy.net/v1/tunnel` | `URLSessionWebSocket` or `NWConnection` TLS |
| Protocol | JSON frames: `hello`, `open`, `data` (b64), `close`, `stats` | Identical (platform: `"ios"`) |
| Egress sockets | TCP dial **bound** to selected `Network` | `NWConnection` + `NWParameters.requiredInterfaceType` (wifi / cellular) |
| Wi‑Fi vs mobile pin | `ConnectivityManager` + `NetworkRequest` | Path monitor + required interface type |
| Background stay-alive | **Foreground service** (`specialUse`) + notification + boot restart | **No direct FGS equivalent** — see §3 |
| Wallet / Stripe | REST `/api/stripe/*` | Same APIs (Safari / ASWebAuthenticationSession for Connect) |
| Events funnel | `POST /api/events/batch` | Same |

CGNAT still applies: phones **cannot** accept inbound proxy connections; the reverse tunnel is mandatory on both platforms.

---

## 2. Verdict: can iOS do the same?

### Yes — core product loop

- Sign in with OTP  
- Consent  
- Start sharing while app is active  
- Reverse tunnel + multi-stream TCP exit through phone IP  
- Stop sharing  
- Stripe wallet / cash-out (web sheet)  
- Show balance, session bytes, exit IP  

### Partially — “always on in background”

| Android | iOS reality |
|---------|-------------|
| FGS keeps WSS for hours with screen off | iOS suspends apps; sockets die after short background time |
| Boot restart | Limited; no silent always-on without NE |
| Battery opt-out | N/A; system decides |

**Production-grade always-on on iOS** requires one of:

1. **Network Extension — Packet Tunnel Provider** (preferred for “VPN-like” long-lived paths)  
   - Paid **Apple Developer Program** ($99/yr)  
   - Entitlements: Network Extension (often needs capability request)  
   - User enables a system VPN toggle (can be branded BusyProxy)  
   - Heavy App Review scrutiny for residential proxy / bandwidth share  

2. **Abuse-prone workarounds** (silent audio, fake location) — **do not ship** (policy rejection + store ban risk)

### App Store policy risk

Bandwidth-sharing / residential-proxy apps face extra review. Mitigations already in product:

- Explicit consent  
- User start/stop  
- No earner-visible proxy URLs  
- Destination policy / auth on edge  

Still expect questions from Apple Review; plan a clear “earn by sharing spare capacity” privacy narrative.

---

## 3. Architecture (iOS)

```text
┌──────────────────── SwiftUI App ────────────────────┐
│  Consent · OTP · Home (Start/Stop) · Wallet · Acct │
└─────────────┬──────────────────────────────────────┘
              │
┌─────────────▼──────────────────────────────────────┐
│  RelayEngine                                        │
│   · NetworkPathSelector (wifi / cellular / auto)    │
│   · TunnelClient (WSS + TunnelProtocol)             │
│   · StreamDialer (NWConnection per open stream)     │
│   · UIBackgroundTask for short grace after lock     │
└─────────────┬──────────────────────────────────────┘
              │ WSS hello / open / data / close
              ▼
         Edge hub (same as Android)
```

**Phase 1 (this repo scaffold):** app process tunnel, foreground + brief background.  
**Phase 2:** Packet Tunnel extension hosting the same dialer/engine.  
**Phase 3:** TestFlight + App Store.

---

## 4. Tooling on this machine (2026-07-30)

| Item | Status |
|------|--------|
| Xcode | **26.1.1** installed |
| Swift | **6.2.1** |
| Simulators | iPhone 16/17 family available |
| Physical device | **iPhone connected** (`CA-JB-13`, UDID `00008030-…`, paired) |
| Code signing identities | **0** — cannot install to device until Apple ID / team is set in Xcode |
| Network Extension entitlement | Not configured yet |

**To install on the physical iPhone:** open `ios/BusyProxy.xcodeproj` in Xcode → Signing & Capabilities → select your Team → Run on `CA-JB-13`.

---

## 5. What’s in `ios/`

SwiftUI app package:

- Auth (OTP) against production API  
- Consent + home share toggle  
- Relay engine + tunnel protocol (platform `ios`)  
- Network path selector  
- Wallet view (Stripe status / open dashboard link)  
- Simulator-friendly build  

See [ios/README.md](../ios/README.md).

---

## 6. Recommendation

| Goal | Path |
|------|------|
| Validate product on iPhone quickly | Phase 1 app, keep screen on / app open while testing tunnel |
| Match Android always-on | Phase 2 Network Extension + paid Developer account |
| Public distribution | TestFlight → App Store after NE + review narrative |

**Do not block Android growth** on full iOS always-on. Ship Phase 1 for OTP/wallet/share-when-open; schedule NE for parity.

---

## 7. Related

- Android design: [ANDROID_MOBILE_PROXY_APP_DESIGN.md](../ANDROID_MOBILE_PROXY_APP_DESIGN.md)  
- Edge / proxy: [PROXY_ACCESS.md](./PROXY_ACCESS.md)  
- App events: [APP_EVENTS.md](./APP_EVENTS.md)  
