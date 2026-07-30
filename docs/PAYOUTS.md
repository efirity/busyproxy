# Earner payouts — Stripe Instant only

## Product decision

BusyProxy pays earners **only through Stripe**:

1. Earner taps **Link debit card**
2. Stripe Connect Express hosted onboarding stores **debit card / bank** (PAN never hits our servers)
3. Earner taps **Cash out** → platform **Transfer** → **Instant Payout** to that card

No PayPal. No manual bank forms in the app.

## One-time platform setup (you)

Your API keys work, but **Connect must be signed up once**:

1. Open **[Connect (test)](https://dashboard.stripe.com/test/connect)** or **[Connect (live)](https://dashboard.stripe.com/connect)**
2. Complete “Get started” / Connect signup  
3. Keep **Instant Payouts** enabled (you already have this)
4. Retry **Link debit card** in the BusyProxy dashboard  

Until step 2 is done, Stripe returns:  
`You can only create new accounts if you've signed up for Connect…`

### Important distinction

| Feature | Meaning |
|---|---|
| Instant Payouts on **your** Stripe account | You receive money from Stripe to **your** bank/card |
| Connect + Instant Payouts to earners | You pay **other people** who completed Express onboarding |

Both use “Instant Payouts”, but **paying earners requires Connect**.

## Technical flow

```text
Earner balance (our DB)
        │
        │  Cash out ≥ $20
        ▼
stripe.transfers.create  →  connected Express account
        │
        ▼
stripe.payouts.create({ method: 'instant' }, { stripeAccount })
        │
        ▼
Earner debit card  (•••• last4 shown in app)
```

If Instant is not available for that account/country, we fall back to `method: 'standard'`.

## Test mode

1. Enable Connect (test)
2. Link card with Stripe test data  
3. **Fund payout balance** (test charge) — wait until **available** (not only pending)  
4. Cash out  

Platform currency is currently **SGD** (account country **SG**).

## Security

- We never collect or store full card numbers  
- Card data lives only on the connected Stripe account  
- Secrets stay in server `.env` (not git)

## API

| Endpoint | Role |
|---|---|
| `POST /api/stripe/connect/onboard` | Create Express account + Account Link |
| `POST /api/stripe/connect/refresh` | Sync `payouts_enabled` + list cards |
| `POST /api/stripe/withdraw` | Transfer + Instant Payout |
| `GET  /api/stripe/wallet` | Balance + linked card summary |
