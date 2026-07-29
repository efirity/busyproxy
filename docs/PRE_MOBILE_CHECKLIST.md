# Pre–Android app checklist

What we already shipped vs what the native agent still needs.

## Done (web + backend + edge design)

| Area | Status |
|---|---|
| Marketing site (SEO, pricing, estimator) | Done |
| Earner web mock + OTP login (Twilio test #) | Done |
| User dashboard (session, wallet hooks) | Done |
| Portal admin (users, fleet, proxy access) | Done |
| Pricing $0.20 Wi‑Fi / $0.12 mobile / $20 min | Done |
| Supabase schema + RLS | Done |
| Stripe test wallet / Connect hooks | Done |
| Reverse-tunnel architecture | Done + documented |
| **Sticky vs rotating** proxy URI design | **Done + implemented** |
| **Mobile pool default** for checkers | **Done** |
| Credential mint + IP allowlist | Done |
| Edge HTTP CONNECT + SOCKS5 listeners (ports 18080/11080) | Done (control plane host) |
| Docs for git / deploy / proxy access | Done |
| DO droplet `busyproxy` + SSL (when accessible) | Deployed (UFW IP lock) |

## Not done (needs Android / production edge)

| Item | Why it blocks “real” residential exit IP |
|---|---|
| Android foreground agent | Opens reverse tunnel; dials targets on cell radio |
| Tunnel mux on gate | Today P0 may dial from edge VM for connectivity tests |
| Google Play / sideload build | Distribution |
| Open Twilio to all numbers | Still test-number gated |
| Production Stripe Connect | Test keys only |
| Edge multi-region + LB | Single gate host for now |
| DNS `gate` / `agent` A records + UFW 18080/11080 | Point to edge VM; allow customer IPs |

## Decision locked before mobile build

1. **Access model:** reverse tunnel only — never inbound to phone.  
2. **Customer URI:** `gate.busyproxy.net` + username params (sticky/rotate/mobile).  
3. **Sticky:** no auto-failover; operator changes session.  
4. **Rotate:** auto next healthy mobile exit.  
5. **Mobile product:** `type-mobile` → cellular agents only.  
6. **Earner UX:** traffic + $ only; no proxy URI.

## Recommended next implementation order

1. Android agent MVP (tunnel + CONNECT dial + byte report + share toggle).  
2. Wire gate to real tunnel streams (stop edge-origin dial).  
3. Publish `gate`/`agent` DNS; open proxy ports to customers.  
4. Expand OTP + payouts to production keys.
