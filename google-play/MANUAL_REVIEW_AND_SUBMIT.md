# First release — review & submit yourself

Fastlane has already pushed everything the API can set.  
You only need to **review in Play Console** and complete forms that require a human, then roll out.

---

## What’s already on Play (via Fastlane)

| Item | Value / status |
|------|----------------|
| **Package** | `net.busyproxy.app` |
| **Version name** | `1.0.0` |
| **Version code** | `1` |
| **Track** | **Internal testing** (draft / not auto-rolled to all users) |
| **Binary** | Signed **AAB** uploaded |
| **App name** | BusyProxy |
| **Short description** | Earn by sharing spare Wi‑Fi or mobile data. Transparent pay per GB. |
| **Full description** | Full earner pitch (privacy, rates, control) — see Console listing |
| **High-res icon** | 512×512 |
| **Feature graphic** | 1024×500 |
| **Phone screenshots** | 7 (home, sharing, agent, consent, login, account, OnePlus) |
| **Changelog (en-US)** | First Play release notes for version code 1 |

Local AAB (if you want to re-download from build machine):

```text
android/app/build/outputs/bundle/release/app-release.aab
```

Re-upload later (only after bumping `versionCode`):

```bash
cd android
fastlane play_prepare
fastlane play_metadata          # listing only
# bump versionCode in app/build.gradle.kts first!
fastlane play_upload            # new AAB → internal draft
```

---

## Open Play Console and review

1. Go to [Google Play Console](https://play.google.com/console)  
2. Select **BusyProxy** (`net.busyproxy.app`)  
3. Check these screens:

### A. Release → Testing → Internal testing
- [ ] See release with **version code 1** / **1.0.0**  
- [ ] Open release details → confirm AAB  
- [ ] **Release notes** look correct  
- [ ] Status is **Draft** (or ready for you to roll out)  
- [ ] Add yourself / testers under **Testers** (email list or Google Group)  
- [ ] When happy: **Review release → Start rollout to Internal testing**

### B. Grow → Store presence → Main store listing
- [ ] Title, short & full description  
- [ ] App icon + feature graphic  
- [ ] Phone screenshots (all 7)  
- [ ] Contact website / email if shown  
- [ ] Privacy policy URL: **https://busyproxy.net/privacy**

### C. Policy / app content (must complete before production)
Use drafts in `google-play/`:

| Console section | Local guide |
|-----------------|-------------|
| Data safety | [DATA_SAFETY.md](./DATA_SAFETY.md) |
| App access (reviewer login) | [APP_ACCESS_REVIEWERS.md](./APP_ACCESS_REVIEWERS.md) |
| Content / ads / declarations | [APP_CONTENT_DECLARATIONS.md](./APP_CONTENT_DECLARATIONS.md) |
| Privacy & legal URLs | [PRIVACY_AND_LEGAL.md](./PRIVACY_AND_LEGAL.md) |
| Full checklist | [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) |

Typical remaining dashboard items:

- [ ] **Data safety** form  
- [ ] **Content rating** questionnaire  
- [ ] **Target audience** (recommend 18+)  
- [ ] **News app** / government / COVID (usually “No”)  
- [ ] **Ads** declaration (this app: no ads)  
- [ ] **App access** — paste demo accounts from APP_ACCESS_REVIEWERS.md  
- [ ] **Foreground service** / special use if prompted  
- [ ] **Countries** for the release  
- [ ] **Pricing** = Free  

### D. Production (later — only when internal looks good)
- [ ] Promote internal → **Closed** or **Production**  
- [ ] Or create a new production release from the same AAB  
- [ ] Submit for **Google review**

---

## Demo accounts for reviewers (paste into App access)

See [APP_ACCESS_REVIEWERS.md](./APP_ACCESS_REVIEWERS.md). Defaults (confirm still enabled on server):

| Phone | OTP |
|-------|-----|
| +15550100001 | 246810 |
| +15550100002 | 135790 |

---

## What Fastlane cannot do for you

These always need Console / human review:

- Data safety answers  
- Content rating quiz  
- Some declarations (FGS, financial features wording)  
- Choosing countries and rolling out testers  
- Accepting Google’s final production review  

---

## Quick “is it ready?”

```bash
cd android
fastlane play_tracks
# expect: internal: [1]
```

If that shows `[1]` and listing graphics look good in Console, you’re set to **review manually and submit / start internal rollout yourself**.
