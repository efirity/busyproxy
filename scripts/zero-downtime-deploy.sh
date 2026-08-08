#!/usr/bin/env bash
# Rsync from laptop + zero-downtime slot switch on the droplet.
#
# Usage (from repo root on your Mac):
#   ./scripts/zero-downtime-deploy.sh
#   DEPLOY_HOST=root@46.101.114.84 ./scripts/zero-downtime-deploy.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${DEPLOY_HOST:-root@46.101.114.84}"
REMOTE="${REMOTE_DIR:-/opt/busyproxy}"

cd "$ROOT"

echo "→ rsync to $HOST:$REMOTE"
rsync -avz \
  --exclude node_modules --exclude .git --exclude .env --exclude .deploy \
  --exclude screenshots --exclude dist --exclude .data \
  --exclude android/app/build --exclude android/.gradle --exclude android/.kotlin \
  --exclude android/local.properties \
  --exclude ios/build --exclude 'ios/build/**' --exclude ios/**/DerivedData* \
  --exclude ios/**/*.xcarchive --exclude ios/build/fastlane \
  --exclude 'android/**/build' --exclude 'android/.gradle' \
  --exclude "*.mobileprovision" \
  --exclude .output --exclude .vinxi --exclude .tanstack --exclude .nitro \
  --exclude artifacts \
  ./ "$HOST:$REMOTE/"

echo "→ zero-downtime restart on server (old slot stays live until new is healthy)"
# Always reinstall unit first so fatal ExecStartPost cannot reappear
ssh -o ConnectTimeout=20 "$HOST" "bash -s" <<'REMOTE'
set -euo pipefail
REMOTE_DIR="${REMOTE_DIR:-/opt/busyproxy}"
# Drop accidental heavy trees that exhaust inotify and slow Vite
rm -rf "$REMOTE_DIR/ios/build" "$REMOTE_DIR/android/app/build" 2>/dev/null || true
sysctl -w fs.inotify.max_user_watches=1048576 >/dev/null 2>&1 || true
# Install fixed unit before switch
install -m 644 "$REMOTE_DIR/deploy/busyproxy@.service" /etc/systemd/system/busyproxy@.service
systemctl daemon-reload
MAX_WAIT=120 bash "$REMOTE_DIR/scripts/zero-downtime-restart.sh" --switch
REMOTE

echo "→ public smoke"
code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 15 https://busyproxy.net/ || echo "000")
echo "https:$code"
if [[ "$code" != "200" && "$code" != "301" && "$code" != "302" ]]; then
  echo "WARN: public health not 200 — check: ssh $HOST 'bash /opt/busyproxy/scripts/zero-downtime-restart.sh --status'"
  exit 1
fi
echo "✓ deploy finished"
