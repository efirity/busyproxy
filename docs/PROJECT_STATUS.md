# BusyProxy — project status

**Last updated:** 2026-07-30  
**Live site:** **https://busyproxy.net** (TLS, IP allowlist)  
**Android:** source under [`android/`](../android/) (build on local Android Studio)

## Product

Earners share Wi‑Fi/mobile bandwidth for **$/GB**. Operators use reverse-tunnel edge credentials. Earners never see proxy URLs.

### Rates

| Network | Rate | Min withdraw |
|---|---|---|
| Wi‑Fi | **$0.20 / GB** | **$20** |
| Mobile | **$0.12 / GB** | |

## Live (DO)

| Item | Value |
|---|---|
| Droplet | **`busyproxy`** · `46.101.114.84` · 2GB fra1 |
| App | `/opt/busyproxy` · systemd `busyproxy` · nginx + Let’s Encrypt |
| UFW | `89.28.43.197` + builder IPs |

## Implemented

- Marketing, earner web, dashboard, portal (proxy access sticky/rotate)
- Supabase, Stripe test, Twilio OTP
- Edge control plane + CONNECT/SOCKS listeners
- **Android agent scaffold** (Compose UI, FGS, network pin, tunnel client, destination policy)

## Next

1. Build APK on machine with Android SDK  
2. Real-device cellular-bind IP proof  
3. Edge WSS stream mux (P1) so exit IP is the phone  
4. `gate` / `agent` DNS + open proxy ports for customers  

## Docs

Start: [docs/README.md](./README.md) · Android: [android/README.md](../android/README.md)
