# Google Play reviewer access (demo accounts)

Play reviewers must exercise the app **without using their own phone number**.
BusyProxy login is **phone + 6-digit OTP**. For review we provide **two demo
accounts** with **fixed OTP codes** (no SMS). Treat them like username/password:

| Field in app | Maps to |
|--------------|---------|
| **Phone** | “Username” |
| **OTP code** (after Send code) | “Password” |

**Why two accounts?** Soft-delete keeps the phone blocked. Reviewers can
**delete account A** to verify deletion, then **log in with account B** to
continue testing start/stop sharing and the rest of the flow.

---

## Demo credentials (paste into Play Console → App access)

These are the **built-in** production defaults (US `555` fiction numbers; no
real SMS is ever sent). Override on the server with env if needed
(see [Configuration](#configuration)).

### Account 1 — primary (full journey)

| | |
|--|--|
| **Display name** | `Play Reviewer A` |
| **Phone** | `+15550100001` |
| **OTP (fixed)** | `246810` |

### Account 2 — backup (after delete test)

| | |
|--|--|
| **Display name** | `Play Reviewer B` |
| **Phone** | `+15550100002` |
| **OTP (fixed)** | `135790` |

> **Operator:** After a review cycle, if account 1 was deleted, reactivate it
> in Supabase (`users.status = 'active'`) or leave B as the survivor and
> recreate A before the next submission. See [Reactivation](#reactivation-after-delete).

---

## Text to paste into Play Console → App content → App access

Copy **exactly** (or adapt slightly) into the “All or some functionality is
restricted” credentials box:

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

Mark access as **restricted** and provide the credentials above.
Do **not** require reviewers to use their personal numbers.

---

## How fixed OTP works (engineering)

1. Reviewer enters a demo **phone** and taps **Send code**.
2. Server recognizes a Play-review phone → creates an OTP challenge with the
   **fixed code hash** (`channel: play_review`) — **Twilio SMS is skipped**.
3. Reviewer enters the **fixed OTP** → normal session issued (same as real users).
4. Start sharing, wallet, delete, etc. behave like production.

Implementation: `server/twilio-auth.mjs` → `playReviewAccountMap()` /
`playReviewCodeFor()`.

---

## Configuration

Set on the server (`/opt/busyproxy/.env`) and restart `busyproxy`:

```bash
# Recommended bulk form (overrides built-in defaults for listed phones)
PLAY_REVIEW_ACCOUNTS=+15550100001:246810,+15550100002:135790

# Or explicit pairs (also override defaults)
# PLAY_REVIEW_PHONE=+15550100001
# PLAY_REVIEW_CODE=246810
# PLAY_REVIEW_PHONE_2=+15550100002
# PLAY_REVIEW_CODE_2=135790
```

| Variable | Meaning |
|----------|---------|
| `PLAY_REVIEW_ACCOUNTS` | Comma-separated `E.164:6digit` pairs |
| `PLAY_REVIEW_PHONE` + `PLAY_REVIEW_CODE` | Account 1 override |
| `PLAY_REVIEW_PHONE_2` + `PLAY_REVIEW_CODE_2` | Account 2 override |

Built-in defaults apply if env is empty so production always has two demos
after deploy. Changing codes: set env → `systemctl restart busyproxy` → update
this doc + Play Console App access.

**Do not** put demo phones in `ADMIN_PHONES` (reviewers must not get admin).

Optional extra beta SMS numbers (real Twilio):

```bash
OTP_ALLOWED_PHONES=+373...,+1...
```

---

## Reactivation after delete

Soft-delete keeps `users.phone` and sets `status=deleted`, so the same phone
cannot OTP-login until reactivated.

```sql
-- Reactivate a demo phone after reviewers deleted it
UPDATE users
SET status = 'active',
    deleted_at = NULL,
    deletion_reason_code = NULL,
    deletion_reason_text = NULL
WHERE phone IN ('+15550100001', '+15550100002');
```

Or use support flow documented in [AUTH_AND_ACCOUNTS.md](../docs/AUTH_AND_ACCOUNTS.md).

---

## What reviewers should verify

1. Consent / disclosure  
2. Login with **demo phone + fixed OTP** (no SMS)  
3. Home: balance, network modes, Start / Stop sharing  
4. Support + Terms / Privacy links  
5. **Delete account** with reason on account 1  
6. Login again with **account 2**  

## Operator / admin

| Role | Access |
|------|--------|
| Earner (reviewer) | Android app + optional web dashboard |
| Admin console | `admin.busyproxy.net` — **separate** admin phone OTP (`ADMIN_PHONES`) |
| Reviewer | Must **not** receive admin credentials |

## Related

- [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)  
- [DATA_SAFETY.md](./DATA_SAFETY.md)  
- [docs/AUTH_AND_ACCOUNTS.md](../docs/AUTH_AND_ACCOUNTS.md)  
- [docs/SECURITY.md](../docs/SECURITY.md)  
