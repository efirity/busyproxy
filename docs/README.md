# BusyProxy documentation

**Canonical index for the whole project.** Start here, then open the linked pages.

| | |
|---|---|
| **Live site** | https://busyproxy.net |
| **Admin** | https://admin.busyproxy.net |
| **Status** | https://busyproxy.net/status (public aggregate) |
| **APK download** | https://busyproxy.net/#download · promo **`5409`** |
| **Whoami (exit check)** | https://busyproxy.net/api/whoami |
| **Support** | support@busyproxy.net |
| **Legal** | [/terms](https://busyproxy.net/terms) · [/privacy](https://busyproxy.net/privacy) · [/account-deletion](https://busyproxy.net/account-deletion) |

---

## Start here

| Doc | What it covers |
|-----|----------------|
| [PROJECT_STATUS.md](./PROJECT_STATUS.md) | **What’s live today**, stack, remaining work |
| [../README.md](../README.md) | Repo overview, quick start |
| [SYSTEM_SPEC.md](./SYSTEM_SPEC.md) | Full product / architecture vision |
| [NETWORK_ARCHITECTURE.md](./NETWORK_ARCHITECTURE.md) | Reverse tunnels, gate, agent, mobile egress |

---

## Operations & deploy

| Doc | What it covers |
|-----|----------------|
| [DEPLOY.md](./DEPLOY.md) | DigitalOcean droplet, nginx, UFW, systemd, rsync redeploy |
| [ANALYTICS_AND_DOWNLOAD.md](./ANALYTICS_AND_DOWNLOAD.md) | **GA4 + GTM, Firebase Android, promo APK, phone deploy** |
| [PLAY_FASTLANE.md](./PLAY_FASTLANE.md) | **Fastlane + Play service-account JSON, upload tracks** |
| [GIT_PUSH.md](./GIT_PUSH.md) | Multi-account git remote, no secrets in git |
| [PERFORMANCE.md](./PERFORMANCE.md) | Site speed notes |
| [PROXY_ACCESS.md](./PROXY_ACCESS.md) | Sticky / rotate proxy URIs for operators |

**Production process:** `npm start` → `scripts/start-prod.mjs` (edge plugins + proxy ports + WSS).  
**App path on droplet:** `/opt/busyproxy` · unit `busyproxy`.

---

## Security

| Doc | What it covers |
|-----|----------------|
| [SECURITY.md](./SECURITY.md) | **TLS, certificate pinning, auth, secrets, threat model** |
| [AUTH_AND_ACCOUNTS.md](./AUTH_AND_ACCOUNTS.md) | OTP, soft-delete, deletion reasons, phone-hint |
| [APP_EVENTS.md](./APP_EVENTS.md) | **Mobile funnel logs** (install → online), 14-day retention |
| [API_REFERENCE.md](./API_REFERENCE.md) | Public + auth + edge endpoints |

---

## Product & money

| Doc | What it covers |
|-----|----------------|
| [PRICING.md](./PRICING.md) | Earner rates ($0.20 Wi‑Fi / $0.12 mobile) |
| [PAYOUTS.md](./PAYOUTS.md) | Cash-out product summary |
| [STRIPE_CONNECT.md](./STRIPE_CONNECT.md) | Connect setup, branding, bank payouts |
| [STRIPE_INTEGRATION.md](./STRIPE_INTEGRATION.md) | Stripe API endpoints (short) |

---

## Data

| Doc | What it covers |
|-----|----------------|
| [SUPABASE_INTEGRATION.md](./SUPABASE_INTEGRATION.md) | Postgres / Supabase + RLS |
| [supabase/](./supabase/) | SQL migrations |

---

## Android earner app

| Doc | What it covers |
|-----|----------------|
| [../android/README.md](../android/README.md) | **Build APK, deploy, TLS pinning, Wi‑Fi ADB** |
| [android/ANDROID_AGENT.md](./android/ANDROID_AGENT.md) | Agent design (tunnel, FGS, network modes) |
| [../android/scripts/ANY_NETWORK_ADB.md](../android/scripts/ANY_NETWORK_ADB.md) | Tailscale / HTTPS APK / any-network deploy |
| [../artifacts/apk/README.md](../artifacts/apk/README.md) | Sideload APK paths |

**Key scripts**

```bash
./android/scripts/build-apk.sh              # debug APK → artifacts/apk/
./android/scripts/wifi-adb-discover.sh      # mDNS rediscover Wi‑Fi ADB port
./android/scripts/wifi-deploy.sh            # discover + install
./android/scripts/print-ssl-pins.sh         # refresh SPKI pins after CA changes
./android/scripts/publish-debug-apk.sh      # publish APK for HTTPS install
```

---

## Google Play submission

| Doc | What it covers |
|-----|----------------|
| [../google-play/README.md](../google-play/README.md) | **Play Console package index** |
| [../google-play/CONSOLE_FORM_ANSWERS.md](../google-play/CONSOLE_FORM_ANSWERS.md) | **Copy/paste answers for every open Console form** |
| [../google-play/MANUAL_REVIEW_AND_SUBMIT.md](../google-play/MANUAL_REVIEW_AND_SUBMIT.md) | What’s already uploaded via Fastlane + human rollout steps |
| [../google-play/STORE_LISTING.md](../google-play/STORE_LISTING.md) | Title, descriptions |
| [../google-play/DATA_SAFETY.md](../google-play/DATA_SAFETY.md) | Data safety form answers |
| [../google-play/APP_CONTENT_DECLARATIONS.md](../google-play/APP_CONTENT_DECLARATIONS.md) | FGS specialUse, ads, audience |
| [../google-play/APP_ACCESS_REVIEWERS.md](../google-play/APP_ACCESS_REVIEWERS.md) | Reviewer phone + fixed OTP |
| [../google-play/GUIDELINES_AND_GAPS.md](../google-play/GUIDELINES_AND_GAPS.md) | Policy review + remaining gaps |
| [../google-play/RELEASE_CHECKLIST.md](../google-play/RELEASE_CHECKLIST.md) | Step-by-step before upload |
| [PLAY_FASTLANE.md](./PLAY_FASTLANE.md) | Fastlane supply / signing / tracks |

---

## Design

| Doc | What it covers |
|-----|----------------|
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | UI tokens |
| [../public/brand/README.md](../public/brand/README.md) | Logo / icons |

---

## Public legal URLs (must stay online)

| Resource | URL |
|----------|-----|
| Terms of Service | https://busyproxy.net/terms |
| Privacy Policy | https://busyproxy.net/privacy |
| Account deletion | https://busyproxy.net/account-deletion |
| Support | support@busyproxy.net |
| System status | https://busyproxy.net/status |
| Exit whoami | https://busyproxy.net/api/whoami |

---

## Repo map (high level)

```text
busyproxy/
├── android/           # Native earner agent (Compose)
├── server/            # Vite plugins: auth, edge, stripe, whoami, admin
├── src/               # Web: marketing, dashboard, admin, legal
├── docs/              # This documentation tree
├── google-play/       # Play Console submission package
├── scripts/           # start-prod, migrate, deploy helpers
├── migrations/        # SQL (if present) / docs/supabase
└── artifacts/apk/     # Built debug APKs (binaries gitignored)
```
