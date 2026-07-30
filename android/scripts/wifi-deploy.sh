#!/usr/bin/env bash
# Deploy BusyProxy debug APK over Wi‑Fi ADB without wiping login/data.
#
# Usage:
#   ./android/scripts/wifi-deploy.sh
#   ./android/scripts/wifi-deploy.sh 192.168.88.74:5555 192.168.91.116:5555
#
# Prefer FIXED port 5555 (Wireless debugging UI ports change every time):
#   1) USB once:  ./android/scripts/wifi-adb-fixed.sh setup
#   2) Later:     ./android/scripts/wifi-adb-fixed.sh connect 192.168.88.74
#   3) Deploy:    ./android/scripts/wifi-deploy.sh 192.168.88.74:5555
#
# "Wireless debugging" pair/connect ports in Developer options are random and
# cannot be locked. After phone reboot, run wifi-adb-fixed.sh setup again (USB).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export JAVA_HOME="${JAVA_HOME:-/Applications/Android Studio.app/Contents/jbr/Contents/Home}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

APK="$ROOT/artifacts/apk/BusyProxy-latest-debug.apk"
PKG="net.busyproxy.app.debug"
ACTIVITY="$PKG/net.busyproxy.app.MainActivity"

# Default: fixed :5555 (set via wifi-adb-fixed.sh). Override via args.
if [[ $# -gt 0 ]]; then
  TARGETS=("$@")
else
  TARGETS=(
    "192.168.88.74:5555"
    "192.168.91.116:5555"
  )
fi

echo "→ build APK"
"$ROOT/android/scripts/build-apk.sh" >/dev/null
test -f "$APK" || { echo "APK missing: $APK" >&2; exit 1; }

adb start-server >/dev/null

ok=0
fail=0
for t in "${TARGETS[@]}"; do
  echo ""
  echo "=== $t ==="
  if ! nc -z -G 2 "${t%:*}" "${t#*:}" 2>/dev/null; then
    echo "  ✗ port closed / unreachable (wireless debugging off, wrong IP/port, or subnet)"
    fail=$((fail + 1))
    continue
  fi
  if ! adb connect "$t" 2>&1 | tee /dev/stderr | grep -qiE 'connected|already'; then
    echo "  ✗ adb connect failed"
    fail=$((fail + 1))
    continue
  fi
  # install -r keeps app data (session login)
  if adb -s "$t" install -r "$APK" 2>&1; then
    adb -s "$t" shell am force-stop "$PKG" || true
    adb -s "$t" shell am start -n "$ACTIVITY" >/dev/null
    model=$(adb -s "$t" shell getprop ro.product.model 2>/dev/null | tr -d '\r')
    echo "  ✓ installed + launched on $model (login data preserved)"
    ok=$((ok + 1))
  else
    echo "  ✗ install failed"
    fail=$((fail + 1))
  fi
done

echo ""
echo "Done: $ok ok, $fail failed"
echo "List: adb devices -l"
adb devices -l
exit $(( fail > 0 ? 1 : 0 ))
