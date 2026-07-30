# Google Play + Fastlane (BusyProxy)

Automate **upload** of signed release builds to Play Console tracks  
(`internal` / `alpha` / `beta` / `production`). Review is still done by Google.

---

## Package names

| Build | `applicationId` | Play listing |
|-------|-----------------|--------------|
| Release | **`net.busyproxy.app`** | This is what Play uses |
| Debug / sideload | `net.busyproxy.app.debug` | **Not** uploaded to Play |

---

## How to get the Play service-account JSON

You already created one; this is the checklist so it keeps working.

### 1. Google Cloud project
1. Open [Google Cloud Console](https://console.cloud.google.com/) (project linked to Play, e.g. **busyproxy**).
2. **IAM & Admin → Service accounts → Create** (or use existing).
3. Create a **JSON key** for that service account → downloads a file like  
   `busyproxy-….json`.

### 2. Link it in Play Console
1. [Play Console](https://play.google.com/console) → **Setup → API access**  
   (or **Users and permissions**).
2. Link the Cloud project if prompted.
3. **Invite** the service account email  
   (e.g. `busyproxy-fastlane@….iam.gserviceaccount.com`).
4. Grant at least:
   - **View app information**
   - **Release to testing tracks** (or Admin for full automation)
5. Accept / save. Wait a few minutes for propagation.

### 3. Put the file on this machine (never commit)
```bash
mkdir -p android/secrets
cp ~/Downloads/busyproxy-*.json android/secrets/play-store-service-account.json
chmod 600 android/secrets/play-store-service-account.json
```

Path is **gitignored** (`android/secrets/`, `*play-store-service-account.json`).

Optional env override:
```bash
export PLAY_STORE_JSON_KEY=/absolute/path/to/key.json
```

---

## Install Fastlane

```bash
brew install fastlane   # already used on the builder Mac
fastlane --version
```

Work from the Android module:

```bash
cd android
```

---

## Lanes

| Lane | What it does |
|------|----------------|
| `fastlane play_whoami` | Print service account email + package |
| `fastlane play_auth` | **Test API** (list internal version codes) — no upload |
| `fastlane play_tracks` | Version codes on internal/alpha/beta/production |
| `fastlane build_release_aab` | `bundleRelease` (needs signing) |
| `fastlane play_upload` | Upload existing AAB to a track (default `internal`) |
| `fastlane play_internal` | Build AAB + upload to internal testing |

Examples:

```bash
cd android
fastlane play_whoami
fastlane play_auth
fastlane play_tracks

# When you have a signed AAB:
PLAY_AAB=app/build/outputs/bundle/release/app-release.aab \
  PLAY_TRACK=internal \
  fastlane play_upload
```

---

## Release signing (required before real upload)

Play accepts **AAB** signed with an **upload key**. Debug APKs are not enough.

1. Create a keystore (once):
   ```bash
   keytool -genkey -v -keystore android/secrets/busyproxy-upload.jks \
     -keyalg RSA -keysize 2048 -validity 10000 -alias busyproxy
   ```
2. Create `android/key.properties` (gitignored):
   ```properties
   storePassword=...
   keyPassword=...
   keyAlias=busyproxy
   storeFile=secrets/busyproxy-upload.jks
   ```
3. Wire signing in `app/build.gradle.kts` release buildType (see Fastlane README in-repo when added).
4. Prefer **Play App Signing** (Console → Setup → App signing).

Until signing is configured, `play_auth` / `play_tracks` still validate the JSON key.

---

## First Play app setup

1. Create application in Play Console with package **`net.busyproxy.app`**.
2. Complete draft listing (you have drafts under `google-play/`).
3. Create an **Internal testing** track.
4. Run `fastlane play_auth` — should return version codes `[]` or existing codes, not 403.

### Common errors

| Error | Fix |
|-------|-----|
| 403 / permission | Invite service account email in Play; wait; check API access link |
| 404 package | Create app with exact id `net.busyproxy.app` |
| Invalid grant | Wrong JSON / clock skew / key deleted |
| AAB missing | Configure release signing + `bundleRelease` |

---

## CI (later)

GitHub Actions secrets:

- `PLAY_STORE_JSON` — full JSON contents  
- `KEYSTORE_BASE64` + passwords  

On tag `v*`: build AAB → `fastlane play_upload` track `internal` only (never auto-production until you trust it).

---

## Security

- Never commit `android/secrets/` or keystores  
- Rotate the service account key if it was shared in chat/logs  
- Limit roles to release tracks when possible  
