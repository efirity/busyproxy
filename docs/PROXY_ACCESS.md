# BusyProxy — proxy access guide (operators)

**Related:** [docs/README.md](./README.md) · [API_REFERENCE.md](./API_REFERENCE.md) (`/api/whoami`) · Admin live exit test uses BusyProxy whoami only (no third-party hosts in the UI).

## Goal

Use earner phones as **mobile residential exits** via a **stable URI**.  
Earners never see host/user/pass. You mint credentials in **Portal → Proxy access**.

## Architecture (short)

```text
Your client  --auth+params-->  gate.busyproxy.net:18080 (HTTP) / :11080 (SOCKS5)
                                      |
                               sticky / rotate resolver
                                      |
                         reverse tunnel → phone (cellular preferred)
```

- **Do not** put phone public IPs in DNS or client configs.  
- Phone IP change = agent reconnect; **gate host stays the same**.

## Ports (DO droplet / edge VM)

| Service | Port | Purpose |
|---|---|---|
| Web (marketing/app/portal) | 80/443 → 8080 | Product UI |
| **HTTP CONNECT gate** | **18080** | Customer proxy |
| **SOCKS5 gate** | **11080** | Customer proxy |
| Agent WSS | 443 path `/v1/tunnel` | Phone reverse tunnel |

Open 18080/11080 only to **your office IPs** (or customers) via UFW / cloud firewall.

## Username grammar

```text
{baseUser}[-session-{id}][-country-{cc}][-type-mobile|residential|any][-mode-sticky|rotate]
```

| Token | Meaning |
|---|---|
| `type-mobile` | **Only cellular** exits (default product — passes mobile IP checkers) |
| `type-residential` | Wi‑Fi / fixed broadband only |
| `type-any` | Both |
| `mode-rotate` | Pool pick; auto skip offline devices |
| `mode-sticky` | Pin `session-{id}` to one device |
| `session-{id}` | Sticky key (required for sticky) |
| `country-md` | Filter ISO country |

### Rotating (auto re-route)

```text
http://bp_XXXX-type-mobile-mode-rotate:PASSWORD@gate.busyproxy.net:18080
socks5://bp_XXXX-type-mobile-mode-rotate:PASSWORD@gate.busyproxy.net:11080
```

If the chosen phone disconnects, the **next** request uses another healthy mobile exit.

### Sticky (fixed exit until you change session)

```text
http://bp_XXXX-session-mysession01-type-mobile-mode-sticky:PASSWORD@gate.busyproxy.net:18080
```

| Event | Behavior |
|---|---|
| Same session, device online | Same phone / same exit identity |
| Device offline | **`sticky_device_offline`** — **no** silent failover |
| Need new sticky IP | Change `session-…` to a new id (or Release session in portal) |

## Mobile appearance for proxy checkers

IP databases classify **ASN / carrier**, not HTTP headers.

| Pool | Checker result (typical) |
|---|---|
| `type-mobile` (cellular agent) | Mobile / cellular carrier |
| `type-residential` (Wi‑Fi) | Residential ISP |
| Datacenter VPS (wrong design) | Hosting — **we never exit from DO for production product** |

**Rule:** production “mobile proxy” SKU **must** set `type-mobile` and only accept agents with `network=cellular`.

P0 note: until Android reverse-tunnel dial is live, the gate may dial targets from the edge host while **assigning** a mobile device identity for routing logic. P1: bytes leave via the phone tunnel so public IP = carrier.

## Admin portal flow

1. **Proxy access** → Mint mobile credential (set allowlist to your IP).  
2. Copy **Rotating** or **Sticky** URI.  
3. **Test rotating / sticky route** (shows selected device, carrier, ASN).  
4. **Fleet** tab: enable/disable exits without earner seeing proxy details.  
5. Sticky table: see pinned sessions; **Release** to free a session id.

### Per-device proxy (open a phone → use immediately)

On **Devices** → open a row / **Full details**, the inspector shows **Proxy for this device**:

- **One sticky URI** pinned to that phone (`type-any` + bound credential + stable `session-dev…`)
- Works whether the phone is on **Wi‑Fi or mobile** — traffic always tunnels through that device; exit IP follows its current network
- Auto-created / refreshed when the device is online with exit on
- Copy paste into curl / browser extension / app
- API: `GET /api/edge/devices/:deviceId/proxy` (admin session)

When the phone is offline the URI may still show but connects fail until sharing is on.

```text
http://bp_XXXX-session-dev……-type-any-mode-sticky:PASS@gate.busyproxy.net:18080
```

## API (control plane)

| Method | Path | Use |
|---|---|---|
| GET | `/api/edge/status` | Snapshot + listeners |
| POST | `/api/edge/credentials` | Mint |
| POST | `/api/edge/connect-check` | Dry-run auth+route |
| POST | `/api/edge/route` | Same as connect-check |
| GET | `/api/edge/sessions` | Sticky list |
| POST | `/api/edge/sessions/release` | Drop sticky bind |

## curl examples

```bash
# Rotating mobile
curl -x "http://bp_USER-type-mobile-mode-rotate:PASS@gate.busyproxy.net:18080" https://api.ipify.org

# Sticky mobile
curl -x "http://bp_USER-session-job42-type-mobile-mode-sticky:PASS@gate.busyproxy.net:18080" https://api.ipify.org
```

## Failure codes

| Code | Meaning | Action |
|---|---|---|
| `invalid_credentials` | Bad user/pass | Re-mint / check vault |
| `ip_not_allowed` | Source not on allowlist | Add office IP |
| `no_capacity` | No online matching exits | Wait for phones / open country |
| `sticky_device_offline` | Pinned phone down | New session id or wait reconnect |
| `session_required` | Sticky without session | Add `-session-…` |

## Before Android app

This control plane + gate listeners + portal URI builder is the **contract** the Android agent must implement:

1. Outbound WSS to `agent.busyproxy.net`  
2. Accept multiplexed CONNECT streams  
3. Dial targets on device network (prefer cellular for mobile SKU)  
4. Report bytes for payroll  

Until then, portal routing + sticky/rotate logic is fully testable via `/api/edge/connect-check`.
