# Competitor teardowns for Wumpus Adventures (snapshot: 2026-10-12)

Method note: Google Play pages and AppBrain returned empty/403 to the fetch tool, so Google Play installs/ratings are mostly NOT verified. App Store data was read directly from listing pages (those pages show no absolute "as of" date for rating counts, so treat counts as the snapshot the page served on 2026-10-12). Verbatim user reviews could not be retrieved for most titles; quotes below are only ones actually seen in sources. No revenue source was found except AppGoblin estimates for one minor minesweeper app.

## 1. Which comparables are genuinely relevant, and how big is the direct niche?

### Takeaway
The closest mechanical match (Minesweeper-style hints + dungeon + fog) has no popular, well-reviewed mobile incumbent that I could verify; the niche is occupied by obscure apps. Wumpus competes mostly with (a) generic ad-supported Minesweeper apps for the hint-puzzle audience and (b) premium roguelike puzzle titles (Hoplite, Card Crawl, Dungelot, Shattered Pixel Dungeon, Slay the Spire, Dicey Dungeons) for the "roguelite" audience.

### Cited Findings
- Search for Minesweeper+dungeon hybrids found: MineSweeper: Dungeon Warrior (Android, package com.feishu.sweeper, v1.1.3, last update Mar 3 2020, 925 downloads on Uptodown, 0 reviews) — [Uptodown](https://minesweeper-dungeon-warrior.en.uptodown.com/android)
- Minesweeper Universe (LITE Games, Hamburg; 2016; iOS+Android; 4 worlds, daily quests, power-ups, "5 modes") — [PCTechMag](https://pctechmag.com/2016/03/minesweeper-universe-released-for-ios-and-android/); I did not verify it is still listed or its current stats.
- The viral browser game "Dragonsweeper" has no confirmed official mobile release; one App Store listing may be an unverified name-squat, and fan clone DungeonSweeper (itch.io; 15 classes, 90+ items, 100+ achievements; HTML5) plans an Android port only "maybe once I hit 1.0" — [itch.io comments](https://cnava.itch.io/dungeonsweeper/comments?before=22), [puzzle-game.io](https://puzzle-game.io/game/dungeonsweeper)
- PC-only hybrids on Steam: Dungeon Sweeper (2026), Dungeon Minesweeper (2024), DemonCrawl — [Steam Dungeon Sweeper](https://store.steampowered.com/app/3282820), [DemonCrawl](https://store.steampowered.com/app/1141220/DemonCrawl/)
- Desktop Dungeons mobile launched May 2015 on iPad/Android tablets only at about $9.99, Metacritic 82; no current mobile listing/stats found, so excluded — [Pocket Gamer](https://www.pocketgamer.com/articles/065537/r/), [PCWelt](https://www.pcwelt.de/?p=1153154)

### Inferences
- A polished mobile Minesweeper-dungeon hybrid is a thin-competition niche (opportunity), though DemonCrawl/Dragonsweeper-style clones show PC/web demand exists.

### Gaps
- Dragonsweeper's real popularity numbers and any legit mobile port; Minesweeper Universe's current status.

## 2. Teardowns (A: Minesweeper; B: Hunt the Wumpus; C: dungeon-crawl hybrids; D: acclaimed roguelike puzzlers with mobile ports)

### Takeaway
Premium one-time purchase ($3.99-$9.99, no IAP) is the norm for acclaimed roguelike puzzlers; free+ads+one unlock IAP is the norm for Minesweeper and Card Crawl. Standouts have localization (16-28 languages for Card Crawl, Dicey Dungeons, ™ Minesweeper), daily/challenge modes, Game Center leaderboards/achievements, and large content volume.

### Cited Findings

**A1. "Minesweeper" (VM Mobile Team): classic minesweeper**
- Free with ads ("Contains: Advertising"); IAP "Premium" $3.99; rating 4.5 from 752 ratings; latest version 2930 (released Apr 13, year not shown); 28 languages; iPhone/iPad/Mac/Vision; themes, undo, hints, optional question marks, quick flagging, zoom, global leaderboards, Game Center achievements, sharing, save/load — [App Store](https://apps.apple.com/app/id1101590054)
- Sampled reviews seen were 2016 and positive nostalgia ("Awesome app!!! I used to love to play this game growing up." — Stardance56) — [App Store](https://apps.apple.com/app/id1101590054)
- Play Store installs: NOT verified. I could not verify that this is the top-grossing/top-installed Minesweeper; no credible chart source found.
- Market data point: "Minesweeper 2026" (Picology inc.) ~72K installs, 1.4K ratings avg 4.57, 100% ads (Google, AppLovin, InMobi), no IAP, est. revenue under $10K/month, updated Oct 5 2026 (AppGoblin third-party estimate) — [AppGoblin](https://appgoblin.info/apps/976995149)
- Quality spread: an older "Minesweeper·" (PPCLINK) is 2.8 from 22 ratings; reviews cite long-press flagging trouble and no tutorial — [App Store](https://apps.apple.com/app/id1037944088). A guide notes Android has heavier ads and most apps use long-press to flag — [minesweeper.now](https://minesweeper.now/blog/minesweeper-for-mobile-differences-between-android-and-ios-versions) (promotional site).
- Ad-free options exist: Everyday Minesweeper (iOS, new, no ads/IAP) — [mwm.ai](https://mwm.ai/apps/everyday-minesweeper/6784740045)
- Learn: undo/hints/themes/global leaderboards are table stakes; flagging UX is the most-complained element.

**A2. Minesweeper Universe (LITE Games, 2016) and MineSweeper: Dungeon Warrior (2020)**
- Universe: 4 worlds, daily quests, power-ups, iOS 8+/Android 4.4+, 112 MB, pricing not stated — [PCTechMag](https://pctechmag.com/2016/03/minesweeper-universe-released-for-ios-and-android/). Dungeon Warrior: a monster may hide under each tile and you fight it on reveal; effectively abandoned — [Uptodown](https://minesweeper-dungeon-warrior.en.uptodown.com/android).
- Learn: the roguelike-minesweeper mix exists on mobile but without traction; the opening is unclaimed, not proven.

**B. Wumpus Cave (Jeffrey Scott Watters): direct Hunt-the-Wumpus descendant**
- iOS only, free, "No ads", no IAP listed, v1.4 dated 05/02/2025 (5 Feb 2025), English only, 28.7 MB, iOS 15+, too few ratings to show an overview, no accessibility features declared; pitch-dark maze, find treasure+key, bottomless pits, multiple wumpus handled with a "grimble" — [App Store](https://apps.apple.com/qa/app/wumpus-cave/id6475701023)
- Other: WumpusWorld (Adaptelligence, iPad, since 2013, few ratings) — [App Store](https://apps.apple.com/app/id688720647). No named Android Hunt-the-Wumpus app confirmed.
- Learn: the literal Wumpus lineage on mobile is hobbyist-grade and unrated, so the name is no moat; polish and retention features are the differentiator.

**C1. Dungelot: Shattered Lands (Lazy Bear Games; App Store seller tinyBuild)**
- iOS release Jan 21 2016, Android July 4 2016 (GamePressure, via search summary); App Store $3.99, 4.2 from ~400 ratings, no IAP listed, 404 MB, English only, 3 worlds, 4 characters, 18 dungeons, mini-games, side-quests, bosses, Game Center leaderboards+achievements; last version on page 1.371 (07/01/2016), i.e. effectively dormant — [App Store](https://apps.apple.com/app/id1034658841)
- Original Dungelot (Red Winter Software): Flash 2012, iOS Jan 2013, Android Feb 2013; tap tiles to reveal, defeat key-holding enemy then find door, permadeath, unlockable characters with perks; Metacritic iOS 83 (8 reviews); TouchArcade 4/5 — [Wikipedia](https://en.wikipedia.org/wiki/Dungelot)
- A third-party AI summary (Marlvel, Apr 18 2026) mentions stability complaints; low reliability — [Marlvel](https://marlvel.ai/apps/dungelot-shattered-lands)
- Google Play stats: NOT verified.
- Learn: the tap-to-reveal dungeon grid is the closest proven mechanic; it sells as a premium roguelike with unlockable characters/perks, and has been stale since 2016.

**D1. Hoplite (Douglas Cowley / Magma Fortress)**
- $3.99 iOS, 4.7 from 790 ratings, v2.8.65 (10/22/2025), no IAP listed, 40.8 MB, English only, Game Center leaderboards+achievements; Quest Mode with upgrades and procedural levels; Challenge Mode with a daily challenge plus preset challenges at two difficulties; "designed to be hard, yet fair" — [App Store](https://apps.apple.com/app/hoplite/id782438457)
- Metacritic 88% (6 critics); TouchArcade: "It's very simple to learn, but there's a huge amount of depth to the game." Criticism: punishing difficulty (D+Pad), repetition/missing RPG depth (TapTap) — [Wikipedia](https://en.wikipedia.org/wiki/Hoplite_(video_game)), [TapTap](https://www.taptap.io/post/1605033)
- Android package com.magmafortress.hoplite exists; Play price/stats NOT verified.
- Learn: tiny app size, deterministic tactical info, short runs, daily challenge: the model for small but sticky. Still updated in late 2025.

**D2. Card Crawl (Arnold Rauers / Tinytouchtales)**
- Free with ads and IAP: "Unlock Card Crawl" $4.99, "Challenge Season Unlock" $0.99; 4.7 from 2.1K ratings; v2.4.20 (Feb 16, year not shown); 17 languages; 4 single-player modes, 35 unlockable ability cards, Game Center score comparison, 2-3 minute games; sequel Card Crawl Adventure also free+IAP — [App Store](https://apps.apple.com/us/app/card-crawl/id950955524), [Adventure listing](https://apps.apple.com/app/id1571091032)
- Earlier paid history: 1.99 EUR in German App Store, later 0.99 and temporarily free — [appgefahren](https://www.appgefahren.de/?p=158553)
- PocketGamer review on replay value: "there's not a huge amount to do here, and once you've beaten the game of monster Patience a few times there's a chance that you won't come back for more" — [PocketGamer](https://www.pocketgamer.com/card-crawl/review/); TouchArcade calls it a go-to game since 2015 — [TouchArcade](https://toucharcade.com/?p=295953)
- Learn: free-to-try + $4.99 one-time unlock + $0.99 seasonal challenge is a proven low-friction model for a 2-minute puzzle game; weak replay is the cited risk.

**D3. Shattered Pixel Dungeon (Evan Debenham)**
- iOS $4.99, 4.9 from 4.2K ratings, no IAP, v4.0.2 (listed about 5 days before 2026-10-12; 4.0.1 dated Oct 3), 140 MB, six heroes, randomized dungeons, regular updates, open-source based on Watabou's Pixel Dungeon, English listed on App Store — [App Store](https://apps.apple.com/us/app/shattered-pixel-dungeon/id1563121109)
- Android: a search summary of AppBrain (snapshot Mar 23 2026, v3.3.8) cited "more than 5 million installs" and ~4.89 from ~4,000 ratings; Steam 95% from ~2,118 reviews. These are second-hand and unverified by me — [AppBrain](https://www.appbrain.com/appstore/shattered-pixel-dungeon/ios-1563121109)
- Learn: benchmark for long-tail roguelite retention: continuous free updates, deep meta (heroes, challenges), no ads.

**D4. Slay the Spire (MegaCrit; mobile port by Balor Games / Good Games Group)**
- $9.99 iOS, 4.3 from 3.2K ratings, v2.6.0 (08/05/2025), no IAP, 933 MB, English listed; Android $9.99 (AppBrain 4.25 from ~3.2K) — [App Store](https://apps.apple.com/us/app/slay-the-spire/id1491530147), [AppBrain](https://www.appbrain.com/appstore/slay-the-spire/ios-1491530147)
- Cloud saves work between mobile devices; no cross-save with PC — [Attack of the Fanboy](https://attackofthefanboy.com/reviews/slay-the-spire-android-review/); TouchArcade: touch targets barely changed, making iPhone harder than iPad — [TouchArcade](https://toucharcade.com/2020/06/13/slay-the-spire-ios-impressions-available-now-price-download-android-coming-later/)
- Source conflict on Android date: Android Police reports Feb 2021; AppBrain says on Play since June 2020.
- Learn: strong IP can charge $10; small-screen tap targets are the known weak point.

**D5. Dicey Dungeons (Terry Cavanagh / Distractionware)**
- $4.99 iOS and Android, no IAP, free Reunion DLC (4-5 hours, six episodes) included at the July 2022 mobile launch; iOS 4.6 from 221 ratings; v2.1.6 (Jul 30, year not shown); 16 languages; 883 MB — [App Store](https://apps.apple.com/app/id1368013995), [TouchArcade](https://toucharcade.com/2022/07/07/dicey-dungeons-mobile-download-out-now-ios-android-price-reunion-dlc-steam-switch-xbox/); TouchArcade reviewed the port as nearly perfect.
- Learn: acclaimed premium ports earn modest mobile rating volume (221), so do not expect premium to be a volume play.

### Inferences
- No credible revenue estimates exist for premium titles; the only figure is under $10K/month for a small ad-only Minesweeper (AppGoblin estimate). Do not extrapolate.
- iOS rating counts (200 to 4.2K) are a rough proxy for niche premium reach, not downloads.
- Verified complaint themes: replay value (Card Crawl), difficulty/repetition (Hoplite), small touch targets (StS), flagging UX and no tutorial (generic minesweeper). Broader review mining (Play reviews, Reddit, YouTube) was not possible with available tools.

### Gaps
- Google Play installs/ratings for every title; exact release dates for several; Reddit/YouTube sentiment; verbatim negative reviews; ad placement specifics and IAP prices other than Card Crawl and ™ Minesweeper; identity of the top-grossing mobile Minesweeper.

## 3. Feature-gap matrix

Legend: Y yes, N no, P partial, ? not verified from fetched sources (do not read as "No"). "Wumpus" column per the brief.

| Feature | Wumpus Adventures | ™ Minesweeper | Wumpus Cave | Dungelot SL | Hoplite | Card Crawl | Shattered PD | Slay the Spire | Dicey Dungeons |
|---|---|---|---|---|---|---|---|---|---|
| Daily challenge | N | ? | N | ? | Y | P (Challenge Season IAP) | ? | ? | ? |
| Achievements | N | Y (Game Center) | N | Y | Y | ? | ? | ? | ? |
| Unlockables | P (4 cosmetic chars) | P (themes) | N | Y (characters/perks) | Y (upgrades) | Y (35 ability cards) | Y (6 heroes) | ? | ? |
| Multiple modes | N | Y (levels, custom) | N | ? | Y (Quest, Challenge) | Y (4 modes) | ? | ? | ? |
| Tutorial | Static instructions | complained absent (other app) | ? | ? | ? | ? | ? | ? | ? |
| Leaderboards | Local best + global top-10 | Y global | N | Y | Y | Y (Game Center) | ? | ? | ? |
| Cloud save | N | save/load only | N | ? | ? | ? | ? | Y (mobile only) | ? |
| Localization | English only | 28 languages | English | English | English | 17 languages | English on App Store | English on App Store | 16 languages |
| Themes/skins | Cosmetic chars | Y themes | N | ? | ? | ? | ? | ? | ? |
| Undo/hints | Counted hints | Y both | ? | ? | ? | ? | ? | ? | ? |
| Monetization | None | Free + ads + $3.99 Premium | Free, no ads | $3.99 premium | $3.99 premium | Free + ads, $4.99 unlock, $0.99 season | $4.99 premium | $9.99 premium | $4.99 premium |
| Social sharing | N | Y | N | ? | ? | ? | ? | ? | ? |

### Inferences
- Largest gaps vs peers: daily challenge, achievements, tutorial, localization, and any monetization. Hoplite is the closest retention template (daily challenge + leaderboards + small size); Card Crawl is the closest monetization template (free + one-time unlock + cheap seasonal IAP).

### Gaps
- Cells marked "?" need direct store/gameplay checks.
