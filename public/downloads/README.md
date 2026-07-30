# Public Android downloads

| File | Purpose |
|------|---------|
| `BusyProxy-latest-debug.apk` | Latest beta APK served at https://busyproxy.net/downloads/BusyProxy-latest-debug.apk |
| `BusyProxy-latest-debug.apk.sha256` | Checksum |

Publish from the repo root:

```bash
./android/scripts/publish-debug-apk.sh
```

Website install UI: `src/data/app-download.ts`  
- `APP_DOWNLOAD_CHANNEL = "apk"` → download APK from this folder  
- `APP_DOWNLOAD_CHANNEL = "play"` → hero/CTA open Google Play  
