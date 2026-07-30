# Play Console — exact answers for each setup item

Use this while finishing **“Provide information about your app and set up your store listing”**.  
Copy/paste values as written. Adjust only if your product changes.

**Package index:** [README.md](./README.md) · **After forms, roll out:** [MANUAL_REVIEW_AND_SUBMIT.md](./MANUAL_REVIEW_AND_SUBMIT.md) · **Fastlane:** [docs/PLAY_FASTLANE.md](../docs/PLAY_FASTLANE.md)

**Already done (green):** Store listing (title, descriptions, icon, feature graphic, screenshots) via Fastlane.

---

## 1. Set privacy policy

**What this is:** Public URL of your privacy policy. Required for apps that collect data.

| Field | Value |
|-------|--------|
| **Privacy policy URL** | `https://busyproxy.net/privacy` |

Also keep these online (not always on this same form):

| Resource | URL |
|----------|-----|
| Terms | `https://busyproxy.net/terms` |
| Account deletion help | `https://busyproxy.net/account-deletion` |
| Support | `support@busyproxy.net` |

---

## 2. Sign in details (App access)

**What this is:** Tells Google reviewers how to log in when the app is locked behind accounts.

| Question | Answer |
|----------|--------|
| Is all functionality available without special access? | **No** — some/all features need sign-in |
| All or some functionality is restricted | **Yes** (select this) |

### Credentials to paste (reviewer instructions box)

```
BusyProxy uses phone number + SMS one-time password (OTP). For Google Play
review, use these DEMO accounts — no real SMS is required. Enter the phone as
the login identifier, tap Send code, then enter the fixed OTP (like a password).

DEMO ACCOUNT 1 (primary)
• Display name: Play Reviewer A
• Phone: +15550100001
• OTP code: 246810

DEMO ACCOUNT 2 (use after testing account deletion, or if account 1 is blocked)
• Display name: Play Reviewer B
• Phone: +15550100002
• OTP code: 135790

Steps:
1. Open BusyProxy → read disclosure → Continue.
2. Enter display name + phone from Demo account 1 → Send code.
3. Enter the fixed OTP above → sign in.
4. Home: Start sharing / Stop sharing; switch Automatic / Wi‑Fi / Mobile.
5. Account (profile icon): support email, Terms, Privacy, Log out.
6. DELETE TEST: Account → Delete my account → pick a reason → Confirm.
   Then log in again with DEMO ACCOUNT 2 (phone + OTP above).
7. Optional web deletion form: https://busyproxy.net/account-deletion

Support: support@busyproxy.net
Privacy: https://busyproxy.net/privacy
Terms: https://busyproxy.net/terms
```

| Field | Account 1 | Account 2 |
|-------|-----------|-----------|
| Phone (“username”) | `+15550100001` | `+15550100002` |
| OTP (“password”) | `246810` | `135790` |

---

## 3. Content rating

**What this is:** IARC questionnaire → age rating (Everyone / PEGI / etc.).

Answer **honestly**. For BusyProxy, expected direction: **Everyone** / low rating.

| Topic | Suggested answer |
|-------|------------------|
| Violence | No |
| Sexual content | No |
| Language | No strong language |
| Controlled substances | No |
| Gambling / casino | **No** (earning bandwidth is **not** gambling) |
| User interaction / UGC chat | **No** social UGC / chat |
| Shares user location | Approximate only via IP if asked; **no GPS** |
| Digital purchases | Optional: in-app money is **earned balance / withdraw**, not IAP catalog — follow form wording carefully |
| Unrestricted internet | Yes, app needs internet |
| Category | Utility / productivity / finance as the form allows |

If a question is about **“simulates gambling”** → **No**.  
If about **real-money features** → describe as **rewards / wallet payouts**, not casino.

Complete the questionnaire → save certificate.

---

## 4. Target audience

**What this is:** Who the app is for; children policies.

| Field | Value |
|-------|--------|
| Target age group | **18 and over** only |
| App appeals to children | **No** |
| Designed for families / Designed for Children | **No** |
| Store presence for kids | **No** |

Not a kids app. Do **not** enroll in Designed for Families.

---

## 5. Data safety

**What this is:** Store “nutrition label” of data collection (must match privacy policy).

| Overview question | Answer |
|-------------------|--------|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** |
| Do you provide a way for users to request that their data is deleted? | **Yes** |

### Account deletion (required)

| Method | Details |
|--------|---------|
| In-app | Signed in → profile / account → **Delete account** |
| Web | `https://busyproxy.net/account-deletion` |
| Email | `support@busyproxy.net` |

### Data types — mark **Collected = Yes** (recommended)

| Data type | Collected | Shared with third parties* | Purpose | Required for app? |
|-----------|-----------|----------------------------|---------|-------------------|
| Phone number | Yes | No* | Account | Required |
| Name (display name) | Yes | No | Account | Required |
| User IDs | Yes | No | Account | Required |
| Device or other IDs | Yes | No | App functionality | Required |
| App interactions / crash logs (diagnostics) | Yes (limited) | No | Analytics / stability | Optional or required as you prefer |
| Approximate location (IP-based city/country) | Yes | No | App functionality / fraud | Optional |
| Other: network type (Wi‑Fi / mobile) | Yes | No | Functionality / rates | Required |
| Other: traffic volume (bytes) | Yes | No | Earnings | Required |
| Financial info (balance / payout status) | Yes | Stripe as processor | Financial features | Required when payouts used |

\* **Twilio** gets phone number to send OTP. **Stripe** gets payout identity when user cash-outs. Treat as **service providers** under your instructions; privacy policy already covers them. Prefer **Shared = No** if Console allows “service provider” handling; if it forces “shared”, mark shared only for those processors and list purpose correctly.

### Not collected

- Precise GPS location  
- Contacts, photos, camera, mic  
- SMS content (only OTP via Twilio)  
- Content of third-party traffic through the user’s connection  

### Security practices

| Question | Answer |
|----------|--------|
| Data encrypted in transit | **Yes** |
| Data encrypted at rest | **Yes** (if Supabase/hosting encryption is on — default Neon/Supabase: Yes) |
| Users can request deletion | **Yes** |
| Independent security review | **No** (unless you paid for one) |
| Committed to Play Families Policy | **No** |

Full table: [DATA_SAFETY.md](./DATA_SAFETY.md).

---

## 6. Government apps

**What this is:** Is this an official government app?

| Question | Answer |
|----------|--------|
| Is this a government app? | **No** |

---

## 7. Financial features

**What this is:** Banking, payments, wallets, crypto, etc.

| Question | Answer |
|----------|--------|
| Does your app provide financial features? | **Yes** |

### What kind (typical options — pick closest)

| Feature | Select? |
|---------|---------|
| Banking / bank accounts | **No** |
| Loans / credit | **No** |
| Cryptocurrency exchange / wallet (crypto) | **No** (unless you add crypto) |
| Peer-to-peer payments / wallet / remittances | **Maybe** — only if listed as general wallet |
| **Rewards / cashback / payout of earnings** | **Yes** (best match) |
| Payment processing / merchant | **No** (users earn; Stripe Connect for *their* payouts) |

**Short description you can paste if asked:**

```
BusyProxy shows an in-app earnings balance for shared bandwidth (per-GB rates).
Users may withdraw available balance via Stripe Connect when they meet the
minimum ($20). The app is not a bank, not a credit product, and not a crypto
exchange. Users control sharing and can stop anytime.
```

---

## 8. Health

**What this is:** Health/fitness/medical apps and Health Connect.

| Question | Answer |
|----------|--------|
| Health features / Health Connect | **No** |
| Medical app | **No** |

---

## 9. Select an app category and provide contact details

**What this is:** Store category + how users reach you.

### Category

| Field | Value |
|-------|--------|
| App or game | **App** |
| Category | **Finance** (earnings / wallet)  
  If rejected: **Tools** or **Productivity** |
| Tags (optional) | earn, bandwidth, wifi, rewards |

### Contact details

| Field | Value |
|-------|--------|
| **Email** | `support@busyproxy.net` |
| **Phone** | (optional — leave blank or put your ops number) |
| **Website** | `https://busyproxy.net` |
| **Privacy policy** | `https://busyproxy.net/privacy` (if shown again) |

---

## 10. Set up your store listing — already complete ✓

Fastlane uploaded:

| Field | Value |
|-------|--------|
| App name | `BusyProxy` |
| Short description | `Earn by sharing spare Wi‑Fi or mobile data. Transparent pay per GB.` |
| Full description | See store listing / `STORE_LISTING.md` |
| Icon | 512×512 |
| Feature graphic | 1024×500 |
| Screenshots | 7 phone screens |

Only re-edit in Console if you want wording changes.

---

## Extra items (may appear later under App content)

### Ads

| Question | Answer |
|----------|--------|
| Contains ads? | **No** |

### News app

| Question | Answer |
|----------|--------|
| News app? | **No** |

### COVID-19 contact tracing / status

| Question | Answer |
|----------|--------|
| | **No** |

### Foreground service (if asked)

| Field | Value |
|-------|--------|
| Type | `specialUse` |
| User starts it? | Yes — after consent + login + **Start sharing** |
| Notification | Yes — persistent, with Stop |

**Justification text:**

```
BusyProxy is an earner app. When the user explicitly starts sharing, the app
maintains an authenticated reverse WebSocket tunnel so authorized platform
clients can use the phone as egress. A foreground service of type specialUse
is required to keep the tunnel alive reliably under Doze and OEM battery
limits while showing a persistent notification. Sharing never starts without
user action; the user can stop from the notification or the app. The service
is not used for ads, location tracking, or unrestricted background work.
```

---

## After all 11 are green

1. **Testing → Internal testing** → open release **1.0.0 (version code 1)**  
2. Add yourself as a tester  
3. **Start rollout to Internal testing**  
4. Install from the Play internal link and smoke-test  
5. When happy → Production (or closed testing) → Submit for review  

Binary already on internal track from Fastlane. You only complete these forms + roll out.

---

## Quick copy sheet

```
Privacy policy:     https://busyproxy.net/privacy
Terms:              https://busyproxy.net/terms
Account deletion:   https://busyproxy.net/account-deletion
Website:            https://busyproxy.net
Support email:      support@busyproxy.net

Reviewer phone 1:   +15550100001
Reviewer OTP 1:     246810
Reviewer phone 2:   +15550100002
Reviewer OTP 2:     135790

Category:           Finance (or Tools)
Target age:         18+
Government app:     No
Health:             No
Ads:                No
Financial features: Yes (rewards / earnings payout via Stripe)
Data collected:     Yes (phone, name, device id, network type, bytes, balance)
Encrypted in transit: Yes
User can delete data: Yes
```
