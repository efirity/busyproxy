# Pre–Android / Android progress checklist

**Updated:** 2026-07-30

## Web + edge (done)

| Area | Status |
|---|---|
| Marketing + pricing live | Done |
| OTP / portal / proxy URI sticky-rotate | Done |
| DO deploy + TLS + allowlist | Done |

## Android app (in progress)

| Area | Status |
|---|---|
| Project under `android/` (Kotlin + Compose) | **Scaffolded** |
| Consent + OTP + home (no proxy URI) | **Implemented** |
| Network modes + destination policy | **Implemented** |
| Reverse tunnel client + stream dialer | **Implemented** |
| Foreground service + Stop notification | **Implemented** |
| APK build (`assembleDebug`) | **Done** on local SDK |
| Install on physical Pixel (debug) | **Done** |
| Real-device cellular-bind IP proof | **Todo** |
| Edge WSS full CONNECT mux (P1) | **Todo** |
| Keystore device key | **Todo** |
| Play store packaging | **Todo** |

See [android/README.md](../android/README.md) and [android/ANDROID_AGENT.md](./android/ANDROID_AGENT.md).

## PocketRelay reference

Used as engineering/security reference only. Product brand and earnings model remain **BusyProxy**. Marketplace / open proxy / silent sharing from that doc are **explicitly out of scope**.
