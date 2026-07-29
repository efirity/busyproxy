# Supabase integration (Relay Earn)

## Project

| Item | Value |
|---|---|
| URL | `https://bp.efir.is` |
| Schema | Applied via MCP `apply_migration` → `001_relay_init` |
| Client | Server-only service role (`server/supabase.mjs`) |
| Anon key | Available for future browser auth (not used for wallet writes) |

## What is stored

| Table | Usage |
|---|---|
| `rate_plans` | Default $0.20/GB, min withdraw $20 |
| `users` | Demo earner (+373…), Stripe Connect id, payout_ready |
| `wallets` | available / pending / lifetime balances |
| `ledger_entries` | Credits & withdrawals |
| `withdrawals` | Stripe transfer status |
| `devices` | Sharing device rows |

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/supabase/health` | Connectivity + rate plan |
| POST | `/api/supabase/seed` | Ensure demo user + wallet |
| GET | `/api/account` | Wallet + ledger + devices |
| GET | `/api/supabase/ledger` | Ledger only |
| GET | `/api/supabase/devices` | Devices only |

Stripe wallet endpoints (`/api/stripe/*`) now read/write Supabase when healthy.

## Secrets

All keys live in `.env` (gitignored). Service role must never ship to the browser.

## Next

- Twilio OTP → create real users on phone verify  
- RLS policies for anon/authenticated (service role bypasses for now)  
- Stripe Connect enable on dashboard for live transfers  
