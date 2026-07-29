# Pre–Android app checklist

**Updated:** 2026-07-30 — website **live** on DO; edge control plane + proxy URI design implemented.

## Done (web + backend + ops)

| Area | Status |
|---|---|
| Marketing site (SEO, pricing, estimator) | **Live** https://busyproxy.net |
| Earner web + OTP (Twilio test #) | Done |
| User dashboard | Done |
| Portal (Proxy access, fleet, sticky/rotate) | Done |
| Pricing $0.20 Wi‑Fi / $0.12 mobile / $20 min | Done |
| Supabase schema + RLS | Done |
| Stripe test wallet / Connect hooks | Done |
| Reverse-tunnel architecture docs | Done |
| Sticky vs rotating proxy URIs | Done + tested |
| Mobile pool default (`type-mobile`) | Done |
| HTTP CONNECT :18080 · SOCKS5 :11080 listeners | Done (host) |
| DO droplet `busyproxy` + nginx + systemd | Done |
| Let’s Encrypt TLS | Done |
| Vite `allowedHosts` for public domain | Done |
| UFW allowlist (operator + builder) | Done |
| Docs for git / deploy / proxy access | Done |

## Not done (needs Android / production edge)

| Item | Why it matters |
|---|---|
| Android foreground agent | Opens reverse tunnel; dials on cell radio |
| Tunnel mux on gate (P1) | Public exit IP becomes the phone, not the VPS |
| Google Play / sideload build | Distribution |
| Open Twilio to all numbers | Still test-number gated |
| Production Stripe Connect | Test keys only |
| DNS `gate` / `agent` + UFW 18080/11080 for customers | B2B proxy traffic |
| Multi-region edge | Latency / capacity |

## Decisions locked before mobile build

1. **Access:** reverse tunnel only — never inbound to phone.  
2. **Customer URI:** `gate.busyproxy.net` + username params (sticky / rotate / mobile).  
3. **Sticky:** no auto-failover; operator changes `session-…`.  
4. **Rotate:** auto next healthy mobile exit.  
5. **Mobile product:** `type-mobile` → cellular agents only (proxy checkers).  
6. **Earner UX:** traffic + money only — no proxy URI.

## Recommended next order

1. Android agent MVP (tunnel + CONNECT dial + byte report + share toggle).  
2. Wire gate streams to real tunnels (stop edge-origin dial for product traffic).  
3. Publish `gate` / `agent` DNS; open proxy ports to customers.  
4. Expand OTP + payouts to production credentials.

## Operator doc

Full URI grammar and examples: [PROXY_ACCESS.md](./PROXY_ACCESS.md).
