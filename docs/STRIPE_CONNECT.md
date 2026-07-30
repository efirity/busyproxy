## 15. Payout receipts (not Stripe Invoices)

Stripe **Invoices** are for **charging customers** (platform receives money).  
Earner cash-outs are **Transfers + Payouts** — Stripe does **not** email a customer-style invoice for money you **send** to earners.

BusyProxy therefore generates a **payout receipt** for each paid withdrawal:

| Item | Detail |
|---|---|
| UI | History → **Download** · Wallet withdrawal list → **Download receipt** |
| API JSON | `GET /api/stripe/receipts/:withdrawalId` |
| API HTML | `GET /api/stripe/receipts/:withdrawalId.html` |
| Contents | Receipt #, amount, phone, bank last4, Stripe `tr_…` + `po_…` IDs |
| Save as PDF | Open receipt → **Print / Save as PDF** in the browser |

Receipt number format: `BP-YYYYMMDD-<first8 of withdrawal uuid>`.

Auth: same Bearer session as the dashboard.
