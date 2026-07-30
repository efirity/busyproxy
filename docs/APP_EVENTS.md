# App event logging (mobile funnel)

**Last updated:** 2026-07-30

Tracks the full earner journey from **install → consent → OTP → home → share online** so operators can see **where someone dropped off** and **why** (not logged in reason, OTP fail, share blocked, etc.) in Admin → Users → **App logs**.

## Architecture

```text
Android EventLogger  --batch POST-->  /api/events/batch
                                         |
                              Supabase app_events (14-day retention)
                              or .data/app-events-fallback.jsonl
                                         |
Admin  --GET-->  /api/admin/users/:id/events  (+ journey summary)
```

## User journey (funnel)

Use this order to reconstruct a user session and find drop-off:

| Step | Key | Typical events | What “done” means |
|------|-----|----------------|-------------------|
| 1 | **installed** | `app_installed`, `app_first_open` | First launch after install |
| 2 | **opened** | `app_open`, `app_foreground` / `app_background`, `notif_permission_*` | Process started; notif prompt answered |
| 3 | **consent** | `consent_shown` → `consent_accepted` | Disclosure accepted |
| 4 | **login_screen** | `login_screen`, `login_screen_returning`, `not_logged_in` | Saw login UI (returning has saved phone) |
| 5 | **otp** | `otp_start` / `_ok` / `_fail`, `otp_verify` / `_ok` / `_fail`, `otp_code_autofill` | Tried SMS OTP |
| 6 | **signed_in** | `logged_in`, `otp_verify_ok`, `session_restored` | Has a session |
| 7 | **home** | `home_ready`, `network_mode_changed` | Home screen ready |
| 8 | **share_started** | `share_start` **or** `share_start_blocked` + reason | Tapped Start sharing |
| 9 | **fully_functional** | `tunnel_online`, `fully_functional`, `egress_ip` | Tunnel online after login |
| 10 | leave | `logout`, `account_delete_*`, `account_open`, `support_open` | Left or deleted |

Admin **App logs** shows:

- A **journey strip** (which steps are done)
- **`journey.droppedAt`** = first milestone not reached
- **`journey.notLoggedInReason`** = latest `not_logged_in.props.reason`
- **`journey.lastBlock`** = latest fail/block event (`otp_*_fail`, `share_start_blocked`, etc.)
- Event table with **message + reason** highlighted

### “Not logged in” reasons (`not_logged_in` props.reason)

| reason | Meaning |
|--------|---------|
| `needs_consent` | Has not accepted disclosure |
| `needs_otp` | On login screen, no session yet |
| `otp_start_fail` | Could not send SMS / API error |
| `otp_verify_fail` | Wrong code or verify API error |
| `logout` | After user logged out |
| `share_without_login` | Tried Start sharing without session |

### Share blocked (`share_start_blocked` props.reason)

| reason | Meaning |
|--------|---------|
| `needs_consent` | Disclosure not accepted |
| `share_without_login` | No session token |

### OTP fail reasons (`otp_*_fail` props.reason)

| reason | Meaning |
|--------|---------|
| `name_invalid` | Display name too short before send |
| `api_error` | Network / server error on start OTP |
| `code_incomplete` | Verify with fewer than 6 digits |
| `bad_code_or_api` | Wrong code or verify API error |

## Event types (allowlisted)

| Category | Types |
|----------|--------|
| install | `app_installed`, `app_first_open`, `app_open`, `app_background`, `app_foreground`, `notif_permission_asked`, `notif_permission_granted`, `notif_permission_denied` |
| consent | `consent_shown`, `consent_accepted` (`consent_skipped` reserved) |
| auth | `login_screen`, `login_screen_returning`, `otp_start`, `otp_start_ok`, `otp_start_fail`, `otp_code_autofill`, `otp_verify`, `otp_verify_ok`, `otp_verify_fail`, `logged_in`, `not_logged_in`, `session_restored`, `session_expired`, `logout` |
| relay | `home_ready`, `network_mode_changed`, `share_start`, `share_start_blocked`, `share_stop`, `relay_state`, `tunnel_connecting`, `tunnel_online`, `tunnel_offline`, `fully_functional`, `egress_ip` |
| account | `account_open`, `account_delete_attempt`, `account_delete_ok`, `account_delete_fail`, `support_open` |
| other | `error`, `info` |

## Retention (14 days)

1. **Supabase SQL** (`docs/supabase/005_app_events.sql`):  
   - Table `app_events`  
   - Optional **pg_cron** job `purge_app_events_14d` daily at 03:15 UTC  
2. **Server purge** on ingest (~hourly): deletes rows older than 14 days  

Apply schema (one-time):

```bash
export SUPABASE_DB_URL='postgresql://…'
node scripts/apply-app-events-sql.mjs
```

Or paste `docs/supabase/005_app_events.sql` into the Supabase SQL editor.

Until the table exists, events still land in **`.data/app-events-fallback.jsonl`** on the droplet (and admin can read them).

## APIs

| Method | Path | Who |
|--------|------|-----|
| POST | `/api/events/batch` | App (Bearer optional until login) |
| GET | `/api/events/types` | Public list of types |
| GET | `/api/admin/users/:id/events` | Admin (includes `journey` summary) |
| GET | `/api/admin/events?phone=&installId=` | Admin search |

### Batch body

```json
{
  "installId": "inst_…",
  "platform": "android",
  "appVersion": "0.1.0-beta-debug",
  "deviceModel": "OnePlus …",
  "osVersion": "Android 14",
  "events": [
    {
      "type": "not_logged_in",
      "at": 1710000000000,
      "message": "On login screen",
      "props": { "reason": "needs_otp", "journey_step": 4 }
    }
  ]
}
```

### Journey summary (admin response)

```json
{
  "journey": {
    "reachedSteps": ["installed", "opened", "consent", "login_screen"],
    "lastStep": 4,
    "lastStepKey": "login_screen",
    "droppedAt": "otp",
    "fullyFunctional": false,
    "notLoggedInReason": "otp_start_fail",
    "lastBlock": {
      "type": "otp_start_fail",
      "reason": "api_error",
      "message": "Unable to resolve host"
    },
    "milestones": [{ "step": 1, "key": "installed", "done": true }]
  }
}
```

## Admin UI

**Admin → Users → App logs** on a row opens:

1. Journey strip + drop-off badge  
2. Not-logged-in reason + last block  
3. Chronological event table (newest first) with reasons  

## Android wiring

| Component | Responsibility |
|-----------|----------------|
| `EventLogger` | Queue + batch; `install_id`; first-open → `app_installed` / `app_first_open`; `fully_functional` once per process after tunnel online + session |
| `AppViewModel` | All funnel logs (consent, OTP, not_logged_in reasons, share block, home, account) |
| `MainActivity` | Notification permission + app foreground/background |

## Related

- [AUTH_AND_ACCOUNTS.md](./AUTH_AND_ACCOUNTS.md)  
- [API_REFERENCE.md](./API_REFERENCE.md)  
- [SECURITY.md](./SECURITY.md)  
