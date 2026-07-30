# Deploy to OnePlus (or any phone) from **any** network

## Why normal Wi‑Fi ADB fails off your home LAN

| Method | Same Wi‑Fi | Cellular / other Wi‑Fi | After reboot |
|--------|------------|------------------------|--------------|
| `adb tcpip 5555` + LAN IP | ✅ | ❌ (private IP not reachable) | Needs USB once again |
| Developer “Wireless debugging” random port | ✅ | ❌ | Port changes |
| USB cable | ✅ | ✅ (if cable plugged into this Mac) | Plug again |

Your Mac mini can only open `192.168.x.x:5555` when it is on the **same LAN**. On mobile data or another Wi‑Fi, the phone’s address is not routable to your builder.

---

## Recommended options (pick one)

### A) Tailscale (best for true “any network” ADB)

Phone and Mac join a private mesh. ADB uses a stable `100.x.y.z:5555` that works on **home Wi‑Fi, office, or cellular**.

**One-time setup**

1. Install [Tailscale](https://tailscale.com) on:
   - this Mac mini  
   - the OnePlus (`Play Store → Tailscale`)
2. Sign both into the **same** Tailscale account / tailnet.
3. On phone: enable Tailscale (VPN permission once).
4. Enable ADB TCP once (USB cable to this Mac):

```bash
./android/scripts/wifi-adb-fixed.sh setup
# or: adb tcpip 5555
```

5. Connect via Tailscale IP (phone Tailscale app shows `100.…`):

```bash
./android/scripts/tailscale-adb.sh connect 100.x.y.z
./android/scripts/wifi-deploy.sh 100.x.y.z:5555
```

Or save the IP once:

```bash
echo 100.x.y.z > ~/.local/state/busyproxy/tailscale-adb-ip.txt
./android/scripts/tailscale-adb.sh connect
./android/scripts/wifi-deploy.sh
```

**Notes**

- Keep Tailscale **on** on the phone when you want remote deploy.
- After phone reboot: USB `tcpip 5555` once (or Magisk/adb always-on if you go advanced later).
- Security: only devices on your tailnet can reach ADB; do not expose `:5555` on the public internet.

---

### B) HTTPS install (any network, no ADB)

Publish the debug APK to the server; open the link on the phone (any network) and install.

```bash
./android/scripts/publish-debug-apk.sh
# prints something like:
#   https://busyproxy.net/downloads/BusyProxy-latest-debug.apk
```

On the phone: open that URL → Install (allow “unknown apps” for the browser once).

Good when you only need “get this build on the phone”, not shell/logcat.

Optional token lock (recommended if the APK is not public):

```bash
export APK_DOWNLOAD_TOKEN=long-random-string
./android/scripts/publish-debug-apk.sh
# URL: https://busyproxy.net/downloads/BusyProxy-latest-debug.apk?token=...
```

---

### C) USB (always works when phone is next to the Mac)

```bash
adb devices
./android/scripts/build-apk.sh
adb install -r artifacts/apk/BusyProxy-latest-debug.apk
```

---

### D) Reverse SSH via droplet (advanced — usually skip)

Phone runs a reverse tunnel so `localhost:5555` appears on the VPS; Mac tunnels to that. Fragile, Termux + keys required, easy to misconfigure into an open ADB. Prefer **Tailscale**.

---

## Practical recommendation for BusyProxy

| Goal | Use |
|------|-----|
| Agent deploys anytime (install + launch + logs) | **Tailscale + `:5555`** |
| “Just put this APK on the phone” | **publish-debug-apk.sh** |
| Desk / charging | USB |

You cannot make plain LAN `192.168.…:5555` work from “any network” without a mesh VPN or a reverse tunnel. There is no Developer Options switch for that.
