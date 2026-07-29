# BusyProxy — project status

**Last updated:** 2026-07-30  
**Brand:** BusyProxy (internal codename: Relay Earn)  
**Live site:** **https://busyproxy.net** (HTTP 200, TLS active)

## Product summary

Phone-verified earners share residential bandwidth (Wi‑Fi / mobile) and earn **$/GB**.  
Operators sell capacity via a **reverse-tunnel edge**; earners never see proxy host / user / pass.

## Official earner rates (locked)

| Network | Rate | Min withdraw |
|---|---|---|
| Wi‑Fi | **$0.20 / GB** | **$20** |
| Mobile | **$0.12 / GB** | |
| Welcome bonus | $0.50 | |
| Referral | 10% × 30 days | |

Source of truth: `src/data/pricing.ts` · Supabase `rate_plans` · [PRICING.md](./PRICING.md).

---

## Live production (DigitalOcean)

| Item | Value |
|---|---|
| Droplet **name** | **`busyproxy`** |
| Droplet ID | `588571657` |
| Public IP | **`46.101.114.84`** |
| Size | `s-1vcpu-2gb` (resized from 1GB — Vite OOM on 1GB) |
| Region | Frankfurt `fra1` |
| App path | `/opt/busyproxy` |
| Process | systemd `busyproxy` → Vite dev on `127.0.0.1:8080` |
| Reverse proxy | nginx :80/:443 → 8080 |
| TLS | Let’s Encrypt via certbot (`busyproxy.net` + www + app + portal) |
| Vite host check | `allowedHosts: true` in `vite.config.ts` |
| DNS A | `@`, `www`, `app`, `portal` → `46.101.114.84` |

### UFW allowlist (current)

| From | Ports |
|---|---|
| `89.28.43.197` (operator) | 22, 80, 443 |
| `34.186.82.14` (builder / agent) | 22, 80, 443 |
| `34.11.74.3` (older builder IP) | 22, 80, 443 |

World is **denied**. Site is private-preview for allowlisted IPs only.

### Public URLs (from allowlisted IP)

| Surface | URL |
|---|---|
| Marketing | https://busyproxy.net |
| Earner app | https://busyproxy.net/app · https://app.busyproxy.net |
| User dashboard | https://busyproxy.net/dashboard |
| Operator portal | https://portal.busyproxy.net |

---

## What is implemented

### Marketing website
- Clean product presentation (no admin/design links in public nav)
- SEO meta, JSON-LD, OG tags
- Pay rates, earnings estimator, safety, FAQ, CTAs

### Earner surfaces (`/app`, `/dashboard`)
- Phone OTP login (Twilio; **test number only** until opened)
- Share toggle (Wi‑Fi + mobile)
- Balance / traffic / account
- **No** proxy URL / IP shown to earners
- Stripe wallet hooks (test mode)

### Operator portal (`/portal`)
- Overview KPIs
- **Proxy access** — mint credentials, rotating + sticky URIs, allowlist, connect-check
- **Fleet & tunnels** — online/offline, exit enable/disable, carrier/ASN
- Users / devices / traffic events / withdrawals (mixed live + demo tables)

### Edge control plane
- Reverse-tunnel model (never dial phone public IP)
- Sticky sessions (no auto-failover when device offline)
- Rotating pool (auto next healthy exit)
- Default product pool = **`type=mobile`** (cellular only for proxy checkers)
- HTTP CONNECT listener **:18080** · SOCKS5 **:11080** (on app host)
- APIs under `/api/edge/*`

### Integrations

| Service | Status |
|---|---|
| Supabase (`bp.efir.is`) | Schema + RLS |
| Stripe | Test keys — wallet / Connect path |
| Twilio | OTP to configured test number |
| Let’s Encrypt | Certs live through ~2026-10-27 |

---

## Not done yet (before full production)

1. **Android agent** — reverse tunnel + dial targets on device + byte payroll  
2. **P1 tunnel mux** — exit IP must be the phone (today P0 may dial from edge for connectivity tests)  
3. DNS for `gate.busyproxy.net` / `agent.busyproxy.net` + open 18080/11080 to customers  
4. Open OTP beyond test number  
5. Live Stripe Connect transfers  
6. Production process (optional: build + `node` server instead of `vite dev`)  
7. Multi-region edge / LB  

See [PRE_MOBILE_CHECKLIST.md](./PRE_MOBILE_CHECKLIST.md).

---

## Docs map

| Doc | Topic |
|---|---|
| [SYSTEM_SPEC.md](./SYSTEM_SPEC.md) | Product / data model |
| [PRICING.md](./PRICING.md) | Earner rates |
| [NETWORK_ARCHITECTURE.md](./NETWORK_ARCHITECTURE.md) | Reverse tunnels |
| [PROXY_ACCESS.md](./PROXY_ACCESS.md) | Operator proxy URIs (sticky/rotate/mobile) |
| [SUPABASE_INTEGRATION.md](./SUPABASE_INTEGRATION.md) | DB + RLS |
| [STRIPE_INTEGRATION.md](./STRIPE_INTEGRATION.md) | Payments |
| [DEPLOY.md](./DEPLOY.md) | DO droplet, UFW, SSL, redeploy |
| [GIT_PUSH.md](./GIT_PUSH.md) | What to commit / not commit |
| [PRE_MOBILE_CHECKLIST.md](./PRE_MOBILE_CHECKLIST.md) | Before Android app |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | UI tokens (internal) |

---

## Secrets

- Live secrets only in **server** `/opt/busyproxy/.env` and local `.env` (**gitignored**)  
- Template: `.env.example`  
- Never commit: `.env`, `.deploy/` (SSH keys, DO tokens, root pass)

## Git push

See [GIT_PUSH.md](./GIT_PUSH.md).
