# Play Console — App content declarations

## 1. Privacy policy

```
https://busyproxy.net/privacy
```

## 2. Ads

- **Does the app contain ads?** No  

## 3. App access (reviewer instructions)

See [APP_ACCESS_REVIEWERS.md](./APP_ACCESS_REVIEWERS.md).  
Mark: **All or some functionality is restricted** → provide credentials.

## 4. Content ratings (IARC questionnaire)

Answer honestly; expected rating roughly **Everyone** or **PEGI 3 / ESRB Everyone**
if no UGC chat, no violence, no gambling. BusyProxy has:

- No user-generated social content  
- No gambling  
- Financial *earnings* (rewards) — answer finance-related questions carefully  
- Internet access required  

## 5. Target audience

- **Target age:** 18+  
- **Appeal to children:** No  
- **Families policy:** Not designed for children  

## 6. News app

- Not a news app  

## 7. COVID-19 contact tracing / status apps

- No  

## 8. Data safety

See [DATA_SAFETY.md](./DATA_SAFETY.md).

## 9. Government apps

- No  

## 10. Financial features

- **Does your app provide financial features?**  
  Yes — rewards / balance display / withdrawal to bank via Stripe (when enabled).  
- Not a bank, not crypto exchange, not credit.  
- Category: digital wallet / rewards payouts.

## 11. Health

- No  

## 12. Foreground service (Android 14+)

Play Console → App content → **Foreground service permissions**.

| Declaration | Value |
|-------------|--------|
| FGS type used | `specialUse` |
| Permission | `FOREGROUND_SERVICE_SPECIAL_USE` |
| Property subtype (manifest) | User-initiated authenticated reverse-tunnel egress for BusyProxy earner sessions |
| User-visible | Yes — persistent notification with Stop action |
| Starts only after user action | Yes — user taps Start sharing after consent + login |

**Justification text (paste into Console):**

```
BusyProxy is an earner app. When the user explicitly starts sharing, the app
maintains an authenticated reverse WebSocket tunnel so authorized platform
clients can use the phone as egress. A foreground service of type specialUse
is required to keep the tunnel alive reliably under Doze and OEM battery
limits while showing a persistent notification. Sharing never starts without
user action; the user can stop from the notification or the app. The service
is not used for ads, location tracking, or unrestricted background work.
```

Also declare any other FGS types if added later (do **not** claim `dataSync` or
`connectedDevice` unless you implement those types correctly).

## 13. Full-screen intent / notifications

- POST_NOTIFICATIONS used for the sharing session notification (Android 13+).  
- No full-screen intent.  

## 14. Photo / video permissions

- None  

## 15. Health Connect / Background location

- None  

## 16. VPN service

- BusyProxy does **not** use `VpnService` in the current build.  
  Do not declare VPN unless you add it.  
