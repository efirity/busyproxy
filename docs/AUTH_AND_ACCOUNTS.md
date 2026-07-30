# Auth & accounts

**Last updated:** 2026-07-30

## Login model

| Field | Role |
|-------|------|
| **Display name** | Profile label (required for new users) |
| **Phone (E.164)** | Unique account identity |
| **SMS OTP** | Login / register (Twilio) |

There is no email/password login for earners in production. Login is always **phone + OTP**.

### Server modules

- `server/twilio-auth.mjs` — OTP start/verify, sessions, profile, delete
- `server/auth-api-plugin.ts` — HTTP routes under `/api/auth/*`
- `server/deletion-reasons.mjs` — predefined delete reasons
- `server/account-deletion-log.mjs` — append-only deletion log

### Client

- Web: `src/components/auth/otp-login.tsx`, `src/lib/auth-client.ts`
- Android: `ApiClient` + `AppViewModel` (OTP, SMS autofill)

### UX helpers

| Feature | Behavior |
|---------|----------|
| **Phone-hint** | `GET /api/auth/phone-hint` → dial prefix from visitor IP (e.g. `+373`) |
| **Remember login** | Web `localStorage` + Android prefs store last phone/name for faster re-login |
| **Browser autocomplete** | `name="tel"` + `autocomplete="tel"` on web forms |

### OTP allowlist (beta)

By default only configured test / allowlisted numbers can receive OTP:

- Twilio test number (`TWILIO_TEST_NUMBER_TO_SEND`)
- Optional `OTP_ALLOWED_PHONES`
- Optional **Play review** path: `PLAY_REVIEW_PHONE` + `PLAY_REVIEW_CODE` (no SMS)

---

## Sessions

- Issued on successful OTP verify
- Sent as `Authorization: Bearer <token>`
- Server stores **hashed** tokens in Supabase `sessions`
- Logout revokes the token
- Admin routes require admin phone allowlist (`isAdmin` / `requireAdminSession`)

---

## Account deletion (soft-delete)

### Product rules

1. User must pick a **deletion reason** (or “Other” + free text).
2. Account is marked **`status = deleted`**.
3. **Phone number is kept** on the row so the same number **cannot sign in or register again** until support reactivates.
4. Profile/wallet/devices/sessions are cleared or revoked.
5. Reason is always written to **`.data/account-deletions.json`** (and DB columns when present).

### User-facing copy on re-login attempt

> This account was deleted and cannot sign in. Contact support@busyproxy.net to request reactivation.

### Predefined reasons

| Code | Label |
|------|--------|
| `not_earning` | Not earning enough |
| `battery_data` | Battery or data usage concerns |
| `privacy` | Privacy or trust concerns |
| `technical` | App technical issues / bugs |
| `switching` | Switching to another service |
| `temporary` | Taking a break / temporary |
| `other` | Other (please describe) — **detail required** |

### Where users delete

| Surface | Path |
|---------|------|
| Android | Account icon → Delete account → reason → confirm |
| Web dashboard | Account section → reason form |
| Web app settings/account | Account screen |
| Public help page | https://busyproxy.net/account-deletion |

### API

```http
GET  /api/auth/deletion-reasons
DELETE /api/auth/account
Authorization: Bearer …
Content-Type: application/json

{
  "reasonCode": "privacy",
  "reasonText": "optional except for other"
}
```

### Reactivation

Manual/support process today: email **support@busyproxy.net** with subject “Account reactivation”.  
Admin UI “reactivate” is a future improvement (set `status=active` after review).

---

## Support & legal links (product)

| | |
|--|--|
| Support | support@busyproxy.net |
| Terms | https://busyproxy.net/terms |
| Privacy | https://busyproxy.net/privacy |
| Account deletion help | https://busyproxy.net/account-deletion |

On Android, support/delete/legal live under the **Account** screen (not cluttering Home).

---

## Related

- [SECURITY.md](./SECURITY.md)
- [API_REFERENCE.md](./API_REFERENCE.md)
- [../google-play/DATA_SAFETY.md](../google-play/DATA_SAFETY.md) (Play Data safety / deletion)
