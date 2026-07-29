# BusyProxy earner pricing (launch)

## Official rates

| Network | Pay to earner | Code constant |
|---|---|---|
| **Wi‑Fi / fixed broadband** | **$0.20 / GB** | `wifiCentsPerGb = 20` |
| **Mobile / cellular** | **$0.12 / GB** | `mobileCentsPerGb = 12` |
| **Minimum withdraw** | **$20.00** | `minWithdrawCents = 2000` |
| **Welcome bonus** | **$0.50** | after first verified share day |
| **Referral** | **10%** of referee earnings for **30 days** | |

Source of truth in app: `src/data/pricing.ts` · Supabase `rate_plans`.

## Why these numbers

### Market
Most consumer “share bandwidth” apps advertise around **$0.08–$0.12/GB**.  
Headline **$0.20/GB on Wi‑Fi** is easy to market and wins comparisons.

### User happiness
- **Wi‑Fi-first** = earnings feel like free money (spare capacity).
- **Lower mobile rate** = protects paid data plans; optional Wi‑Fi-only mode.
- **Clear $ not points** = trust.
- **$20 min withdraw** = standard category UX; covers payout ops.

### Business happiness
Residential proxy capacity can sell B2B roughly **$1.50–$4+/GB** depending on quality and geo.  
Paying **$0.12–$0.20** leaves margin for:

- Edge / proxy infra  
- Fraud & risk  
- Support  
- Stripe fees  
- Growth (referrals, bonuses)

### Example unit economics (illustrative)
- Earner shares 100 GB Wi‑Fi → we pay **$20**.  
- If sold at $2.00/GB blended → **$200** revenue → strong contribution after infra.

## Estimates (marketing only)

| Scenario | Traffic | ~Monthly earn |
|---|---|---|
| Light Wi‑Fi | 3 GB/day | ~$18 |
| Typical home | 8 GB/day Wi‑Fi | ~$48 |
| Power user | 15 GB/day Wi‑Fi | ~$90 |

Actuals depend on demand and uptime.

## Changelog
- **2026-07-30** — Launch schedule locked: Wi‑Fi $0.20 · Mobile $0.12 · Min $20.
