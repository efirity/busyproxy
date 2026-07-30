# BusyProxy — project status

**Last updated:** 2026-07-30  

| | |
|---|---|
| **Live site** | https://busyproxy.net |
| **Admin** | https://admin.busyproxy.net |
| **Status page** | https://busyproxy.net/status |
| **Droplet** | `busyproxy` · `46.101.114.84` · fra1 |
| **Android** | `android/` · debug APK via `./android/scripts/build-apk.sh` |
| **Docs index** | [docs/README.md](./README.md) |

---

## Product (one line)

Earners share Wi‑Fi or mobile bandwidth for **$/GB** via a **reverse tunnel**. Operators mint proxy credentials; **earners never see proxy URLs**.

### Rates

| Network | Rate | Min withdraw |
|---------|------|--------------|
| Wi‑Fi | **$0.20 / GB** | **$20** |
| Mobile | **$0.12 / GB** | |

---

## What’s live

### Web

- [x] Marketing landing + pricing estimator  
- [x] Earner web app (`/app`) + dashboard (`/dashboard`)  
- [x] Operator admin (`admin.busyproxy.net`) — fleet, devices, proxy mint, live exit test  
- [x] Admin **Devices** = dense table + right inspector + full-page detail (no card grid) · design system §6.4 
- [x] Public **Terms**, **Privacy**, **account deletion** pages  
- [x] Support contact: **support@busyproxy.net**  
- [x] Public **status** + `/api/status`  
- [x] Exit **whoami** at `/api/whoami` (no third-party hosts in admin UI)  
- [x] Phone dial-code prefill from IP (`/api/auth/phone-hint`)  
- [x] Soft-delete accounts + **required deletion reason** + re-login blocked  
- [x] Google Play **two demo accounts** with fixed OTP (no SMS) — see `google-play/APP_ACCESS_REVIEWERS.md`  

### Edge / proxy

- [x] HTTP CONNECT `:18080` + SOCKS `:11080`  
- [x] Reverse WSS tunnel hub (`/v1/tunnel`)  
- [x] Sticky / rotate username grammar  
- [x] Device enroll, geo enrichment, traffic probe tools  
- [x] Edge state persistence (`.data/edge-state.json`)  
- [x] Production process: `scripts/start-prod.mjs`  

### Android earner agent

- [x] Compose UI: consent, OTP (+ SMS autofill), home, account  
- [x] Network modes: **Automatic / Wi‑Fi / Mobile**  
- [x] Foreground service + reverse tunnel + network binding  
- [x] Account icon: profile, support, legal, delete (with reasons)  
- [x] Back to home from account  
- [x] No internal `tunnel_open` spam on home  
- [x] Remember last phone for re-login  
- [x] **TLS certificate pinning** (renewal-safe intermediate/root pins)  
- [x] Wi‑Fi ADB discover + deploy scripts  

### Google Play prep

- [x] `google-play/` package: listing copy, Data safety, FGS text, reviewer access, checklists  
- [ ] Release signing + AAB upload  
- [ ] Final screenshots / feature graphic  
- [ ] Open OTP beyond allowlisted test phones for production users  

### Data / money

- [x] Supabase users/sessions/OTP (+ wallets)  
- [x] Stripe Connect wallet flows (test/live per env)  
- [x] Twilio OTP  

---

## Production deploy (short)

```bash
# from laptop
rsync -avz --exclude node_modules --exclude .git --exclude .env \
  --exclude android/build --exclude android/.gradle --exclude artifacts --exclude .data \
  ./ root@46.101.114.84:/opt/busyproxy/

ssh root@46.101.114.84 'systemctl restart busyproxy'
```

Full detail: [DEPLOY.md](./DEPLOY.md).

Android:

```bash
./android/scripts/build-apk.sh
./android/scripts/wifi-deploy.sh          # LAN mDNS rediscover
# or: adb install -r artifacts/apk/BusyProxy-latest-debug.apk
```

---

## Remaining / next (priority)

| Priority | Item |
|----------|------|
| P0 Play | Release keystore + `bundleRelease` + Console listing assets |
| P0 Product | OTP for all legitimate phones (exit test-number allowlist when ready) |
| P1 Security | Encrypted storage for session + device secret on Android |
| P1 Ops | Admin “reactivate deleted account” UI |
| P1 Edge | Continue hardening dual-device traffic / scale |
| P2 | Play Integrity, optional tunnel mTLS |

---

## Documentation map

Full index: **[docs/README.md](./README.md)**

| Area | Doc |
|------|-----|
| Security & pinning | [SECURITY.md](./SECURITY.md) |
| Auth / delete | [AUTH_AND_ACCOUNTS.md](./AUTH_AND_ACCOUNTS.md) |
| APIs | [API_REFERENCE.md](./API_REFERENCE.md) |
| Deploy | [DEPLOY.md](./DEPLOY.md) |
| Network | [NETWORK_ARCHITECTURE.md](./NETWORK_ARCHITECTURE.md) |
| Proxy URIs | [PROXY_ACCESS.md](./PROXY_ACCESS.md) |
| Android | [../android/README.md](../android/README.md) |
| Play | [../google-play/README.md](../google-play/README.md) |
