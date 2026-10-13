# Run structure and engagement design for mobile roguelites / puzzle roguelites

Overall evidence quality: THIN. Searches returned mostly listicles, forum posts and vendor blogs. No GDC talk, postmortem or developer interview with run-length, retention or push-your-luck numbers was found for Hoplite, Peglin, Dicey Dungeons, Card Crawl, Dungelot, Balatro mobile or Dead Cells mobile. Search tool calls were also limited (about 13). Treat everything under "Inferences" as hypothesis.

## Run length and session length

### Takeaway
Mobile sessions are short (median about 5-6 min, top quartile 8-9 min per GameAnalytics), but successful roguelites still run 20-40 min per run and are played across several sessions. Evidence supports "runs must be pausable / sessions must end cleanly in 5-10 min", not necessarily "runs must be 3-5 min". No hard data was found comparing micro-runs with long runs.

### Cited Findings
- GameAnalytics 2025 benchmarks (2024 data): average session length top 25% of projects 8-9 min, median 5-6 min; about 4 sessions/day on average; midcore projects have the most sessions (6-7/day); median daily playtime about 22 min. (Vendor benchmark, all genres, read via secondary summary.) — [GameDev Reports summary](https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks)
- GameAnalytics Q1 2024: global median session length 4.45 min; casino/card reach up to 25 min in some European markets; puzzle is stable but below "classic" genres on retention. (Secondary summary, not primary PDF.) — [investgame.net Q1 2024](https://investgame.net/news/pdf/mobile-gaming-benchmarks-for-q1-2024/), [2025 PDF](https://investgame.net/wp-content/uploads/2025/02/2025-GameAnalytics-Mobile-Gaming-Benchmarks.pdf)
- Dicey Dungeons runs: about 20-40 min per player reviews, versus 2+ hours for Slay the Spire; reviewers note novelty fades once all classes are unlocked, and a steep late difficulty spike. (Anecdotal user comments.) — [itch.io comment](https://itch.io/post/2359564), [GameSpot review](https://www.gamespot.com/reviews/dicey-dungeons-review/1900-6417267/), [Giant Bomb blog](https://Www.Giantbomb.com/profile/laughingman/blog/ranking-of-roguelikes-3-dicey-dungeons/260870/)
- Vampire Survivors: a run is roughly 30 min or less (listicle claims). — [G2A](https://www.g2a.com/news/features/games-that-dont-require-long-play-sessions/), [Udonis roundup](https://www.blog.udonis.co/top-games/roguelite)
- Balatro about 20-30 min and Brotato 15-25 min per a consumer listicle (not developer data). — [Two Average Gamers](https://www.twoaveragegamers.com/best-roguelikes-short-sessions/)
- Shattered Pixel Dungeon: 26 floors in 5 regions, designed for mobile; one reviewer of its predecessor won about 5 of 500-700 runs. (Review, not developer interview.) — [GamingOnLinux](https://www.gamingonlinux.com/2021/10/hugely-popular-mobile-roguelike-shattered-pixel-dungeon-is-coming-to-steam/page=1/), [Mr Creosote review](https://goodolddays.net/en/game/Shattered-Pixel-Dungeon)
- Retention depth in PC roguelites: SNKRX dev (Aug 2021) reported Slay the Spire median playtime 34.7 h, 40% of players over 50 h, versus SNKRX median 5.1 h. Steam data, 2021, PC only. — [WN Hub summary](https://wnhub.io/news/marketing/item-4017)

### Inferences
- A 10-25 min expedition is in line with Dicey Dungeons / Balatro / Vampire Survivors (20-40 min) and above the mobile median session; the real risk is that a 1-3 min floor is a fine "stopping point" but only if the expedition can be suspended and resumed mid-run (verify the game saves per floor).
- A floor (1-3 min) already is the micro-session. Adding a separate 3-5 min micro-run mode is lower priority than making floor-level save/resume and the daily seed feel complete in one short session.

### Gaps
- No session or run-length data for Hoplite, Peglin, Card Crawl, Dungelot, Dead Cells mobile or Balatro mobile from developers; no source comparing micro-run vs long-run retention. Hoplite search returned irrelevant results.

## Push-your-luck / extraction mechanics

### Takeaway
Commentary says bank-or-push choices create tension and a stronger payoff, but no retention data was found. One developer warns that strong deduction hints can reduce the push-your-luck feel, which is directly relevant to a clue-based deduction game.

### Cited Findings
- Extraction loops are described as "bank-it-or-lose-it": reward grows with exposure and one bad outcome wipes it; an article argues front-loaded risk and back-loaded relief makes the payout land harder. (Opinion piece, no data.) — [Co-Optimus](https://www.co-optimus.com/blog/article-poster/3326/risk-timing-and-nerve-the-game-mechanics-that-test-when-to-cash-out.html), [CogConnected 2026](https://cogconnected.com/2026/08/how-extraction-loops-changed-reward-design/)
- Roguelike examples with cash-out-or-push: Dice & Dare, Risk'Em All!, Bubbly (with permanent progression). — [Steam: Dice & Dare](https://store.steampowered.com/app/4927140/), [itch: Risk'Em All](https://bayblok.itch.io/riskm-all), [Deku Deals: Bubbly](https://www.dekudeals.com/items/bubbly)
- Developer of a card roguelike notes that if hints make you too good at deducing where enemies are, "you're not pushing your luck anymore." — [Mr Magpie devlog](https://giantlight.itch.io/mr-magpies-harmless-card-game/devlog/944370/qol-better-hints-balance-changes)

### Inferences
- In a deduction game, push-your-luck fits naturally at the floor boundary: "leave now with banked embers" vs "descend with a tougher floor". Also fits in-floor: guessing a 50/50 cell for a bonus.
- Hypothesis: a partial banking rule (keep a percentage of embers on death) is gentler than all-or-nothing and suits a broad mobile audience.

### Gaps
- No retention or A/B evidence for extraction mechanics; no examples found specifically in minesweeper-like puzzle roguelikes.

## Branching choices vs linear floors

### Takeaway
Slay the Spire's designers credit FTL for branching paths and say map navigation adds risk, reward and planning; critics say it often gives only the appearance of choice. No replayability measurements or solo-dev cost data found.

### Cited Findings
- Mega Crit (Road to the IGF): branching paths inspired by FTL; layered decision-making adds value. — [Game Developer](https://www.gamedeveloper.com/game-platforms/road-to-the-igf-mega-crit-games-i-slay-the-spire-i-)
- StS2 maps contain seven node types (normal/elite fights, rest, unknown, treasure, merchant, boss); rest site guaranteed before the boss, treasure at halfway. — [Untapped.gg guide](https://sts2.untapped.gg/en/guides/how-to-make-the-best-map-choices-in-slay-the-spire-2)
- A third-party developer notes the map became a template but is criticised for sometimes offering the appearance of a choice. — [itch.io devlog](https://itch.io/devlog/1022799/this-is-where-i-put-and-you-put-up-with-random-thoughts-of-mine-about-the-games-development.amp)

### Inferences
- A cheap version for this game: after each floor, offer a 2-way fork (e.g. "risky floor: bigger board, better relic" vs "safe floor / rest / shop"), using existing floor generation plus 1-2 new node types. Cost is mainly UI and balance, not new content.

### Gaps
- No evidence on the effect on replayability or on dev cost.

## Mid-run variety levers (biomes, modifiers, shops, events, curses)

### Takeaway
No sourced impact-per-effort comparison was found. Dicey Dungeons commentary shows variety through character-specific rules; novelty is reported to fade once everything is unlocked.

### Cited Findings
- Dicey Dungeons players say novelty wears off once every class is unlocked. — [Giant Bomb blog](https://Www.Giantbomb.com/profile/laughingman/blog/ranking-of-roguelikes-3-dicey-dungeons/260870/)
- StS-style maps use shops, rest and unknown/event nodes as variety (see above). — [Untapped.gg](https://sts2.untapped.gg/en/guides/how-to-make-the-best-map-choices-in-slay-the-spire-2)

### Inferences
- Ranking by likely effort/impact (my judgement, unsourced): (1) floor modifiers/rule twists every few floors (reuse the existing depth modifier code), (2) shop/rest node using embers or in-run gold, (3) events with curse-for-reward choices, (4) biomes with new tile rules (highest effort).

### Gaps
- No data on which levers move retention.

## Near-miss, "one more try", ethics

### Takeaway
The near-miss effect is documented in gambling research and used in game design; fast restart reduces the cost of retrying, but direct evidence tying restart speed to compulsion was not found.

### Cited Findings
- Near-miss: seeing a failure as nearly successful makes retry more likely; studied in gambling addiction. — [Eliens game patterns](https://math.vu.nl/~eliens/demo/pattern-nearmissindicators.html)
- "Temporal dark pattern" = designed to make you play longer than you otherwise would. — [Deceptive Patterns](https://deceptive.design/articles/dark-pattern-games-resource-for-gamers-wanting-to-avoid-dark-patterns/)
- Restart "scumming" in roguelikes is common when early luck is bad. — [Spelunky Wiki](https://spelunky.fandom.com/wiki/Scumming)
- Dicey Dungeons user complaint: losing near the finish to dice luck feels bad. — [Metacritic page](https://legacy.prod.metacritic.com/game/switch/dicey-dungeons)

### Inferences
- Ethical line (judgement): show honest progress ("3 cells from clearing", embers earned, best floor) and allow one-tap restart; avoid fake near-misses, loss-aversion timers, or streak guilt notifications. For a deduction game, losing to forced guesses feels unfair, so near-miss framing should be paired with fairness (guaranteed solvable openings).

### Gaps
- No ethics-framed studies of run summaries, ghost runs, or "X away from" messaging.

## Early game ramp and win-rate targets

### Takeaway
Slay the Spire 2 reportedly has about 25% overall and 16% Ascension 0 win rate (versus 9% A0 in the first game), so ~1 in 6 to 1 in 11 newcomers win; but this is a single-blog source. Balatro Ante 8 reach rates are widely reported 48-80% depending on platform.

### Cited Findings
- StS2: 240M runs, 25% overall win rate, 16% at Ascension 0 vs 9% in the original; sourced to a beginner guide quoting Mega Crit. Unverified against Mega Crit; the second article (gamegeeker) returned HTTP 403. — [Two Average Gamers](https://www.twoaveragegamers.com/slay-the-spire-2-beginner-guide/)
- Balatro "reach Ante 8" achievement rates: 48% (Epic), about 63% (Xbox), 67-78% (PSN), 80% (WeMod, Steam/Xbox mix). Platform and sample differ widely; the Steam-specific figure was not obtained. — [Epic](https://store.epicgames.com/achievements/balatro-f56b77), [Exophase Xbox](https://www.exophase.com/game/balatro-xbox/achievements/), [WeMod](https://www.wemod.com/en/cheats/balatro-trainers/achievements)

### Inferences
- Balatro's high Ante 8 rate suggests that a "first win within the first ~5 runs" target is plausible for a hit; the median-dies-at-floor-4-6 profile of this game is harsher than that of Balatro but similar to Slay the Spire A0.

### Gaps
- No data on the share of players dying in the first 3 minutes; no Act 1 death rates; no Hoplite data.

## Onboarding and D1 retention

### Takeaway
Only generic benchmarks found; no puzzle-roguelite onboarding case study.

### Cited Findings
- GameAnalytics 2024: top-25% D1 is 26.5-27.7%, median D7 3.4-3.9%, bottom-25% D1 10-11.5%; iOS D1 top 25% 31-33%. — [GameDev Reports](https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks)
- Q1 2024: global median D1/D7/D28 of 22.91% / 4.20% / 0.85%; North America top-25% puzzle D1 32.4%. (Secondary summary.) — [investgame.net](https://investgame.net/news/pdf/mobile-gaming-benchmarks-for-q1-2024/)
- Blog heuristic (not a study): D7/D1 ratio below 0.30 signals onboarding problems. — [gamedev.net](https://gamedev.net/blogs/entry/2298160-the-d7d1-retention-ratio-for-mobile-games-a-complete-guide)

### Inferences
- Use these as targets: D1 above about 25%, D7 above about 7% would put the game in the top quartile.

### Gaps
- No case studies of onboarding changes that lifted D1.

## Cheap social / competitive hooks

### Takeaway
The Wordle emoji share grid is the best-known cheap hook; magnitude claims are from secondary blogs and confounded by press. A small daily puzzle game's own writeup lists daily seed, streak flame, streak-at-risk email and daily leaderboard defaults but reports no results.

### Cited Findings
- Wardle added the spoiler-free share grid in Dec 2021 about two months after launch; daily players reportedly rose from thousands to millions by Jan 2022 (secondary, confounded by press). — [Dino Game blog](https://dinogame.gg/blog/how-wordle-was-made-in-5-days/), [The Spinoff](https://thespinoff.co.nz/media/13-01-2022/those-coloured-boxes-on-twitter-are-new-zealands-fault)
- Small daily puzzle game "one-and-done" fix: activation email after 48 h, win-back email, streak badge, streak-at-risk email, shared daily puzzle without account, leaderboard defaulting to Daily with player's own rank. No metrics yet. — [PeerPush](https://peerpush.com/blog/how-we-fixed-a-one-and-done-problem-on-a-daily-puzzle-game)
- A LiveOps vendor page lists metrics for streaks but gives no results (vendor-biased). — [Bruin](https://getbruin.com/use-cases/mobile-gaming/event-streak-mechanic-retention/)

### Inferences
- A text/emoji share card of the daily seed result (floors cleared, clue-grid pattern, no spoilers) is low effort. The game already has daily seed + streak; likely missing pieces are share card, a daily leaderboard (needs backend) and challenge links with the seed.

### Gaps
- No controlled D1/D7 uplift for daily streaks or share cards; no data on ghost runs.

## What this game appears to lack (inference from the brief, not from sources)
1. In-run decisions beyond relic draft: no map fork, shop, rest, event, or descend-vs-bank choice.
2. Mid-run rule variety (biome/modifier changes every few floors) - depth modifiers exist only at the expedition level.
3. A shareable result and daily leaderboard.
4. Honest near-miss run summary plus instant restart (check whether present).
5. Possible early-ramp tuning for floors 1-3 given the median death at floors 4-6 (needs the game's own telemetry).
