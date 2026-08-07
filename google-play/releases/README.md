# Play release App Bundles

Signed **AAB** files for manual upload in [Google Play Console](https://play.google.com/console).

| File | Package | versionName | versionCode | Notes |
|------|---------|-------------|-------------|--------|
| `BusyProxy-1.0.0-versionCode1.aab` | `net.busyproxy.app` | `1.0.0` | `1` | Upload keystore (`busyproxy-upload.jks`) |

## Upload

1. Play Console → BusyProxy → **Testing → Internal testing** (or Production)  
2. **Create new release** → upload the `.aab`  
3. For any **new** binary, bump `versionCode` in `android/app/build.gradle.kts`, run `./gradlew :app:bundleRelease`, then copy the new AAB here with a versioned name.

## Rebuild

```bash
cd android
./gradlew :app:bundleRelease
cp app/build/outputs/bundle/release/app-release.aab \
  ../google-play/releases/BusyProxy-<versionName>-versionCode<N>.aab
```
