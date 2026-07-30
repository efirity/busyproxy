# Deploy BusyProxy (DigitalOcean)

**Status:** **Live** on droplet `busyproxy` — https://busyproxy.net  

**Related:** [README docs index](./README.md) · [SECURITY.md](./SECURITY.md) (TLS / pinning) · [PROJECT_STATUS.md](./PROJECT_STATUS.md)

After TLS cert or intermediate changes on the server, Android SPKI pins normally **still work** (we pin LE intermediates/roots). Only a new CA path requires updating `SecureOkHttp.kt` — see [SECURITY.md](./SECURITY.md#certificate-pinning-android).


## Production target

| Item | Value |
|---|---|
| Droplet name | **`busyproxy`** (always this name / `busyproxy-*` prefix) |
| Droplet ID | `588571657` |
| IP | **`46.101.114.84`** |
| Size | `s-1vcpu-2gb` (fra1) |
| App directory | `/opt/busyproxy` |
| Node | 22.x |
| Web | nginx → `127.0.0.1:8080` (systemd unit `busyproxy`) |
| TLS | certbot / Let’s Encrypt |
| Vite | `allowedHosts: true` (required for public Host headers) |

### DNS (DigitalOcean domain `busyproxy.net`)

| Name | Type | Value |
|---|---|---|
| `@` | A | `46.101.114.84` |
| `www` | A | `46.101.114.84` |
| `app` | A | `46.101.114.84` |
| `portal` | A | `46.101.114.84` (legacy operator URL) |
| **`admin`** | **A** | **`46.101.114.84`** — **operator admin console** |
| `gate` | A | *(TODO — same or dedicated edge IP)* |
| `agent` | A | *(TODO — same or dedicated edge IP)* |

**Operator admin:** https://admin.busyproxy.net/ (all devices, proxies, fleet).  
Earner dashboard stays on https://busyproxy.net/dashboard only.

### UFW (production — public website)

| Port | Policy | Purpose |
|---|---|---|
| **80 / 443** | **Anywhere** | Public site, API, phone WSS tunnel (`wss://busyproxy.net/v1/tunnel`) |
| **18080 / 11080** | **Anywhere** | HTTP CONNECT + SOCKS proxy gate (credential auth required) |
| **22** | Operator / builder IPs only | SSH |

```bash
ufw status numbered
# Public web + proxy (app auth / admin OTP still required for console):
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 18080/tcp
ufw allow 11080/tcp
# SSH stay locked:
# ufw allow from <OPERATOR_IP> to any port 22 proto tcp
```

**Admin console** (`admin.busyproxy.net`) is public network-wise but **gated by phone OTP** (`ADMIN_PHONES`).  
**Proxy** still requires minted credentials; do not expose without auth.

DNS: `gate.busyproxy.net` and `agent.busyproxy.net` A → droplet IP (same host today).

---

## systemd

Unit: `/etc/systemd/system/busyproxy.service`

**Production process** uses `npm start` → `scripts/start-prod.mjs` (Vite in production mode, **no HMR**, edge plugins + proxy ports + WSS).

```ini
[Unit]
Description=BusyProxy web app
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/busyproxy
EnvironmentFile=/opt/busyproxy/.env
Environment=NODE_ENV=production
Environment=PATH=/opt/busyproxy/node_modules/.bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin
ExecStart=/usr/bin/node /opt/busyproxy/scripts/start-prod.mjs
# Warm homepage so first visitor is fast
ExecStartPost=/bin/bash -c 'for i in 1 2 3 4 5 6 7 8 9 10; do curl -sf -o /dev/null -m 3 -H "Host: busyproxy.net" http://127.0.0.1:8080/ && break; sleep 2; done'
Restart=always
RestartSec=4

[Install]
WantedBy=multi-user.target
```

Edge registry + credentials persist under **`.data/edge-state.json`** (override with `EDGE_STATE_PATH`).

Public status: **https://busyproxy.net/status** and **GET /api/status**.

```bash
systemctl status busyproxy
systemctl restart busyproxy
journalctl -u busyproxy -f
```

### Edge proxy ports (on same host today)

| Port | Protocol |
|---|---|
| 18080 | HTTP CONNECT |
| 11080 | SOCKS5 |

Not yet opened in UFW for customers — open only when B2B clients need them.

---

## Redeploy from laptop / builder

```bash
# from project root (secrets stay local)
rsync -avz --delete \
  --exclude node_modules --exclude .git --exclude .env --exclude .deploy \
  --exclude screenshots --exclude dist \
  ./ root@46.101.114.84:/opt/busyproxy/

ssh root@46.101.114.84 '
  cd /opt/busyproxy
  npm ci
  systemctl restart busyproxy
  sleep 10
  curl -sS -o /dev/null -w "%{http_code}\n" -H "Host: busyproxy.net" http://127.0.0.1:8080/
'
```

Or use `scripts/install-server.sh` on a fresh host (expects files already under `/opt/busyproxy` + `.env`).

### Fix Vite “host is not allowed”

```bash
# already set in repo vite.config.ts:
#   allowedHosts: true
# After deploy: systemctl restart busyproxy
```

Helper: `scripts/fix-allowed-hosts-on-server.sh`

---

## TLS (certbot)

Certs live under `/etc/letsencrypt/live/busyproxy.net/`.

```bash
certbot certificates
certbot renew --dry-run
```

Domains covered: `busyproxy.net`, `www`, `app`, `portal`.

---

## SSH access notes

- Deploy key (builder): `relay-deploy@sandbox` ed25519 in `/root/.ssh/authorized_keys`
- Root password was rotated on first forced change (store in password manager; **not** in git)
- Prefer key auth; disable password login once keys are solid

---

## Naming rule

Any droplet for this product:

```text
busyproxy
busyproxy-edge-1
busyproxy-db
```

Never leave random names (`t`, `ubuntu-s-…`).

---

## Checklist after deploy

- [ ] `curl -I https://busyproxy.net` → 200 from allowlisted IP  
- [ ] `systemctl is-active busyproxy nginx`  
- [ ] `grep allowedHosts /opt/busyproxy/vite.config.ts`  
- [ ] Portal → Proxy access works  
- [ ] `.env` present, mode 600, **not** in git  
