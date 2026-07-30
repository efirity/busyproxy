# Play policy review — BusyProxy

## Product summary (what reviewers will understand)

BusyProxy is an **earner app**: users opt in to share spare bandwidth via an
authenticated reverse tunnel. They are paid per GB. The phone is **not** an
open proxy; users never see proxy passwords.

## Policy areas that matter

| Area | Risk | Our posture | Status |
|------|------|-------------|--------|
| User Data / Privacy Policy | High | Public privacy + data safety answers | ✅ Pages live |
| Account deletion | High (blocking) | In-app + web + API `DELETE /api/auth/account` | ✅ Implemented |
| Deceptive behavior / misleading claims | Medium | Transparent rates; no guaranteed income | ⚠️ Watch store text |
| Background / FGS abuse | High | specialUse + user start + notification | ✅ Manifest; declare in Console |
| Permissions minimum | Medium | INTERNET, network state, FGS, notifications, wake lock | ✅ |
| SMS / Phone | Medium | OTP via Twilio; Play Services SMS User Consent | ✅ |
| Kids / Families | Low | 18+ only | ✅ Declare |
| Financial features | Medium | Wallet + Stripe payouts | ⚠️ Complete Stripe KYC copy |
| Residential proxy legality | **Product/legal** | Consent, AUP in Terms, abuse desk email | ⚠️ Counsel recommended |
| Device and network abuse | Medium | Destination policy, auth, no open proxy | ✅ Core design |
| Impersonation / brand | Low | Own brand BusyProxy | ✅ |
| Closed testing (20 testers) | Process | New personal accounts may need closed test first | ⏳ Process |

## Implemented for this Play prep stage

- [x] Terms of Service page  
- [x] Privacy Policy page  
- [x] Account deletion web page + API  
- [x] Dashboard + web app Settings delete  
- [x] Android in-app delete with confirm  
- [x] Support email on web + Android  
- [x] Play review **two** fixed-OTP demo accounts (`+15550100001` / `+15550100002`)  

- [x] `google-play/` submission docs  

## Still needed before production publish

### Engineering / product

| Item | Why | Priority |
|------|-----|----------|
| **Release-signed AAB** | Play requires App Bundle + upload key / Play App Signing | P0 |
| **versionCode / versionName** production bump | e.g. `1` / `1.0.0` | P0 |
| **ProGuard / R8 minify** for release | Optional but recommended | P1 |
| **Play Integrity** (optional later) | Fraud / multi-account | P2 |
| **OTP for any phone** (not only test allowlist) | Real users | P0 for public launch |
| **Feature graphic + final screenshots** | Store listing | P0 |
| **512×512 icon export** | Store listing | P0 |
| **Stripe Connect live mode + clear payout UX** | Financial claims | P1 |
| **Counsel review of Terms/Privacy** | Liability | P1 |
| **Crash reporting** (e.g. Play Vitals only or Firebase) | Quality | P2 |
| **Data deletion email SLA process** | Ops | P1 |
| **Restore edge-state on deploy** | Ops (rsync --delete risk) | P1 |

### Play Console process

| Item | Notes |
|------|-------|
| Developer account verified | Identity / organization |
| Closed testing track + 12+ testers (if required for new accounts) | Google policy evolves; check current Console |
| Complete Data safety | Use DATA_SAFETY.md |
| Declare specialUse FGS | Use APP_CONTENT_DECLARATIONS.md |
| App access credentials | APP_ACCESS_REVIEWERS.md |
| Content rating questionnaire | Complete IARC |
| Countries / pricing | Free app |

## Rejection risks specific to this product

1. **Unclear disclosure** that traffic may exit via the user’s network → we show consent + notification.  
2. **FGS specialUse** rejected if justification is weak → use provided Console text.  
3. **Missing account deletion** → fixed.  
4. **Reviewer cannot log in** (SMS-only) → fixed via dual demo phones + fixed OTP (see APP_ACCESS_REVIEWERS.md).  

5. **Misleading “make money”** claims → keep store copy conservative.  
6. **Policy on residential proxies** is not a single Play “toggle”; ensure AUP + abuse contact.  

## Out of scope for v1.0 (document as future)

- iOS app  
- VpnService-based local routing  
- Multi-language store listings  
- In-app purchase of proxy plans (buyer product is separate)  
