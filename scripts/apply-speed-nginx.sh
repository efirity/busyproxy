#!/bin/bash
# Apply gzip + asset cache to live nginx without breaking Certbot SSL lines.
set -euo pipefail

CONF=/etc/nginx/sites-enabled/default
if [[ ! -f "$CONF" ]]; then
  CONF=$(ls /etc/nginx/sites-enabled/* 2>/dev/null | head -1)
fi
[[ -n "${CONF:-}" && -f "$CONF" ]] || { echo "no nginx site conf"; exit 1; }

# Global gzip if missing
if ! grep -q 'gzip on' /etc/nginx/nginx.conf 2>/dev/null; then
  sed -i '/http {/a\    gzip on;\n    gzip_vary on;\n    gzip_proxied any;\n    gzip_comp_level 5;\n    gzip_min_length 256;\n    gzip_types text/plain text/css text/javascript application/javascript application/json application/xml image/svg+xml;' /etc/nginx/nginx.conf
fi

# Inject /assets/ cache block before location / if not present
if ! grep -q 'location /assets/' "$CONF"; then
  python3 - <<'PY'
from pathlib import Path
import re
p = Path("/etc/nginx/sites-enabled")
files = list(p.glob("*"))
target = None
for f in files:
    t = f.read_text()
    if "proxy_pass http://127.0.0.1:8080" in t or "proxy_pass http://busyproxy" in t:
        target = f
        break
if not target:
    raise SystemExit("no proxy conf found")
text = target.read_text()
if "location /assets/" in text:
    print("assets block exists")
else:
    block = '''
  # BusyProxy speed: long-cache Vite assets
  location /assets/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    expires 7d;
    add_header Cache-Control "public, max-age=604800, immutable";
  }

  location /api/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    add_header Cache-Control "no-store" always;
    proxy_read_timeout 120s;
  }

'''
    # insert before first "location / {"
    text2 = re.sub(r'(\n\s*location\s+/\s*\{)', block + r'\1', text, count=1)
    target.write_text(text2)
    print("patched", target)
PY
fi

nginx -t
systemctl reload nginx
echo "nginx speed config applied"
