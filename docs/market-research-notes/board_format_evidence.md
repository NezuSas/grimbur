# Board format evidence for a mobile Minesweeper-style deduction roguelite (finite per-floor boards vs alternatives)

Research date: 2026-10-13. About 22 tool calls. Evidence is thin on hard engagement or retention data. Many sources were store pages or itch.io comments. Reddit, Hacker News, Ars Technica, Game Developer postmortems and Google Play were not reachable or not surfaced by search. No claim below comes from those sources unless a URL is given. Several other claims (for example the premise that Dragonsweeper "went viral" in 2025) could not be verified, and the search tool found no news article confirming it.

## Q1. Which successful games use finite fixed boards vs endless/scrolling formats?

### Takeaway
Every acclaimed or fast-growing title found in this niche (Dragonsweeper, Dungelot, Dungeon Squire, Rogue Sweeper, Desktop Dungeons, Hoplite, Slay the Spire) uses finite, bounded levels or a bounded run. The only clearly endless examples (Infinite Minesweeper by GRYKUBY, Infinity Sweeper) exist, and one has strong ratings, but it is monetised as a classic-Minesweeper score game. The roguelite "Infinity Sweeper" is rated only Mixed. I found no sales or download figures for any of these except Slay the Spire.

### Cited Findings
- Dragonsweeper (Daniel Benmergui, free HTML5 on itch.io): 4.9/5 from 2,188 ratings, 1,067 comments, pay-what-you-want. The page says "A minesweeper game that requires observation." — [itch.io](https://danielben.itch.io/dragonsweeper)
- Dragonsweeper starts with a level 15 dragon at the center of a 13x10 grid. This comes from a search-result summary, not the page itself, so it is moderately reliable. — [search summary on thinkygames](https://thinkygames.com/games/dragonsweeper)
- Dragonsweeper v1.1.10 (Feb 2025) added new monsters, UI and "basic mobile support". The author says mobile "will not be perfect unless the game is redesigned for the format." — [devlog](https://danielben.itch.io/dragonsweeper/devlog/882560/new-dragonsweeper-version)
- Dungeon Squire (itch.io, free, browser or Android) calls itself a "direct descendant" of Dragonsweeper, which is a spin on Mamono Sweeper. It has 4.6/5 from 19 ratings and an average session of "About a half-hour". The developer says it is "always solvable" with "only rarely guessing is required". — [itch.io](https://mvolution.itch.io/squire)
- DungeonSweeper (Smoketree Studios, Steam, released 2026-03-11, $12.99): 20 reviews, 80% positive per GG.deals. — [gg.deals](https://gg.deals/gb/game/dungeonsweeper/)
- Dungeon Sweeper Plus (Setamo/PLAYISM) started as a free itch.io game in 2023 and was announced for PC Steam in May 2026. The Gematsu page returned 403; this comes from a search snippet only. — [Gematsu](https://www.gematsu.com/2026/05/fantasy-globetrotting-minesweeper-game-dungeon-sweeper-plus-announced-for-pc)
- Rogue Sweeper (Mankind, Steam, 6 Mar 2023, $3.59): stage-based, 10 dungeons, each a grid of blocks, some dark. Only 4 reviews. — [Steam](https://store.steampowered.com/app/1588500)
- Dungelot: Shattered Lands: Steam "Mostly Positive" (about 278 reviews), OpenCritic 74, critic scores of 9/10 Gamezebo, 10/10 JayIsGames and 9/10 PocketGamer. Structure is 18 dungeons over three worlds, with randomly generated dungeons. Gamingtrend gave 80/100 on 2016-03-01. — [Steam sub](https://store.steampowered.com/sub/79077), [OpenCritic](https://opencritic.com/game/2335/dungelot-shattered-lands), [Gamingtrend](https://gamingtrend.com/reviews/dungelot-shattered-lands-review/)
- Desktop Dungeons mobile (May 2015) was "designed to be played in 10-minute sessions, or thereabouts", in a randomly generated dungeon. — [PocketGamer](https://www.pocketgamer.com/desktop-dungeons/desktop-dungeons-to-deliver-a-roguelike-experience-in-10-minute-sessions-out-now/)
- Hoplite (Magma Fortress, 20 Dec 2013, iOS/Android): fixed-size hex arena with small randomly generated maps. It began as a 7-Day Roguelike entry. No exact map size was found. — [Wikipedia](https://en.wikipedia.org/wiki/Hoplite_(video_game))
- Slay the Spire (branching node map, small encounters): over 1.5M copies by GDC 2019, and it grew through streamers (especially in China). — [GamesBeat](https://gamesbeat.com/slay-the-spire-passes-1-5-million-copies-sold/)
- Endless example: Infinite Minesweeper by GRYKUBY (iOS) has an endless board in 8x8 sectors. Rating is 4.7 from about 3.8K ratings. It is free with ads and IAP, from $1.99 to $69.99 gem packs. Modes are Endless, Hardcore and Timed. Review quotes include "It really is infinite" and "Good concept, too many ads". — [App Store](https://apps.apple.com/us/app/infinite-minesweeper-grykuby/id6476042029)
- Infinity Sweeper (Steam, $4.99, procedural boards that "grow larger and deadlier", boss every 4 stages, roguelite shop): Mixed, 59% positive of 259 reviews. — [Steam](https://store.steampowered.com/app/3161400/Infinity_Sweeper/)
- Other endless apps (SAPPER: Infinite Minesweeper, Minesweeper Eternal, InfiniSweeper) have 0 to 1 ratings, so no usable signal. — [App Store search results](https://appshunter.io/ios/app/sapper-infinite-minesweeper/id6774213261)

### Inferences
- The strong, popular roguelike-Minesweeper titles are bounded: one dungeon (Dragonsweeper) or discrete stages (Rogue Sweeper, Dungelot). The one roguelite built around growing boards that I could find (Infinity Sweeper) is Mixed. That is correlation across a tiny sample, not proof.
- Endless boards do well as a score or classic mode (GRYKUBY), but that app's feedback centres on ads and monetisation, not on format.
- Nothing found argues that a finite 5x8 to 8x12 board is a weaker choice.

### Gaps
- No download counts or revenue for Dragonsweeper, Dungelot, Dungeon Squire or the others. Hoplite, Peglin and Into the Breach evidence not found.
- Ars Technica or other press coverage of Dragonsweeper not found. The "2025 phenomenon" is supported only by itch.io rating and comment counts.
- Dragonsweeper grid size is from a third-party summary and not re-verified on the official page.

## Q2. What do players and critics say about board size, floor length, repetition, luck and no-guess?

### Takeaway
Luck and forced guesses are the most common complaint across this genre. Developers respond with "always solvable" promises or by adding information tools. Repetition across many floors is the main critic complaint about Dungelot. I found no specific complaint that boards are too small.

### Cited Findings
- Dragonsweeper commenters: "It took many attempts, and more than a few... educated guesses?" (JugglerofDooom), "luck into a very scrollful seed" (hecko), "Abbietheapple: It's really hard to clear them." — [itch comments](https://danielben.itch.io/dragonsweeper/comments?before=873)
- Dragonsweeper: first win reportedly takes around 3-4 hours per one commenter, some say certain positions force guesses, and the "Rat Pacifist" achievement is called luck-dependent. — [itch.io page](https://danielben.itch.io/dragonsweeper)
- A critical Dragonsweeper comment says it feels like "a puzzle game like memory cards and not a puzzle game like minesweeper"; another notes you may "need to get lucky with a few early randoms". — [itch comments (via search summary)](https://danielben.itch.io/dragonsweeper/comments?before=48)
- Dragonsweeper devlog commenter says the update made difficulty lean on learning monster patterns, with less pure number deduction. — [devlog](https://danielben.itch.io/dragonsweeper/devlog/882560/new-dragonsweeper-version)
- Dungeon Squire developer: "always solvable", guessing "only rarely"; one player still found it "rather luck based". A player also asked for auto-save because finishing a level in one sitting is hard on mobile. — [itch.io](https://mvolution.itch.io/squire)
- Dungelot critic: "Having to retry the same 30 floors over and over gets tiring." "Frustration increases with number of dungeon floors." Also: it "rewards you for skill more than it ruins you with bad luck." — [Gamingtrend](https://gamingtrend.com/reviews/dungelot-shattered-lands-review/)
- Another Dungelot critic noted that only the longest late-game dungeons take more than a few minutes. (From a search summary, reviewer not named.) — [Steam sub](https://store.steampowered.com/sub/79077)
- Infinity Sweeper critique (GameGeeker): meaningful innovation usually has to happen around classic Minesweeper's core logic. I could not load the page (403), so this is a search-snippet paraphrase. — [GameGeeker](https://gamegeeker.com/news/infinity-sweeper-roguelike-plus-minesweeper-review?country=US)
- Competitors market on no-guess boards: Mines+ ("every board is solvable without guessing"); a Go CLI states only 13 of 200 random Expert boards are solvable without guessing. — [Hunted](https://www.hunted.space/product/mines-plus), [pkg.go.dev](https://pkg.go.dev/github.com/TF0119/minesweeper)

### Inferences
- The player-facing risk for Wumpus Adventures is guess-forced floors and repetition over 10 floors, not board dimensions.
- "Always solvable" is a selling point worth stating in store copy and enforcing with a solver check.

### Gaps
- r/Minesweeper, r/roguelikes, Steam review text, and Hacker News threads could not be retrieved. No Reddit quotes. No "too long" or "too short" floor-length quotes found for the genre.

## Q3. Do endless modes raise retention, and what do postmortems say about run and floor length?

### Takeaway
I found no retention or session data comparing endless against finite modes, and no postmortem of a puzzle roguelite on floor or run length. Only anecdotal design statements exist.

### Cited Findings
- Dungeon Squire averages "About a half-hour" per run, and Desktop Dungeons mobile targeted about 10-minute sessions. — [itch.io](https://mvolution.itch.io/squire), [PocketGamer](https://www.pocketgamer.com/desktop-dungeons/desktop-dungeons-to-deliver-a-roguelike-experience-in-10-minute-sessions-out-now/)
- Listicle-level figures: Brotato waves run 60-90 seconds with a run of about 20-25 minutes; Vampire Survivors fixes runs at 30 minutes. Low-quality sources. — [Two Average Gamers](https://www.twoaveragegamers.com/best-roguelikes-short-sessions/)
- GRYKUBY endless Minesweeper uses sector-based "chunks" with Endless, Hardcore and Timed modes, i.e. endless plus time-limited variants. — [App Store](https://apps.apple.com/us/app/infinite-minesweeper-grykuby/id6476042029)
- Slay the Spire's growth is attributed to streamers, not map format. — [GamesBeat](https://gamesbeat.com/slay-the-spire-has-china-to-thank-for-launching-its-700000-sales-in-steam-early-access/)

### Inferences
- Wumpus Adventures' 1-3 minute floors and roughly 10-30 minute expeditions sit at or below the observed bands (10 min to 30 min). That fits mobile session norms.
- An endless mode is plausibly best as a secondary mode (the genre's endless apps present it as the main product only for classic Minesweeper).

### Gaps
- No Game Developer or GDC postmortem found on board format. No retention figures anywhere.

## Q4. Board-size ergonomics on phones

### Takeaway
Top Minesweeper apps handle large boards with pinch-zoom, pan, overview maps and long-press tuning, not with a fixed small board. Specific minimum tile sizes were not found in any source.

### Cited Findings
- Minesweeper apps list 1x/2x/3x zoom modes, an overview mode for jumping around big boards, drag-to-pan and pinch-to-zoom. Custom boards go up to 72x72 in one app and 30x30 in another. These are developer claims. — [Minesweeper X](https://apps.apple.com/us/app/-/id444449278), [Minesweeper XL](https://apps.apple.com/app/id1067644217)
- Accidental taps are handled by tap-to-open and long-press-to-flag, adjustable long-press timing, a Quick Flag mode and undo. — [Minesweeper XL](https://apps.apple.com/app/id1067644217)
- minesweeper.now blog (self-promoting): the most common tablet mistake is revealing a mine when meaning to flag, and pinch-zoom costs scrolling. — [blog](https://minesweeper.now/blog/how-to-play-google-minesweeper-on-an-ipad-or-tablet-touchscreen-tips)
- Dragonsweeper's author says its mobile support is basic and would need a redesign for the format. A mobile commenter requested an on-screen button to toggle mark mode. — [devlog](https://danielben.itch.io/dragonsweeper/devlog/882560/new-dragonsweeper-version), [comments](https://danielben.itch.io/dragonsweeper/comments?before=873)

### Inferences
- Zoom and pan exist because classic boards are large; a fit-to-screen 5x8 to 8x12 grid with 28-45 dp tiles avoids needing them. Platform guidance (Apple about 44 pt, Material 48 dp) is from my background knowledge and was not verified here, so 28 dp tiles are below it; mitigations in the sources are undo, a mark-mode button, and adjustable press timing.

### Gaps
- No usability studies or reviews quantifying mis-tap rates. I did not check user reviews of these apps.

## Q5. Non-rectangular, themed or variable boards

### Takeaway
Evidence is thin. Variation in this genre comes mostly from tile content, themes and hazards rather than board shape.

### Cited Findings
- Rogue Sweeper varies dungeons with darkness (only a few blocks visible) and some "hard to solve" layouts, plus tools such as a Dynamite Detector and Compass. — [Steam](https://store.steampowered.com/app/1588500)
- Dungelot uses random dungeons across three worlds, with mini-bosses and a final boss per area. — [Gamingtrend](https://gamingtrend.com/reviews/dungelot-shattered-lands-review/)
- Hoplite uses a fixed-size hex arena with lava and rock tiles. — [Wikipedia](https://en.wikipedia.org/wiki/Hoplite_(video_game))
- A Dragonsweeper commenter says a later version had "more common monsters and fewer blank spaces". — [devlog](https://danielben.itch.io/dragonsweeper/devlog/882560/new-dragonsweeper-version)

### Inferences
- Cheap variety levers present in the examples: fog or darkness, tile content density, per-world themes and bosses. These do not require changing board shape.

### Gaps
- No evidence on how irregular shapes or obstacle layouts affect difficulty or reviews.

## Q6. What does Dragonsweeper teach?

### Takeaway
Dragonsweeper is one big bounded board (13x10, a boss dragon at the center) with RPG levelling, a short free browser experience and heavy replay, which spawned descendants. The verified evidence is community enthusiasm; the "why it spread" explanation is inference.

### Cited Findings
- 4.9/5 from 2,188 ratings and 1,067 comments, free browser, "no generative AI". — [itch.io](https://danielben.itch.io/dragonsweeper)
- Clones and descendants exist: Dungeon Squire, Dungeon Sweeper Roguelike (Godot, cites it as inspiration), and unofficial copy sites. A YouTube short complains it is "still getting stolen". — [Dungeon Sweeper Roguelike](https://devaosx.itch.io/dungeon-sweeper-roguelike), [YouTube](https://www.youtube.com/shorts/1P1ysZxBp5I)
- Player praise includes "My new No.1 Minigame on smartphone" and a family playing it for days. — [itch.io](https://danielben.itch.io/dragonsweeper)
- Speedrunners time full runs, and some players replay in incognito windows to see the original ending. — [itch.io](https://danielben.itch.io/dragonsweeper), [comments](https://danielben.itch.io/dragonsweeper/comments?before=873)
- A ResetEra thread discusses it as "fantasy Minesweeper with character development twist". — [ResetEra](https://www.resetera.com/threads/dragonsweeper-fantasy-minesweeper-with-character-development-twist-itch-io-browser-game.1085823/)

### Inferences
- Likely drivers: zero friction (browser, free), a hook that adds RPG progression to a known mechanic, and a single memorable boss goal. Not confirmed by any source.
- Dragonsweeper's single large board is not a multi-floor format, so it neither supports nor contradicts a floor-based design. Descendants kept the single dungeon format.
- Relevant to Wumpus Adventures: player complaints centre on luck and learning curve, so solvability guarantees and a clear monster or hazard reference help.

### Gaps
- No Ars Technica or press article found, no download figures, no developer statement on why a single board was chosen.
