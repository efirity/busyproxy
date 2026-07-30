#!/usr/bin/env bash
# Publish latest debug APK to production for install from any network (no ADB).
#
#   ./android/scripts/publish-debug-apk.sh
#   APK_DOWNLOAD_TOKEN=secret ./android/scripts/publish-debug-apk.sh
#
# Phone: open the printed HTTPS URL → Install.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST="${DEPLOY_HOST:-root@46.101.114.84}"
REMOTE_DIR="${REMOTE_DIR:-/opt/busyproxy/public/downloads}"
TOKEN="${APK_DOWNLOAD_TOKEN:-}"

echo "→ build"
"$ROOT/android/scripts/build-apk.sh" >/dev/null
APK="$ROOT/artifacts/apk/BusyProxy-latest-debug.apk"
test -f "$APK"

SHA=$(shasum -a 256 "$APK" | awk '{print $1}')
echo "$SHA  BusyProxy-latest-debug.apk" >"$ROOT/artifacts/apk/BusyProxy-latest-debug.apk.sha256"

echo "→ rsync to $HOST:$REMOTE_DIR"
ssh -o ConnectTimeout=15 "$HOST" "mkdir -p '$REMOTE_DIR'"
rsync -avz "$APK" "$ROOT/artifacts/apk/BusyProxy-latest-debug.apk.sha256" \
  "$HOST:$REMOTE_DIR/"

# Optional nginx-style note file (token is checked only if you add a tiny gate later)
if [[ -n "$TOKEN" ]]; then
  echo "$TOKEN" | ssh "$HOST" "cat > '$REMOTE_DIR/.download-token'"
fi

URL="https://busyproxy.net/downloads/BusyProxy-latest-debug.apk"
echo ""
echo "✓ Published"
echo "  $URL"
echo "  sha256: $SHA"
echo ""
echo "On the OnePlus (any network): open the URL in Chrome → Install."
echo "If install is blocked: Settings → allow install from that browser."
