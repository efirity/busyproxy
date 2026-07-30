# Release checklist — BusyProxy Android → Play

## A. Product / backend (before upload)

- [ ] https://busyproxy.net/privacy returns 200  
- [ ] https://busyproxy.net/terms returns 200  
- [ ] https://busyproxy.net/account-deletion returns 200  
- [ ] `DELETE /api/auth/account` works with a real session  
- [ ] Two Play demo accounts work (fixed OTP, no SMS):  
      `+15550100001` / `246810` and `+15550100002` / `135790`  
      (or `PLAY_REVIEW_ACCOUNTS` overrides on server)  
- [ ] Paste credentials from [APP_ACCESS_REVIEWERS.md](./APP_ACCESS_REVIEWERS.md) into Play Console  
- [ ] Reviewer can sign in **without** SMS on both demos  
- [ ] Delete account 1 still leaves account 2 loginable
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

**Copy/paste every form field from [CONSOLE_FORM_ANSWERS.md](./CONSOLE_FORM_ANSWERS.md).**  
After Fastlane, use [MANUAL_REVIEW_AND_SUBMIT.md](./MANUAL_REVIEW_AND_SUBMIT.md) for what’s already uploaded vs still human-only.

- [ ] Create app `BusyProxy` / package `net.busyproxy.app`  
- [ ] Paste store listing from STORE_LISTING.md (or confirm Fastlane listing)  
- [ ] Upload graphics (ASSETS_CHECKLIST.md)  
- [ ] Privacy policy URL — see CONSOLE_FORM_ANSWERS  
- [ ] Data safety — CONSOLE_FORM_ANSWERS + DATA_SAFETY.md  
- [ ] App access credentials — CONSOLE_FORM_ANSWERS + APP_ACCESS_REVIEWERS.md  
- [ ] FGS specialUse declaration — CONSOLE_FORM_ANSWERS  
- [ ] Content rating — CONSOLE_FORM_ANSWERS  
- [ ] Target audience 18+ — CONSOLE_FORM_ANSWERS  
- [ ] Ads / news / other declarations — CONSOLE_FORM_ANSWERS  
- [ ] Select countries  
- [ ] Upload AAB to internal/closed testing (recommended first)  
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
