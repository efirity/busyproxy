# Analytics, APK download & mobile ops (2026-07-30)

Operational notes for what is live on **busyproxy.net** and the Android earner app.

---

## 1. Web analytics (site-wide)

Both tags load in the root document (`src/routes/__root.tsx`) on every page.

| Product | ID | Placement |
|---------|-----|-----------|
| **Google Analytics 4 (gtag.js)** | `G-Z1ZVDLYFWQ` | `<head>`: async `gtag/js` + inline `gtag('config', …)` |
| **Google Tag Manager** | `GTM-NB3866JG` | `<head>` bootstrap + `<body>` noscript iframe |

**Note:** If GTM also fires the same GA4 property, sessions may double-count. Prefer **either** direct gtag **or** GA only inside GTM for `G-Z1ZVDLYFWQ`.

Verify live HTML:

```bash
curl -sS https://busyproxy.net/ | grep -oE 'G-Z1ZVDLYFWQ|GTM-NB3866JG|gtag/js|gtm.js' | sort -u
```

---

## 2. Android analytics (Firebase → GA4)

| Item | Detail |
|------|--------|
| Config | `android/app/google-services.json` |
| Firebase project | `busyproxy-b6d73` |
| Packages in JSON | `net.busyproxy.app` (release) + `net.busyproxy.app.debug` (debug builds) |
| Gradle | Root: `com.google.gms.google-services` 4.4.2 · App: plugin + Firebase BOM + `firebase-analytics` |
| Init | `BusyProxyApp` → `Analytics.init` |
| Funnel | `EventLogger` dual-writes: server `POST /api/events/batch` **and** Firebase `Analytics.logEvent` |

**Debug package:** sideload/debug APK uses `net.busyproxy.app.debug`. Register that package in Firebase Console if DebugView is empty for debug builds.

Build / publish:

```bash
./android/scripts/build-apk.sh
./android/scripts/publish-debug-apk.sh   # → server + public/downloads (gated)
```

---

## 3. Promo-code APK download (invite only)

The beta APK is **online** but **not open**.

| | |
|---|---|
| **Promo code (default)** | **`5409`** |
| **Env override** | `APK_PROMO_CODE` on droplet (`/opt/busyproxy/.env`) |
| **UI** | https://busyproxy.net/#download |
| **Plugin** | `server/apk-download-plugin.ts` |

### API

| Endpoint | Purpose |
|----------|---------|
| `POST /api/download/verify` body `{"code":"5409"}` | Unlock → returns download URLs |
| `GET /api/download/apk?code=5409` | Streams APK (~20 MB) |
| `GET /api/download/apk-sha256?code=5409` | Streams checksum |
| `GET /downloads/BusyProxy-latest-debug.apk` **without** code | **403** |

### Checks

```bash
# Must be 403
curl -sS -o /dev/null -w "%{http_code}\n" https://busyproxy.net/downloads/BusyProxy-latest-debug.apk

# Must be 200 + APK size
curl -sS -o /dev/null -w "%{http_code} %{size_download}\n" \
  "https://busyproxy.net/api/download/apk?code=5409"
```

### Change the code

```bash
ssh root@46.101.114.84
# edit /opt/busyproxy/.env → APK_PROMO_CODE=newcode
systemctl restart busyproxy
```

Frontend: `src/components/marketing/apk-download-gate.tsx` · config `src/data/app-download.ts`.

---

## 4. Deploy phones (Pixel + OnePlus)

| Device | How | Serial / target |
|--------|-----|-----------------|
| **Pixel 4a** | USB ADB | `09201JEC206711` |
| **OnePlus (CPH2581)** | Wi‑Fi ADB fixed port | `192.168.88.74:5555` |

```bash
export PATH="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools:$PATH"
APK=artifacts/apk/BusyProxy-latest-debug.apk
PKG=net.busyproxy.app.debug

# OnePlus Wi‑Fi (after reboot re-run wifi-adb-fixed setup)
adb connect 192.168.88.74:5555

# Both
for t in 09201JEC206711 192.168.88.74:5555; do
  adb -s "$t" install -r "$APK"
  adb -s "$t" shell am force-stop "$PKG"
  adb -s "$t" shell am start -n "$PKG/net.busyproxy.app.MainActivity"
done
```

Or: `./android/scripts/wifi-deploy.sh` (mDNS rediscover + install; USB Pixel may need explicit serial).

Scripts: `android/scripts/wifi-deploy.sh`, `wifi-adb-fixed.sh`, `wifi-adb-discover.sh`, `publish-debug-apk.sh`.

---

## 5. Public status page

| | |
|---|---|
| **URL** | https://busyproxy.net/status |
| **Public API** | `GET /api/status` / `GET /api/health` |
| **Public payload** | Aggregate only: `status`, `time`, `message`, `service` — **no** Supabase/Twilio/ports/fleet dump |
| **Admin detail** | `GET /api/status/admin` (Bearer admin session or `EDGE_ADMIN_TOKEN`) |
| **Admin UI** | Full checks on `status.busyproxy.net` or `admin.busyproxy.net/status` when host is operator (login required) |

Code: `server/status-api-plugin.ts`, `src/routes/status.tsx`, host helpers `src/lib/host.ts`.

**DNS note:** `status.busyproxy.net` may need an A record → `46.101.114.84` + cert expand if not already set. Admin detail also works on `admin.busyproxy.net/status`.

---

## 6. Production host map

| Host | Role |
|------|------|
| https://busyproxy.net | Marketing, earner web, public status, gated APK |
| https://admin.busyproxy.net | Operator console (OTP allowlist) |
| https://portal.busyproxy.net | Legacy operator host |
| https://busyproxy.net/#download | Promo APK unlock |
| `wss://busyproxy.net/v1/tunnel` | Phone reverse tunnel |

Droplet: `46.101.114.84` · app `/opt/busyproxy` · unit `busyproxy` · nginx → `:8080`.

---

## 7. Quick redeploy cheat sheet

```bash
# Web files + restart
rsync -avz server/apk-download-plugin.ts src/routes/__root.tsx \
  root@46.101.114.84:/opt/busyproxy/…   # paths as needed
ssh root@46.101.114.84 'systemctl restart busyproxy'

# Publish new APK (keeps promo gate)
./android/scripts/publish-debug-apk.sh

# Install on both test phones
# (see §4)
```

Full droplet notes: [DEPLOY.md](./DEPLOY.md) · overall status: [PROJECT_STATUS.md](./PROJECT_STATUS.md).
