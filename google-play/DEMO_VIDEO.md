# Play review demo video (full flow + background)

## Files

| File | Purpose |
|------|---------|
| `google-play/assets/busyproxy-play-review-demo.mp4` | Longer take (incl. lock/unlock) |
| `google-play/assets/busyproxy-play-review-demo-bg.mp4` | **Recommended** start → sticky notif → return → **stop** (~9 MB) |
| `artifacts/play-demo/busyproxy-play-review-demo-bg.mp4` | Local copy of bg take |
| `artifacts/play-demo/busyproxy-play-demo.mp4` | Shorter earlier take (in-app only) |

Recorded on **Pixel 4a** (USB), BusyProxy debug build — same UX as release.

## What `busyproxy-play-review-demo-bg.mp4` shows (start → stop)

Clean full lifecycle for reviewers:

1. **App open** — Home, balance, rates, **Sharing off**  
2. **Start sharing** — status becomes **Sharing on**; sticky notification posts  
3. **Leave app** — Home (tunnel keeps running in background)  
4. **Notification shade** — BusyProxy **ongoing / sticky** notification  
   - Title: **BusyProxy** (FGS “Sharing on · wifi” style status)  
   - This is the persistent **foreground-service** notification (not a home-screen widget)  
5. **Tap notification** → returns to the app with **Sharing on** still active  
6. **Stop sharing** — status becomes **Sharing off**; notification clears  

## Longer take (`busyproxy-play-review-demo.mp4`)

Also covers screen off / lock while sharing, then unlock + shade + tap-to-return.

Demo account (App access form):

| Field | Value |
|-------|--------|
| Phone | `+15550100001` |
| OTP | `246810` |

## Play Console usage

1. Upload the MP4 to **YouTube → Unlisted**  
2. In **App access** instructions, add:
   - Demo phones + OTPs from [APP_ACCESS_REVIEWERS.md](./APP_ACCESS_REVIEWERS.md)  
   - Unlisted YouTube URL  
3. If Google asks for a video by email, send the same link  

### Suggested App access note (paste)

```
Demo (no real SMS):
• Phone +15550100001 → OTP 246810
• Phone +15550100002 → OTP 135790 (backup after delete)

Flow to verify:
1. Consent → login with demo phone + OTP
2. Home: rates, network mode, Start sharing
3. Press Home: sharing continues in background
4. Pull down notifications: BusyProxy “Sharing on” ongoing notification
5. Tap notification: returns to app; session still live
6. Stop sharing anytime

Demo video (unlisted): <PASTE_YOUTUBE_URL>
```

## Note on “widget”

Android shows status via a **persistent notification** (foreground service), not a separate home-screen widget. Reviewers treat that as the background indicator. The video covers shade + tap-to-return.

## Re-record

```bash
adb shell screenrecord --bit-rate 8000000 --time-limit 120 /sdcard/demo.mp4
# drive UI: share → Home → expand notif → tap notif → lock/unlock → stop
adb pull /sdcard/demo.mp4 artifacts/play-demo/
```
