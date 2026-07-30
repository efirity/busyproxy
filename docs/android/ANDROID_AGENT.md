# BusyProxy Android agent

**Status:** Debug APK builds and installs (2026-07-30).  
Package id: `net.busyproxy.app.debug` · source in `/android`.

## Purpose

Earner-facing Android app:

- OTP login (Twilio via control API)
- Explicit **Start / Stop sharing**
- Reverse tunnel to BusyProxy edge
- Network modes (Wi‑Fi only, mobile only, prefer-*)
- Balance + rates UI — **no proxy URI**

Operators connect via portal-minted credentials (sticky/rotate) documented in [PROXY_ACCESS.md](../PROXY_ACCESS.md).

## Mapping: PocketRelay spec → BusyProxy

| Spec topic | Implementation |
|---|---|
| Reverse tunnel topology | `TunnelClient` + edge `/api/edge/agent/hello` |
| Network pin / modes | `NetworkSelector`, `NetworkMode` |
| Destination safety | `DestinationPolicy` (80/443, private CIDR block) |
| Foreground service | `RelayForegroundService` (`specialUse`) |
| Consent + caps | Consent screen, daily cap in DataStore |
| No open proxy | Auth required; no listen port on phone |
| Marketplace | **Out of scope** (BusyProxy operator portal handles B2B) |

## Critical proof (before calling “mobile egress ready”)

```text
Client → gate (auth) → stream open → phone socket bound to CELLULAR Network
→ destination sees carrier public IP while Wi‑Fi still connected
```

Until the edge multiplexes real CONNECT streams to the phone WSS, enrollment + tunnel “hello” work against control plane; full byte path is P1 on the edge.

## API surface used by the app

| Call | Role |
|---|---|
| `POST /api/auth/otp/start` | SMS OTP |
| `POST /api/auth/otp/verify` | Session token |
| `POST /api/edge/agent/hello` | Device enroll / reconnect |
| `GET  /api/stripe/wallet` | Optional balance |
| `WSS agent.busyproxy.net/v1/tunnel` | Data plane (P1 full mux) |

## Safety defaults

- Roaming: off  
- Daily cap: 1 GB default  
- Ports: 80, 443 only  
- Payload logging: never  
- Auto-start on boot: off  

## Build

See [android/README.md](../../android/README.md).
