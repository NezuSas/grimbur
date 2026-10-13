# Store compliance and release requirements: free ad-supported + IAP Expo SDK 57 game (state as of Oct 2026)

Note: Several sources were fetched through a summarizing tool; items marked [UNVERIFIED] come from general knowledge or secondary sources and should be checked in Play Console / App Store Connect.

## Google Play: AAB, target API, closed testing

### Takeaway
New apps must ship as AAB (not APK); EAS builds AAB by default and the current APK-typed production profile must be changed. Since Aug 31 2026 new apps/updates must target API 36 (extension to Nov 1 2026 only for those who requested it). New personal accounts need a closed test with 12 testers opted-in for 14 continuous days before production access.

### Cited Findings
- Play requires app bundles, not APKs; an APK cannot be submitted via EAS Submit — [Expo submit Android](https://docs.expo.dev/submit/android/)
- EAS Build outputs AAB by default; APK only if profile sets `android.buildType: "apk"`, `distribution: internal`, or a custom gradleCommand. So `production` just needs `buildType` removed or set to app-bundle — [Expo APK docs](https://docs.expo.dev/build-reference/apk/) (that page documents only "apk"; "app-bundle" value not shown there, verify in the eas.json reference)
- From Aug 31 2026, new apps and updates must target Android 16 (API 36); existing apps must target API 35+ to stay visible to new users on newer Android; extension to Nov 1 2026 available via Play Console form (page "last updated 2026-10-01") — [Android target SDK requirements](https://developer.android.com/google/play/requirements/target-sdk)
- The target-sdk page does not itself state the AAB requirement — same source.
- Expo SDK 57 (published June 30 2026, RN 0.86, React 19.2; expo 57.0.17 updated Aug 27) — [Expo SDK 57 changelog](https://expo.dev/changelog/sdk-57.md). The changelog does not mention Android targetSdk.
- SDK 57 `expo-build-properties` docs example sets compileSdkVersion 36 / targetSdkVersion 36 explicitly; default not documented there — [build-properties v57](https://docs.expo.dev/versions/v57.0.0/sdk/build-properties/)
- SDK 57 changelog: iOS 27 SDK/Xcode 27 apps need UIKit scene lifecycle; SDK 57 offers opt-in `ios.enableSceneSupport` (expo-build-properties, expo@57.0.23); SDK 58 default — [Expo SDK 57 changelog](https://expo.dev/changelog/sdk-57.md)
- New personal developer accounts: closed test with at least 12 testers opted in continuously for 14 days before applying for production; previously 20 testers; organization accounts exempt; cutoff date for affected accounts cited as personal accounts created after Nov 13 2023 (one source says Nov 1 2023) — [Play Console Help 14151465](https://support.google.com/googleplay/android-developer/answer/14151465) (via search snippet), [Android Authority](https://androidauthority.com/google-play-app-testing-requirement-3510580), [Level Up article](https://levelup.gitconnected.com/the-12-tester-tax-google-plays-closed-testing-rule-is-quietly-killing-solo-devs-2cea83c2e338)

### Inferences
- Because the project has no iOS bundle ID and an APK production profile, the Android build must be re-profiled to AAB, and `targetSdkVersion` should be verified at build time (inspect generated build.gradle or set 36 via expo-build-properties to be safe).
- Start the 14-day closed test early; it gates production regardless of everything else.
- Closed test needs real opted-in testers; EAS submit's first upload lands on internal track, then promote to closed.

### Gaps
- Expo SDK 57's default targetSdkVersion not confirmed from official docs.
- Official Google 12-tester page was only seen via search snippet, not fetched; confirm exact wording in Play Console.
- Play requirement for AAB for new apps: confirmed by Expo docs, not by a Google page fetched.

## Google Play: Data safety, IARC, privacy policy, Families, ads policy

### Takeaway
Data safety form is mandatory and must include SDK-collected data (AdMob, Firebase Analytics, Crashlytics, Firestore); a privacy policy URL is required. Choose target audience as 13+/general, not children, to avoid the Families program; ads must not be mistakable for game UI.

### Cited Findings
- Data safety form: required for all apps on closed/open/production tracks (internal track exempt); includes data collected by third-party SDKs; must link privacy policy even if no data collected; declarations must stay accurate; check SDK providers' data disclosures and Play SDK Index — [Data safety help](https://support.google.com/googleplay/android-developer/answer/10787469)
- Firebase data disclosure: Crashlytics collects stack traces, device metadata, installation UUID (plus custom keys/logs/user IDs if used); Firestore auto-collects only Firebase user agent, plus developer-defined end-user data (e.g. the typed display name and scores); Analytics defers to Google Analytics docs (not listed on page); Firebase does not transfer data to third parties other than subprocessors — [Firebase Play data disclosure](https://firebase.google.com/docs/android/play-data-disclosure)
- Families/ads: if children are among target audience, must follow Families policy, use only self-certified ad SDKs, no interest-based ads; mixed-audience apps use a neutral age screen; rewarded/opt-in ads that interfere with gameplay must be closeable after 5 seconds for child/unknown-age users; ads that could be mistaken for app content are a violation; no interstitial at launch for child audiences — [Play ads/Families policy](https://support.google.com/googleplay/android-developer/answer/9893335)
- Practical Data safety mapping (derived): Device or other IDs (AdMob advertising ID, Firebase installation ID; purposes: advertising, analytics), App activity/interactions (analytics), Crash logs/Diagnostics (Crashlytics), Approximate location (AdMob IP-derived) — Firebase/AdMob sources above; AdMob-specific table not fetched.
- Display name typed by user + score stored in Firestore = user-provided "Name" (or user IDs) collected; deletion request mechanism should be declared.

### Inferences
- Choose "not designed for children" (13+/18+) target audience and keep content non-child-directed to avoid Families ad restrictions and Apple Kids category constraints (Kids category bans third-party analytics/ads).
- Rewarded ads: user taps to opt in; show clear "Watch ad for X" button styled distinct from game UI.

### Gaps
- IARC questionnaire specifics (not fetched); expect questions on violence, user interaction/UGC (leaderboard names), in-app purchases, ads. [UNVERIFIED]
- Exact AdMob Data safety table not fetched; Google Analytics for Firebase data types not listed on the Firebase page.
- Account deletion requirement on Play (applies if app has account creation): not applicable if no accounts, not verified.

## Apple: enrollment, bundle ID, privacy, ATT, UGC, review

### Takeaway
A paid Apple Developer Program account and `ios.bundleIdentifier` are required. Declare App Privacy details including AdMob/Firebase SDK data, show ATT prompt only if tracking, and treat the typed leaderboard name as UGC: implement filtering, report, block, and contact info (guideline 1.2).

### Cited Findings
- Paid Apple Developer account required; set `ios.bundleIdentifier` in app.json; build `eas build -p ios --profile production`; `ascAppId` in `submit.production.ios` in eas.json; `eas submit -p ios`; processing 10-15 min then in TestFlight; app must already exist in App Store Connect — [Expo iOS submit](https://docs.expo.dev/submit/ios/)
- App Privacy: must declare data from third-party partners (analytics, ad networks, SDKs); Identifiers, Usage Data, Diagnostics, Purchases categories; tracking = linking with third-party data for targeted ads/measurement; privacy policy URL required; answers editable without a new build — [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- ATT: "You must receive explicit permission ... via the App Tracking Transparency APIs to track" (5.1.2(i)) — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Expo: `expo-tracking-transparency` config plugin with `userTrackingPermission` sets NSUserTrackingUsageDescription (without it app is rejected); adds AD_ID permission on Android; call `requestTrackingPermissionsAsync()` — [Expo tracking-transparency](https://docs.expo.dev/versions/latest/sdk/tracking-transparency/)
- Guideline 1.2 UGC: requires filtering method, report mechanism with timely responses, ability to block abusive users, published contact info — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Guideline 5.1.1(v): account deletion in-app if app supports account creation — same source.
- Guideline 3.1.1: provide restore mechanism for restorable IAP (Remove Ads must have Restore Purchases button) — same source.
- Guideline 2.1: IAPs must be complete and visible/functional to reviewer — same source.
- Kids Category: no third-party analytics/advertising — same source.

### Inferences
- A free-text leaderboard name visible to other players is user-generated content; reviewers can enforce 1.2. Minimal compliant approach: profanity filter on submit, a long-press "Report" on entries (writes to a Firestore reports collection), a way to hide/block a name, a contact email in-app and on store page. Alternative lowering risk: use generated names/presets instead of free text. (Guideline text does not define a name as UGC explicitly; this is interpretation.)
- With anonymous Firestore auth and no accounts, account deletion rule likely doesn't apply, but offering a "delete my leaderboard entry" is cheap insurance.
- With AdMob personalized ads, the ATT prompt is required on iOS; with UMP configured, the UMP SDK can show the ATT alert (see consent section).

### Gaps
- Apple developer enrollment fee/time and individual vs organization steps not fetched (known generally as US$99/year, may require D-U-N-S for organizations) [UNVERIFIED].
- Review times: Apple support page fetch failed (404); not verified. Commonly reported ~24-48h [UNVERIFIED].
- Last ~12k characters of the guidelines page were not read.

## Consent: UMP, US states, react-native-google-mobile-ads on Expo SDK 57

### Takeaway
Use the library's `AdsConsent` (Google UMP) with AdMob Privacy & messaging configured; gate `mobileAds().initialize()` on `canRequestAds`. Latest library is v17.2.0 (Sep 25 2026), requires New Architecture; the Expo config-plugin errors in #820/#835 are editor/tooling-level warnings, not build failures.

### Cited Findings
- UMP flow: configure GDPR + IDFA messaging in AdMob console; call `AdsConsent.gatherConsent()` (or `requestInfoUpdate`) each launch; initialize ads only if `canRequestAds`; Expo plugin options `androidAppId`, `iosAppId`, `delayAppMeasurementInit`, `userTrackingPermission`; add ProGuard keep rule `com.google.android.gms.internal.consent_sdk.**` through `expo-build-properties` `extraProguardRules`; UMP SDK handles ATT alert if ATT message configured in AdMob; `debugGeography` for testing; dev build needed — [RNGMA UMP docs](https://docs.page/invertase/react-native-google-mobile-ads/european-user-consent)
- US state laws: AdMob supports Restricted Data Processing (`gad_rdp`=1) and IAB GPP signals; page doesn't list which states; Android legacy SDK page says maintenance mode and recommends GMA Next-Gen — [AdMob US states](https://developers.google.com/admob/android/privacy/us-states)
- Releases: v17.2.0 (Sep 25 2026, Latest), v17.1.0 (Sep 23), v17.0.0 (Sep 18, breaking: RN 0.76+, New Architecture only, iOS 15.1, Android API 24, new API/ad pools), v16.5.0 (Aug 18), v16.4.0 (Jun 25) — [RNGMA releases](https://github.com/invertase/react-native-google-mobile-ads/releases), [v17.0.0](https://github.com/invertase/react-native-google-mobile-ads/releases/tag/v17.0.0)
- Issue #820 (Expo 54.0.22, lib ^16.0.0): "does not contain a valid config plugin / Unexpected token 'typeof'"; the reporter fixed it with `npx expo install --fix` plus restarting the editor; closed Nov 6 2025 — [#820](https://github.com/invertase/react-native-google-mobile-ads/issues/820)
- Issue #835 (Expo 54.0.33, RN 0.81.5, lib ^16.0.3): same error; app builds and runs, warning persists; maintainer said 16.0.2 wasn't meant to be breaking; closed stale "not planned" Mar 28 2026 — [#835](https://github.com/invertase/react-native-google-mobile-ads/issues/835)

### Inferences
- SDK 57 (RN 0.86, New Architecture always on) satisfies v17 requirements, so v17.2.x is the likely choice; an alternative is the 16.x line if issues arise. No source explicitly confirms v17 + SDK 57 compatibility; test with a dev build.
- Because the plugin errors come from config-plugin import (TypeScript in the plugin), treat as non-blocking if `npx expo prebuild` and EAS build succeed.
- Needs a development build/EAS build; won't run in Expo Go.

### Gaps
- No official statement of "recommended version for SDK 57" found; Expo compatibility not documented in releases.
- Which US states require messaging, and AdMob US-state UMP config details, not fetched.
- GMA Next-Gen SDK migration status of the RN library unknown.

## Privacy policy and Ecuador LOPDP

### Takeaway
Both stores require a public privacy policy URL. Free hosting via GitHub Pages or Firebase Hosting is adequate; policy must cover SDK data collection. Ecuador's LOPDP is only partly researched.

### Cited Findings
- Play requires linked privacy policy to complete Data safety — [Data safety help](https://support.google.com/googleplay/android-developer/answer/10787469)
- Apple requires a public Privacy Policy URL on the product page — [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)

### Inferences
- Minimal contents: controller name and contact email; data collected (display name, score, device/advertising IDs, crash/diagnostic data, purchase status); third parties (Google AdMob, Firebase Analytics/Crashlytics/Firestore, Apple/Google billing) with links to their policies; purposes; legal basis/consent (UMP, ATT); retention and deletion request method; children statement (not directed to under 13/16); international transfers; policy update date.
- LOPDP (Ecuador's Ley Orgánica de Protección de Datos Personales, in force with its regulation since 2023): as a developer based in Ecuador processing players' personal data, the policy should state purposes, consent, and rights (access, rectification, deletion, objection) and a contact channel. [UNVERIFIED: no source fetched; consult the official text or a local lawyer].

### Gaps
- Free generator comparison (e.g., Termly, FreePrivacyPolicy, App Privacy Policy Generator) not researched. LOPDP details not sourced.

## EAS configuration

### Takeaway
Use `appVersionSource: remote` with `autoIncrement` on the production profile, build AAB, and use `eas submit` with a Play service account key. First submit lands on internal track.

### Cited Findings
- `cli.appVersionSource: "remote"` is recommended since EAS CLI 12.0.0; `autoIncrement: true` under `build.production` increments versionCode/buildNumber; first remote value comes from local config; `eas build:version:set` to sync an existing store version — [Expo app versions](https://docs.expo.dev/build-reference/app-versions/)
- Submit Android: set `android.package`; service account key via `eas credentials` or dashboard; `eas submit -p android` creates first release on internal track; submit profile options `track`, `releaseStatus` (e.g. draft), `serviceAccountKeyPath`; `--auto-submit` option — [Expo submit Android](https://docs.expo.dev/submit/android/)
- Submit iOS flow as above — [Expo iOS submit](https://docs.expo.dev/submit/ios/)

### Inferences
Suggested eas.json:
```json
{
  "cli": { "appVersionSource": "remote" },
  "build": {
    "preview": { "distribution": "internal", "android": { "buildType": "apk" } },
    "production": { "autoIncrement": true }
  },
  "submit": {
    "production": {
      "android": { "track": "internal", "releaseStatus": "draft" },
      "ios": { "ascAppId": "<Apple ID from App Store Connect>" }
    }
  }
}
```
The app.json needs `ios.bundleIdentifier` and `android.package`; plugins for `react-native-google-mobile-ads` (with app IDs, `userTrackingUsageDescription`), `expo-tracking-transparency`, `expo-build-properties` (targetSdkVersion 36 and ProGuard rule), and the Firebase config files.

### Gaps
- Whether Google Play Console requires the very first AAB to be uploaded manually: Expo docs say not required (first submit works) but a Google service account needs the app to exist in Play Console first.
