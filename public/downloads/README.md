# Android downloads (promo protected)

| File | Purpose |
|------|---------|
| `BusyProxy-latest-debug.apk` | Beta APK binary (not open — server requires promo code) |
| `BusyProxy-latest-debug.apk.sha256` | Checksum (same gate) |

**Default promo code:** `5409`  
Override on the server with env `APK_PROMO_CODE`.

### How download works

1. User opens https://busyproxy.net/#download  
2. Enters promo code → `POST /api/download/verify`  
3. On success → download from `GET /api/download/apk?code=…`  
4. Direct `GET /downloads/*.apk` without a valid `?code=` returns **403**

### Publish

```bash
./android/scripts/publish-debug-apk.sh
```

Website switch: `src/data/app-download.ts`  
- `APP_DOWNLOAD_CHANNEL = "apk"` → promo-gated APK  
- `APP_DOWNLOAD_CHANNEL = "play"` → Google Play  
