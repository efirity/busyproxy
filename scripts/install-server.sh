#!/bin/bash
# Run ON the droplet as root after project files are in /opt/busyproxy
set -euo pipefail

APP_DIR=/opt/busyproxy
USER_IP="${USER_IP:-89.28.43.197}"

if [ ! -f "$APP_DIR/package.json" ]; then
  echo "Missing $APP_DIR/package.json" >&2
  exit 1
fi
if [ ! -f "$APP_DIR/.env" ]; then
  echo "Missing $APP_DIR/.env — copy from .env.example and fill secrets" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl ca-certificates nginx ufw

if ! command -v node >/dev/null 2>&1 || ! node -v | grep -q v22; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

cd "$APP_DIR"
npm ci || npm install
npm run build || true

cat > /etc/nginx/sites-available/busyproxy <<'NGX'
server {
  listen 80 default_server;
  server_name busyproxy.net www.busyproxy.net app.busyproxy.net portal.busyproxy.net _;
  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
NGX
ln -sfn /etc/nginx/sites-available/busyproxy /etc/nginx/sites-enabled/busyproxy
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

cat > /etc/systemd/system/busyproxy.service <<'UNIT'
[Unit]
Description=BusyProxy web
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/busyproxy
EnvironmentFile=/opt/busyproxy/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run dev
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now busyproxy

ufw default deny incoming
ufw default allow outgoing
ufw allow from "$USER_IP" to any port 22 proto tcp
ufw allow from "$USER_IP" to any port 80 proto tcp
ufw allow from "$USER_IP" to any port 443 proto tcp
ufw --force enable

echo "BusyProxy listening via nginx :80 → :8080"
echo "Allowlisted IP: $USER_IP"
curl -sS -o /dev/null -w "local_app:%{http_code}\n" http://127.0.0.1:8080/ || true
