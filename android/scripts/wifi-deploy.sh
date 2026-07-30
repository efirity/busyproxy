#!/usr/bin/env bash
# Deploy BusyProxy debug APK over Wi‑Fi ADB without wiping login/data.
#
# Usage:
#   ./android/scripts/wifi-deploy.sh              # mDNS rediscover + install
#   ./android/scripts/wifi-deploy.sh --discover   # same (explicit)
#   ./android/scripts/wifi-deploy.sh IP:PORT ...  # explicit targets only
#
# When Wireless debugging port changes, just re-run — no need to read the phone.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export JAVA_HOME="${JAVA_HOME:-/Applications/Android Studio.app/Contents/jbr/Contents/Home}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

APK="$ROOT/artifacts/apk/BusyProxy-latest-debug.apk"
PKG="net.busyproxy.app.debug"
ACTIVITY="$PKG/net.busyproxy.app.MainActivity"
STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/busyproxy"
USE_DISCOVER=1
EXPLICIT=()

for a in "$@"; do
  case "$a" in
    --discover|--auto) USE_DISCOVER=1 ;;
    --no-discover) USE_DISCOVER=0 ;;
    *) EXPLICIT+=("$a"); USE_DISCOVER=0 ;;
  esac
done

echo "→ build APK"
"$ROOT/android/scripts/build-apk.sh" >/dev/null
test -f "$APK" || { echo "APK missing: $APK" >&2; exit 1; }

adb start-server >/dev/null

TARGETS=()
if [[ ${#EXPLICIT[@]} -gt 0 ]]; then
  TARGETS=("${EXPLICIT[@]}")
elif [[ "$USE_DISCOVER" -eq 1 ]]; then
  echo "→ rediscover wireless ADB (same Wi‑Fi / mDNS)…"
  # Connect + save OnePlus target
  "$ROOT/android/scripts/wifi-adb-discover.sh" --oneplus >/tmp/bp-adb-discover.out 2>&1 || true
  cat /tmp/bp-adb-discover.out 2>/dev/null | head -40 || true
  # Collect connected wireless devices
  while read -r serial state; do
    [[ "$serial" == *":"* && "$state" == "device" ]] && TARGETS+=("$serial")
  done < <(adb devices 2>/dev/null | awk 'NR>1 && NF>=2 {print $1, $2}')
  # Prefer saved OnePlus first
  if [[ -f "$STATE_DIR/wifi-adb-oneplus-target.txt" ]]; then
    op=$(cat "$STATE_DIR/wifi-adb-oneplus-target.txt")
    TARGETS=("$op" "${TARGETS[@]}")
  fi
  # Fixed-port fallbacks if nothing found
  if [[ ${#TARGETS[@]} -eq 0 ]]; then
    TARGETS=("192.168.88.74:5555" "192.168.91.116:5555")
  fi
fi

# Dedupe (bash 3.2)
DEDUPED=""
for t in "${TARGETS[@]}"; do
  case " $DEDUPED " in
    *" $t "*) ;;
    *) DEDUPED="${DEDUPED}${DEDUPED:+ }$t" ;;
  esac
done

ok=0
fail=0
for t in $DEDUPED; do
  echo ""
  echo "=== $t ==="
  host="${t%%:*}"
  port="${t##*:}"
  if ! nc -z -G 2 "$host" "$port" 2>/dev/null; then
    echo "  ✗ port closed / unreachable"
    fail=$((fail + 1))
    continue
  fi
  if ! adb connect "$t" 2>&1 | tee /dev/stderr | grep -qiE 'connected|already'; then
    echo "  ✗ adb connect failed"
    fail=$((fail + 1))
    continue
  fi
  if adb -s "$t" install -r "$APK" 2>&1; then
    adb -s "$t" shell am force-stop "$PKG" || true
    adb -s "$t" shell am start -n "$ACTIVITY" >/dev/null
    model=$(adb -s "$t" shell getprop ro.product.model 2>/dev/null | tr -d '\r')
    echo "  ✓ installed + launched on $model"
    ok=$((ok + 1))
  else
    echo "  ✗ install failed"
    fail=$((fail + 1))
  fi
done

echo ""
echo "Done: $ok ok, $fail failed"
adb devices -l
exit $(( fail > 0 && ok == 0 ? 1 : 0 ))
