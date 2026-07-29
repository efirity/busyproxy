# Stripe integration (Relay Earn)

## What’s wired

| Piece | Status |
|---|---|
| Test secret + publishable keys in `.env` (gitignored) | Done |
| Server API under `/api/stripe/*` | Done |
| Live wallet balance (file-backed until Supabase) | Done |
| Connect Express onboarding link | Done (requires Connect enabled on account) |
| Withdraw → `stripe.transfers.create` | Done |
| Fund platform (test charge `tok_visa`) | Done |
| UI: `/dashboard` Wallet + mobile `/app` Wallet | Done |

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/stripe/config` | Publishable key, min withdraw, mode |
| GET | `/api/stripe/status` | Balance + Connect flag |
| GET | `/api/stripe/wallet` | Earner wallet snapshot |
| POST | `/api/stripe/connect/onboard` | Create Express account + Account Link |
| POST | `/api/stripe/connect/refresh` | Refresh payouts_enabled |
| POST | `/api/stripe/connect/dashboard` | Express login link |
| POST | `/api/stripe/withdraw` | `{ amountCents }` Transfer to connected account |
| POST | `/api/stripe/fund-platform` | Test charge to fund platform balance |
| POST | `/api/stripe/credit-demo` | Add demo earnings to local wallet |

## One-time setup on your Stripe account

1. Open **[Connect (test mode)](https://dashboard.stripe.com/test/connect)**  
2. Click **Get started** / enable Connect  
3. Prefer **Express** accounts for earners  
4. Retry **Connect Stripe** in the Relay dashboard  

Without this, API keys work but `accounts.create` returns a Connect signup error.

## Test money flow

1. **+ $10 demo earnings** until balance ≥ $20  
2. **Connect Stripe** → complete Express onboarding (test data)  
3. **Fund platform** if transfers say insufficient balance  
4. **Withdraw all** → creates a real Transfer in test mode  

Note: test charges often appear under **pending** balance first, then **available**.

## Security

- Secret key only on server (Vite middleware / `.env`)  
- Publishable key may be shown truncated in UI  
- Never commit `.env` (already gitignored)  
- Rotate keys if they were exposed outside this private sandbox  

## After Supabase

Move `stripe-store` fields onto `users` / `wallets` / `withdrawals` tables (see `docs/supabase/001_init.sql`).
