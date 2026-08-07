# Play release App Bundles

Signed **AAB** files for manual upload in [Google Play Console](https://play.google.com/console).

| File | Package | versionName | versionCode | Notes |
|------|---------|-------------|-------------|--------|
| `BusyProxy-1.0.0-versionCode1.aab` | `net.busyproxy.app` | `1.0.0` | `1` | First internal release |
| `BusyProxy-1.0.0-versionCode2.aab` | `net.busyproxy.app` | `1.0.0` | `2` | Closed / production drafts |
| `BusyProxy-1.0.1-versionCode3.aab` | `net.busyproxy.app` | `1.0.1` | `3` | Multi-language (crashes: AppCompat theme) |
| `BusyProxy-1.0.2-versionCode4.aab` | `net.busyproxy.app` | `1.0.2` | `4` | **Fix crash** — Theme.AppCompat + multi-language |
| `BusyProxy-1.0.3-versionCode5.aab` | `net.busyproxy.app` | `1.0.3` | `5` | Language dropdown + full UI i18n |

## Languages (in-app)

English, Español, 简体中文, हिन्दी, Português — switch under **Account → Language**.

## Current Play track state (after Fastlane)

| Track | Console name | Version | Status |
|-------|--------------|---------|--------|
| `internal` | Internal testing | 1.0.3 (5) | Completed |
| `alpha` | Closed testing – Alpha | 1.0.3 (5) | Draft |
| `production` | Production | 1.0.3 (5) | Draft |

## Upload with Fastlane

```bash
cd android

PLAY_AAB=../google-play/releases/BusyProxy-1.0.1-versionCode3.aab \
PLAY_TRACK=alpha PLAY_RELEASE_STATUS=draft \
  fastlane play_upload
```

## Rebuild

```bash
cd android
# bump versionCode in app/build.gradle.kts first
./gradlew :app:bundleRelease
cp app/build/outputs/bundle/release/app-release.aab \
  ../google-play/releases/BusyProxy-<versionName>-versionCode<N>.aab
```
