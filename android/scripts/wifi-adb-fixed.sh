#!/usr/bin/env bash
# Stable Wi‑Fi ADB on fixed port 5555 (recommended).
#
# Android "Wireless debugging" (Dev options) picks a *new random port* every time
# you toggle it or change Wi‑Fi. You cannot lock that UI port.
#
# Fix: enable classic TCP mode once over USB → always use IP:5555 until reboot.
#
# One-time (USB cable plugged into the phone):
#   ./android/scripts/wifi-adb-fixed.sh setup
#
# Later (no cable, same Wi‑Fi):
#   ./android/scripts/wifi-adb-fixed.sh connect 192.168.88.74
#   ./android/scripts/wifi-adb-fixed.sh connect   # auto-discovers via mDNS / last IP
#
# After phone reboot, run setup again (USB) or:
#   Developer options → Wireless debugging ON is still random;
#   re-run setup over USB for :5555 again.
set -euo pipefail

export PATH="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools:$PATH"
PORT=5555
STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/busyproxy"
LAST_IP_FILE="$STATE_DIR/wifi-adb-last-ip.txt"
mkdir -p "$STATE_DIR"

usage() {
  sed -n '2,20p' "$0" | sed 's/^# \?//'
  exit 1
}

cmd="${1:-}"
shift || true

case "$cmd" in
  setup)
    # Prefer a USB device (serial without colon)
    usb=$(adb devices | awk '/\tdevice$/ && $1 !~ /:/ { print $1; exit }')
    if [[ -z "${usb:-}" ]]; then
      echo "Plug the phone with USB, enable USB debugging, then re-run:"
      echo "  $0 setup"
      adb devices -l
      exit 1
    fi
    echo "→ USB device: $usb"
    # Optional: stay awake / trust this machine already done by user
    adb -s "$usb" tcpip "$PORT"
    sleep 1
    # Read phone Wi‑Fi IP (wlan0 / wifi)
    ip=$(adb -s "$usb" shell ip -f inet addr show wlan0 2>/dev/null \
      | awk '/inet / { print $2 }' | cut -d/ -f1 | tr -d '\r' | head -1)
    if [[ -z "${ip:-}" ]]; then
      ip=$(adb -s "$usb" shell ip route 2>/dev/null \
        | awk '/wlan0/ && /src/ { print $NF; exit }' | tr -d '\r')
    fi
    if [[ -z "${ip:-}" ]]; then
      echo "Could not detect Wi‑Fi IP. On phone: Settings → About → Status → IP."
      echo "Then: adb connect <IP>:$PORT"
      exit 0
    fi
    echo "$ip" >"$LAST_IP_FILE"
    echo "→ phone Wi‑Fi IP: $ip"
    # Unplug USB if you want; connect over Wi‑Fi
    adb connect "$ip:$PORT"
    echo "✓ Fixed ADB: $ip:$PORT  (stays until phone reboot)"
    echo "  Later: $0 connect $ip"
    adb devices -l
    ;;

  connect)
    ip="${1:-}"
    if [[ -z "$ip" && -f "$LAST_IP_FILE" ]]; then
      ip=$(cat "$LAST_IP_FILE")
    fi
    if [[ -z "${ip:-}" ]]; then
      # try mDNS (Android 11+ wireless debugging advertises sometimes)
      echo "No IP given. Scanning adb devices / last IP…"
      adb devices -l
      echo "Usage: $0 connect 192.168.88.74"
      exit 1
    fi
    # strip accidental :port
    ip="${ip%%:*}"
    echo "$ip" >"$LAST_IP_FILE"
    echo "→ adb connect $ip:$PORT"
    adb connect "$ip:$PORT"
    adb devices -l
    ;;

  status)
    adb devices -l
    if [[ -f "$LAST_IP_FILE" ]]; then
      echo "last IP: $(cat "$LAST_IP_FILE"):$PORT"
    fi
    ;;

  *)
    usage
    ;;
esac
