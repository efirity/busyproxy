# How earners get paid (global)

## Problem

Earners rarely have a **Stripe account**. Stripe cannot send money to a random
card number without **Connect** (or Issuing). For a worldwide earner product we
need **multiple payout rails**.

## Rails we support

| Rail | Earner provides | When money moves | Good for |
|---|---|---|---|
| **Instant cash-out (sandbox)** | Nothing | Immediately (test only) | Demo UX, QA |
| **PayPal** | Email | Queue now · auto later with PayPal Payouts API | Global, easiest |
| **Bank / Wise** | IBAN / Wise email / note | Queue · Wise API later | Countries without PayPal |
| **Stripe Connect Express** | Hosted onboarding (ID, bank/debit) | Transfer when platform balance available | US/EU/SG etc. when Connect is on |

## What Stripe can / cannot do

| Question | Answer |
|---|---|
| Pay user card without Connect? | **No** (not with standard Stripe) |
| Pay bank after Connect Express? | **Yes** |
| Platform must enable Connect? | **Yes** for that rail |
| Platform needs available balance for Transfers? | **Yes** |

## Recommended product default

1. **Default UX:** PayPal email (or local bank form)  
2. **Optional:** “Get paid faster with debit card” → Stripe Connect where available  
3. **Ops:** Weekly batch via Wise / PayPal Payouts  
4. **Test:** Sandbox instant cash-out so dashboard demos work without Connect  

## Keys needed later

| Service | Purpose |
|---|---|
| Stripe Connect enabled | Card/bank Express |
| `PAYPAL_CLIENT_ID` + `PAYPAL_SECRET` | Auto PayPal Payouts |
| Wise API token | Auto bank transfers |

## Min withdraw

**$20** (`MIN_WITHDRAW_CENTS=2000`) — keeps fees sane.

## Current earner (+37368182830)

Seeded with **$28.50** available so cash-out demos past the $20 minimum.
