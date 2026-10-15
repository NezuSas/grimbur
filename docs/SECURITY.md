# Leaderboard security

The global leaderboard is a Firestore collection (`highscores`) written directly from the app.
Anyone can read the Firebase config out of an APK, so **the Firestore rules are the real protection**.
The web API key in `src/lib/firebase.ts` is not a secret by design.

## What the repo already does

- `firestore.rules` (this repo): only `create` is allowed on `highscores`, only with exactly the six expected
  fields and plausible ranges (score ≤ level × 20,000, coins ≤ level × 8, name 1–20 chars, ...).
  Updates and deletes are denied, and every other collection is closed.
- `src/core/leaderboard/validation.ts`: the same limits on the client, plus name sanitising and a baseline
  English/Spanish profanity filter. `addHighscore` refuses invalid submissions.

## What you must do (needs your Firebase account)

1. **Deploy the rules** (they are NOT live until you do this):
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase deploy --only firestore:rules --project mario-s-grid
   ```
   Before that, open the Firebase console → Firestore → Rules and save a copy of whatever is deployed now.
2. **Check the project.** The project id is `mario-s-grid`, which looks like a leftover from an older game.
   Consider creating a fresh Firebase project for this game and updating `src/lib/firebase.ts`.
3. **Turn on App Check** (Play Integrity for Android, App Attest for iOS) so only your genuine app can call
   Firestore. Needs `@react-native-firebase/app-check` and a development build.
4. **Optional, stronger anti-cheat:** rules cannot prove a score is real. A Cloud Function that receives the
   run seed + action list and re-simulates it with the deterministic reducer (`core/engine/reducer.ts`) can.
   This requires the seed per run to be stored (see the daily-challenge work) and the Blaze plan.

## Keeping the rules in step with the game

`firestore.rules` bounds `characterIndex` by the number of heroes (now 6: indexes 0-5). When a hero is added, raise that bound
in the rules AND redeploy them, or scores played with the new hero are rejected by the server.

## Known limits

- A determined cheater can still submit a plausible fake score within the rules' ranges.
- The profanity filter is a baseline and will miss creative spellings. If the game reaches the App Store,
  add a report/hide mechanism for leaderboard names (App Review guideline 1.2).
