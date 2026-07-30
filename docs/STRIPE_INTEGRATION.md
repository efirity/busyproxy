# Stripe integration (BusyProxy)

> **Canonical Connect + branding doc:** [STRIPE_CONNECT.md](./STRIPE_CONNECT.md)  
> **Payout product summary:** [PAYOUTS.md](./PAYOUTS.md)

## What’s wired

| Piece | Status |
|---|---|
| Test secret + publishable keys in `.env` (gitignored) | Done |
| Server API under `/api/stripe/*` | Done |
| Supabase wallet + ledger | Done |
| Connect Express Account Links | Done |
| Withdraw → Transfer + Instant/standard Payout | Done |
| Fund platform (`tok_bypassPending` → available) | Done |
| UI: dashboard + mobile wallet (bank-aware) | Done |
| Connect branding colours / assets documented | Done → [STRIPE_CONNECT.md](./STRIPE_CONNECT.md) |

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/stripe/config` | Publishable key, min withdraw, mode |
| GET | `/api/stripe/status` | Balance + Connect flags |
| GET | `/api/stripe/wallet` | Earner wallet + bank/card methods |
| POST | `/api/stripe/connect/onboard` | Express account + Account Link |
| POST | `/api/stripe/connect/refresh` | Sync payouts_enabled + methods |
| POST | `/api/stripe/connect/dashboard` | Express login link |
| POST | `/api/stripe/withdraw` | Transfer + payout |
| POST | `/api/stripe/fund-platform` | Test: fund available balance |
| POST | `/api/stripe/credit-demo` | Test: credit earnings |

## Branding (quick)

```text
Business name:  BusyProxy
Brand colour:   #07090E
Accent colour:  #3B82F6
Icon:           public/brand/icon-512.png
Logo:           public/brand/logo-full.svg
```

Full form fields and Connect wizard answers: **[STRIPE_CONNECT.md](./STRIPE_CONNECT.md)**.

## Security

- Secret key only on server  
- Never commit keys — [GIT_PUSH.md](./GIT_PUSH.md)  
