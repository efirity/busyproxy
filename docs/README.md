# Relay Earn — Documentation Index

| Document | Purpose |
|---|---|
| [SYSTEM_SPEC.md](./SYSTEM_SPEC.md) | Full product + backend architecture, APIs, money flows, infra |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | Tokens, components, mobile/web/admin IA |
| [supabase/001_init.sql](./supabase/001_init.sql) | Postgres schema to apply on Supabase |

## Preview routes (this workspace)

| Path | Surface |
|---|---|
| `/` | Marketing website |
| `/app` | Mobile earner app mock |
| `/dashboard` | User web dashboard |
| `/admin` | Operator admin |
| `/design` | Design system gallery |
| `/docs` | Spec summary in UI |

## Credentials to supply for implementation

1. **Supabase** — project URL + service role key  
2. **Twilio** — Account SID, Auth Token, Verify Service SID  
3. **Stripe** — secret key, webhook secret, Connect  
4. **DigitalOcean** — API token + domain(s)  

Until then, all UIs run on demo data.
