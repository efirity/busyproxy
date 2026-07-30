# Release checklist — BusyProxy Android → Play

## A. Product / backend (before upload)

- [ ] https://busyproxy.net/privacy returns 200  
- [ ] https://busyproxy.net/terms returns 200  
- [ ] https://busyproxy.net/account-deletion returns 200  
- [ ] `DELETE /api/auth/account` works with a real session  
- [ ] `PLAY_REVIEW_PHONE` + `PLAY_REVIEW_CODE` set on production  
- [ ] Reviewer can sign in **without** SMS  
- [ ] Support email reaches a monitored inbox  
- [ ] OTP allowlist or open registration decision made  

## B. Android build

- [ ] Create upload keystore (keep offline backup)  
- [ ] Configure `signingConfigs.release` in Gradle  
- [ ] `versionCode` incremented; `versionName` e.g. `1.0.0`  
- [ ] `applicationId` = `net.busyproxy.app` (no `.debug`)  
- [ ] Build: `./gradlew :app:bundleRelease`  
- [ ] Install release build on a physical device and smoke-test:  
  - consent → login → start/stop share → delete account  

## C. Play Console

- [ ] Create app `BusyProxy` / package `net.busyproxy.app`  
- [ ] Paste store listing from STORE_LISTING.md  
- [ ] Upload graphics (ASSETS_CHECKLIST.md)  
- [ ] Privacy policy URL  
- [ ] Data safety (DATA_SAFETY.md)  
- [ ] App access credentials (APP_ACCESS_REVIEWERS.md)  
- [ ] FGS specialUse declaration  
- [ ] Content rating  
- [ ] Target audience 18+  
- [ ] Select countries  
- [ ] Upload AAB to closed testing (recommended first)  
- [ ] Promote to production when stable  

## D. Post-submit

- [ ] Monitor pre-launch report / crashes  
- [ ] Reply to policy emails quickly  
- [ ] Keep legal URLs online forever while app is listed  

## E. Commands (reference)

```bash
# Debug APK (sideload / internal)
cd android && bash scripts/build-apk.sh

# Release bundle (after signing configured)
cd android && ./gradlew :app:bundleRelease
# Output: app/build/outputs/bundle/release/app-release.aab
```
