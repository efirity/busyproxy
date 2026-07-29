# BusyProxy network architecture

**Role:** How operators reach earner phones as residential exits — fast, stable, and without exposing technical details to earners.

## The core problem

| Approach | Why it fails on mobile |
|---|---|
| Customer dials phone public IP:port | Carrier **CGNAT**, IP changes every session, inbound blocked |
| DynDNS to phone IP | Still inbound + NAT; flaky; not scalable |
| UPnP / hole punch | Unreliable on cellular; security nightmare |

**Decision:** phones never accept inbound connections.

## Solution: reverse tunnel + edge gateways

```text
  [B2B client / scraper]
           |
           | HTTPS / HTTP CONNECT / SOCKS5
           | host: gate.busyproxy.net  (or proxy.busymate.net)
           | auth: generated user:pass  (operator-managed)
           | optional: source IP allowlist
           v
  ┌─────────────────────────────┐
  │  Edge gateway cluster       │  anycast / L4 LB, multi-region
  │  - auth + IP ACL            │
  │  - sticky session map       │
  │  - route → device tunnel    │
  └─────────────┬───────────────┘
                | multiplexed streams over long-lived tunnel
                v
  ┌─────────────────────────────┐
  │  Control plane              │  device registry, keys, policy
  │  agent.busyproxy.net        │  WSS / QUIC / mTLS
  └─────────────┬───────────────┘
                | OUTBOUND only from phone
                v
  ┌─────────────────────────────┐
  │  Device agent (Android)     │  shares Wi‑Fi / mobile
  │  dials targets on behalf of │  reports bytes for payroll
  │  edge streams               │
  └─────────────────────────────┘
```

### Why this is fast

1. **Warm tunnels** — agent keeps a persistent connection (WebSocket over TLS or QUIC). No dial-to-phone per request.
2. **Regional edges** — client hits nearest POP; tunnel already terminates in-region when possible.
3. **Multiplexing** — many CONNECT sessions over one tunnel (HTTP/2-style stream IDs or yamux).
4. **Sticky sessions** — same `user:pass` or session id pins to same device for cookie/IP consistency.
5. **No DNS chase** — public endpoint is stable; mobile IP changes only force a **re-register of the tunnel socket**, not a new customer hostname.

### Mobile IP change flow

```text
1. Phone on cell IP 10.x via CGNAT → opens tunnel to agent.busyproxy.net
2. Control plane binds device_id → live socket S1
3. Carrier rotates public mapping → TCP drops
4. Agent reconnects in <2s with device_id + device_secret
5. Control plane rebinds device_id → socket S2
6. In-flight streams fail once; new streams succeed on S2
7. Customer endpoint host:port NEVER changes
```

## Domains

| Hostname | Role | Brand |
|---|---|---|
| `busyproxy.net` | Marketing + earner app + dashboard | Consumer |
| `portal.busyproxy.net` | Operator admin | Internal |
| **`gate.busyproxy.net`** | Customer HTTP/SOCKS entry (primary) | Product |
| **`agent.busyproxy.net`** | Device agent tunnel endpoint | Infra |
| `proxy.busymate.net` | Optional **B2B alias** CNAME → gate | If you sell under BusyMate |

**Recommendation:** keep **gate.busyproxy.net** as the real proxy entry. Use **proxy.busymate.net** only as a commercial alias if BusyMate is the reseller brand — same cluster underneath.

Do **not** put per-user IPs in DNS.

## Credentials (transparent to earner)

Earners **never** see:

- Proxy host / port  
- Username / password  
- Allowlists  

Operators (admin portal) can:

1. **Enable exit** on a device (policy flag; earner only sees “Sharing on”)  
2. **Mint access credentials** (`bp_…` user + random secret)  
3. **Bind credential → device pool** (single device, country, or ASN class)  
4. **Whitelist source IPs** that may use that credential (empty = any)  
5. **Rotate / revoke** without app update  

Auth on edge: HTTP Proxy-Authorization or SOCKS5 user/pass.

## Device control without “user knowing”

| Control | Mechanism | Earner UI |
|---|---|---|
| Start/stop exit capacity | Policy on control plane + agent honors | Optional: only global “Sharing” toggle |
| Force Wi‑Fi only | Device setting + server policy override | Settings toggle they chose, or silent policy for risk |
| Disable abused device | `status=banned` / tunnel rejected | “Sharing unavailable” soft message later |
| Metering | Agent reports bytes; edge double-counts | Balance + GB only |

Server is source of truth for **whether traffic is accepted**.

## Security

- Device auth: `device_id` + long `device_secret` (rotated), mTLS later  
- Edge: credential hash at rest; IP ACL; rate limits; concurrent stream caps  
- No earner-facing proxy ports on the phone  
- RLS / service role for DB; admin portal separate from marketing  

## Implementation phases

| Phase | What |
|---|---|
| **P0 (this codebase)** | Control plane API: devices, credentials, allowlists, tunnel registry (sim + real agent protocol stub) |
| **P1** | Real Android agent: outbound WSS, CONNECT dial, byte counters |
| **P2** | Multi-region edge + sticky LB + busymate CNAME |
| **P3** | QUIC transport, geo targeting product SKUs |

## Local / preview endpoints

| Path | Purpose |
|---|---|
| `GET /api/edge/status` | Architecture + live registry snapshot |
| `POST /api/edge/agent/hello` | Device registers / heartbeats (simulates phone) |
| `POST /api/edge/credentials` | Mint operator credential |
| `PATCH /api/edge/credentials/:id` | Allowlist, enable, bind device |
| `POST /api/edge/connect-check` | Validate client would be allowed (auth+IP+device online) |
