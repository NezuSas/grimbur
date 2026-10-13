# Retention, engagement and live-ops for a solo-dev puzzle-roguelite (Wumpus Adventures)

Research depth note: ~14 searches/fetches. Public, rigorous, genre-specific data on individual mechanics (daily challenge, streaks, achievements) is thin; most mechanic-level claims are vendor blogs or design commentary. Where a number is unverified it is flagged.

## 1. Benchmarks: D1 / D7 / D30, session length, sessions per day

### Takeaway
Cross-genre mobile medians are very low (D1 ~22%, D7 ~4%, D30 ~0.7%, 2025 data), and top-25% is only D1 ~30%, D7 6-7%, D30 1.6-1.8%. Puzzle is qualitatively one of the best genres for mid/long-term retention, but I found no verified, sourced puzzle-specific numbers; unsourced blog tables put casual puzzle at D1 30-40%, D7 10-20%, D30 3-7%, which are optimistic versus GameAnalytics.

### Cited Findings
- GameAnalytics 2026 report (2025 data, 16,262 mobile titles with >=1,000 MAU, all genres combined): D1 top 25% just above 30%, top 10% ~40%, top 1% 64-68%; D7 median just under 4%, top 25% 6-7%, top 10% 11-12%, top 1% >25%; D30 median 0.69-0.79%, top 25% 1.6-1.8%, top 1% 13-15%. D1 declined in 2025 vs 2024. — [GameDev Reports summary of GameAnalytics 2026](https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game)
- Same report, mobile session length: top 25% ~5.2 min, top 10% ~8 min, top 1% ~22 min (median not stated). Sessions/day: top 25% 5.3-5.7, top 10% ~9.6, top 1% ~14 (median not stated). — [same](https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game)
- A secondary slide-deck summary of the same dataset gives median D1 ~22%, top-10% 40%/12%/4% for D1/D7/D30. — [Search summary of GameAnalytics 2026 / investgame PDF](https://investgame.net/wp-content/uploads/2026/01/2026-01-20-Mobile_retention_benchmarks_2026.pdf) (not independently verified by me; the top-10% D30 4% is not in the GameDev Reports table)
- GameAnalytics 2025 report (data through end of 2024, 11,600 games, classic retention): top-25% D1 ~26.5-27.7% (down from 28-29% in 2023); median D7 3.4-3.9%, top-25% D7 7-8%. Best genres for medium/long-term retention: board, card, puzzle, casino. Arcade leads D1 but is weak long-term. — [GameDev Reports: GameAnalytics 2025](https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks)
- Unsourced genre table (blog, Dec 2025, no data source or year stated): Casual Puzzle D1 30-40%, D7 10-20%, D30 3-7%; Strategy D1 35-50%, D7 20-35%, D30 10-20%. No roguelike row. — [Playio](https://blog.playio.co/retention-by-game-genre) (low reliability)
- Older AppsFlyer-derived figure (2022 data): casual/puzzle Android D1 28-32%, D7 9-12%, D30 3.5-5%. — [Segwise](https://segwise.ai/blog/mobile-gaming-app-user-retention-strategies.md) (dated, secondary)
- MWM Q3 2025 "Game" category median: D1 36.6%, D7 9.3%, D30 2.9% (different methodology, likely a curated app set; not comparable with GameAnalytics). — [MWM](https://mwm.ai/glossary/retention)
- Mistplay x AppsFlyer 2025 Loyalty Index (US, data 2023-24): puzzle top loyalty index (85), then RPG (75), strategy (71); puzzles lead share of payers on D30 (7.06% Android / 7.82% iOS). Match games have highest avg D30 retention across platforms at 6.6% per Global Games Forum; GameDev Reports summary says board games lead D30 on Android and match on iOS (sources slightly disagree). — [GameDev Reports](https://gamedevreports.substack.com/p/mistplay-and-appsflyer-player-loyalty); [Global Games Forum](https://www.globalgamesforum.com/news/mistplays-2025-mobile-gaming-loyalty-index-reveals-top-genres-for-engagement-and-monetization)
- Older (2018) GameAnalytics: D1 >=35% was "performing well"; best D28 was 4-6%. — [GameAnalytics 2018](https://tap-nation.io/assets/docs/Mobile_Benchmarks_Industry_Report_2018_GameAnalytics.pdf) (dated)

### Inferences
- Realistic "good" targets for a paid-UA-free indie: D1 25-30% (already top quartile cross-genre), D7 6-10%, D30 2-3%. Anything above that is top-decile. Use cross-genre GameAnalytics as the conservative yardstick, puzzle blog tables as the optimistic ceiling.
- Session design target: 5+ minutes per session is top-quartile; Wumpus's session-based runs fit that if a run takes ~3-8 minutes.
- Organic indie games have no UA-quality dilution, so may beat the medians, which are dominated by paid traffic (inference).

### Gaps
- No verified puzzle-specific or roguelite-specific D1/D7/D30 median vs top-quartile; no Adjust or Liftoff retention numbers found (Liftoff results returned only D30 ROAS for casual: 15% Android / 47% iOS per secondary source). GameAnalytics/Unity genre pages are paywalled/not surfaced.
- Genre-specific sessions/day and session length not found.

## 2. Which mechanics measurably drive retention in this genre

### Takeaway
No controlled public dataset isolates the effect of daily challenges, streaks, achievements, etc. on retention; evidence is design commentary and vendor claims. Strongest qualitative case: a shared, once-per-day seeded puzzle (Wordle model) and persistent meta-progression (Vampire Survivors-type) which softens failure.

### Cited Findings
- Daily mode precedent: Spelunky's daily cave is the same for everyone, one attempt per day, with a per-day leaderboard; Slay the Spire's daily adds constraints (limited decks, special relics, penalties). — [Spelunky Wiki](https://spelunky.fandom.com/wiki/Daily_Challenge_Mode_(HD)); [Playing Software](https://playingsoftware.substack.com/p/the-ritual)
- Design critique: one writer argues Spelunky's daily (single attempt, score leaderboard) encourages worse play. — [The Ludite](https://theludite.com/2014/06/23/spelunky-when-scoring-goes-bad/) (opinion)
- Wordle: limiting to one puzzle per day is the core retention mechanism, designer said the shared word matters; grid share added Dec 2021; grew from 90 to 300,000 players in two months (then >2M by end of Jan 2022 per one source). Spoiler-free emoji grid enabled sharing. NYT bought it for "low seven figures". — [CUNY Pressbooks](https://pressbooks.cuny.edu/inspire/part/the-wordle-effect-how-five-letters-changed-the-internet/); [TechCrunch](https://techcrunch.com/2022/05/04/wordle-new-york-times-user-growth); [Know Your Meme](https://amp.knowyourmeme.com/memes/subcultures/wordle)
- Streaks (vendor claims, unverified): users 2.3x more likely to engage daily after a 7+ day streak (Duolingo internal data, as cited); "Forrester 2024" claim of -35% 30-day churn for streak+milestone systems (underlying report not found). — [Plotline](https://www.plotline.so/blog/streaks-for-gamification-in-mobile-apps)
- Streak adoption roughly doubled into 2024 then slipped as share in 2025; works best where a genuine daily habit exists. — [Lazyweb](https://www.lazyweb.com/research/are-streaks-still-spreading-beyond-duolingo)
- Google Play Games now has a platform "Streaks" feature. — [Google Play Help](https://support.google.com/googleplay/answer/16562031)
- Meta-progression: Vampire Survivors retention attributed to persistent unlocks (characters, weapons, permanent upgrades after failed runs); roguelite meta-progression gives long-term investment despite failure. One commenter says Slay the Spire's limited meta-progression "works as a tutorial"; Balatro's hook is described as moment-to-moment scoring-engine feel. — [Retromo](https://retromo.substack.com/p/vampire-survivors-pc-2022); [Sophie Cress](https://sophiecress.com/blog/balatro-a-deep-dive-into) (all opinion)
- Anecdote: a visible permanent "daily wins" tally reportedly turned casual players into daily regulars (single dev post). — [Product Hunt](https://www.producthunt.com/p/graze-edge-rush/i-added-a-permanent-daily-wins-tally-to-my-game-and-it-changed-how-people-play)

### Inferences
- Seeded daily run is the best fit: the engine presumably has deterministic level generation; one seed per UTC date means no backend beyond the existing Firestore leaderboard (a per-day leaderboard collection).
- Unlockable characters already exist (4 selectable); gating them behind achievements or cumulative score is cheap meta-progression.
- Leaderboards: global top-10 alone demotivates most players; a daily board (resets, fresh chance) and "personal best / rank percentile" are likely more motivating. No evidence found on global vs friends comparison.
- Daily login rewards, in-game currency, collections, seasonal events, ghost/replay, endless mode, difficulty modes: no measured retention evidence found in this research.

### Gaps
- No retention uplift numbers (A/B) for daily challenges, achievements, login rewards, leaderboards (global vs friends), seasons, ghosts, difficulty or endless modes. Slay the Spire/Spelunky daily participation rates not found.

## 3. First-time user experience (FTUE)

### Takeaway
Guidance is generic: reach core play within ~1 minute, teach a few mechanics at a time, and instrument a tutorial funnel to find drop-off. I found no genre-specific (deduction/roguelite) drop-off benchmarks.

### Cited Findings
- Reach core gameplay within ~1 minute; if the "fun" moment takes >90 seconds many users won't return for session two (vendor opinion). — [Playio](https://blog.playio.co/mobile-game-onboarding-retention)
- Build a funnel from tutorial steps to find drop-off; track completion rate and time-to-completion of early levels; first interaction should be the most engaging mechanic. — [Unity](https://unity.com/how-to/10-first-time-user-experience-tips-games)
- Avoid information overload; introduce only essential features first. — [devtodev](https://devtodev.com/resources/articles/how-to-analyze-first-player-session)
- FTUE funnel is the measure of D1 retention. — [Roblox Creator Docs](https://create.roblox.com/docs/en-us/production/game-design/onboarding)

### Inferences
- For a Wumpus-hunt style deduction game, a 1-2 level scripted first run (forced safe first move, hint pointing to a breeze/stench clue, one trap) that teaches clue-reading by doing is more appropriate than a static instructions page; introduce power-ups and combos after level 2-3 (inference, not sourced).
- Measure: tutorial_step funnel, first-level completion, time to first move, deaths in level 1-3, and D1 by cohort.

### Gaps
- No typical drop-off percentages for puzzle/roguelite tutorials; no roguelite/deckbuilder-specific onboarding case studies found.

## 4. Analytics and tooling for solo devs

### Takeaway
Firebase's Analytics, Crashlytics, Remote Config (and A/B Testing) are no-cost even in production, and the project already uses Firebase, making it the lowest-friction stack. PostHog/Amplitude/GameAnalytics SDK not verified in this research.

### Cited Findings
- Analytics, Crashlytics, Remote Config and A/B Testing are no-cost products usable on Spark plan in production. BigQuery export is a paid Cloud feature. A third-party guide claims a 200k DAU Remote Config cap, but official pages do not state it (check docs). — [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans); [Gurubase](https://gurubase.io/g/android/firebase-product-limitations-free-tier-android)
- Push opt-in: Android 13+ requires consent so Android and iOS opt-in rates are near parity (Airship 2025/26). Secondary figure: Android opt-in fell 85% to 67%, iOS 58% to 56% in one year (Batch, unverified). iOS opt-in is lowest in hyper-casual games. Overall range 23-92% by industry/platform. — [Airship](https://www.airship.com/mobile-app-push-notification-benchmarks-for-2026/); [Pushwoosh](https://www.pushwoosh.com/blog/push-notification-benchmarks/)

### Inferences
- Minimum event set: app_open, tutorial_begin/step/complete, level_start, level_end (result, moves, hp, level number, character), run_end (cause of death, score), powerup_used, hint_used, character_selected, daily_started/completed, share_tapped, leaderboard_viewed, notification_permission_result. Set user properties: character, best level, days since install.
- Ask for push permission after a first good moment (e.g. after completing a run or daily), never at launch; local scheduled notifications (daily challenge ready, streak at risk) avoid needing a push backend.
- Use Remote Config to tune difficulty/trap rates/hint counts, then A/B Testing for the tutorial.
- Add Crashlytics (or Sentry) before launch of any live-ops feature.

### Gaps
- Not researched: PostHog, Amplitude, GameAnalytics SDK, Unity Analytics comparison; Expo/React Native integration specifics (Firebase needs a dev build, not Expo Go; unverified); Sentry details; gaming-specific push opt-in rate and push effect on retention.

## 5. Social / virality

### Takeaway
The best-documented organic mechanism is a spoiler-free shareable result tied to a shared daily puzzle (Wordle). For indie mobile discovery, short-form video and streamers/free keys are cited; organic reach is hard, and a platform feature (Apple) was a major driver in one example.

### Cited Findings
- Wordle share grid added after the creator saw players pasting emoji results; spoiler-free; shared via WhatsApp, text, Twitter; many players do not post publicly so tweet counts understate. — [CUNY Pressbooks](https://pressbooks.cuny.edu/inspire/part/the-wordle-effect-how-five-letters-changed-the-internet/); [Know Your Meme](https://amp.knowyourmeme.com/memes/subcultures/wordle)
- Card Crawl Adventure (roguelike deckbuilder, TinyTouchTales): 55,000 downloads in a month (38k App Store, 17k Google Play) with no paid acquisition, helped by an Apple feature and mailing list. — [GameDiscoverCo](https://newsletter.gamediscover.co/p/tiktok-practical-advice-for-big-discovery)
- Studio Folly (Gubbins): one TikTok video gave ~10k followers, 70k likes, 300k+ plays. — [GameDiscoverCo](https://newsletter.gamediscover.co/p/tiktok-practical-advice-for-big-discovery)
- Streaming described as indie devs' top way to convert eyeballs to sales; tactic is free keys to streamers (PC-oriented). — [Wireframe](https://wireframe.raspberrypi.com/articles/no-budget-no-problem-harnessing-the-power-of-streamers-for-free)
- Mobile discoverability is worse than ever and UA is expensive; indie success is the exception. — [MobileGamer.biz](https://mobilegamer.biz/indie-publishing-is-in-a-really-weird-place-on-mobile-so-is-tiktok-the-answer/)

### Inferences
- Share card: text/emoji grid of the daily run (e.g. "Wumpus Daily #123: level 7, 4,210 pts" with a map-trace in emoji) plus store link; implementable with the native Share sheet at near zero cost.
- A same-seed "challenge a friend" link (deep link with seed + score to beat) is the natural extension; fits "seeded shareable runs".
- Streamer-friendly: seed display, fast restart, and clean on-screen state.

### Gaps
- No conversion/install-lift numbers for share cards or challenge links in mobile; no data on challenge-a-friend effectiveness.

## Impact vs. cost ranking for a solo dev (synthesis; judgment, evidence quality noted)

1. Analytics + Crashlytics (Firebase) — cost very low, enables everything else; evidence: free tier confirmed.
2. Improved FTUE (interactive 1-3 level tutorial) + funnel events — low-medium cost; high expected D1 impact; evidence generic.
3. Daily seeded challenge with per-day leaderboard and share card — medium cost; best precedent (Wordle, Spelunky, StS); no measured uplift.
4. Streak counter + local notification for daily — low cost once daily exists; vendor evidence only; ask permission after first completed daily.
5. Meta-progression: unlock the 4 characters via achievements/cumulative goals, simple achievements list — low-medium cost; roguelite precedent qualitative.
6. Remote Config tuning and A/B tests — low cost, valuable only once there are enough users (inference).
7. Later/low priority: endless/difficulty modes, ghost replays, seasons, currency/collections — higher cost, no evidence found.
