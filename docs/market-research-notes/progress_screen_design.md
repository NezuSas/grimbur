# Progress / Stats Screen Design - Research Notes (2026-10-13)

Evidence quality: THIN. Web search returned mostly vendor blogs and SEO duplicates. Only a few items below are primary or peer-reviewed. Screen layouts of Wordle, Strava, Hades, Balatro, Vampire Survivors, Brawl Stars, Clash Royale, Chess.com were NOT verified from a source in this pass; those appear only in Inferences (from general knowledge, flagged).

## 1. Findings (cited)

**Streaks (Duolingo)**
- Duolingo's own blog: 7-day-streak learners are "3.6x more likely to complete their course" (no baseline given, correlational). A new post-streak animation raised new-learner 7-day retention by +1.7%. Equipping up to two Streak Freezes raised daily actives +0.38% and did not increase days off. Streak screen shows day count, milestone flame, "Protect your 3 day streak" with freeze slots (freeze refill sold for 400 gems). https://blog.duolingo.com/how-duolingo-streak-builds-habit/
- Q2 2026 investor coverage (secondary): DAU +23% to 58.7M; a one-time Streak Revival campaign had 15.4M learners revive streaks. https://pulse2.com/duolingo-daily-active-users-reach-58-7-million-as-retention-hits-record-84-and-social-accounts-top-1-billion-organic-impressions/
- Peer-reviewed: Silverman & Barasch, J. Consumer Research 49(6), 2023. Seven studies: intact logged streaks raise later engagement versus broken ones; the penalty for a broken streak is bigger when people blame themselves and smaller when the streak can be repaired. Authors suggest offering alternate ways to keep a streak going. (Abstract and press only; full text not read.) https://www.colorado.edu/business/faculty-research/2023/04/19/or-track-how-broken-streaks-affect-consumer-decisions and https://lerner.udel.edu/seeing-opportunity/lerner-professor-researches-how-streaks-motivate-us/
- Practitioner claims that long streaks turn into loss-driven anxiety come from a gamification consultant who sells a framework (not neutral). https://yukaichou.com/gamification-study/core-drive-8-loss-avoidance/

**Progress toward a milestone**
- Nunes & Dreze 2006 (J. Consumer Research 32(4)): car-wash cards needing 8 stamps; the card with 2 of 10 pre-stamped was redeemed by 34% vs 19% for the empty 8-slot card. Persistence tracks relative progress; effect stronger when a reason for the head start is given. Secondary summaries: https://coglode.com/nuggets/endowed-progress-effect and https://knowledge.wharton.upenn.edu/?p=5630 . The "endow 10-25%" rule is a consultant's reading, not from the paper.

**Rings / recaps / sharing**
- Apple: analysis of 140,000+ Apple Heart and Movement Study participants links closing rings to better sleep, heart health and wellbeing; associations only, company-sourced. Apple also ships limited awards and shareable stickers for closing rings. https://www.apple.com/au/newsroom/2025/04/get-active-with-apple-watch/
- Strava Year in Sport (since 2017) recaps all activities and surfaces trends users did not notice. https://escapecollective.com/a-year-of-strava-in-review/
- Spotify Wrapped: vendor blog claims 90M engaged in 2020 and a 21% rise in app downloads in the first week of December; company-sourced figures relayed by a vendor, unverified. https://www.idomoo.com/blog/why-spotify-wrapped-works-and-how-you-can-do-it-too/ ; Axios on the many copycats: https://www.axios.com/2023/12/08/spotify-wrapped-apps-marketing-copy

**GitHub contribution graph**
- Official docs: a calendar of squares, one per day, covering the last year; click a day for detail, select up to a one-month range. The docs do not describe shading or the empty-profile view. https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/managing-contribution-settings-on-your-profile/viewing-contributions-on-your-profile

**Roguelike stats**
- Slay the Spire 2 developer update (May 2026, via news aggregator): 240M runs, 25% overall win rate, win rate shown per ascension and per character. Third-party STS Tracker imports .run files to give run history and meta stats, which suggests the in-game history is not enough for players. https://gamegeeker.com/fr/news/slay-the-spire-2-may-neows-news-update?market=FR , https://ststracker.app/about . Nothing found for Hades, Balatro, Vampire Survivors.

**Charts with little data**
- Bar charts should start at zero; truncation distorts perceived effect size even when the axis is flagged (Tableau summarising a study). If the range is narrow, consider a dot plot or table. https://www.tableau.com/blog/truncating-y-axis-threat-or-menace and https://ar5iv.arxiv.org/html/1907.02035
- Empty-state guidance (Carbon, Wix, Cegid): explain why nothing shows, say when it will fill in, show what it will look like, give a next action. https://carbondesignsystem.com/patterns/empty-states-pattern/ , https://www.wix.com/studio/blog/empty-states-ux-design
- Dark patterns in games are documented broadly (1,496-game analysis), but nothing streak-specific. https://arxiv.org/pdf/2503.01828 , https://deceptive.design/articles/level-up-or-game-over-exploring-how-dark-patterns-shape-mobile-games

## 2. Inferences (mine, not sourced)

Per-app visuals (from general familiarity, UNVERIFIED here; check before copying):
- Wordle: four big numbers (played, win %, current streak, max streak) plus a horizontal bar guess distribution with the latest result highlighted; with zero games it shows zeros and empty bars. Motivates streak protection and a share grid.
- Duolingo: streak flame number plus a week row of ticked days; XP bars and a league table. Streak is the hero, charts are secondary.
- Strava/Apple Fitness: rings or weekly bars with a goal line; personal records as badges.
- Slay the Spire/Hades: run history list with character, result, ascension/floor and win rate; Chess.com: rating line graph, which needs many points.
- GitHub heatmap: the graph is useful because the grid is fixed, so sparse data just looks like a quiet year. This is the strongest model for sparse data: fixed slots, not fitted ones.

Design rules:
1. Zero points: no chart. Show a one-line promise ("Finish 3 runs to see your trend") and the lifetime counters that do exist.
2. 1-3 points: a list or big number, not a bar chart. Bars with fixed slot width and a zero baseline are acceptable only if shown as a fixed row of N empty slots filled left to right. Never stretch bars to fill the width.
3. Chart (trend) appears around 5+ runs; give a reference line for personal best, not a fitted y-axis.
4. Single big number wins when the story is "my best"; list wins when the story is "what happened"; calendar wins for "did I show up".
5. Streak features lift return rates in vendor and academic reports, but also create loss anxiety. Ethical line: streaks that forgive (freeze/repair earned by play, not sold), no guilt copy, no pressure notifications on the stats screen, no fake urgency, no selling of streak repair with a premium currency under a countdown. Endowed progress is fine when honest (a real head start with a stated reason); fake pre-filled bars with no reason are manipulative. Shareable cards are fine if opt-in and not loaded with guilt.

## 3. Recommendations for our screen (priority order)

1. **Lifetime header (always shown, no history needed)**: games played, wins, win rate, best floor, best score, current and best daily streak, from the counters. These are exact for all 26 games, so lead with them.
2. **Per-hero row**: victories per hero (counter exists) plus best score per hero only where known; show "-" otherwise.
3. **Recent runs list (not chart) while history is short**: row = hero icon, result icon (win/defeat), floor, score, personal-best marker (star on best floor/score). Title "Last N runs", not "History". With 1 run, show 1 row plus a ghost row "Your next run appears here".
4. **Honest backfill**: do not fabricate runs. Add one muted line when counters exceed stored runs: "Showing runs since [date]. Older games are counted in your totals but have no details." Never compute average floor or trend from the stored subset and label it lifetime. Label derived stats "last N runs". Win rate may use lifetime counters (wins/played) and is honest.
5. **Streak calendar, last 14 days**: fixed 14 slots, filled days vs empty days, today outlined. Requires per-day play data; if not stored before, start recording now and show earlier days as blank "not tracked" rather than missed. Do not show red misses.
6. **Trend chart only when >= 5 stored runs**: fixed-width bars (current fix is right), zero baseline, dashed personal-best line, last run highlighted. Below 5, show the list and "N more runs to unlock your trend".
7. **Next-milestone bar**: one bar (e.g. next achievement or next forge unlock), with real progress only; no artificial head start unless a stated reason.
8. **Shareable result card**: post-run, opt-in, shows hero, floor, score, result; low priority.
9. **Averages (average floor, average score)**: show only with >= 5 runs, labelled "last N runs".

## 4. Gaps

- No verified layout source for Wordle stats (NYT help page blocked), Strava, Apple Fitness, Hades, Balatro, Vampire Survivors, Brawl Stars/Clash Royale trophy road, or Chess.com rating graph; all were not found.
- No evidence isolating any single stats view (run list, weekly summary, personal-best marker, milestone bar) as raising retention in games. Duolingo numbers are company-reported and correlational; Spotify figures are vendor-relayed.
- No authoritative source on minimum data points for charts (Nielsen Norman, Datawrapper not found); the 5-run threshold is my judgment.
- Silverman & Barasch full text not read; effect sizes unknown.
- No data on how many players of a casual roguelite open a stats screen at all.
- Suggested follow-up: screenshot-based teardown (App Store/Steam screenshots, YouTube) of Wordle, Hades, Balatro, Vampire Survivors; read the Silverman & Barasch paper; check Duolingo's 2021 S-1.
