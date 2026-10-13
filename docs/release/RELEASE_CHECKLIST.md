# Release checklist

Status key: ✅ done in the repo · 👤 needs the owner (accounts, legal, people) · 🔶 decision needed

## Product and code
- ✅ Expedition, Wumpus, relics, heroes, daily challenge, stalkers, achievements, tutorial, EN/ES, accessibility settings.
- ✅ Original audio (`scripts/generateAudio.js`); the Mario loading image removed.
- ✅ Production build profile builds an AAB; target SDK 36 by default (React Native 0.86).
- 👤 Play the game for a few hours on 2-3 real devices (a small phone, a big phone, a tablet if possible) and report anything off.
- 🔶 Final name (trademark search: USPTO, EUIPO TMview, WIPO, SENADI) and then update `app.json` `name`/`slug` and the store copy.
- 👤 Art: replace/verify sprites and write proof of license in `docs/ASSETS.md` (`docs/ART_BRIEF.md` lists what to produce).
- 👤 Deploy `firestore.rules` and set up App Check (`docs/SECURITY.md`). Consider a fresh Firebase project (the current id is `mario-s-grid`).

## Accounts and money
- 👤 Google Play Console developer account (25 USD, identity verification). Payments profile: Ecuador is a supported country.
- 👤 Accountant: RUC and regime (RIMPE?), whether foreign platform income is an exported service (0% IVA), W-8BEN / Form 8233 for US withholding,
  whether to form an SAS. Questions are listed in `docs/market-research-notes/ecuador_tax.md`.
- 👤 Apple Developer Program (99 USD): **confirm Ecuador is accepted for enrolment and payouts first.**
- 🔶 Monetisation: free to level 3 + one-time unlock (recommended in `docs/GAME_DESIGN.md`). Needs in-app purchase (RevenueCat or `react-native-iap`)
  and a development build; AdMob only if you choose ads (check `react-native-google-mobile-ads` against SDK 57 first).

## Google Play steps
1. 👤 Create the app; enable **App Signing**.
2. 👤 **Closed test**: 12+ testers opted in for 14 continuous days before you can apply for production (new personal accounts). Start by day ~10 of the month.
   Build: `eas build -p android --profile production` (AAB), then `eas submit -p android --profile production` (internal track, draft) with a Play
   service-account key.
3. 👤 Privacy policy URL (`docs/release/PRIVACY_POLICY.md`, hosted), Data safety form (`DATA_SAFETY.md`), IARC content rating, target audience: **not** children.
4. 👤 Store listing from `STORE_LISTING.md`, screenshots, feature graphic, icon.
5. 👤 Promote to production once the closed test passes.

## Before every release
- ✅ `npm run typecheck`, `npm test`, `npx expo-doctor`, `npx expo export --platform android`.
- ✅ `npx tsx scripts/simulate.ts` after any balance change.
- 👤 Bump `version` in `app.json` (EAS auto-increments the build number).
- 👤 Re-read `PRIVACY_POLICY.md` and `DATA_SAFETY.md` if any SDK or data collection changed.
