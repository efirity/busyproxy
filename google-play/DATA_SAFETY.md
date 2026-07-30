# Play Console — Data safety form (draft answers)

Complete **App content → Data safety**. Align store answers with the live
Privacy Policy: https://busyproxy.net/privacy

## Overview questions

| Question | Answer |
|----------|--------|
| Does your app collect or share user data? | **Yes** |
| Is all user data encrypted in transit? | **Yes** (HTTPS / WSS TLS) |
| Do you provide a way for users to request that their data is deleted? | **Yes** |
| Account deletion | In-app **and** web URL (see below) |

### Account / data deletion URLs (required)

- **In-app path:** Home (signed in) → **Delete account** → Confirm  
- **Web resource:** https://busyproxy.net/account-deletion  
- **Also:** Dashboard sidebar → Delete account; email support@busyproxy.net  

---

## Data types collected

Mark **Collected = Yes** where applicable. **Shared** = only if sent to a third
party for their own purposes (not pure processor). Prefer **Shared = No** when
data only goes to processors under your instructions (Twilio, Stripe, hosting),
and disclose those processors in privacy policy. Adjust if your counsel differs.

| Data type | Collected | Shared | Purpose | Optional? | Ephemeral? |
|-----------|-----------|--------|---------|-----------|------------|
| Phone number | Yes | No* | Account management, App functionality | No | No |
| Name (display name) | Yes | No | Account management | No | No |
| Email (if user sets) | Optional | No | Account management | Yes | No |
| User IDs | Yes | No | Account management | No | No |
| Device or other IDs | Yes (device id) | No | App functionality | No | No |
| App interactions / diagnostics | Yes (limited logs, status) | No | Analytics / fraud / stability | No | Partial |
| Approximate location | Yes (IP-based country/city) | No | App functionality, fraud | No | No |
| Other: network type | Yes (wifi/cellular) | No | App functionality, payout rates | No | No |
| Other: traffic volume (bytes) | Yes | No | App functionality, payments | No | No |
| Financial info (wallet balances, payout status) | Yes | Stripe processes payouts | Financial features | No | No |
| SMS / OTP | OTP only via Twilio (not stored as cleartext long-term; hash of code) | Twilio as SMS processor | Account management | No | Challenge expires |

\* Twilio receives the phone number to deliver SMS. Stripe receives payout identity
data when the user connects payouts. Disclose as **service providers**.

### Not collected

- Precise location (GPS)  
- Contacts, photos, microphone, camera  
- Web browsing history of the phone owner as a general profile  
- **Payload content** of third-party traffic through the exit  

---

## Security practices checklist

- [x] Data encrypted in transit  
- [ ] Data encrypted at rest (depends on Supabase/hosting — mark Yes if DB at rest encryption is on)  
- [x] Users can request deletion  
- [x] Independent security review: **No** (unless you commission one)  
- [x] Committed to Play Families Policy: **No** (not a kids app)  

## Account creation

- App allows account creation / sign-in: **Yes** (phone OTP)  
- Deletion available: **Yes** (in-app + web)  
