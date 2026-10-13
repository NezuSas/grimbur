# Store data forms (draft answers)

These answers describe the app **as it is in this repository**. Re-do them if you add ads, analytics, crash reporting, accounts or purchases.

## Google Play: Data safety

| Question | Answer |
| --- | --- |
| Does the app collect or share user data? | **Yes** (leaderboard name and score are sent to a server) |
| Is all collected data encrypted in transit? | Yes (Firebase uses HTTPS) |
| Can users request that data is deleted? | Yes, by email (see privacy policy). Optionally add a web form |
| Data type: **Personal info → Name** | Collected: yes (the display name typed for the leaderboard; may be a nickname). Shared: no. Purpose: App functionality. **Optional** (user chooses to submit) |
| Data type: **App activity → Other user-generated content / in-app actions** | Collected: yes (score, floor, gems, hero, time). Shared: no. Purpose: App functionality |
| Device or other IDs, location, contacts, photos, audio, financial info | Not collected |
| Crash logs / diagnostics | **No** today. Becomes "Yes" if you enable crash reporting |
| Ads | The app contains no ads today. Update if you add them |
| Target audience | 13+ (not children) |
| Content rating (IARC) | Mild fantasy violence; no gambling; user-generated text is limited to a leaderboard nickname (filtered) |

## Apple: App Privacy ("nutrition label")

| Item | Answer |
| --- | --- |
| Data used to track you | None |
| Data linked to you | None (no account). The leaderboard nickname is not linked to an identity |
| Data not linked to you | **Other User Content** (nickname) and **Gameplay Content** (score, floor), purpose: App Functionality |
| App Tracking Transparency prompt | Not needed today |
| Guideline 1.2 (user-generated content) | Leaderboard nicknames are filtered (blocklist) and rate-limited by the Firestore rules. Add a report/hide mechanism before the App Store release |
| Restore Purchases button | Required as soon as you add the one-time unlock |
