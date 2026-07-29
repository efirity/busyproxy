# BusyProxy — project status

**Last updated:** 2026-07-30  
**Codename:** Relay Earn → brand **BusyProxy**

## Product summary

Phone-verified users share residential bandwidth (Wi‑Fi / mobile) and earn **$/GB**. Operators sell capacity via a **reverse-tunnel edge**; earners never see proxy host/user/pass.

## Official earner rates (locked)

| Network | Rate | Min withdraw |
|---|---|---|
| Wi‑Fi | **$0.20 / GB** | **$20** |
| Mobile | **$0.12 / GB** | |
| Welcome bonus | $0.50 | |
| Referral | 10% × 30 days | |

Source: `src/data/pricing.ts` · Supabase `rate_plans` · `docs/PRICING.md`.

## What is implemented

### Public website (`busyproxy.net`)
- Clean marketing landing (SEO meta, JSON-LD, OG tags)
- Sections: hero, how it works, **pay rates**, earnings estimator, safety, FAQ
- Nav: Home · How it works · Pay rates · Estimator · App · Log in
- **No** public admin / design system / specs links

### Earner app (`/app`) · User dashboard (`/dashboard`)
- Phone OTP (Twilio), Stripe wallet hooks, share toggle, account

### Operator portal (`/portal`)
- Edge gateway: reverse-tunnel registry, mint credentials, IP allowlist, exit enable/disable

### Backend
Supabase · Stripe test · Twilio OTP · Edge control plane API

## DigitalOcean

| Item | Value |
|---|---|
| Droplet **name** | **`busyproxy`** (id `588571657`) |
| IP | **`46.101.114.84`** |
| Region | `fra1` |
| DNS | `@` `www` `app` `portal` → that IP |

Naming rule: always **`busyproxy`** (or `busyproxy-*` prefix). Never leave random names like `t` / `x`.

**Deploy:** app not on droplet yet until SSH key installed (see `docs/DEPLOY.md`).

## Secrets

Live secrets only in local `.env` (gitignored). Template: `.env.example`.

## Git push

See `docs/GIT_PUSH.md` — never commit `.env` or `.deploy/`.
