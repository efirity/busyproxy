# BusyProxy

**Share bandwidth. Get paid per GB.**

| | |
|---|---|
| **Live site** | https://busyproxy.net |
| **Admin** | https://admin.busyproxy.net |
| **Status** | https://busyproxy.net/status |
| **Support** | support@busyproxy.net |
| **Legal** | [Terms](https://busyproxy.net/terms) · [Privacy](https://busyproxy.net/privacy) · [Delete account](https://busyproxy.net/account-deletion) |
| **Android** | [`android/`](android/) earner agent |
| **Docs** | **[docs/README.md](docs/README.md)** ← full documentation index |
| **Play prep** | [`google-play/`](google-play/) |

| Surface | Production |
|---|---|
| Marketing | https://busyproxy.net |
| Earner app (web) | https://busyproxy.net/app |
| User dashboard | https://busyproxy.net/dashboard |
| Operator admin | https://admin.busyproxy.net |
| Proxy gate | `busyproxy.net:18080` (HTTP) / `:11080` (SOCKS) |
| Exit check | https://busyproxy.net/api/whoami |
| Android earner | APK from `android/` → reverse tunnel agent |

---

## Product in one paragraph

Consenting users run the **BusyProxy Android app**, sign in with **phone OTP**, and opt in to **share** Wi‑Fi or mobile capacity. Authorized platform clients use credentials minted by operators; traffic exits via the phone’s network through a **reverse WSS tunnel**. Earners are paid **$0.20/GB Wi‑Fi** and **$0.12/GB mobile**, cash out from **$20**. Earners **never** see proxy passwords.

---

## Quick start (web)

```bash
cp .env.example .env   # local only; production uses droplet .env
npm run dev            # or: npm start → scripts/start-prod.mjs
# serves 0.0.0.0:8080 with edge plugins
```

## Android

```bash
./android/scripts/build-apk.sh
adb install -r artifacts/apk/BusyProxy-latest-debug.apk

# Same Wi‑Fi: auto-discover wireless debug port + install
./android/scripts/wifi-deploy.sh
```

Details: [android/README.md](android/README.md) · TLS pinning: [docs/SECURITY.md](docs/SECURITY.md)

---

## Documentation

| Doc | Contents |
|---|---|
| **[docs/README.md](docs/README.md)** | **Master index** (all topics) |
| [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) | What’s live / what’s next |
| [docs/SECURITY.md](docs/SECURITY.md) | TLS, **cert pinning**, auth, threat model |
| [docs/AUTH_AND_ACCOUNTS.md](docs/AUTH_AND_ACCOUNTS.md) | OTP, soft-delete, deletion reasons |
| [docs/API_REFERENCE.md](docs/API_REFERENCE.md) | HTTP/WSS endpoints |
| [docs/DEPLOY.md](docs/DEPLOY.md) | DigitalOcean production |
| [docs/PROXY_ACCESS.md](docs/PROXY_ACCESS.md) | Sticky / rotate URIs |
| [docs/NETWORK_ARCHITECTURE.md](docs/NETWORK_ARCHITECTURE.md) | Reverse tunnels |
| [docs/SYSTEM_SPEC.md](docs/SYSTEM_SPEC.md) | Full product spec |
| [google-play/README.md](google-play/README.md) | Play Console submission package |

---

## Security (short)

- HTTPS + WSS only; Android cleartext disabled  
- **Certificate pinning** on API + tunnel (LE intermediate/root pins → leaf renew without app update)  
- Phone OTP sessions; admin phone allowlist  
- Soft-delete accounts with **required reason**; re-login blocked until support reactivates  

Never commit `.env` or production secrets. See [docs/SECURITY.md](docs/SECURITY.md).

---

## Production host

| Item | Value |
|------|--------|
| Droplet | `busyproxy` · `46.101.114.84` |
| App dir | `/opt/busyproxy` |
| Process | systemd `busyproxy` → `scripts/start-prod.mjs` |

Redeploy: [docs/DEPLOY.md](docs/DEPLOY.md)

---

## License

Proprietary — BusyProxy / operators.
