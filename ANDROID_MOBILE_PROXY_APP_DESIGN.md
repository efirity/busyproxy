# Mobile Phone Proxy — Android App
## Full Product Analysis, Architecture & Initial Design Spec

**Document version:** 1.0  
**Status:** Initial design / pre-implementation  
**Platform:** Android (primary)  
**Product name (working):** **Relay**  
**One-line pitch:** Turn any Android phone into a secure, always-reachable HTTP & SOCKS5 proxy that routes traffic through that device’s mobile or Wi‑Fi connection.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Problem & opportunity](#2-problem--opportunity)
3. [Product goals & non-goals](#3-product-goals--non-goals)
4. [User personas & use cases](#4-user-personas--use-cases)
5. [How it works (concept)](#5-how-it-works-concept)
6. [Competitive landscape](#6-competitive-landscape)
7. [Core feature set](#7-core-feature-set)
8. [Technical architecture](#8-technical-architecture)
9. [Proxy protocols & networking](#9-proxy-protocols--networking)
10. [Android platform requirements](#10-android-platform-requirements)
11. [Security model](#11-security-model)
12. [Legal, policy & abuse considerations](#12-legal-policy--abuse-considerations)
13. [UX / UI design system](#13-ux--ui-design-system)
14. [Screen-by-screen app design](#14-screen-by-screen-app-design)
15. [Data model & local storage](#15-data-model--local-storage)
16. [Optional cloud / remote-access layer](#16-optional-cloud--remote-access-layer)
17. [Tech stack recommendation](#17-tech-stack-recommendation)
18. [Project structure (codebase)](#18-project-structure-codebase)
19. [MVP scope vs later phases](#19-mvp-scope-vs-later-phases)
20. [Implementation roadmap](#20-implementation-roadmap)
21. [Testing strategy](#21-testing-strategy)
22. [Performance, battery & reliability](#22-performance-battery--reliability)
23. [Distribution & packaging](#23-distribution--packaging)
24. [Monetization options](#24-monetization-options)
25. [Risks & open decisions](#25-risks--open-decisions)
26. [Appendix: glossary, sample configs, checklist](#26-appendix)

---

## 1. Executive summary

### What we are building

An Android application with a **simple, modern UI** that:

1. Starts a **local proxy server** on the phone (HTTP CONNECT and/or SOCKS5).
2. Optionally exposes that proxy **beyond the local network** (via port mapping, a tunnel, or a relay service) so external tools can use a **proxy URL**.
3. Routes outbound client traffic **through the phone’s active network** (cellular data or Wi‑Fi), so destinations see the phone’s public IP and network path.
4. Gives the user a **copyable proxy URL/endpoint**, auth credentials, stats, and simple controls (start / stop / share).

### Why this is non-trivial on Android

A “proxy on phone” is easy to describe and hard to ship well:

| Challenge | Why it matters |
|---|---|
| **Background execution** | Android kills idle apps; proxy must survive screen-off via a **foreground service** |
| **Carrier CGNAT** | Most mobile IPs are behind NAT — you **cannot** accept inbound connections from the internet on the phone alone |
| **Battery & Doze** | Long-lived sockets + wake locks drain battery; need careful power design |
| **Permissions & Play policy** | Foreground service, notifications, network security, possible VPN-like behavior |
| **Reachability** | LAN-only is simple; **internet-reachable proxy** needs a tunnel/relay (TURN/WireGuard/SSH/cloud reverse proxy) |
| **Security** | An open proxy is catastrophic (abuse, legal liability); **auth + bind controls** are mandatory |
| **TLS / HTTPS** | Clients use HTTP CONNECT; phone must not MITM unless user explicitly enables decrypt (usually out of scope) |

### Recommended product positioning

**MVP:** Local + same-Wi‑Fi proxy with auth (works for laptops/TVs on the same network).  
**v1.1:** Internet reachability via **optional reverse tunnel** (user-hosted or managed relay).  
**Later:** Multi-device fleet, API, SOCKS5 UDP, per-app routing helpers, desktop companion.

Working product name in this doc: **Relay**. Final branding TBD.

---

## 2. Problem & opportunity

### Problem

Developers, privacy-conscious users, and remote-access scenarios often need traffic to **originate from a specific mobile network / geo / SIM**:

- Test “how does my API look from mobile carrier X in country Y?”
- Route a single tool (browser, scraper, app) through a phone already on site
- Access region-locked content using **your own** phone’s connection (not a third-party residential proxy farm)
- Give a temporary, revocable proxy endpoint to a teammate for debugging

Existing solutions are either:

- Desktop-centric (ProxyDroid-like, requires root historically)
- Complex (full VPN clients, SSH tunnels, WireGuard mesh)
- Commercial residential proxy marketplaces (expensive, privacy-opaque, ToS-sensitive)

### Opportunity

A **consumer-grade, no-root Android app** with:

- One-tap “Start proxy”
- Clear **proxy URL** the user can paste into browser / OS / curl / app settings
- Modern UI (not a 2012 settings dump)
- Safe defaults (auth on, LAN-only by default, explicit “expose” modes)

---

## 3. Product goals & non-goals

### Goals

| ID | Goal |
|---|---|
| G1 | One-tap start/stop of a working HTTP + SOCKS5 proxy on device |
| G2 | Copyable proxy endpoint (host:port + scheme + credentials) |
| G3 | Modern, calm, trustworthy UI (status-first, not feature-soup) |
| G4 | Safe defaults: password required, bind to LAN, no open internet proxy |
| G5 | Survives screen lock / brief network switches via foreground service |
| G6 | Live stats: uptime, bytes in/out, active connections, current public IP |
| G7 | Works without root on modern Android (API 26+ target, min API 26 or 28) |
| G8 | Clear modes: **Local only** / **Same Wi‑Fi** / **Remote (tunnel)** |

### Non-goals (MVP)

| ID | Non-goal |
|---|---|
| N1 | Full device VPN that captures all phone apps (that’s a different product) |
| N2 | Transparent MITM / HTTPS decryption |
| N3 | Becoming a commercial residential proxy marketplace |
| N4 | Multiplayer / social features |
| N5 | Root-only features as primary path |
| N6 | iOS parity in v1 (iOS background networking is much more constrained) |
| N7 | Guaranteeing a public IP without a tunnel (impossible under CGNAT) |

---

## 4. User personas & use cases

### Personas

**1. Dev / QA engineer — “Alex”**  
Needs to verify geo, mobile headers, or carrier-specific behavior. Laptop on office Wi‑Fi; phone on mobile data. Wants SOCKS5 in browser or `curl --proxy`.

**2. Power user — “Mira”**  
Wants selected desktop traffic to exit via their phone’s connection while traveling. Values simple UI and battery awareness.

**3. Field technician — “Sam”**  
Phone is on-site with local network access; remote tools need to hit APIs as if from that site. Needs remote reachability (tunnel).

### Primary use cases

| # | Use case | Mode | Success criteria |
|---|---|---|---|
| UC1 | Share phone as proxy to laptop on same Wi‑Fi | Same Wi‑Fi | Laptop configures `http://user:pass@phone-ip:port` and HTTPS sites work |
| UC2 | Local loopback only (apps on phone talking to local proxy) | Local | `127.0.0.1:port` works for termux/curl |
| UC3 | Internet client uses phone’s mobile IP | Remote tunnel | External machine uses tunnel URL; exit IP = phone public IP |
| UC4 | Rotate / revoke access | Auth | Change password or stop service; old clients fail |
| UC5 | See what happened | Stats | Bytes, connections, last errors visible |

### Anti-use cases (design must discourage)

- Running an **unauthenticated open proxy** on the public internet
- Bulk account farming / fraud networks
- Hiding criminal activity (product copy + ToS must forbid abuse)

---

## 5. How it works (concept)

### High-level data path

```text
┌────────────────────┐         proxy protocol          ┌─────────────────────────┐
│  Client device     │  HTTP CONNECT / SOCKS5          │  Android phone (Relay)  │
│  (laptop, server)  │ ──────────────────────────────► │  Proxy engine           │
└────────────────────┘                                 │         │               │
                                                       │         ▼               │
                                                       │  Outbound TCP (and later│
                                                       │  UDP for SOCKS5) via     │
                                                       │  phone network stack    │
                                                       │         │               │
                                                       │         ▼               │
                                                       │  Destination website /  │
                                                       │  API (sees phone's IP)  │
                                                       └─────────────────────────┘
```

### Three exposure modes

```text
MODE A — LOCAL ONLY
  Bind: 127.0.0.1
  Who can connect: apps on the same phone only
  Reachability: always works
  Complexity: lowest

MODE B — LAN / SAME WI‑FI
  Bind: 0.0.0.0 (or Wi‑Fi interface IP)
  Who can connect: devices on same Wi‑Fi / local subnet
  Reachability: works if client can route to phone private IP
  Complexity: low (firewall / AP client isolation may block)

MODE C — REMOTE (INTERNET)
  Problem: carrier CGNAT blocks inbound connections to phone
  Solutions:
    C1. User port-forward on home router (rare on cellular)
    C2. Reverse tunnel to a VPS (SSH -R, frp, rathole, cloudflared)
    C3. Managed Relay cloud (app opens outbound WebSocket/QUIC to your servers;
        clients connect to relay.example.com:port which forwards to phone)
  Complexity: highest; required for “use proxy URL from anywhere”
```

**Critical product truth:**  
> Without Mode C (tunnel/relay), most users on **mobile data** cannot share a public proxy URL.  
> The app must teach this honestly in the UI, not pretend every phone has a public IP.

### Proxy URL the user copies

Examples the app should generate:

```text
# HTTP proxy
http://relay:S3cret@192.168.1.42:8080

# SOCKS5
socks5://relay:S3cret@192.168.1.42:1080

# Remote tunnel (managed)
socks5://relay:S3cret@relay-eu.example.com:24017
```

OS / browser settings differ; UI should offer:

- Copy full URL
- Copy host / port / user / password separately
- “How to set on Windows / macOS / Android / curl” quick guides

---

## 6. Competitive landscape

| Product / approach | Notes | Gap we fill |
|---|---|---|
| **Every Proxy** (Android) | Mature, feature-rich | UI often dense; UX modernization |
| **Proxy Server** apps on Play | Mixed quality, ads, unclear security | Trust + modern design + safe defaults |
| **SSH reverse tunnel** | Powerful, technical | Too hard for non-devs |
| **WireGuard / Tailscale** | Mesh VPN, not classic HTTP proxy | Different model; can *complement* Mode C |
| **Residential proxy vendors** | Paid IPs at scale | We’re **user-owned device**, not a marketplace |
| **iOS Shortcuts / Network Extension** | Limited background proxy hosting | Android is the right first platform |

**Differentiation:** safety-first defaults, beautiful status UI, honest remote mode, copy-paste proxy URLs, no root required.

---

## 7. Core feature set

### MVP (must ship)

1. **Start / Stop proxy** (foreground service + persistent notification)
2. **HTTP proxy** with CONNECT (HTTPS pass-through)
3. **SOCKS5** TCP (username/password auth — RFC 1929)
4. **Authentication** always on by default (random strong password on first run)
5. **Bind mode:** Local / LAN
6. **Display:** local IP(s), ports, public IP (lookup), connection status
7. **Copy proxy URL** + share sheet
8. **Live stats:** uptime, active conns, bytes ↑↓
9. **Connection log** (last N requests: host, status, bytes) — privacy-sensitive, local only
10. **Battery / network warnings** (Doze, data saver, Wi‑Fi isolation)
11. **Onboarding** explaining modes and risks in plain language
12. **Material 3** modern UI, light/dark

### v1.1

13. **Remote tunnel** (user provides VPS endpoint *or* optional managed relay)
14. **QR code** for proxy config (for companion setup)
15. **Allowlist / blocklist** of destination hosts
16. **Client allowlist** by source IP (LAN)
17. **Export/import** settings
18. **Tasker / intent** start-stop for automation

### Later

19. SOCKS5 UDP associate  
20. Multi-profile (home / work / travel)  
21. Fleet dashboard for multiple phones  
22. Bandwidth caps & schedules  
23. Desktop companion app  
24. WireGuard exit-node style integration  

---

## 8. Technical architecture

### Component diagram

```text
┌──────────────────────────────────────────────────────────────────┐
│                         Relay Android App                         │
│                                                                  │
│  ┌─────────────┐   ┌──────────────┐   ┌───────────────────────┐  │
│  │  UI (Compose)│◄─►│ ViewModels   │◄─►│ Domain / Use cases    │  │
│  └─────────────┘   └──────────────┘   └───────────┬───────────┘  │
│                                                    │             │
│  ┌─────────────────────────────────────────────────▼───────────┐ │
│  │              ProxyService (Foreground Service)              │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────────┐   │ │
│  │  │ HTTP Engine │  │ SOCKS5 Eng. │  │ Tunnel Client (opt)│   │ │
│  │  └──────┬──────┘  └──────┬──────┘  └─────────┬──────────┘   │ │
│  │         └────────────┬───┘                   │              │ │
│  │                      ▼                       ▼              │ │
│  │              Connection Manager / Stats / ACL               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│           │ OS network          │ Notifications  │ DataStore     │
└───────────┼─────────────────────┼────────────────┼───────────────┘
            ▼                     ▼                ▼
      Phone uplink           Status bar         Encrypted prefs
   (Wi‑Fi / cellular)        + actions
```

### Layers

| Layer | Responsibility |
|---|---|
| **UI** | Jetpack Compose screens, Material 3, navigation |
| **Presentation** | ViewModels, UI state (StateFlow), one-shot events |
| **Domain** | StartProxy, StopProxy, RotatePassword, GetEndpoints, ObserveStats |
| **Data** | DataStore / encrypted prefs, optional Room for logs |
| **Service** | Long-running proxy process, lifecycle, wake/network callbacks |
| **Engine** | Pure Kotlin (or native) socket proxy implementation |
| **Tunnel** | Optional reverse connection to relay/VPS |

### Process model

- **Single app process** for MVP (simpler).
- Proxy runs inside **`ProxyForegroundService`**.
- Notification channels: `proxy_status` (ongoing), `proxy_alerts` (errors).
- Sticky service with explicit user Start; Stop from notification or UI.

### Threading model (engine)

- **Acceptor thread / coroutine** per listening port
- **Per-connection coroutine** (Kotlin structured concurrency)
- **Bounded connection pool** (e.g. max 64–256 concurrent)
- **Dispatchers.IO** for sockets; never block Main

---

## 9. Proxy protocols & networking

### 9.1 HTTP proxy (MVP)

Support:

- `CONNECT host:443 HTTP/1.1` → tunnel raw TCP (required for HTTPS)
- Optional: plain `GET http://…` absolute-form forwarding (useful for legacy clients)

Do **not** implement HTTPS MITM.

**Auth:** HTTP Basic (`Proxy-Authorization`) for MVP; document that credentials appear in client configs.

### 9.2 SOCKS5 (MVP)

Support:

- Method negotiation: `NO AUTH` **disabled by default**; `USERNAME/PASSWORD` required
- Commands: `CONNECT` only in MVP
- IPv4, IPv6, domain names
- Later: `UDP ASSOCIATE`

### 9.3 Ports

| Service | Default port | Configurable |
|---|---|---|
| HTTP | `8080` | Yes |
| SOCKS5 | `1080` | Yes |

Detect port conflicts; offer next free port.

### 9.4 Binding

| Mode | Bind address | Notes |
|---|---|---|
| Local | `127.0.0.1` | Safest |
| LAN | `0.0.0.0` | Show all non-loopback IPs; warn on multiple interfaces |
| Remote | Local bind + tunnel advertises public endpoint | Phone still binds locally to tunnel |

### 9.5 Public IP detection

Use a small HTTPS call to a trusted IP echo service (e.g. `https://api.ipify.org` or self-hosted). Cache with TTL; refresh on network change.

Show:

- Local IPv4 / IPv6
- Public IPv4 / IPv6 (if any)
- Network type: Wi‑Fi / Cellular / VPN
- Carrier name when available

### 9.6 Why CGNAT breaks “just open a port”

```text
Client on Internet  ──x──►  Carrier CGNAT  ──x──►  Phone
                         (no inbound mapping)

Client on Internet  ──►  Relay Server  ◄── outbound tunnel ──  Phone
                         (works)
```

Document this in onboarding with a simple diagram.

### 9.7 Tunnel options (for Mode C design)

| Option | Pros | Cons | MVP? |
|---|---|---|---|
| **SSH reverse** (`RemoteForward`) | Simple for devs, user VPS | Needs SSH key UX | v1.1 optional |
| **frp / rathole / bore** | Purpose-built | User hosts server | v1.1 |
| **cloudflared quick tunnel** | Easy, free tier-ish | Not classic SOCKS; different model | Evaluate |
| **Managed Relay (your backend)** | Best UX: one toggle | Cost, liability, abuse | Product decision |
| **Tailscale / Headscale** | Great mesh | Client must be on tailnet | Complementary |

**Recommendation:**  
- MVP: Modes A + B only, with UI teaser for Remote.  
- v1.1: “Bring your own tunnel” (SSH/frp config).  
- v2: Optional managed relay if you accept ops + abuse load.

---

## 10. Android platform requirements

### Min / target SDK

| | Recommendation |
|---|---|
| **minSdk** | 26 (Android 8.0) — foreground service notifications mature |
| **targetSdk** | Latest stable (e.g. 35) |
| **language** | Kotlin 2.x |
| **UI** | Jetpack Compose + Material 3 |

### Permissions

| Permission | Why | When requested |
|---|---|---|
| `INTERNET` | Proxy + IP lookup | Install-time |
| `ACCESS_NETWORK_STATE` | Detect Wi‑Fi/cell changes | Install-time |
| `ACCESS_WIFI_STATE` | Read Wi‑Fi IP / SSID hints | Install-time |
| `FOREGROUND_SERVICE` | Keep proxy alive | Install-time |
| `FOREGROUND_SERVICE_SPECIAL_USE` or `…_DATA_SYNC` / `…_CONNECTED_DEVICE` | Android 14+ FGS types — pick the most accurate allowed type; document Play justification | Install-time |
| `POST_NOTIFICATIONS` | Android 13+ status notification | Runtime |
| `WAKE_LOCK` | Optional short holds during reconnect (minimize use) | Install-time |
| `RECEIVE_BOOT_COMPLETED` | Optional auto-start if user enabled | Install-time + user toggle |

**Avoid unless necessary:**

- `BIND_VPN_SERVICE` — only if you later build a local VPN-based capture mode
- Location permissions — don’t request “just for SSID” if not essential (Android 8–12 SSID restrictions)

### Foreground service design

- Type: prefer a type accepted by Play for “network proxy / remote access” use; prepare a **Play Console declaration**.
- Ongoing notification must show: **Running**, protocol, port, Stop action, optionally bytes.
- User can stop from notification — critical for trust.

### Battery optimizations

- Prompt user to disable battery optimization for Relay **only after** first start, with explanation.
- Listen to `ConnectivityManager.NetworkCallback` for reconnection.
- Do not hold permanent partial wake locks; rely on active sockets + FGS.

### OEM quirks

Xiaomi, Huawei, Oppo, Samsung: aggressive app killers. Provide an in-app **“Keep alive guide”** per OEM (deep links to settings where possible).

### Root

**Not required.** Root could enable iptables transparent proxy later — out of scope for MVP.

---

## 11. Security model

### Threat model (simplified)

| Threat | Mitigation |
|---|---|
| Open proxy abuse | Auth required; LAN default; no public bind without tunnel auth |
| Credential leak via screenshots | Optional hide password; show once + copy |
| Log leakage | Logs local-only; redaction toggle; clear logs |
| Malicious client on LAN | Strong password; optional client IP allowlist |
| MITM on local Wi‑Fi | Prefer SOCKS5 + short-lived passwords; educate user |
| App backup extracting secrets | EncryptedSharedPreferences / Encrypted DataStore |
| Server-side relay compromise (if managed) | Mutual auth, device keys, rate limits, audit logs |

### Mandatory security defaults

1. Generate **16+ char** random password on first launch  
2. Username default: `relay` (editable)  
3. **Reject** start if auth disabled (or require multi-step “I understand” for no-auth local-only)  
4. No-auth allowed **only** on `127.0.0.1`  
5. Certificate pinning for IP echo & managed relay APIs  
6. Clear-text traffic: proxy speaks clear control channel on LAN — document risk; optional later: TLS wrapper for proxy port  

### Auth UX

- Show password as dots; tap eye to reveal  
- **Rotate password** one tap (disconnects clients)  
- Biometric gate for revealing password (optional setting)

### What we do *not* do (MVP)

- Terminate TLS for inspection  
- Log full URLs with query secrets by default (log host + port only unless verbose mode)

---

## 12. Legal, policy & abuse considerations

> This section is product design guidance, not legal advice. Consult counsel before public launch.

### Legitimate uses

- Personal traffic routing through **your own** device  
- Development, QA, geo testing with consent  
- Temporary access for a team you control  

### Prohibited uses (ToS)

- Fraud, credential stuffing, spam  
- Circumventing law enforcement or court orders  
- Providing open proxies to anonymous third parties as a service without controls  
- Violating third-party site ToS in ways that create liability for you as a tool vendor (jurisdiction-dependent)

### Google Play policy notes

- Foreground service type must match actual behavior  
- Disclose data collection (if any analytics) in Play Data Safety form  
- If you offer managed relay that exits via user devices, you may be treated closer to a **proxy network operator** — expect stricter abuse controls  
- Avoid marketing as “undetectable residential proxies for sneaky growth hacking”

### In-app trust copy

Onboarding must state:

- Traffic exits via **this phone’s IP**  
- Clients who have the URL/password can use your connection  
- Mobile data may incur **carrier charges**  
- You are responsible for how the proxy is used  

---

## 13. UX / UI design system

### Design principles

1. **Status first** — big clear Running / Stopped state  
2. **One primary action** — Start or Stop  
3. **Copy in one tap** — proxy URL is the product  
4. **Honest networking** — explain why Remote needs a tunnel  
5. **Calm modern aesthetic** — not cyber-hacker neon cliché; trustworthy utility  

### Visual direction

| Token | Value (light) | Value (dark) |
|---|---|---|
| Brand primary | `#2563EB` (blue 600) | `#3B82F6` |
| Success / running | `#059669` | `#34D399` |
| Danger / stop | `#DC2626` | `#F87171` |
| Warning | `#D97706` | `#FBBF24` |
| Background | `#F8FAFC` | `#0B1220` |
| Surface | `#FFFFFF` | `#111827` |
| Text primary | `#0F172A` | `#F1F5F9` |
| Text muted | `#64748B` | `#94A3B8` |
| Radius | 16–24 dp cards | same |
| Font | **Plus Jakarta Sans** or system **Roboto / Geist** equivalent via Compose Google Fonts | |

**Avoid:** purple-on-white generic AI look, too many gradients, dense settings walls.

### Motion

- Soft status pulse when Running (subtle)  
- Port/IP copy → checkmark feedback 1s  
- Screen transitions: shared axis / fade, 200–250ms  

### Accessibility

- Content descriptions on icon buttons  
- Min 48 dp touch targets  
- Don’t rely on color alone for Running state (icon + label)  
- Dynamic type support  

### Information architecture

```text
Bottom nav (3 tabs)
├── Home          (status, start/stop, copy URL)
├── Activity      (connections log + stats charts)
└── Settings      (ports, auth, modes, advanced)

Modal / stack screens
├── Onboarding (first run)
├── Mode explainer
├── Keep-alive / OEM guide
├── How to connect (platform guides)
└── Remote tunnel setup (v1.1)
```

---

## 14. Screen-by-screen app design

### 14.1 Onboarding (3 pages)

**Page 1 — Welcome**  
Headline: *Turn this phone into your personal proxy*  
Body: Traffic you allow will exit through this device’s network.  
Illustration: phone as a small relay node (simple geometric).

**Page 2 — Safety**  
- Password protected by default  
- You control start/stop  
- Only share credentials with people you trust  
Primary CTA: Continue  

**Page 3 — Modes**  
Cards: Local / Wi‑Fi / Remote (Remote “Coming soon” or setup)  
CTA: *Generate secure password & finish*

### 14.2 Home (main)

```text
┌────────────────────────────────────────┐
│  Relay                          ⋯ menu │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  ● RUNNING · 01:24:09            │  │
│  │  Cellular · Public IP 85.x.x.x   │  │
│  │                                  │  │
│  │     [  Stop proxy  ]             │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Connection mode                       │
│  [ Local ] [ Wi‑Fi ✓ ] [ Remote ]      │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ HTTP proxy                       │  │
│  │ http://relay:••••@192.168.1.8:8080│ │
│  │ [ Copy ]  [ QR ]  [ Share ]      │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │ SOCKS5                           │  │
│  │ socks5://relay:••••@192.168.1.8:1080│
│  │ [ Copy ]  [ Show details ]       │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Stats                                 │
│  ↑ 12.4 MB   ↓ 48.1 MB   3 active      │
│                                        │
│  ⚠ Client isolation may block Wi‑Fi    │
│     guests — learn more                │
└────────────────────────────────────────┘
```

**Behaviors:**

- Start → request notification permission if needed → start FGS → animate to Running  
- Copy → clipboard + snackbar  
- Mode change while running → confirm restart  
- Banner if no LAN IP (mobile data + Wi‑Fi mode): suggest Remote  

### 14.3 Activity

- Top: sparkline or simple bar of bandwidth last 60 minutes  
- List: time, destination host, protocol, bytes, OK/Fail  
- Filters: All / Failed / HTTP / SOCKS  
- Empty state: *No connections yet — point a client at your proxy URL*

### 14.4 Settings

**Sections:**

1. **Access** — username, password, rotate, biometric reveal  
2. **Ports** — HTTP port, SOCKS port, enable/disable each protocol  
3. **Network** — preferred mode, bind interface, IPv6 toggle  
4. **Reliability** — start on boot, battery optimization link, OEM guides  
5. **Privacy** — log verbosity, clear logs, analytics opt-in  
6. **About** — version, licenses, ToS, privacy policy  

### 14.5 Notification (ongoing)

```text
Relay is running
Wi‑Fi · 3 connections · ↓ 1.2 MB/s
[Stop]  [Copy URL]
```

### 14.6 Empty / error states

| State | Message | Action |
|---|---|---|
| Port in use | Port 8080 is busy | Change port |
| No network | No active network | Open system settings |
| Auth failed flood | Multiple failed logins | Rotate password |
| Tunnel down | Remote endpoint unreachable | Retry / view logs |
| Data saver | System may throttle | Open data saver settings |

### 14.7 Microcopy guidelines

- Prefer “proxy URL” over “endpoint string”  
- Prefer “Wi‑Fi devices” over “L2 broadcast domain”  
- Errors: what happened + what to do  

---

## 15. Data model & local storage

### Preferences (DataStore)

```kotlin
data class ProxySettings(
  val httpEnabled: Boolean = true,
  val socksEnabled: Boolean = true,
  val httpPort: Int = 8080,
  val socksPort: Int = 1080,
  val username: String = "relay",
  val password: String,               // stored encrypted
  val bindMode: BindMode = BindMode.LAN,
  val startOnBoot: Boolean = false,
  val maxConnections: Int = 128,
  val loggingMode: LoggingMode = LoggingMode.HOST_ONLY,
  val tunnel: TunnelConfig? = null,
)

enum class BindMode { LOCAL, LAN, REMOTE }
enum class LoggingMode { OFF, HOST_ONLY, VERBOSE }
```

### Runtime state (in memory / service)

```kotlin
data class ProxyRuntimeState(
  val status: Status,                 // STOPPED, STARTING, RUNNING, ERROR
  val startedAt: Long?,
  val localAddresses: List<InetAddress>,
  val publicIp: String?,
  val networkType: NetworkType,
  val activeConnections: Int,
  val bytesUp: Long,
  val bytesDown: Long,
  val lastError: String?,
)

data class ConnectionEvent(
  val id: String,
  val timestamp: Long,
  val protocol: Protocol,
  val destinationHost: String,
  val destinationPort: Int,
  val bytesUp: Long,
  val bytesDown: Long,
  val success: Boolean,
  val errorMessage: String?,
)
```

### Logs storage

- Room DB or append-only file, **cap** at N rows (e.g. 1000) or 7 days  
- Never sync logs to cloud in MVP  

---

## 16. Optional cloud / remote-access layer

Only needed for true “proxy URL from anywhere.”

### Managed Relay (conceptual)

```text
Phone app  --outbound WSS/QUIC-->  Relay Edge  <--TCP--  Client
                 (auth device JWT)
```

**Components you’d need to build/ops:**

| Component | Role |
|---|---|
| Device auth | Sign-in or device key pairing |
| Session broker | Maps `deviceId` → connected tunnel |
| Edge proxies | Accept client SOCKS/HTTP, multiplex to device |
| Abuse systems | Rate limit, bandwidth cap, ToS enforcement, DMCA contact |
| Billing | If freemium remote access |
| Status API | Show remote URL in app |

**Cost drivers:** bandwidth (exit is on user’s phone, but **ingress to your edge** still costs if clients connect to you).

**Alternative (no your-cloud bandwidth):**  
App only configures user-owned VPS; you never see traffic. Better liability profile.

**Recommendation for v1:** **BYO tunnel**, not managed traffic proxy.

---

## 17. Tech stack recommendation

### App

| Area | Choice | Why |
|---|---|---|
| Language | Kotlin | Android standard |
| UI | Jetpack Compose + Material 3 | Modern, fast UI iteration |
| Architecture | MVVM + Use cases (+ optional Hilt) | Clear testability |
| Async | Coroutines + Okio/Java NIO | Natural for sockets |
| DI | Hilt | Standard |
| Settings | DataStore + security-crypto | Encrypted secrets |
| Logs DB | Room | Query + cap |
| Images/icons | Material Icons + simple custom vectors | Cohesive |
| Analytics | None in MVP; later optional opt-in | Privacy posture |
| Crash | Play Vitals / optional Sentry (opt-in) | Stability |

### Proxy engine options

| Option | Pros | Cons | Recommendation |
|---|---|---|---|
| **Pure Kotlin coroutines sockets** | Full control, no JNI | More work | **Best for MVP learning & control** |
| **Embed LittleProxy / similar on Android** | Faster feature parity | JVM assumptions, size, mobile fit | Evaluate carefully |
| **Rust engine via JNI (e.g. custom)** | Perf + safety | Build complexity | Later if needed |
| **Go mobile** | Good net libs | Heavy toolchain | Not first choice |

**MVP engine plan:** implement a focused Kotlin engine:

- `HttpProxyServer`
- `Socks5ProxyServer`
- Shared `OutboundConnector` + `Pipe` (bidirectional byte copy)
- `Authenticator`
- `StatsSink`

### Build & quality

- Android Gradle Plugin latest stable  
- `ktlint` / Detekt  
- Unit tests for protocol parsers  
- Instrumented tests for service start  
- CI: GitHub Actions (assemble + test)

### Backend (only if managed relay)

- Edge: Rust/Go for high-conn proxy  
- Control plane: Kotlin/Node + Postgres  
- Auth: device keys  
- **Defer** until product validates local/LAN usage  

---

## 18. Project structure (codebase)

```text
relay/
├── app/
│   ├── src/main/
│   │   ├── AndroidManifest.xml
│   │   ├── java/com/example/relay/
│   │   │   ├── RelayApp.kt
│   │   │   ├── MainActivity.kt
│   │   │   ├── di/
│   │   │   ├── ui/
│   │   │   │   ├── theme/
│   │   │   │   ├── home/
│   │   │   │   ├── activity/
│   │   │   │   ├── settings/
│   │   │   │   ├── onboarding/
│   │   │   │   └── components/
│   │   │   ├── service/
│   │   │   │   ├── ProxyForegroundService.kt
│   │   │   │   └── ProxyNotification.kt
│   │   │   ├── domain/
│   │   │   ├── data/
│   │   │   │   ├── settings/
│   │   │   │   └── log/
│   │   │   ├── engine/
│   │   │   │   ├── http/
│   │   │   │   ├── socks/
│   │   │   │   ├── auth/
│   │   │   │   ├── pipe/
│   │   │   │   └── stats/
│   │   │   ├── network/
│   │   │   │   ├── LocalIpProvider.kt
│   │   │   │   ├── PublicIpProvider.kt
│   │   │   │   └── NetworkMonitor.kt
│   │   │   └── tunnel/          # v1.1
│   │   └── res/
│   └── build.gradle.kts
├── docs/
│   └── ANDROID_MOBILE_PROXY_APP_DESIGN.md  (this file)
├── gradle/
└── README.md
```

---

## 19. MVP scope vs later phases

### MVP definition of done

- [ ] Install APK on real device  
- [ ] Start proxy; notification visible  
- [ ] From a laptop on same Wi‑Fi:  
  `curl -x http://user:pass@PHONE_IP:8080 https://api.ipify.org`  
  returns **phone’s public IP**  
- [ ] SOCKS5 same check with `curl --socks5`  
- [ ] Wrong password rejected  
- [ ] Stop kills listeners; clients disconnect  
- [ ] Stats update  
- [ ] App survives screen off ≥ 30 minutes on at least one stock Android device  
- [ ] Light + dark UI polished  
- [ ] Onboarding + danger copy present  

### Explicitly cut from MVP

- Managed cloud relay  
- UDP  
- MITM  
- Multi-user accounts  
- iOS  
- Root mode  

---

## 20. Implementation roadmap

### Phase 0 — Foundations (3–5 days)

- Create Android project (Compose, minSdk 26)  
- Theme, navigation shell, onboarding placeholders  
- Settings model + encrypted password generation  
- Network IP utilities  

### Phase 1 — Engine (1–2 weeks)

- TCP listen + accept loop  
- HTTP CONNECT + Basic auth  
- SOCKS5 CONNECT + user/pass  
- Bidirectional pipe + connection limits  
- Unit tests for handshake parsers  
- Manual test harness (from emulator/laptop)  

### Phase 2 — Service integration (3–5 days)

- Foreground service + notification actions  
- Bind modes  
- Start/stop from UI  
- Stats plumbing  
- Connectivity callback (restart listeners on interface change if needed)  

### Phase 3 — Product UI polish (1 week)

- Home status design  
- Copy/share/QR  
- Activity log  
- Settings  
- Empty/error/OEM battery guides  
- Light/dark QA  

### Phase 4 — Hardening (1 week)

- Fuzz auth / malformed handshakes  
- Leak canaries (password in logs)  
- Battery measurements  
- Play policy prep (FGS declaration text)  
- Privacy policy draft  

### Phase 5 — Remote access (post-MVP, 2–4 weeks)

- BYO SSH/frp config UX  
- Or managed relay prototype  
- Failure UX for tunnel flaps  

### Phase 6 — Launch

- Closed testing track  
- Crash-free sessions target  
- Public listing if Play distribution chosen  

**Calendar estimate (solo experienced Android dev):**  
~5–8 weeks to a solid MVP (LAN proxy), longer with managed remote.

---

## 21. Testing strategy

### Unit

- HTTP request line parsing  
- SOCKS5 greeting / auth / request parsing  
- Password verification  
- Settings migration  

### Integration

- Engine on loopback with OkHttp client configured as proxy  
- Assert exit IP via mock server / ipify in instrumented tests (network-dependent)  

### Manual matrix

| Device class | Focus |
|---|---|
| Pixel stock | Baseline FGS behavior |
| Samsung | Battery / kill |
| Xiaomi | Autostart permissions |
| Emulator | Protocol correctness |
| iOS client / Windows / macOS | Client compatibility |

### Acceptance tests (human)

1. Same-Wi‑Fi browser proxy  
2. `curl` HTTP + SOCKS5  
3. Wrong password  
4. Kill app from recents — service should persist if FGS (verify expected behavior)  
5. Toggle airplane mode → recovery  
6. Mobile data only + Local mode  
7. Notification Stop  

### Security tests

- Port scan from another LAN machine without creds → fail  
- Extremely long hostname / bad headers → no crash  
- Max connections stress  

---

## 22. Performance, battery & reliability

### Performance targets (MVP)

| Metric | Target |
|---|---|
| Idle CPU while running, 0 conns | < 1% on mid device |
| Concurrent TCP tunnels | ≥ 64 stable |
| Throughput | Saturate typical Wi‑Fi for single stream within 20% of direct |
| Start time to listening | < 1s after service start |
| Memory | < 80 MB baseline service |

### Battery

- No timers at 1 Hz waking CPU for UI; UI samples service binder/flows at 1s only when visible  
- Coalesce stats updates  
- Warn user when on cellular + high transfer  

### Reliability

- Auto-restart listener if bind fails transiently  
- Exponential backoff for public IP refresh  
- Crash isolation: engine errors → ERROR state + notification, not silent death  

---

## 23. Distribution & packaging

### Options

| Channel | Pros | Cons |
|---|---|---|
| **Google Play** | Trust, updates | Policy scrutiny on proxy/FGS |
| **Sideload APK / GitHub Releases** | Full control | Harder for non-technical users |
| **F-Droid** | FOSS audience | Must meet FOSS requirements |
| **Enterprise MDM** | B2B | Different product motion |

**Recommendation:** Start with **Play internal testing** + GitHub APK for power users.

### App identity

- Application ID: `app.relay.proxy` (example)  
- Versioning: semver  
- Signing: Play App Signing  

### Store listing essentials

- Title: Relay — Phone Proxy Server  
- Short description: Turn your Android phone into a secure HTTP & SOCKS5 proxy  
- Screenshots: Home running, copy URL, activity, settings  
- Feature graphic: clean device + connection metaphor  
- Data safety: no data collected (if true)  

---

## 24. Monetization options

| Model | Fit |
|---|---|
| **Free open source** | Trust, adoption; donate |
| **Paid app** | Simple; may limit adoption |
| **Free LAN + paid Remote** | Aligns with cost of relay infra |
| **Tip jar / Pro unlock** | OEM guides, QR, multi-profile, advanced ACL |

Avoid selling “access to other users’ phones.” That is a different, high-risk business.

---

## 25. Risks & open decisions

### Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Play rejects FGS type | High | Policy review early; fallback sideload |
| Users expect public URL on cellular | High | UX education; remote phase |
| Open proxy abuse if users disable auth | Critical | Force auth; warnings |
| Battery complaints | Medium | Guides + efficient engine |
| Carrier ToS on “tethering-like” use | Medium | User responsibility copy |
| Complex OEM kills | Medium | Per-OEM docs |
| Legal liability if managed relay | High | Prefer BYO tunnel first |

### Open decisions (need product owner choice)

1. **Final name & branding**  
2. **Managed relay: yes/no/when?**  
3. **Open source vs closed**  
4. **minSdk 26 vs 28 vs 29**  
5. **Single port multiplexer vs separate HTTP/SOCKS ports**  
6. **Account system or fully local app**  
7. **Whether auto-start on boot is default off (recommended off)**  

---

## 26. Appendix

### A. Glossary

| Term | Meaning |
|---|---|
| **HTTP CONNECT** | Method to tunnel TCP (usually TLS) through an HTTP proxy |
| **SOCKS5** | Lower-level proxy protocol for TCP/UDP |
| **CGNAT** | Carrier-grade NAT — many subscribers share public IPs; blocks inbound |
| **FGS** | Foreground Service — Android mechanism for user-visible long tasks |
| **Exit IP** | Public IP seen by destination servers |
| **Bind address** | Local interface/address the proxy listens on |

### B. Sample client configs

**curl HTTP:**

```bash
curl -x http://relay:PASSWORD@192.168.1.8:8080 https://api.ipify.org
```

**curl SOCKS5:**

```bash
curl --socks5 relay:PASSWORD@192.168.1.8:1080 https://api.ipify.org
```

**Firefox:** Settings → Network → Manual proxy → HTTP host/port + SOCKS host/port as needed.

**Windows system proxy:** Settings → Network & Internet → Proxy → Manual setup (HTTP). SOCKS often needs app-level support.

### C. Notification channel IDs

- `relay_proxy_status` — low/default importance ongoing  
- `relay_proxy_alerts` — default importance  

### D. First-run password generation

- 18 characters from `A–Z a–z 0–9` (no ambiguous `O0Il1` if user-facing typing expected)  
- Or 10 bytes base32  
- Store only in encrypted prefs; allow rotate  

### E. Minimal AndroidManifest service sketch

```xml
<service
    android:name=".service.ProxyForegroundService"
    android:exported="false"
    android:foregroundServiceType="specialUse">
    <property
        android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE"
        android:value="Local HTTP/SOCKS proxy server requested by the user" />
</service>
```

*(Exact FGS type must be validated against current Play rules at implementation time.)*

### F. MVP build checklist

- [ ] Design tokens applied in Compose theme  
- [ ] Onboarding complete  
- [ ] Password generated & encrypted  
- [ ] HTTP CONNECT works with auth  
- [ ] SOCKS5 CONNECT works with auth  
- [ ] LAN IP detection  
- [ ] Public IP display  
- [ ] Foreground notification Start/Stop/Copy  
- [ ] Stats + basic log  
- [ ] Battery optimization deep link  
- [ ] Privacy policy URL  
- [ ] Play Data Safety form drafted  
- [ ] Real-device test on Wi‑Fi with laptop curl  

### G. Future doc set (to write during build)

| Doc | Purpose |
|---|---|
| `ENGINE_SPEC.md` | Byte-level protocol behavior |
| `THREAT_MODEL.md` | Expanded security |
| `PLAY_POLICY.md` | Store submission notes |
| `TUNNEL_SPEC.md` | Remote mode protocol |
| `UI_KIT.md` | Component inventory |

---

## Summary

**Relay** is a no-root Android app that runs an authenticated **HTTP + SOCKS5** proxy inside a **foreground service**, with a **status-first modern UI** that makes the **proxy URL** effortless to copy.  

**MVP** delivers **Local + same-Wi‑Fi** proxying with strong security defaults.  
**True “use this proxy from anywhere on the internet”** requires a **remote tunnel or relay** because of **carrier CGNAT** — that is phase 2 architecture, not a checkbox on day one.  

This document is sufficient to start implementation: product scope, architecture, Android constraints, UI structure, security defaults, roadmap, and test plan are defined. Next concrete step after approval: **Phase 0 Android project scaffold + HTTP CONNECT engine spike**.

---

*End of design document.*
