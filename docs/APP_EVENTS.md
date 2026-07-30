# App event logging (mobile funnel)

**Last updated:** 2026-07-30

Tracks earner journey from **install → consent → OTP → home → share online** so operators can debug any user in Admin → Users → **App logs**.

## Architecture

```text
Android EventLogger  --batch POST-->  /api/events/batch
                                         |
                              Supabase app_events (14-day retention)
                              or .data/app-events-fallback.jsonl
                                         |
Admin  --GET-->  /api/admin/users/:id/events
```

## Event types (allowlisted)

| Category | Types |
|----------|--------|
| install | `app_first_open`, `app_open`, `app_background`, `app_foreground` |
| consent | `consent_shown`, `consent_accepted` |
| auth | `login_screen`, `otp_start`, `otp_start_ok`, `otp_start_fail`, `otp_verify`, `otp_verify_ok`, `otp_verify_fail`, `session_restored`, `logout` |
| relay | `home_ready`, `network_mode_changed`, `share_start`, `share_stop`, `relay_state`, `tunnel_online`, `tunnel_offline`, `egress_ip` |
| account | `account_open`, `account_delete_attempt`, `account_delete_ok`, `account_delete_fail` |
| other | `error`, `info` |

## Retention (14 days)

1. **Supabase SQL** (`docs/supabase/005_app_events.sql`):  
   - Table `app_events`  
   - Optional **pg_cron** job `purge_app_events_14d` daily at 03:15 UTC  
2. **Server purge** on ingest (~hourly): deletes rows older than 14 days  

Apply schema (one-time):

```bash
# Prefer Postgres URL for the Supabase project:
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
| GET | `/api/admin/users/:id/events` | Admin |
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
    { "type": "otp_verify_ok", "at": 1710000000000, "message": "Signed in", "props": {} }
  ]
}
```

## Admin UI

**Admin → Users → App logs** on a row opens the event timeline for that user (by `user_id` + phone).

## Android

- `EventLogger` + stable `install_id` in DataStore  
- Flushes every ~8s or every 12 events  
- Wired through `AppViewModel` lifecycle  

## Related

- [AUTH_AND_ACCOUNTS.md](./AUTH_AND_ACCOUNTS.md)  
- [API_REFERENCE.md](./API_REFERENCE.md)  
- [SECURITY.md](./SECURITY.md)  
