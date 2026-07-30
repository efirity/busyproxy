# BusyProxy

**Share bandwidth. Get paid per GB.**

| | |
|---|---|
| **Live site** | https://busyproxy.net |
| **Portal** | https://portal.busyproxy.net |
| **Android** | [`android/`](android/) earner agent (source) |
| **Status** | Web live on droplet `busyproxy` @ `46.101.114.84` (IP allowlist) |

| Surface | Production | Dev path |
|---|---|---|
| Marketing | https://busyproxy.net | `/` |
| Earner app (web) | https://busyproxy.net/app | `/app` |
| User dashboard | https://busyproxy.net/dashboard | `/dashboard` |
| **Admin (operator)** | **https://admin.busyproxy.net** | `/` on admin host · `/portal` elsewhere |
| Operator portal (legacy) | https://portal.busyproxy.net | `/portal` |
| Edge gate (B2B) | `gate.busyproxy.net:18080` / `:11080` | `/api/edge/*` |
| Android earner | APK from `android/` | OTP + reverse tunnel agent |

## Quick start (web)

```bash
cp .env.example .env
sh startup.sh          # 0.0.0.0:8080
```

## Android

```bash
# one-shot shareable APK → artifacts/apk/BusyProxy-latest-debug.apk
./android/scripts/build-apk.sh

# USB install
adb install -r artifacts/apk/BusyProxy-latest-debug.apk
```

Or copy `artifacts/apk/BusyProxy-latest-debug.apk` to any phone and open to install.

Details: [android/README.md](android/README.md) · [artifacts/apk/README.md](artifacts/apk/README.md) · [docs/android/ANDROID_AGENT.md](docs/android/ANDROID_AGENT.md)

## Docs

| Doc | Contents |
|---|---|
| [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) | Live status |
| [docs/PROXY_ACCESS.md](docs/PROXY_ACCESS.md) | Sticky / rotating proxy URIs |
| [docs/NETWORK_ARCHITECTURE.md](docs/NETWORK_ARCHITECTURE.md) | Reverse tunnels |
| [docs/android/ANDROID_AGENT.md](docs/android/ANDROID_AGENT.md) | Native agent design |
| [docs/DEPLOY.md](docs/DEPLOY.md) | DigitalOcean |
| [docs/GIT_PUSH.md](docs/GIT_PUSH.md) | Safe push |

## Security

Never commit `.env` or `.deploy/`. UFW allowlists operator + builder IPs.

## License

Proprietary — BusyProxy / operators.
