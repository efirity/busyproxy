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
| Foreground service | `RelayForegroundService` (`specialUse`, sticky) |
| Keep-alive | `SharingKeepAlive` + boot/watchdog + battery unrestricted |
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
- Auto-start on boot: **only if user left sharing ON** (`sharingWanted` + session)

## Keep-alive (background / close)

Android will not let us silently reopen the full UI forever. We keep **earning** alive instead:

| Layer | Behavior |
|-------|----------|
| **Foreground service** | Ongoing notification while sharing; `START_STICKY` |
| **`stopWithTask=false`** | Swiping app from recents does not kill FGS |
| **`sharingWanted` flag** | Survives process death; cleared on Stop / logout / delete |
| **Boot / update** | `KeepAliveReceiver` restarts FGS if wanted + session |
| **Watchdog alarm** | ~12 min recheck; 5s quick revive after unexpected destroy |
| **Battery unrestricted** | Prompt + home card so OEMs don’t kill the service |
| **Reopen UI** | User taps the ongoing notification (Play-compliant) |

**Cannot survive:** system **Force stop**, or user **Stop sharing**.  
Document for Play: FGS specialUse + battery exemption justified by reverse-tunnel earner session.

## Build

See [android/README.md](../../android/README.md).
