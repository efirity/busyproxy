#!/usr/bin/env bash
# Auto-discover Android Wireless debugging on the same Wi‑Fi (mDNS).
# Port changes when you toggle Wireless debugging — re-run this instead of
# reading the phone screen.
#
# Usage:
#   ./android/scripts/wifi-adb-discover.sh              # connect all found
#   ./android/scripts/wifi-adb-discover.sh --oneplus     # prefer OnePlus
#   ./android/scripts/wifi-adb-discover.sh --print       # print host:port only
#   ./android/scripts/wifi-adb-discover.sh --deploy      # discover + install APK
set -euo pipefail

export PATH="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools:$PATH"
STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/busyproxy"
mkdir -p "$STATE_DIR"
LAST_IP_FILE="$STATE_DIR/wifi-adb-last-ip.txt"
LAST_TARGET_FILE="$STATE_DIR/wifi-adb-last-target.txt"
LAST_ONEPLUS_FILE="$STATE_DIR/wifi-adb-oneplus-target.txt"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

PREFER_ONEPLUS=0
PRINT_ONLY=0
DO_DEPLOY=0
for a in "$@"; do
  case "$a" in
    --oneplus) PREFER_ONEPLUS=1 ;;
    --print) PRINT_ONLY=1 ;;
    --deploy) DO_DEPLOY=1 ;;
    -h|--help)
      sed -n '2,14p' "$0" | sed 's/^# \?//'
      exit 0
      ;;
  esac
done

if ! command -v adb >/dev/null; then
  echo "adb not found" >&2
  exit 1
fi

adb start-server >/dev/null 2>&1 || true

# Drop offline wireless sessions
adb devices 2>/dev/null | awk 'NR>1 && $1 ~ /:/ && $2=="offline" {print $1}' | while read -r s; do
  adb disconnect "$s" >/dev/null 2>&1 || true
done

# Parse: adb-SERIAL  _adb-tls-connect._tcp  192.168.x.x:PORT
collect_targets() {
  adb mdns services 2>/dev/null | awk '
    /_adb-tls-connect|_adb\._tcp/ {
      for (i = 1; i <= NF; i++) {
        if ($i ~ /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+:[0-9]+$/) print $i
      }
    }
  ' || true
  if [[ -f "$LAST_TARGET_FILE" ]]; then cat "$LAST_TARGET_FILE" || true; fi
  if [[ -f "$LAST_ONEPLUS_FILE" ]]; then cat "$LAST_ONEPLUS_FILE" || true; fi
  return 0
}

FOUND=$(collect_targets | sed '/^$/d' | sort -u || true)

# Fallback when mDNS is quiet: re-try last known host:port and classic :5555.
# (Random wireless-debug ports only reappear via mDNS once Wireless debugging is ON.)
probe_known() {
  local t host port
  for t in "$@"; do
    [[ -z "$t" || "$t" == ":5555" || "$t" == ":"* ]] && continue
    if [[ "$t" != *":"* ]]; then
      host="$t"
      t="${host}:5555"
    else
      host="${t%%:*}"
      port="${t##*:}"
      [[ -z "$host" || -z "$port" ]] && continue
    fi
    if nc -z -G 1 "$host" "${t##*:}" 2>/dev/null; then
      echo "$t"
    fi
  done
  return 0
}

_op=$(cat "$LAST_ONEPLUS_FILE" 2>/dev/null || true)
_lt=$(cat "$LAST_TARGET_FILE" 2>/dev/null || true)
_ip=$(cat "$LAST_IP_FILE" 2>/dev/null || true)
KNOWN_EXTRA=$(
  probe_known "$_op" "$_lt" \
    $([ -n "$_ip" ] && echo "${_ip}:5555") \
    "192.168.88.74:5555" \
    "192.168.88.74:40219" \
    || true
)
if [[ -n "${KNOWN_EXTRA:-}" ]]; then
  FOUND=$(printf '%s\n%s\n' "${FOUND:-}" "$KNOWN_EXTRA" | sed '/^$/d' | sort -u)
fi

if [[ -z "$FOUND" ]]; then
  echo "No wireless ADB services found on this Wi‑Fi."
  echo ""
  echo "On the OnePlus:"
  echo "  1) Same Wi‑Fi as this Mac"
  echo "  2) Developer options → Wireless debugging → ON"
  echo "  3) Pair once if asked (pairing code)"
  echo ""
  echo "Stable alternative (USB once): ./android/scripts/wifi-adb-fixed.sh setup  → :5555"
  exit 1
fi

echo "Discovered wireless ADB endpoints:"
echo "$FOUND" | sed 's/^/  /'
echo ""

CONNECTED=""
PRIMARY=""
ONEPLUS=""

while IFS= read -r t; do
  [[ -z "$t" ]] && continue
  host="${t%%:*}"
  port="${t##*:}"
  if ! nc -z -G 1 "$host" "$port" 2>/dev/null; then
    echo "  · $t  (closed — skip)"
    continue
  fi
  if [[ "$PRINT_ONLY" -eq 1 ]]; then
    echo "$t"
    CONNECTED="${CONNECTED}${CONNECTED:+ }$t"
    continue
  fi
  echo "  → adb connect $t"
  out=$(adb connect "$t" 2>&1 || true)
  echo "    $out"
  if ! echo "$out" | grep -qiE 'connected|already'; then
    continue
  fi
  sleep 0.4
  state=$(adb -s "$t" get-state 2>/dev/null | tr -d '\r' || true)
  if [[ "$state" != "device" ]]; then
    echo "    state=$state"
    continue
  fi
  CONNECTED="${CONNECTED}${CONNECTED:+ }$t"
  echo "$host" >"$LAST_IP_FILE"
  echo "$t" >"$LAST_TARGET_FILE"
  model=$(adb -s "$t" shell getprop ro.product.model 2>/dev/null | tr -d '\r' || true)
  brand=$(adb -s "$t" shell getprop ro.product.brand 2>/dev/null | tr -d '\r' || true)
  echo "    ✓ $model ($brand)"
  if echo "$model $brand" | grep -qiE 'oneplus|CPH|OP[0-9]|oppo'; then
    echo "$t" >"$LAST_ONEPLUS_FILE"
    ONEPLUS="$t"
    echo "    (saved as OnePlus)"
  fi
  [[ -z "$PRIMARY" ]] && PRIMARY="$t"
done <<< "$FOUND"

if [[ -z "$CONNECTED" ]]; then
  if [[ "$PRINT_ONLY" -eq 1 ]]; then
    # Still print candidates even if we did not fully connect
    echo "${FOUND}" | head -5
    exit 0
  fi
  echo "None connected. Toggle Wireless debugging off/on on the phone and re-run."
  exit 1
fi

if [[ "$PREFER_ONEPLUS" -eq 1 && -n "$ONEPLUS" ]]; then
  PRIMARY="$ONEPLUS"
elif [[ "$PREFER_ONEPLUS" -eq 1 && -f "$LAST_ONEPLUS_FILE" ]]; then
  cand=$(cat "$LAST_ONEPLUS_FILE")
  for c in $CONNECTED; do
    if [[ "$c" == "$cand" ]]; then PRIMARY="$c"; break; fi
  done
fi
PRIMARY="${PRIMARY:-${CONNECTED%% *}}"

echo ""
echo "Primary: $PRIMARY"
echo "$PRIMARY" >"$LAST_TARGET_FILE"

if [[ "$DO_DEPLOY" -eq 1 ]]; then
  # shellcheck disable=SC2086
  "$ROOT/android/scripts/wifi-deploy.sh" $CONNECTED
fi

# Always print primary last for scripting
echo "$PRIMARY"
