# Genre landscape for Wumpus Adventures: Minesweeper-like deduction, puzzle roguelites, Wumpus-inspired titles

Research depth note: about 17 tool calls. Many store pages (Google Play, App Store, Sensor Tower) were not accessible, so install and revenue data is thin. Anything not cited is listed under Gaps.

## Which titles lead each sub-genre, with real numbers

### Takeaway
Hard numbers exist mainly for premium roguelite crossovers: Balatro, Slay the Spire and Shattered Pixel Dungeon. The "Minesweeper + dungeon" hybrid niche is populated by small, mostly free or indie titles with no verified large install counts. Dungelot is the only commercial veteran, and its numbers are modest.

### Cited Findings
- Balatro: 3.1M mobile downloads and $21.3M mobile revenue, per AppMagic data via GamesIndustry.biz, as reported by Pocket Tactics. The article does not state the period, and the figure appears to come from a 2026 report on 2025 trends. — [Pocket Tactics](https://www.pockettactics.com/premium-mobile-games-increase)
- Same article, other premium mobile revenue figures (period unstated): Slay the Spire $13.7M, Human Fall Flat $7.8M, Dead Cells $6.5M. — [Pocket Tactics](https://www.pockettactics.com/premium-mobile-games-increase)
- Premium mobile market context for 2025: premium releases up 77% to nearly 750 (AppMagic). Free-to-play took 96% of mobile downloads, leaving premium 4%. Premium releases were above 1,000 in 2022 and 422 in 2024. — [Pocket Tactics](https://www.pockettactics.com/premium-mobile-games-increase)
- Balatro: more than 3.5M units sold across platforms as of 13 Dec 2024. Mobile launched 26 Sept 2024 (PC and console debut was in February 2024). It earned $1M in its first week and about $4.4M on iOS and Google Play within two months. It won Mobile Game of the Year at The Game Awards. — [PocketGamer.biz](http://www.pocketgamer.biz/balatro-has-sold-over-35-million-copies/). Note the URL slug says "35 million", which conflicts with the page text of 3.5M. The slug may be a later update or a typo, so treat it as unresolved. A search snippet also references a PocketGamer.biz story titled "balatro has sold over 35 million copies", but I could not verify it.
- Statista lists Balatro mobile IAP revenue of more than $9M as of January 2025. PocketGamer.biz describes the game as premium with no IAP or ads, so this label looks wrong. — [Statista](https://statista.com/statistics/1546856/balatro-global-unit-sales)
- Slay the Spire on Android: released 3 Feb 2021 at $9.99. AppBrain lists version 2.6.0, 4.25 rating from 3,179 reviews, last update 5 Aug 2025. No install count was found. — [AppBrain](https://www.appbrain.com/appstore/slay-the-spire/ios-1491530147), [PocketGamer](https://pocketgamer.com/articles/085624/indie-roguelike-deckbuilder-slay-the-spire-releases-on-android-today)
- Shattered Pixel Dungeon: more than 5M Google Play installs (AppBrain overview shows about 6M). Rating about 4.78 from about 160K ratings. It is still receiving major versions in 2026. It is free and open-source style, and it reached Steam in 2022. — [AppBrain dev page](https://www.appbrain.com/dev/Shattered+Pixel/), [GamingOnLinux](https://gamingonlinux.com/2022/03/shattered-pixel-dungeon-arrives-on-steam-eight-years-later). The "still receiving major versions in 2026" claim comes from a search snippet and is unverified.
- Dungelot: Shattered Lands (Red Winter Software, published by tinyBuild; third in the series). The original Dungelot launched on iOS in 2013 and was called "the Minesweeper of roguelikes" by one review. Steam release was 18 Feb 2016 at $9.99. SteamSpy estimates 50,000 to 100,000 owners, a Metascore of 78, and 3 peak concurrent players on the day checked (old data). — [SteamSpy](https://steamspy.com/app/403940), [Game Critics](https://gamecritics.com/daniel-weissenberger/dungelot-review/)
- Hoplite: Pocket Gamer called it the best roguelike the reviewer had played on mobile, with an AV Club score of 8.0 (older reviews, no sales data). Dicey Dungeons mobile (about $4.99): TouchArcade called the port nearly perfect. — [PocketGamer](https://www.pocketgamer.com/hoplite/review/), [AV Club](https://www.avclub.com/mobile-review-of-the-week-hoplite-iosandroid), [TapSmart](https://www.tapsmart.com/reviews/dicey-dungeons-review/)
- Pocket Tactics and others currently name Into the Breach (mobile port), Balatro, Peglin and RogueSlide (a sliding-tile dungeon crawl on iOS and Android) among the notable mobile puzzle-roguelites. — [Pocket Tactics](https://www.pockettactics.com/best-mobile-roguelikes), [Pocket Gamer](https://www.pocketgamer.com/rogueslide/). This list comes from search summaries, not from the pages themselves.
- Plain Minesweeper clones on Google Play have small numbers in the sources I found: Classic Minesweeper (Junfeng Tech) has 1.2K all-time downloads per AppBrain, and Minesweeper - Classic Game (com.dado) shows 5,000+ installs. — [AppBrain](https://www.appbrain.com/app/classic-minesweeper/com.junfengtech.games.minesweeper), [APKCombo](https://apkcombo.com/minesweeper-classic-game/com.dado.Minesweeper/)

### Inferences
- The hard-numbers leaders are premium roguelites (Balatro, Slay the Spire, Shattered Pixel Dungeon). Revenue in the pure Minesweeper-hybrid niche appears to be at most low and indie-scale, judging from Dungelot's SteamSpy owner estimate and the absence of large figures anywhere else.
- Premium is a thin slice (4% of downloads), so a free-to-play or free-with-light-monetization model is the default for reaching volume.

### Gaps
- No verified Google Play install ranges or App Store ranks for Microsoft Minesweeper, Dungelot, Slay the Spire, Hoplite, Into the Breach or Dicey Dungeons. Store pages and Sensor Tower or data.ai were not accessible. The Microsoft Minesweeper figure in particular was not found.
- No data on current top-chart positions in Google Play or App Store puzzle or roguelike categories.
- Revenue for Dungelot, Hoplite and Dicey Dungeons was not found.

## Design pillars shared across the sub-genres

### Takeaway
Successful titles pair a tiny, learnable rule set with deep emergent decisions, short sessions and run-based replayability. Information-gathering from numeric clues (Minesweeper-style) is the core hook of the hybrid niche.

### Cited Findings
- Dungelot: each level is a 25-tile grid with monsters, a key, treasure or nothing. Finding the hidden key opens the next floor. Steam page lists 3 worlds, 4 upgradable characters, 18 dungeons, bosses, merchants and mini-games. This shows a meta-progression structure of upgradable characters and worlds. — [SteamSpy](https://steamspy.com/app/403940), [Game Critics](https://gamecritics.com/daniel-weissenberger/dungelot-review/)
- Dragonsweeper (Daniel Benmergui, free browser game on itch.io): clear a dungeon of monsters and defeat the dragon at the center. Clue numbers equal the summed level of monsters in adjacent tiles, rather than a mine count. It descends from Mamono Sweeper. Kyle Orland (Ars Technica) wrote about it in Feb 2025, said he was "mildly obsessed", and noted that Benmergui keeps changing the game. — [ThinkyGames](https://thinkygames.com/games/dragonsweeper) (via search snippet), [Waxy](https://waxy.org/2025/02/kyle-orland-on-the-genius-of-dragonsweeper)
- Balatro: a poker-hand puzzle roguelite structured as 24 rounds, building a joker set. — [Pocket Tactics](https://www.pockettactics.com/best-roguelike-games) (via search snippet)
- Dungeons & Miners (Angry Bugs, 2021) is a mining and action roguelike, not Minesweeper-based. A reviewer called it only partially successful. It condenses roguelike loops into a mobile-friendly format. — [TouchArcade](https://toucharcade.com/2021/09/04/toucharcade-game-of-the-week-dungeons-miners/) (via search snippet; the page returned 403 when fetched)

### Inferences
- Pillars: (1) a simple base mechanic with numeric or visual clues, (2) risk and resource management (HP, keys, arrows in the Wumpus case), (3) short runs of a few minutes, (4) a meta-layer (unlocks, characters, upgrades) for retention, and (5) pixel or minimalist art that is cheap to produce and reads well on small screens. Items 3 to 5 are my synthesis from the titles above, not directly sourced statements.

### Gaps
- No sourced numbers for typical session length, retention, or difficulty curve design in the genre.

## Recent breakout hits (2023-2026) and why

### Takeaway
Balatro is the clear breakout, followed by a wave of Dragonsweeper-derived free Minesweeper roguelikes in 2025. The Minesweeper-roguelike sub-trend is a grassroots itch.io phenomenon without verified commercial scale.

### Cited Findings
- Balatro: PC and console launch Feb 2024, mobile 26 Sept 2024, Mobile Game of the Year at The Game Awards, $21.3M and 3.1M downloads on mobile per AppMagic. — [PocketGamer.biz](http://www.pocketgamer.biz/balatro-has-sold-over-35-million-copies/), [Pocket Tactics](https://www.pockettactics.com/premium-mobile-games-increase)
- Dragonsweeper-inspired derivatives: Dungeon Squire (mvolution, descendant of Dragonsweeper, Android and browser; public beta 14 Feb 2025, 1.0 on 28 Feb 2025), DungeonSweeper (Smoketree Studios, paid on Steam, also on Google Play), RogueSweeper (Windows, Linux, Android), Dungeon Sweeper Roguelike (Godot, devlogs through July 2025). — [Dungeon Squire](https://mvolution.itch.io/squire), [DungeonSweeper devlog](https://cnava.itch.io/dungeonsweeper/devlog), [RogueSweeper](https://zapakitul.itch.io/roguesweeper), [Dungeon Sweeper Roguelike](https://devaosx.itch.io/dungeon-sweeper-roguelike)
- Dungeon Sweeper Plus (Setamo, with PLAYISM) was announced for PC in May 2026. Its original was a free itch.io game from 2023. The Gematsu article itself returned 403, so these details come from the search result summary. — [Gematsu](https://www.gematsu.com/2026/05/fantasy-globetrotting-minesweeper-game-dungeon-sweeper-plus-announced-for-pc)
- Premium-mobile tailwind: premium releases up 77% in 2025, with Balatro as a driver. — [Pocket Tactics](https://www.pockettactics.com/premium-mobile-games-increase)

### Inferences
- The Minesweeper-roguelike trend shows publisher interest (PLAYISM picking up a Minesweeper-style title), which suggests the formula can be monetized on Steam and consoles. Balatro's success shows that a simple, well-known rule base (poker) can break out on mobile.
- Likely reasons for the Balatro breakout (my inference, not sourced here): a familiar rule base, strong "one more run" feel and a premium price without ads.

### Gaps
- No download or revenue data for any 2025-2026 Minesweeper-roguelike titles. Coverage of why Balatro broke out was not retrieved in detail.
- Dragonsweeper has no verified Steam or store release in my sources.

## Minesweeper + RPG/dungeon hybrids on mobile and their performance

### Takeaway
Dungelot is the established commercial reference. Newer entries (Dungeon Squire, RogueSweeper, DungeonSweeper) are indie, free or low-priced, and there is no evidence of any large mobile hit.

### Cited Findings
- Dungelot (iOS 2013; Shattered Lands on Android, iOS and PC): described as "a hybrid of a roguelike RPG with Minesweeper mechanics", PC owners 50K to 100K (SteamSpy estimate). — [SteamSpy](https://steamspy.com/app/403940), [TechRaptor](https://techraptor.net/gaming/news/dungelot-shattered-lands-launching-on-ios)
- DungeonSweeper: "A Roguelike Minesweeper Adventure", with a dragon quest, 5 dungeons and a merchant between levels. — [itch.io](https://itch.io/t/5093196/dungeonsweeper-a-minesweeper-roguelike)
- Dungeon Squire: built for touch, shares dungeon seeds, procedurally generated maps. — [Dungeon Squire](https://mvolution.itch.io/squire)
- Dungeons & Miners is not a Minesweeper hybrid. — [TouchArcade](https://toucharcade.com/2021/09/04/toucharcade-game-of-the-week-dungeons-miners/)

### Inferences
- Dungelot, now about 10 years old, being the main commercial name suggests the niche has had few polished mobile entrants since.

### Gaps
- No store-verified install or rating data for any of these on Google Play or the App Store.

## Hunt-the-Wumpus-inspired titles

### Takeaway
I found no commercial app-store Wumpus-inspired game. Only small itch.io, GitHub and jam projects exist.

### Cited Findings
- Hunt the Beholder (itch.io, browser, mobile-compatible, Game Boy palette, procedural map). — [itch.io](https://hemetgo.itch.io/hunt-the-beholder)
- Hunt the Gwumbus, a Game Boy Color rethink of the text classic (devlog). — [itch.io](https://eric-c-wilder.itch.io/hunt-the-gwumbus/devlog/704399/rethinking-a-text-based-classic-for-game-boy-color)
- The Empress Must Die (Twine, partly Wumpus-inspired per search summary) and Cave Invader (pre-alpha, unfinished). — [itch.io](https://nturnergames.itch.io/the-empress-must-die), [IndieDB](https://www.indiedb.com/games/caveinvader)
- Many GitHub and teaching implementations exist (CS/AI course exercise). — [GitHub topic](https://redirect.github.com/topics/hunt-the-wumpus)

### Inferences
- The Wumpus brand is effectively unoccupied on mobile stores, but it also has little name recognition outside programming circles, so the "Wumpus" name is not a strong search hook.

### Gaps
- I did not search App Store or Google Play directly for "Wumpus" titles, so I cannot rule out small apps. No data on r/WumpusGame.

## Gaps and niches Wumpus Adventures could occupy

### Takeaway
There is room between the free, rough itch.io Minesweeper-roguelikes and the premium polished roguelites: a polished mobile-first deduction roguelite with probability hints, online leaderboards and quick runs.

### Cited Findings
- Most Minesweeper-roguelike derivatives are itch.io projects, in beta, or tied to PC. Dungeon Squire is the one explicitly mobile-focused; RogueSweeper and DungeonSweeper also list Android. — [Dungeon Squire](https://mvolution.itch.io/squire), [RogueSweeper](https://zapakitul.itch.io/roguesweeper), [DungeonSweeper devlog](https://cnava.itch.io/dungeonsweeper/devlog)
- Premium titles are 4% of mobile downloads but are growing in count. — [Pocket Tactics](https://www.pockettactics.com/premium-mobile-games-increase)
- Plain Minesweeper clones show small install numbers in the sources found, so competition on pure deduction is not about volume. — [AppBrain](https://www.appbrain.com/app/classic-minesweeper/com.junfengtech.games.minesweeper)

### Inferences
- Candidate niches (all my inference): (1) a polished touch-first deduction roguelite with global leaderboards and daily seeds (Dungeon Squire already shares seeds), (2) a Wumpus-themed brand with a unique shooting mechanic (limited arrows), (3) free-to-play with cosmetic or optional premium, given that F2P is 96% of downloads.
- Risk: the niche is small, and I found no evidence that any Minesweeper-roguelike has a large mobile audience.

### Gaps
- Unverified: whether leaderboards or daily challenges appear in competitors. No user-review mining (Reddit, store reviews) was done. No chart-position data. Further research should check Google Play and App Store listings directly for Dungelot, Dungeon Squire, DungeonSweeper, and Minesweeper by Microsoft/Google.
