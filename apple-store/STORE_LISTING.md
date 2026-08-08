# App Store Connect — listing copy (en-US)

Source of truth for Fastlane `deliver` / `fastlane store_metadata`:  
`ios/fastlane/metadata/`

## App Information

| Field | Value | Fastlane? |
|-------|--------|-----------|
| Name | BusyProxy | ✅ `metadata/en-US/name.txt` |
| Subtitle | Earn sharing spare data | ✅ `subtitle.txt` |
| Privacy Policy URL | https://busyproxy.net/privacy | ✅ `privacy_url.txt` |
| Privacy Choices URL | https://busyproxy.net/account-deletion | ✅ API / App Info loc |
| Primary category | Finance | ✅ `primary_category.txt` |
| Secondary category | Utilities | ✅ `secondary_category.txt` |
| Copyright | 2026 SERGIU TODERASCU, AI | ✅ `copyright.txt` |
| Content rights | Does not use third-party content | ✅ API |

## Version 1.0 (Prepare for Submission)

| Field | Value | Fastlane? |
|-------|--------|-----------|
| Description | See `description.txt` | ✅ |
| Keywords | earn,wifi,data,bandwidth,proxy,rewards,wallet,mobile | ✅ |
| Support URL | https://busyproxy.net | ✅ |
| Marketing URL | https://busyproxy.net/app | ✅ |
| Promotional text | Earn by sharing spare Wi‑Fi… | ✅ |
| What’s New | *(not editable on first version)* | ⚠️ after first release |
| Build | 1.0.0 (1) selected | ✅ API `select_build` |
| App icon | From **binary** AppIcon (not deliver `app_icon` — deprecated) | ✅ via IPA |

## App Review Information

| Field | Value |
|-------|--------|
| Contact | BusyProxy Support · support@busyproxy.net · +44 844 209 0611 |
| Demo account required | Yes |
| Demo user | +15550100001 |
| Demo password (OTP) | 246810 |
| Notes | See `metadata/review_information/notes.txt` |

## Screenshots

| Field | Status | Fastlane? |
|-------|--------|-----------|
| iPhone 6.7" / 6.5" / etc. | ❌ Not uploaded yet | ✅ `deliver` screenshots folder |
| App Preview video | ❌ Optional | ✅ |

Capture from simulator/device and place under  
`ios/fastlane/screenshots/en-US/` then run deliver with screenshots enabled.

## Cannot fully automate with Fastlane (API key)

| Field | Notes |
|-------|--------|
| **Age Rating questionnaire** | New multi-step form; partial Spaceship support — finish in ASC UI |
| **App Privacy (“nutrition labels”)** | Needs `upload_app_privacy_details` / portal or ASC UI |
| **Export compliance** | Often answered on build (`ITSAppUsesNonExemptEncryption=false` in Info.plist) |
| **Pricing & availability** | Set in ASC or `deliver` price_tier (free = 0) |
| **App Store icon in My Apps list** | Comes from **processed build** after it’s selected on the version — hard-refresh ASC |
| **Signing certificates** | Developer Portal / automatic Xcode |

## Commands

```bash
# On mm_ser
source ~/.config/appstoreconnect/env
cd ~/dev/busyproxy/ios
fastlane store_metadata   # metadata only
fastlane beta             # binary + TestFlight
```
