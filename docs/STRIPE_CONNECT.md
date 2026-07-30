# BusyProxy — Stripe Connect (full reference)

**Updated:** 2026-07-30  
**Platform account:** Efirity PTE. LTD. · Singapore · test mode `acct_1Tyffb2fijvpRf35`  
**Currency:** SGD  
**Product use:** pay **earners** (bandwidth sharers) only for now; proxy **buyers** come later.

This doc is the single place for Connect setup, branding, onboarding choices, payout flow, and test recipes. Related: [PAYOUTS.md](./PAYOUTS.md), [STRIPE_INTEGRATION.md](./STRIPE_INTEGRATION.md), [PRICING.md](./PRICING.md).

---

## 1. Product model (map to Stripe language)

| Stripe word | BusyProxy |
|---|---|
| **Platform** | BusyProxy (your company Stripe account) |
| **Seller / connected account** | Earner (user who shares Wi‑Fi / mobile data) |
| **Buyer** | Future proxy customer (not required to pay earners in test) |
| **Payout** | Cash-out of earned balance (≥ $20) to earner’s bank |

**Funds flow we chose:**

```text
(Buyers later) → Your platform balance → Transfer → Earner Express account → Bank payout
```

Earners are paid **individually** (not “split one charge across many sellers”).

---

## 2. Connect wizard answers (record of what we selected)

Use these if you re-run Connect setup or open a second environment.

| Step | Choice |
|---|---|
| How sellers are paid | **Sellers will be paid out individually** |
| Where sellers create accounts | **Onboarding hosted by Stripe** |
| Where sellers manage accounts | **Express Dashboard** |
| Industry (if asked) | On-demand services (or Software) |
| Liability for refunds/chargebacks | Platform (you) — normal for this model |
| Optional interactive platform guide | Optional — skip is fine |

Dashboard after setup:  
https://dashboard.stripe.com/test/connect  
Live: https://dashboard.stripe.com/connect  

---

## 3. Branding (Stripe Connect Branding page)

Fill **Settings → Connect → Branding** (Onboarding experience) so earners see BusyProxy, not a generic Stripe shell.

### Business name

```text
BusyProxy
```

### Platform branding toggle

- **Copy platform branding:** OFF unless main Brand settings already have assets  
- Prefer uploading icon + logo **on the Connect Branding form**

### Icon (square)

| Item | Value |
|---|---|
| File | `public/brand/icon-512.png` (or `icon-1024.png`) |
| Live URL | https://busyproxy.net/brand/icon-512.png |
| Spec | Square PNG, ≥ 128px (512–1024 ideal) |

### Logo (horizontal)

| Item | Value |
|---|---|
| File | `public/brand/logo-full.svg` |
| Live URL | https://busyproxy.net/brand/logo-full.svg |
| Fallback | Same icon-512 if SVG rejected |

### Brand colours

| Field | Hex | Role |
|---|---|---|
| **Brand colour** | `#07090E` | Dark navy — site background / shell |
| **Accent colour** | `#3B82F6` | Primary blue — buttons, links, CTAs |

Do **not** use white `#FFFFFF` as brand colour (washes out on Stripe’s light UI).  
Optional secondary (mark gradient only, not a Stripe form field): `#22D3EE` cyan.

### Design tokens (app ↔ Stripe alignment)

| Token | Hex | Use in product |
|---|---|---|
| `--color-bg` | `#07090E` | App / marketing background |
| `--color-surface` | `#141A24` | Cards |
| `--color-primary` | `#3B82F6` | Primary actions |
| Accent cyan | `#22D3EE` | Logo gradient end |
| Text | `#EEF2F8` | Primary text on dark |

Full UI system: [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).  
Brand file index: [public/brand/README.md](../public/brand/README.md).

### After branding save

Earners should see **BusyProxy** name + icon on hosted Connect onboarding and Express Dashboard.

---

## 4. Account type & country rules

| Setting | Value |
|---|---|
| Connected account type | **Express** |
| Platform country | **SG** |
| Connect account country we create | **SG** (`STRIPE_CONNECT_COUNTRY`, default `SG`) |
| Capabilities requested | `card_payments` + `transfers` |
| Payout schedule on connected account | **manual** (we trigger payouts in code) |

### Why not earner phone country (e.g. Moldova MD)?

Stripe rule: **platforms in SG cannot create connected accounts in MD** (and many other countries).  
Error we hit:

```text
Connected accounts in MD cannot be created by platforms in SG.
```

**BusyProxy behaviour:** always create Express accounts in **platform Connect country (SG)** for now.  
Earner phone country is stored as metadata only (`phone`, `phone_country`).

**Implication for live multi-country earners:** later need multi-country Connect coverage or another platform setup. Test mode with SG Express + test bank is fine.

### What SG earners link (not free-form cards)

On Singapore Express onboarding, Stripe collects:

- Personal details (name, DOB, address, phone)  
- **NRIC/FIN** (test values OK in sandbox)  
- **Bank** (bank + branch + account) — primary payout rail  
- Optional Singpass / photo ID (skip in test if Submit works)

**Instant debit-card push** is mainly US-centric. For this SG platform, **bank = how users get paid**.

UI copy on BusyProxy uses **“Link bank for payouts”** / bank last4, not only “debit card.”

---

## 5. Earner UX flow

```text
Dashboard / App Wallet
    → Link bank for payouts
    → Stripe hosted Account Link (connect.stripe.com/setup/e/…)
    → Personal details + bank (Use test account in sandbox)
    → Submit / return ?stripe=return
    → BusyProxy refreshes status → shows bank ••••last4
    → Cash out (≥ $20)
```

### Two different Stripe URLs (do not confuse)

| URL | Who | Purpose |
|---|---|---|
| `dashboard.stripe.com/.../connect` | **You (company)** | Platform Connect overview |
| `connect.stripe.com/setup/e/acct_…` | **Earner** | Link bank / finish KYC |

---

## 6. Backend cash-out flow

```text
1. Check session user + wallet balance ≥ MIN_WITHDRAW ($20)
2. refreshAccountStatus → payouts_enabled + bank/card on file
3. Debit internal wallet (Supabase)
4. stripe.transfers.create → connected account
5. stripe.payouts.create({ method: 'instant' }, { stripeAccount })
   → on failure: method: 'standard'
6. Mark withdrawal paid + ledger row
```

Platform must have **available** balance (not only pending) for transfers.

### Test funding platform balance

- UI: **Fund payout balance**  
- API: `POST /api/stripe/fund-platform`  
- Implementation uses test source **`tok_bypassPending`** so funds hit **available** in test mode  

Legacy note: plain `tok_visa` often sits in **pending** only.

---

## 7. API surface

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/stripe/config` | Publishable key, min withdraw, currency, mode |
| GET | `/api/stripe/status` | Balance, connect flags |
| GET | `/api/stripe/wallet` | Earner wallet + payout methods |
| POST | `/api/stripe/connect/onboard` | Express account + Account Link URL |
| POST | `/api/stripe/connect/refresh` | Sync bank/card + `payouts_enabled` |
| POST | `/api/stripe/connect/dashboard` | Express login link (“Manage bank”) |
| POST | `/api/stripe/withdraw` | Transfer + payout |
| POST | `/api/stripe/fund-platform` | Test: fund platform available balance |
| POST | `/api/stripe/credit-demo` | Test: credit earner earnings |

Auth: `Authorization: Bearer <session token>` when logged in (OTP).

Code: `server/stripe-engine.mjs`, plugins `server/stripe-api-plugin.ts`, UI `src/components/stripe/wallet-panel.tsx`.

---

## 8. Env vars (never commit secrets)

```bash
STRIPE_SECRET_KEY=sk_test_...          # server only
STRIPE_PUBLISHABLE_KEY=pk_test_...     # or STRIPE_PUB_KEY
STRIPE_CURRENCY=sgd                    # optional override; auto-detected from balance
STRIPE_CONNECT_COUNTRY=SG              # Express account country
MIN_WITHDRAW_CENTS=2000                # $20
SEED_EARNINGS_CENTS=2850               # demo seed for empty wallets
```

Keys live in droplet `/opt/busyproxy/.env` and local `.env` (gitignored). See [GIT_PUSH.md](./GIT_PUSH.md).

---

## 9. Sandbox / test recipes

### Platform (you)

1. Connect enabled (done)  
2. Branding saved (name + icon + colours above)  
3. Fund available balance via **Fund payout balance** or `tok_bypassPending` charge  

### Earner (test user e.g. `+37368182830`)

1. Log in OTP → Wallet  
2. **Link bank for payouts**  
3. Stripe form: skip Singpass; use test personal data  
4. Bank step: **Use test account** → Continue  
5. Additional info: **Submit** without real photo if allowed  
6. Return to BusyProxy → **Refresh**  
7. Expect: **STRIPE TEST BANK · ••••3456** · **Payout ready**  
8. **Cash out**  

### Example test identity (SG Express)

| Field | Example |
|---|---|
| Name | Test / Geo |
| DOB | 01 / 01 / 1988 |
| Address | 68 CIRCULAR ROAD #02-01, 049422 |
| Phone | +65 8123 4567 |
| NRIC | S1234567A |
| Bank | Use test account / STRIPE TEST BANK |

---

## 10. Status checklist (as of 2026-07-30)

| Item | Status |
|---|---|
| Test API keys on droplet | Done |
| Connect platform signup | Done |
| Express onboarding Account Links | Done |
| Branding colours + assets documented | Done (this doc) |
| SG bank external account on earner | Verified in test |
| Transfer + standard/instant payout code | Done |
| Platform available balance funding (`tok_bypassPending`) | Done |
| UI shows bank (not only debit card) | Done |
| Live mode keys / production KYC | Todo when launching |
| Multi-country connected accounts | Todo (product/Stripe constraint) |

---

## 11. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| “Sign up for Connect” | Connect not enabled | Complete Connect wizard once |
| “Connect not enabled” but Connect works | Bug: error matched word “connect” in other messages | Fixed; use current `stripe-engine.mjs` |
| MD / phone country create fails | SG platform can’t create MD accounts | Always create Express as **SG** |
| “No debit card linked” after bank setup | UI only checked cards | Fixed — shows bank last4 |
| Transfer insufficient funds | Only **pending** platform balance | Fund with `tok_bypassPending` / Fund payout balance |
| Redirects to Connect **overview** | Opened company dashboard link | Use **Link bank** from BusyProxy only |
| `payouts_enabled: false` + pending verification | Stripe reviewing | Wait + Refresh; test often clears |

---

## 12. Security notes

- Never store full card/bank numbers in BusyProxy DB  
- Secret key only on server  
- Earners never see proxy credentials (separate edge system)  
- Connect Account Links use `return_url` / `refresh_url` on `https://busyproxy.net/dashboard`  

---

## 13. Quick copy-paste for Stripe Branding form

```text
Business name:   BusyProxy
Icon:            public/brand/icon-512.png
Logo:            public/brand/logo-full.svg
Brand colour:    #07090E
Accent colour:   #3B82F6
```

---

## 14. Related docs

| Doc | Topic |
|---|---|
| [PAYOUTS.md](./PAYOUTS.md) | Product payout decision |
| [STRIPE_INTEGRATION.md](./STRIPE_INTEGRATION.md) | Early wiring notes |
| [PRICING.md](./PRICING.md) | $/GB rates, $20 min |
| [public/brand/README.md](../public/brand/README.md) | Icon/logo file map |
| [DEPLOY.md](./DEPLOY.md) | Droplet / env deploy |
