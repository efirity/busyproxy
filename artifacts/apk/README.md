# BusyProxy Android APKs

Sideload builds for testing on any phone (USB or file share).

## Latest file

After running the build script:

| File | Purpose |
|---|---|
| **`BusyProxy-latest-debug.apk`** | Always the newest debug build — use this |
| `BusyProxy-0.1.0-beta-debug.apk` | Versioned copy |
| `BusyProxy-latest-debug.apk.sha256` | Checksum |

```bash
# from repo root
./android/scripts/build-apk.sh
```

## Install on a phone

### A) USB (fastest for debugging)

1. Enable **Developer options** → **USB debugging**
2. Plug in the phone, accept the RSA prompt
3. Run:

```bash
adb devices
adb install -r artifacts/apk/BusyProxy-latest-debug.apk
adb shell am start -n net.busyproxy.app.debug/net.busyproxy.app.MainActivity
```

### B) Share the file (any phone, no computer)

1. AirDrop / Drive / Telegram / USB file copy of  
   `artifacts/apk/BusyProxy-latest-debug.apk`
2. On the phone open the file → **Install**
3. If blocked: Settings → allow install from that app (Files / Chrome / etc.)

## Package details

| | |
|---|---|
| Application id | `net.busyproxy.app.debug` |
| Min Android | 8.0 (API 26) |
| API host | `https://busyproxy.net` |
| Agent WSS | `wss://agent.busyproxy.net/v1/tunnel` |

Debug builds use the Android debug keystore (safe for internal testing, not Play Store).

## Note on git

`*.apk` files are **gitignored** (large binaries). Rebuild anytime with the script above; keep a local/shared folder for distribution if needed.
