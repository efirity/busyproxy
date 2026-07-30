# API reference (control plane)

**Last updated:** 2026-07-30  
**Base URL:** `https://busyproxy.net`

Auth header (when required):

```http
Authorization: Bearer <session_token>
```

---

## Public (no auth)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/whoami` | Exit IP + geo for the caller (use through proxy to see phone egress) |
| GET | `/api/public/whoami` | **Alias** of `/api/whoami` (legacy) |
| GET | `/api/status` | Public system status JSON |
| GET | `/api/auth/config` | Twilio configured?, OTP length, etc. |
| GET | `/api/auth/phone-hint` | Dial prefix from visitor IP |
| GET | `/api/auth/deletion-reasons` | List of account-deletion reasons |

### `GET /api/whoami`

Example response:

```json
{
  "ok": true,
  "ip": "89.x.x.x",
  "country": "Moldova",
  "countryCode": "MD",
  "city": "Chisinau",
  "isp": "…",
  "asn": "AS…",
  "org": "…",
  "source": "busyproxy",
  "time": "2026-07-30T…"
}
```

Operator / client check through the gate:

```bash
curl -x http://USER:PASS@busyproxy.net:18080 https://busyproxy.net/api/whoami
```

---

## Auth (`/api/auth`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/otp/start` | No | Send OTP (displayName for new users) |
| POST | `/api/auth/otp/verify` | No | Verify code → session token + user |
| GET | `/api/auth/session` | Bearer | Current session |
| POST | `/api/auth/logout` | Bearer | Revoke session |
| PATCH | `/api/auth/profile` | Bearer | Update display name / email |
| DELETE | `/api/auth/account` | Bearer | Soft-delete account (**reason required**) |

### Delete account body

```json
{
  "reasonCode": "not_earning",
  "reasonText": "optional unless reasonCode is other"
}
```

---

## Edge / agent (selected)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/edge/agent/hello` | Device enroll / heartbeat (session or device secret) |
| POST | `/api/edge/agent/bye` | Agent disconnect |
| GET | `/api/edge/architecture` | Public architecture snapshot |
| POST | `/api/edge/proxy-exit-test` | Admin: live sticky/rotate exit via whoami |
| POST | `/api/edge/devices/:id/probe-ip` | Admin: probe device exit |
| … | `/api/edge/*` | Credentials, fleet, traffic jobs (admin) |

WSS tunnel: `wss://busyproxy.net/v1/tunnel` (device hello with device secret).

---

## Stripe / wallet (earner)

See [STRIPE_INTEGRATION.md](./STRIPE_INTEGRATION.md) and [STRIPE_CONNECT.md](./STRIPE_CONNECT.md).  
Typical paths under `/api/stripe/*` with Bearer session.

---

## Admin

- Console UI: https://admin.busyproxy.net (OTP + admin phone)
- APIs under `/api/admin/*` and protected edge routes
- Optional automation: `EDGE_ADMIN_TOKEN` / `ADMIN_API_TOKEN`

---

## Implementation map

| Area | Server files |
|------|----------------|
| Auth | `server/auth-api-plugin.ts`, `server/twilio-auth.mjs` |
| Whoami | `server/public-whoami-plugin.ts` |
| Status | `server/status-api-plugin.ts` |
| Edge | `server/edge-api-plugin.ts`, `edge-gateway.mjs`, `edge-proxy-server.mjs`, `edge-tunnel-hub.mjs` |
| Exit probe | `server/edge-traffic-probe.mjs` |
| Stripe | `server/stripe-api-plugin.ts` |
| Deletion log | `server/account-deletion-log.mjs` |

Plugins are registered in `vite.config.ts` and run under `scripts/start-prod.mjs` in production.
