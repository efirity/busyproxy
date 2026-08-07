# Play review demo video

**File (local):**

- `artifacts/play-demo/busyproxy-play-demo.mp4`
- `google-play/assets/busyproxy-play-review-demo.mp4` (copy)

Recorded on **Pixel 4a** from the BusyProxy debug build (same product flow as release).

## What the video shows

1. Home after sign-in (Play Reviewer demo account)  
2. Balance / rates (Wi‑Fi $0.20/GB · Mobile $0.12/GB)  
3. Network mode chips (Automatic / Wi‑Fi / Mobile)  
4. **Start sharing** → **Sharing on** + background notification note  
5. Session card (Live, streams, **Exit IP**)  
6. Account / profile area  
7. **Stop sharing**

Demo account used (same as App access form):

| Field | Value |
|-------|--------|
| Phone | `+15550100001` |
| OTP | `246810` |

## How to submit to Google Play

Play Console does **not** upload arbitrary MP4 into every form. Typical uses:

1. **App access** → “Provide instructions” / notes:  
   - Paste demo credentials from [APP_ACCESS_REVIEWERS.md](./APP_ACCESS_REVIEWERS.md)  
   - Optional: unlisted YouTube link to this video  

2. **Store listing** (optional):  
   - YouTube → upload as **Unlisted** → paste URL under promo video if you want  

3. If Google asks for a video in email / declaration:  
   - Reply with the unlisted YouTube link  

### Upload to YouTube (you)

1. Open [YouTube Studio](https://studio.youtube.com)  
2. Upload `busyproxy-play-review-demo.mp4`  
3. Visibility: **Unlisted**  
4. Title e.g. `BusyProxy — app review demo (login, share, stop)`  
5. Copy the link into Play Console App access instructions  

## Re-record later

```bash
# Device connected via adb
adb shell screenrecord --bit-rate 8000000 --time-limit 120 /sdcard/busyproxy-play-demo.mp4
# … drive the UI …
adb pull /sdcard/busyproxy-play-demo.mp4 artifacts/play-demo/
```

## Note

Large MP4s may be gitignored under `artifacts/`. Keep a local copy for Play; do not commit secrets.  
