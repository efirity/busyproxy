# Store listing graphics checklist

Place final exports under `google-play/assets/` (gitignored large binaries optional).

## Required

| Asset | Spec | Status | Notes |
|-------|------|--------|-------|
| App icon (high-res) | 512 × 512 PNG, 32-bit, no alpha required for Play | ⚠️ Export from Android adaptive icon | Current adaptive icons in `android/app/src/main/res/mipmap-*` |
| Feature graphic | 1024 × 500 PNG/JPEG | ❌ TODO | Brand + “Earn per GB” |
| Phone screenshots | min 2, max 8; 16:9 or 9:16; min short side 320px | ⚠️ Capture from real devices | Prefer Pixel / modern phone |
| 7" tablet screenshots | Optional | ❌ | Skip unless tablet-optimized |
| 10" tablet screenshots | Optional | ❌ | Skip unless tablet-optimized |
| TV / Wear / Auto | N/A | — | Not supporting |

## Screenshot shot list (recommended order)

1. **Home / balance** — available balance, rates  
2. **Sharing on** — agent status online, network mode chips  
3. **Consent** — clear disclosure  
4. **Login** — phone OTP (no secrets)  
5. **Network modes** — Automatic / Wi‑Fi / Mobile  
6. **Delete account / support** — policy-friendly  

Capture with **status bar clean** if possible; crop notch if needed (already done for web /app gallery).

## Capture commands (local)

```bash
# After adb install of release or debug build
adb shell screencap -p /sdcard/bp1.png
adb pull /sdcard/bp1.png google-play/assets/screenshots/
```

Or use Android Studio → Layout Inspector / device screenshot.

## Branding notes

- Use BusyProxy logo/wordmark consistently  
- Dark UI matches product  
- Avoid competitor names, “guaranteed income”, or misleading earnings claims  
- Do not show proxy host:port or credentials in screenshots (earner never sees them)  
