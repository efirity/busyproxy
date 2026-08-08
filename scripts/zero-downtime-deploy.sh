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

echo "→ zero-downtime restart on server"
ssh -o ConnectTimeout=20 "$HOST" "bash $REMOTE/scripts/zero-downtime-restart.sh --switch"

echo "→ public smoke"
curl -sS -o /dev/null -w "https:%{http_code}\n" https://busyproxy.net/ || true
echo "✓ deploy finished"
