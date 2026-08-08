# What Fastlane filled vs still open

**Last automated fill:** 2026-08-08 (Spaceship + `metadata/` pack)

## Filled now (check ASC → App Store → 1.0 Prepare for Submission)

- [x] App name: BusyProxy  
- [x] Subtitle: Earn sharing spare data  
- [x] Privacy policy URL  
- [x] Description (full)  
- [x] Keywords  
- [x] Support URL + Marketing URL  
- [x] Promotional text  
- [x] Copyright  
- [x] Primary category Finance + secondary Utilities  
- [x] Content rights declaration  
- [x] Build **1.0.0 (1)** selected on version 1.0  
- [x] App Review contact + demo account notes  
- [x] App icon **in binary** (Apple CDN token on build)  

## Still need human / ASC UI

- [ ] **Screenshots** (required before Submit for Review)  
- [ ] **Age Rating** questionnaire complete  
- [ ] **App Privacy** data types form  
- [ ] Pricing (Free) + territories if not default  
- [ ] Optional: App Preview video  
- [ ] Submit for Review (when ready for public; TestFlight internal already works)  

## Icon still blank in sidebar?

1. Hard-refresh App Store Connect (⌘⇧R).  
2. Open **App Store → iOS App 1.0** — Build should show 1.0.0 (1) with icon.  
3. My Apps list icon updates after a **VALID** build is **selected** on a version (done). Cache can lag 5–30 minutes.  
4. `deliver` **cannot** set the marketing icon separately anymore (`app_icon` deprecated June 2020); icon always comes from the IPA AppIcon asset catalog.  

If the list still shows the grid template after 30+ minutes, open the app → **App Information** and confirm Privacy + categories saved, then re-select build 1.
