# Android secrets (local only)

**All API / Play / Firebase key files live under `android/secrets/`.**  
That directory is **gitignored** — never commit it.

## Layout

| File in `android/secrets/` | Purpose |
|----------------------------|---------|
| `play-store-service-account.json` | Google Play API (Fastlane `supply`) — **primary** |
| `busyproxy-play-api-service-account.json` | Same Play key (copy of the download name) |
| `google-services.json` | Firebase config for **both** packages (mirror of app build file) |
| `google-services.both-packages.json` | Source export with release + debug clients |
| `google-services.release-only.json` | Original release-only export |

## What Gradle / Fastlane use

| Tool | Path |
|------|------|
| **Gradle / Firebase** | `android/app/google-services.json` (committed client config is normal for Android; keep in sync with secrets copy) |
| **Fastlane** | `android/secrets/play-store-service-account.json` (or `PLAY_STORE_JSON_KEY`) |

## Initial copy (from Downloads → project)

Run once on a machine that has the files in Downloads:

```bash
mkdir -p android/secrets
cp ~/Downloads/busyproxy-*.json android/secrets/play-store-service-account.json
cp ~/Downloads/busyproxy-*.json android/secrets/busyproxy-play-api-service-account.json
cp ~/Downloads/google-services-2.json android/secrets/google-services.both-packages.json
cp ~/Downloads/google-services-2.json android/secrets/google-services.json
cp ~/Downloads/google-services-2.json android/app/google-services.json
cp ~/Downloads/google-services.json android/secrets/google-services.release-only.json
chmod 600 android/secrets/*.json
```

After that, **only use paths under the repo** (not `~/Downloads`).

## Packages

| Package | Role |
|---------|------|
| `net.busyproxy.app` | Play / release |
| `net.busyproxy.app.debug` | Sideload debug APK |

See also: [docs/PLAY_FASTLANE.md](../docs/PLAY_FASTLANE.md)
