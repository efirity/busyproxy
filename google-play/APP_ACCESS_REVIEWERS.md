# Google Play reviewer access (demo account)

Play reviewers must be able to open the app without a real SMS if possible.

## Recommended setup (production env)

Set on the server (e.g. `/opt/busyproxy/.env`):

```bash
# Dedicated reviewer phone (E.164) — can be the Twilio test number or a second number
PLAY_REVIEW_PHONE=+373XXXXXXXX
# Fixed 6-digit code shown ONLY in Play Console (not public)
PLAY_REVIEW_CODE=482916
```

Restart `busyproxy` after changing env.

### Behaviour

- For `PLAY_REVIEW_PHONE`, OTP **start does not require SMS**.  
- Reviewer enters the fixed `PLAY_REVIEW_CODE` after tapping Send code.  
- Display name can be any 2+ character name (e.g. `Play Reviewer`).  

## Text to paste into Play Console → App access

```
BusyProxy uses phone + SMS OTP. For Google Play review, use this demo account
(no real SMS required):

1. Open the app → accept disclosure.
2. Display name: Play Reviewer
3. Phone: <PLAY_REVIEW_PHONE>
4. Tap Send code
5. Enter OTP: <PLAY_REVIEW_CODE>
6. On Home: you can Start / Stop sharing and change network mode.
7. Account deletion: scroll Home → Delete account (or https://busyproxy.net/account-deletion)

Support: support@busyproxy.net
Privacy: https://busyproxy.net/privacy
Terms: https://busyproxy.net/terms
```

**Replace** the placeholders with the values you set in `.env` before submission.
Do **not** commit real review codes to public git if the repo is public — keep
secrets in server env only; this file holds the template.

## Optional beta phones

```bash
OTP_ALLOWED_PHONES=+373...,+1...
```

(Plus the existing Twilio test number allowlist.)

## Operator notes

| Role | Access |
|------|--------|
| Earner (reviewer) | Android app + dashboard |
| Admin console | admin.busyproxy.net — separate admin phone OTP (`ADMIN_PHONES`) |
| Reviewer should **not** need admin | Do not put admin credentials in App access unless testing admin |

## What reviewers should see

1. Consent / disclosure screen  
2. OTP login  
3. Home with balance card, network modes, Start sharing  
4. Support email + Terms / Privacy links  
5. Delete account with confirmation  
