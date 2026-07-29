# BusyProxy

**Share bandwidth. Get paid per GB.**

| | |
|---|---|
| **Live site** | https://busyproxy.net |
| **Portal** | https://portal.busyproxy.net |
| **Status** | Production droplet `busyproxy` @ `46.101.114.84` (IP allowlist) |

Consumer earner product + operator portal + reverse-tunnel edge for residential / mobile exits.

| Surface | Production | Dev path |
|---|---|---|
| Marketing | https://busyproxy.net | `/` |
| Earner app | https://busyproxy.net/app | `/app` |
| User dashboard | https://busyproxy.net/dashboard | `/dashboard` |
| Operator portal | https://portal.busyproxy.net | `/portal` |
| Edge gate (B2B) | `gate.busyproxy.net:18080` / `:11080` | `/api/edge/*` + listeners |

## Quick start (local)

```bash
cp .env.example .env   # fill secrets — never commit .env
npm install            # if needed
sh startup.sh          # 0.0.0.0:8080
```

Stack: React 19 · TanStack Start · Vite · Tailwind · Supabase · Stripe · Twilio.

## Docs

| Doc | Contents |
|---|---|
| [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) | **Current status** (live deploy, done / todo) |
| [docs/README.md](docs/README.md) | Full docs index |
| [docs/DEPLOY.md](docs/DEPLOY.md) | DigitalOcean, UFW, SSL, redeploy |
| [docs/PROXY_ACCESS.md](docs/PROXY_ACCESS.md) | Sticky / rotating / mobile proxy URIs |
| [docs/PRE_MOBILE_CHECKLIST.md](docs/PRE_MOBILE_CHECKLIST.md) | Before Android agent |
| [docs/NETWORK_ARCHITECTURE.md](docs/NETWORK_ARCHITECTURE.md) | Reverse tunnels |
| [docs/PRICING.md](docs/PRICING.md) | $0.20 Wi‑Fi / $0.12 mobile |
| [docs/SYSTEM_SPEC.md](docs/SYSTEM_SPEC.md) | Product + data model |
| [docs/SUPABASE_INTEGRATION.md](docs/SUPABASE_INTEGRATION.md) | DB + RLS |
| [docs/STRIPE_INTEGRATION.md](docs/STRIPE_INTEGRATION.md) | Payments |
| [docs/GIT_PUSH.md](docs/GIT_PUSH.md) | What to commit |

## Security

- **Never commit `.env`** or `.deploy/` (keys, tokens, root pass).
- Use `.env.example` only in git.
- Public marketing has **no** admin/design/spec links.
- Portal is `portal.busyproxy.net` (+ `noindex`).
- UFW: only operator + builder IPs (see DEPLOY.md).

## Scripts

```bash
npm run dev
npm run build
npm run typecheck
sh startup.sh
```

## License

Proprietary — BusyProxy / operators.
