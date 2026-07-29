# BusyProxy (Relay Earn)

**Share bandwidth. Get paid per GB.**

Consumer earner product + operator portal + edge control plane for residential reverse-tunnel exits.

| Surface | URL (prod) | Path (dev) |
|---|---|---|
| Marketing site | https://busyproxy.net | `/` |
| Earner app | https://busyproxy.net/app | `/app` |
| User dashboard | https://busyproxy.net/dashboard | `/dashboard` |
| Operator portal | https://portal.busyproxy.net | `/portal` |
| Edge gate (B2B) | gate.busyproxy.net | control plane `/api/edge/*` |

## Quick start (local / preview)

```bash
cp .env.example .env   # fill secrets
npm install            # if needed
sh startup.sh          # serves 0.0.0.0:8080
```

Stack: React 19 · TanStack Start · Vite · Tailwind · Supabase · Stripe · Twilio.

## Docs index

| Doc | Contents |
|---|---|
| [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) | What is built, keys, open blockers |
| [docs/SYSTEM_SPEC.md](docs/SYSTEM_SPEC.md) | Full product / data model spec |
| [docs/PRICING.md](docs/PRICING.md) | Earner pay rates ($0.20 Wi‑Fi / $0.12 mobile) |
| [docs/NETWORK_ARCHITECTURE.md](docs/NETWORK_ARCHITECTURE.md) | Reverse tunnels, mobile IP, edge |
| [docs/SUPABASE_INTEGRATION.md](docs/SUPABASE_INTEGRATION.md) | DB + RLS |
| [docs/STRIPE_INTEGRATION.md](docs/STRIPE_INTEGRATION.md) | Connect / withdraw |
| [docs/DEPLOY.md](docs/DEPLOY.md) | DigitalOcean deploy + IP allowlist |
| [docs/PROXY_ACCESS.md](docs/PROXY_ACCESS.md) | Sticky/rotate proxy URIs |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | UI tokens (internal) |
| [docs/supabase/](docs/supabase/) | SQL migrations |

## Security

- **Never commit `.env`** (gitignored). Use `.env.example` only.
- Service role / Stripe secret / Twilio token = server-only.
- Public marketing has **no** admin/design/spec links.
- Admin: `portal.busyproxy.net` + `noindex`.
- Supabase RLS enabled; sensitive tables deny anon.

## Scripts

```bash
npm run dev        # 0.0.0.0:8080
npm run build
npm run typecheck
sh startup.sh      # idempotent start for preview revive
```

## License

Proprietary — BusyProxy / operators.
