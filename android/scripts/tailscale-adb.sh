#!/usr/bin/env bash
# ADB over Tailscale — works from home Wi‑Fi, office, or cellular.
#
# Prereqs: Tailscale installed + logged in on Mac and phone; phone Tailscale ON.
# One-time USB:  ./wifi-adb-fixed.sh setup   (enables adbd on :5555)
#
# Usage:
#   ./android/scripts/tailscale-adb.sh connect 100.x.y.z
#   ./android/scripts/tailscale-adb.sh connect          # uses saved IP
#   ./android/scripts/tailscale-adb.sh status
#   ./android/scripts/tailscale-adb.sh deploy           # build + install via Tailscale IP
set -euo pipefail

export PATH="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools:$PATH"
PORT=5555
STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/busyproxy"
IP_FILE="$STATE_DIR/tailscale-adb-ip.txt"
mkdir -p "$STATE_DIR"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

cmd="${1:-status}"
shift || true

resolve_ip() {
  local ip="${1:-}"
  if [[ -n "$ip" ]]; then
    echo "${ip%%:*}"
    return
  fi
  if [[ -f "$IP_FILE" ]]; then
    cat "$IP_FILE"
    return
  fi
  # Try Tailscale CLI status for likely Android peers
  if command -v tailscale >/dev/null 2>&1; then
    # Prefer tagged/online peers; user can still pass IP explicitly
    local guess
    guess=$(tailscale status --json 2>/dev/null \
      | python3 -c '
import json,sys
try:
  d=json.load(sys.stdin)
except Exception:
  sys.exit(0)
peers=d.get("Peer") or {}
for k,p in peers.items():
  osn=(p.get("OS") or "").lower()
  host=(p.get("HostName") or "").lower()
  online=p.get("Online")
  ips=p.get("TailscaleIPs") or []
  if not online or not ips: continue
  if "android" in osn or "oneplus" in host or "phone" in host or "pixel" in host:
    print(ips[0]); sys.exit(0)
' 2>/dev/null || true)
    if [[ -n "${guess:-}" ]]; then
      echo "$guess"
      return
    fi
  fi
  return 1
}

case "$cmd" in
  connect)
    ip="$(resolve_ip "${1:-}" || true)"
    if [[ -z "${ip:-}" ]]; then
      echo "No Tailscale IP. On the phone: Tailscale app → copy 100.x address."
      echo "Then: $0 connect 100.x.y.z"
      if command -v tailscale >/dev/null 2>&1; then
        echo ""
        echo "Peers:"
        tailscale status 2>/dev/null || true
      fi
      exit 1
    fi
    echo "$ip" >"$IP_FILE"
    echo "→ adb connect $ip:$PORT  (Tailscale)"
    if ! nc -z -G 3 "$ip" "$PORT" 2>/dev/null; then
      echo "✗ $ip:$PORT not open."
      echo "  • Tailscale ON on the phone?"
      echo "  • ADB TCP enabled? USB once: ./android/scripts/wifi-adb-fixed.sh setup"
      echo "  • Phone not asleep with aggressive battery kill on adbd?"
      exit 1
    fi
    adb connect "$ip:$PORT"
    adb devices -l
    ;;

  deploy)
    ip="$(resolve_ip "${1:-}" || true)"
    if [[ -z "${ip:-}" ]]; then
      echo "Save IP first: $0 connect 100.x.y.z"
      exit 1
    fi
    "$0" connect "$ip"
    "$ROOT/android/scripts/wifi-deploy.sh" "$ip:$PORT"
    ;;

  status)
    echo "saved Tailscale IP: $(cat "$IP_FILE" 2>/dev/null || echo '(none)')"
    if command -v tailscale >/dev/null 2>&1; then
      echo ""
      tailscale status 2>/dev/null || echo "tailscale not logged in"
    else
      echo "tailscale CLI not installed (app-only is fine; pass 100.x IP manually)"
    fi
    echo ""
    adb devices -l
    ;;

  *)
    sed -n '2,14p' "$0" | sed 's/^# \?//'
    exit 1
    ;;
esac
