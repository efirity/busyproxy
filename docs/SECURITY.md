# Security

**Last updated:** 2026-07-30

How BusyProxy protects the web control plane, the Android earner agent, and the reverse-tunnel edge.

---

## 1. Transport security

| Surface | Protocol | Notes |
|---------|----------|--------|
| Web + REST API | HTTPS (`busyproxy.net`) | Let’s Encrypt via certbot / nginx |
| Phone agent tunnel | WSS (`wss://busyproxy.net/v1/tunnel`) | TLS under WebSocket |
| Customer proxy gate | HTTP CONNECT `:18080`, SOCKS `:11080` | Auth required (credentials) |
| Android cleartext | **Disabled** | `usesCleartextTraffic=false` + network security config |

### Certificate pinning (Android)

**Code:** `android/app/src/main/java/net/busyproxy/app/network/SecureOkHttp.kt`

Both:

- REST (`ApiClient`)
- Reverse tunnel WSS (`TunnelClient`)

use OkHttp **`CertificatePinner`** with **SPKI public-key pins**.

#### Renewal-safe design (no app update on every LE leaf renew)

We **do not** rely only on the short-lived leaf certificate for `busyproxy.net` (those rotate ~every 60–90 days, often with a new key).

OkHttp accepts the TLS connection if **any** configured pin matches **any** certificate in the validated chain. Therefore we pin:

| Pin class | Purpose |
|-----------|---------|
| **ISRG Root X1 / X2** | Long-lived trust anchors |
| **LE intermediates** (YE1, R3, R10, R11, E5, E6, …) | Survive leaf renewals; buffer for path changes |
| **Current leaf** | Extra pin; may change on renew — **not required alone** |

**Result:** a normal Let’s Encrypt **leaf renew** continues to work without shipping a new APK.

#### When an app update *is* required

If Let’s Encrypt (or the host) moves to a **brand-new intermediate or root** that is **not** in `SecureOkHttp.kt`:

```bash
./android/scripts/print-ssl-pins.sh busyproxy.net
```

1. Add new `sha256/…` pins to `SecureOkHttp.kt`
2. Ship an app update **before** cutting the server over to that chain

Hosts pinned: `busyproxy.net`, `www`, `gate`, `admin`, `agent` (and `**.` patterns where supported).

---

## 2. Authentication & sessions

| Mechanism | Use |
|-----------|-----|
| **Phone + SMS OTP** (Twilio) | Earner + admin login |
| **Bearer session token** | `Authorization: Bearer …` on `/api/*` after verify |
| **Admin phone allowlist** | `ADMIN_PHONES` / test number — operator console only |
| **Device secret** | Agent enroll `/api/edge/agent/hello` + WSS hello |
| **Play review fixed OTP** | Two demos: `+15550100001` / `246810` and `+15550100002` / `135790` (no SMS; override via `PLAY_REVIEW_ACCOUNTS`) |

Details: [AUTH_AND_ACCOUNTS.md](./AUTH_AND_ACCOUNTS.md).

### Account deletion

- Soft-delete: `status=deleted`, **phone retained** (blocks re-registration until support reactivates)
- **Required deletion reason** (predefined codes + “Other” free text)
- Logged to `.data/account-deletions.json` and optional DB columns
- In-app + web + https://busyproxy.net/account-deletion

---

## 3. Authorization model

| Actor | Can see / do |
|-------|----------------|
| **Earner (app/web)** | Own wallet, share toggle, account settings — **never** proxy URIs/passwords |
| **Operator (admin)** | Fleet, devices, mint sticky/rotate credentials, live exit test |
| **Proxy customer** | HTTP/SOCKS with minted username/password only |

Proxy credentials are mintable only from the admin/edge control plane. See [PROXY_ACCESS.md](./PROXY_ACCESS.md).

---

## 4. Edge / proxy security

| Control | Behavior |
|---------|----------|
| Reverse tunnel only | Phone opens **outbound** WSS; no inbound open proxy on the phone |
| Credential auth | Gate requires valid proxy username/password |
| Destination policy (Android) | Blocks private/reserved ranges; focuses egress on allowed targets |
| Allowlists (credentials) | Optional IP allowlists on credentials |
| Rate limits | Edge rate-limit module (abuse resistance) |

Exit checks for operators use **BusyProxy whoami** (`GET /api/whoami`), not third-party hosts in the UI. Private enrichers may run **server-side only**.

---

## 5. Secrets & env

| Rule | |
|------|---|
| Never commit | `.env`, `.deploy/`, production keys |
| Server secrets | Twilio, Supabase, Stripe, `EDGE_ADMIN_TOKEN`, `ADMIN_PHONES`, optional `PLAY_REVIEW_*` overrides |
| On droplet | `/opt/busyproxy/.env` via systemd `EnvironmentFile` |

---

## 6. Data at rest (client)

| Data | Storage today | Future hardening |
|------|----------------|------------------|
| Session token | DataStore prefs | EncryptedSharedPreferences / Keystore |
| Device secret | DataStore prefs | Android Keystore |
| Last login phone | DataStore (for UX) | OK as non-secret |

See roadmap below.

---

## 7. Threat model (summary)

| Threat | Mitigations |
|--------|-------------|
| Passive network sniff | TLS everywhere |
| Active MITM with rogue CA | **Certificate pinning** |
| Stolen session on device | Soft-delete, logout; shorter TTL planned |
| Open residential proxy abuse | No earner-visible creds; auth on gate; tunnel + policy |
| Account takeover via phone reuse after delete | Soft-delete keeps phone; support reactivation only |

---

## 8. Recommended next security steps (not all done)

1. ~~Certificate pinning (renewal-safe)~~ **Done**
2. Encrypt session + device secret on device (Keystore)
3. Shorter access tokens + refresh
4. Play Integrity for agent enroll (anti-farm)
5. Optional mTLS for tunnel later

---

## 9. Related docs

- [AUTH_AND_ACCOUNTS.md](./AUTH_AND_ACCOUNTS.md)
- [API_REFERENCE.md](./API_REFERENCE.md)
- [DEPLOY.md](./DEPLOY.md) (TLS on server)
- [../android/README.md](../android/README.md)
