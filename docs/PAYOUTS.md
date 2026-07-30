# Earner payouts — Stripe Connect (bank / Instant)

> **Full Connect + branding reference:** [STRIPE_CONNECT.md](./STRIPE_CONNECT.md)

## Product decision

BusyProxy pays earners **only through Stripe Connect Express**:

1. Earner taps **Link bank for payouts** (SG platform → bank is the primary rail)
2. Stripe hosted onboarding stores bank (or card where available) — we never store full numbers
3. Earner taps **Cash out** → platform **Transfer** → **Instant** payout if available, else **standard**

No PayPal. No manual bank forms in the BusyProxy UI.

## Platform facts

| Item | Value |
|---|---|
| Company Stripe country | Singapore (SG) |
| Currency | SGD |
| Express account country | SG (`STRIPE_CONNECT_COUNTRY`) |
| Min withdraw | $20 (`MIN_WITHDRAW_CENTS=2000`) |
| Brand colour | `#07090E` |
| Accent colour | `#3B82F6` |

## One-time platform setup

1. [Connect test](https://dashboard.stripe.com/test/connect) — complete signup (done)
2. Branding: name **BusyProxy**, colours `#07090E` / `#3B82F6`, icon from `public/brand/`
3. Wizard: individual seller payouts · hosted onboarding · Express Dashboard

## Cash-out flow

```text
Earner balance (DB)
        │
        ▼
stripe.transfers.create  →  connected Express account
        │
        ▼
stripe.payouts.create (instant → fallback standard)
        │
        ▼
Earner bank  •••• last4
```

Platform needs **available** balance — use **Fund payout balance** (`tok_bypassPending` in test).

## Security

- Secrets only in server `.env` (not git)
- PAN / full account numbers only on Stripe

See [STRIPE_CONNECT.md](./STRIPE_CONNECT.md) for branding form fields, test recipes, and troubleshooting.
