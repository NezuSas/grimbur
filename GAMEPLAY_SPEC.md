# WumpusAdventures — Gameplay Specification

This document defines the rules, mechanics, and systems of **WumpusAdventures**.

## 1. World Structure
- **Play Area**: A grid whose size grows with the level (from 5×8 up to 8×13, see `core/difficulty/difficulty.ts`; boards stop growing at floor 10, the endless descent gets harder through density and hunters instead).
- **Coordinate System**: Internally a 1D index where `0` is top-left and `rows*cols - 1` is bottom-right.
- **Fog of War**: Most tiles start as unvisited (hidden). Moving into a tile reveals it persistently.

## 2. Movement Rules
- **Input**: The player moves in four cardinal directions (UP, DOWN, LEFT, RIGHT).
- **Wall Interaction**: Attempting to move into a boundary will update the player's **Facing Direction** but will not change their position.
- **Cost**: Every move has a base cost of **-1 point**.
- **Exploration**: Visiting a new tile for the first time awards **+5 points**.

## 3. Hazards & Interaction
The game board contains several hidden threats:

| Hazard | Behavior | Result |
| :--- | :--- | :--- |
| **Enemy (Guardian)** | Stationary. | **Game Over** on impact. With an active shield the shield breaks and the guardian is destroyed instead. |
| **Pit (Vortex)** | Stationary. | Teleports the player to an empty tile (an unexplored one about 70% of the time, one already explored about 30%). It never lands on a hazard. **It takes a toll:** one arrow if you have any, otherwise one shop gem if you have any, otherwise nothing. |
| **Trap** | Hidden, no warning. | **-75 points** (never lethal); the trap is consumed. Appears from level 3 (max 4). |

### Power-ups
Visible on the board (unlike traps):

| Item | Effect |
| :--- | :--- |
| **Shield** | Absorbs one guardian hit and destroys it. Carries over between levels. Appears from level 2. |
| **Arrows** | +2 attack charges. Appears from level 2. |

Collecting a power-up awards +50 points.

### Proximity Detection
Visited tiles show a rune when a guardian (🔊) or vortex (∞) is orthogonally adjacent, with a number when two or more of the same kind surround the tile. The player can also "hear" hazards through audio loops:
- **Monster Near**: Localized growling sounds.
- **Lava Near**: Bubbling sounds indicating a pit is adjacent.

## 4. Combat Logic
Players are equipped with arrows to defend themselves.
- **Attack**: Firing an arrow consumes 1 attack charge. It flies up to 1 tile in the **Facing Direction** and hits the first hostile tile it meets; the Scarlet Archer (piercing arrows) and the Long Bow relic add reach (see sections 10 and 11).
- **Hit**: Killing an enemy awards high points and increases the **Enemy Combo**.
- **Miss**: Firing into an empty tile or a wall results in a **-25 point** penalty and resets the combo to zero.

## 5. Scoring System
Final scores are calculated based on efficiency and risk-taking.

| Action | Score | Scaling |
| :--- | :--- | :--- |
| **Step (Base)** | -1 | No |
| **New Tile** | +5 | No |
| **Collect Coin** | +100 | **Yes (Level Multiplier)** |
| **Kill Enemy** | +250 × combo | Combo only |
| **Trap** | -75 | No |
| **Power-up** | +50 | No |
| **Attack Miss** | -25 | No |
| **Level Clear** | +500 | **Yes (Level Multiplier)** |

### Multipliers
- **Level Multiplier**: `1 + (Level - 1) * 0.2`. Coin and level-clear rewards increase by 20% per level.
- **Enemy Combo**: Hits cap at a **3x multiplier** for consecutive kills without moving or missing.

## 6. Level Progression (Expedition)
- **Victory Condition**: Collect **all coins** on the current board (3 at level 1, capped at 8).
- **Level Up**: Clears the board, resets player to starting position, and generates a new, more difficult level.
- **Arrows are a resource**: a floor starts with `ceil(0.7 x guardians) + 1` arrows (3 on floor 1, 11 on floor 10) and up to **4 unused arrows carry over** to the next floor (added after the Blood Pact / Glass Bow cuts). The shop's +2 arrows and the Quiver therefore matter.
- **Difficulty Scaling**: Board size, enemies, pits and coins grow with the level. Every generated board is validated so that all coins are reachable without crossing a hazard.

## 7. Game Modes
- **Endless**: the default run. Each run gets a random run seed; every level derives its own board seed from it, so a run is fully reproducible.
- **Daily Challenge**: the run seed is derived from the current UTC date, so every player gets the same boards that day. Retrying replays the same cave. Results are kept locally (best of the day, attempts) together with a streak of consecutive days, and can be shared as text. Daily runs never enter the global Top 10.

## 8. Pause
A pause button sits next to the timer. Android's Back button pauses (and resumes) instead of abandoning the run, and sending the app to the background pauses automatically. The timer stops while paused.

## 9. The Expedition and the Wumpus
A standard run (and the Daily Challenge) is an **expedition of 10 floors**. Floors 1-9 follow the rules above (levels are
called floors). **Floor 10 is the Wumpus lair**:

- No gems. Killing the Wumpus clears the floor and wins the expedition (victory screen, +2,000 points).
- The Wumpus has 3 hearts; each arrow removes one (+150 points per hit).
- It hunts: after every 2nd player action (a move **or a shot**) it steps one tile toward the player, only onto empty tiles.
- **Fury**: with its last heart it acts after **every** action. Each hit that does not kill it may call a stalker next to it (50%, at most 2 per fight).
- The lair is a fight, not a minefield: it keeps at most 8 guardians and 7 vortexes, and at most one stalker (the lair boards are not checked for deduction, so they are kept light).
- It needs a **wind-up**: when it reaches you it glows on its next action, and only on the action after that can it strike (about four player actions from arrival to strike), which leaves a bare hero three shots at an adjacent Wumpus. If you move away it loses the charge and has to close in again.
- Touching it (or being struck by it) is fatal; a shield absorbs one touch and, if the player walked into it, throws the player back. The Wumpus survives. **A hit that was just absorbed stuns every hunter for that action**, so one move never costs both a shield and a second strike.
- It counts as a guardian in the proximity clues, so the roar warns you as it closes in.

## 10. Heroes
Each hero has a perk (`core/engine/heroes.ts`), shown on the selection screen:

| Hero | Perk |
| :--- | :--- |
| Cyan Explorer | Trapfinder: traps never hurt; +1 arrow every floor |
| Scarlet Archer | Piercing arrows: arrows fly 2 tiles |
| Moss Warden | Stoneskin: starts every floor with a shield |
| Gilded Delver | Treasure hunter: gems +30%, exploration bonus x2 |

## 11. Relics
After every cleared floor the game offers **3 different relics** and waits for the player to take one. They stack (up to each relic's limit) and last for the rest of the run. The offer is seeded, so a Daily Challenge shows every player the same draft.

| Relic | Effect | Max |
| :--- | :--- | :--- |
| Bottomless Quiver | +2 arrows now, +1 arrow at the start of every floor | 3 |
| Lucky Coin | Gems +25% points, and each gem has a 20% chance per stack to give one more shop gem (decided by the seed) | 3 |
| Wayfarer Boots (id `iron_boots`) | Walking costs no points, and stepping on an already explored tile does not advance the hunters' clocks (turn counter and Wumpus / stalker actions); no effect in the lair | 1 |
| Old Lantern | Each floor starts with the area around the spawn explored | 1 |
| Phoenix Feather | Survives one deadly touch, then is consumed (a shield is spent first) | 1 |
| Hunter's Mark | Kill combos can climb one step higher; every guardian killed by an arrow or volley drops 1 shop gem | 2 |
| Long Bow | Arrows fly one tile farther | 1 |
| Bulwark | Start every floor with a shield | 1 |
| Dragon Hoard | Clearing a floor pays +50% and gives 1 shop gem per stack | 2 |
| Frost Charm | The Wumpus **and the stalkers** act one action later | 1 |
| Trap Sense | Traps are disarmed without penalty | 1 |

Drafts never offer a relic the hero cannot use: no Bulwark for Borin (Stoneskin) and no Trap Sense for Vael (Trapfinder). The four cursed relics are listed in section 25.

## 12. Tutorial
The first expedition starts with a guided mini-floor (gem, clue, shooting a guardian, last gem) played on the real engine. It can be skipped and is replayable from the manual (`How to play`). Completion is stored in the settings (`tutorialSeen`).

## 13. Languages and accessibility
English and Spanish (follows the phone language; override in Settings). Settings also include vibration and *reduce flashes*. All controls have labels, touch targets are at least 46 dp and text never scales below 11 sp or above the caps set on the HUD and buttons.

## 14. Stalkers
Floors 4 and 5 get a single **stalker** with 50% chance (rolled from the floor seed, so a cave always has the same hunters): the first close call. From floor 7 there is always one (two from floor 11 in endless mode, plus one more every 5 floors beyond floor 10, at most 5 per floor). It looks like a guardian with a violet glow but it walks: after every 4th action it steps toward the player (only onto empty tiles); when it is next to you it winds up for one of its own actions (brighter glow) and then strikes. One arrow kills it (it pays like a guardian), a shield or feather absorbs its strike, and the Frost Charm slows it. Because it moves, the clue icons around you change as it approaches, which is the signal to turn and shoot or walk away.

Design note: moving hazards break static Minesweeper deduction, so they are deliberately rare. Boards are generated as if stalkers were absent (see section 18), so the standard careful bot (it only shoots a stalker it already faces) clears 100% of floors 1-3, 85-86% of floors 4-5, about 74% of floor 6 and 57-68% of floors 7-10; a bot that also turns to shoot any adjacent stalker (`simulate.ts ... aim`) clears 97-100%. Stalker deaths are mostly the bot's, not the board's.

Whenever the floor is cleared on the same move a hunter was due to strike, the clear wins and nothing strikes.

## 15. Depth (ascension)
After winning an expedition the next **depth** unlocks (1 to 5). On the hero screen the player picks any unlocked depth (it defaults to the deepest). Each depth keeps the earlier penalties:

| Depth | Extra rule |
| :--- | :--- |
| 1 | One arrow fewer on every floor (never below 1) |
| 2 | A stalker always appears from floor 5 |
| 3 | The Wumpus has one more heart |
| 4 | Traps hurt twice as much and every floor from 3 has one more |
| 5 | Relic drafts offer only 2 choices |

The Daily Challenge is always depth 0 so every player sees the same cave. Two achievements reward winning on depth 3+ and on depth 5. `scripts/simulate.ts [runs] [first] [last] [depth]` measures the effect on survival.

## 16. The Forge (permanent upgrades)
Every finished run earns **embers**, win or lose: `floor(score / 250) + 4 x floor reached`, plus `50 + 15 x depth` for a victory. Runs that never started earn nothing. Embers are spent in the Forge (reachable from the cover) on permanent upgrades:

| Upgrade | Levels (cost) | Effect |
| :--- | :--- | :--- |
| Whetstone | 2 (60, 160) | +1 arrow on every floor, per level |
| Coin purse | 3 (40, 90, 160) | Gems worth +10% per level |
| Scribe | 1 (250) | Relic drafts offer 1 extra choice |
| Ward | 1 (80) | Start every run with a shield |
| Phoenix start | 1 (300) | Begin every run holding a Phoenix Feather |
| Fortune | 2 (120, 240) | Every run earns +15% embers per level |

Forge upgrades never apply to the Daily Challenge (same cave, same tools for everyone). Embers earned appear on the end-of-run card.

## 17. Omens
From floor 2 (never the lair) a floor may announce an **omen** in the banner shown as it starts. Chosen only from the run seed and the floor, so a daily challenge has the same omens for everyone: about 40% plain floors, 25% Bounty, 20% Calm, 15% Arsenal.

| Omen | Effect |
| :--- | :--- |
| Bounty | One more gem on the floor, gems are worth 50% more points **and** every second gem gives one more shop gem; but one more guardian |
| Calm | One guardian and one vortex fewer (never fewer than one of each); but one gem less (never fewer than two) |
| Arsenal | +2 arrows; but one more vortex and a roaming stalker (one more guardian before floor 4) |

## 18. Fair boards
Floors are generated until a careful player can collect every gem using only the clue numbers, never gambling on an unknown tile (`core/engine/solver.ts`, up to 30 tries per floor; boards that need a guess are accepted only if every try fails, which has not happened in 54,000 generated boards). Gems and power-ups are visible and count as known safe; stalkers are ignored by the check because they move. This is what lets the difficulty curve use dense hazards (about 23-25% of tiles from floor 5) without feeling unfair.

## 19. Controls and aids
- **Direction pad** (one step per tap) is the reference control. On windows at least 720 dp wide and landscape, the **attack button sits alone on the opposite side** of the board (Settings: opposite side / in the pad). Narrow windows keep it in the middle of the pad.
- **Tap to travel**: tapping an explored, empty tile walks there along explored tiles only. It stops when a gem, pickup, shield or arrow count changes, when a wind-up appears, when something occupies the next tile, when a visible hunter is within 3 tiles, on a teleport, and on any control touch.
- **Swipe to move** (Settings, off by default): a swipe of at least 28 dp (or 60% of a tile) moves one step, acting on release. Short drags and diagonal smears do nothing.
- **Danger flags**: holding a finger on an unexplored tile marks it as dangerous. A marked tile cannot be stepped on (the pad warns with a vibration) until the mark is removed. Marks are cosmetic memory aids and are cleared on each floor.
- **Aimed shots**: pressing and dragging from the attack button toward a side turns the hero that way and fires without moving or paying a step; a plain tap still fires where the hero faces. While the button is held the board outlines the tiles the arrow would cross, and the button shows the chosen arrow. The button also prints the arrows left.
- **The lair**: the banner states the goal ("Slay the Wumpus", how many hearts it has and that it hunts you) and fades as soon as the player moves; the gem counter becomes the Wumpus' hearts; the relic draft before it says the lair is next.
- **Relics** collected so far sit in a tray (above the attack button on wide screens, above the pad on narrow ones) with a count for duplicates.
- **Facing**: the hero is mirrored when it faces left, leans away (up) or toward (down) the viewer, and the tile in front of it carries a faint chevron: that is where a plain shot goes. There is no arrow over the hero's head.
- **Start of a run**: an opaque "preparing the cave" cover stays up until the first board's tiles have been drawn (or 2.5 s), then fades out; the floor banner starts after it.
- **No swipe-back**: the stack's edge-swipe back gesture is disabled on the game, tutorial and floor-complete screens, so a finger sliding across the board cannot abandon the run. The system Back gesture pauses the game.
- **Hero select**: all four cards share one centred row when they fit (about 190 dp each); otherwise they scroll. Cards are as tall as the free area, with text sized to the card, and a compact card is used on short windows.
- **Death**: the moment the hero dies the board shakes hard and the screen flashes red (softer with *reduce flashes*), the killer stays visible on its tile, and 0.85 s later the card appears (0.7 s after a victory).
- **Game-over card**: names what killed you (with its picture), says on which floor you fell, shows a ten-pip progress bar, the score counting up, a new-best or near-miss line, gems, time and embers earned, one tip about that killer, a large Retry button, and Menu / Forge (when embers were earned) / Share below it.

## 20. Menu screens
All menu screens share one header (`ui/components/ScreenHeader.tsx`: back button, title with a gold underline, optional right slot).
- **Forge**: the ember balance is a pill at the top right that pops when it changes. Each upgrade is a card with a large icon, level pips and one clear state: gold *Buy* button when affordable, a progress bar (`175 / 250`) when not, *Maxed* when done. A line names the next goal and how many embers are missing.
- **Achievements**: overall progress bar, earned ones first (newest first) with a green check and date, locked ones with a lock badge.
- **Leaderboard**: a "your record" panel (best score, deepest floor, victories, runs, and the score the top 10 starts at) beside the list on wide screens; gold, silver and bronze for the first three rows.
- **How to play**: a four-step picture strip, the replay-tutorial button, then collapsible sections (mission and controls open, the rest folded).

## 21. Modes, difficulty and long-term goals
- **Expedition**: 10 floors and the Wumpus; your Forge upgrades and chosen difficulty apply; it earns embers and unlocks heroes and difficulties.
- **Daily challenge**: the same cave for everyone, today only; no upgrades, always *Normal*; keeps a streak (a flame with the number of days on the cover; it pulses until today's run is done and shows a check afterwards).
- **Endless descent**: unlocked by the first victory. No last floor: the Wumpus returns every 10 floors with one more heart each time (killing it opens the next floor, it is not a victory), and from floor 11 each floor adds guardians (up to +3), vortexes (up to +2) and a stalker every five floors (up to +3, five stalkers at most per floor). Boards stay at 8x13, so hazard density climbs from about 23% to about 28% by floor 30 (`endlessPressure` in `core/engine/lair.ts`). It keeps its own record (deepest floor) and never touches the expedition's best score, floor or victories, and it does not submit to the leaderboard.
- **Difficulty** (formerly "depth"): Normal, Veteran, Nightmare, Inferno, Abyssal, Legendary. Each one keeps the earlier penalties (section 15) and the next opens by winning at the current one.
- **Achievements**: 104, in four tiers (easy, medium, hard, legendary) across getting started, depth, treasure, builds, the Wumpus, difficulty, habits and the endless descent. Cumulative ones show a progress bar; the next goal sorts to the top.
- **Heroes** have names and titles: Vael the Pathfinder, Sera the Crimson Archer, Borin the Moss Warden, Auric the Gilded Delver.
- **Typeface**: Fredoka (OFL), one file per weight, applied through `ui/components/Text.tsx`. The version number is not shown to players.

## 22. The cover, the Forge and the achievement loop
- **Cover**: no panel around everything. The title stands on the cave (with the Wumpus below it on roomy screens); the three game modes are separate cards; Forge, Ranking, Achievements and How to play are a dock of round icons. Wide landscape windows put the title on the left and the menu on the right; narrow or portrait windows stack them, and the two small mode cards become full-width rows when the menu is under 480 dp.
- **Forge**: 18 upgrades in three groups. *Power* (Whetstone, Ward, Explorer's pride, Scribe, Eagle eye), *Economy* (Coin purse, Fortune) and *Start with a relic* (Miner's lamp, Trapper's eye, Silent boots, Frost heart, Lucky coin, Phoenix start, Long bow, Hunter's mark, Dragon's greed, Bottomless quiver, Bulwark). Relics bought here act from the first move of every expedition (never in the daily). Prices run from 40 to 600 embers.
- **Achievements**: 104, each paying embers when unlocked (easy 10, medium 25, hard 60, legendary 150: 6,630 in total) so that chasing them feeds the Forge. The screen shows the overall bar, the embers still waiting, the three goals closest to done, filters (all, to do, done) and a reward chip on every card. New counters: victories per hero, daily challenges played and won, lifetime embers. Trophy achievements (10, 25, 50, 75, 100 unlocked) are awarded in the same pass as the ones that complete them.

## 23. Cover hierarchy
One thing to do first: a large golden PLAY button (the expedition) with the best score under it. Below it, smaller, the daily challenge (with the streak flame) and the endless descent; then the dock of round icons (Forge, Ranking, Achievements, How to play); an ember chip with the purse and the settings cog sit in the corner. A red dot marks the Forge when something is affordable and Achievements when new ones were unlocked since the screen was last opened. The Wumpus breathes on a lit medallion and a few embers float behind the menu (both off with *reduce flashes*). No popups, ads, rating or sign-in prompts before the first run.

## 24. More value
- **Pad feedback**: pressing a direction lights the whole quadrant under the thumb (gold wash from the centre to the rim), not only a circle around the arrow. A thumb covers the arrow it presses, so the lit wedge is what confirms which direction was read.
- **Daily bonus**: the first finished run of each UTC day also pays 15 embers plus 5 per day of streak (up to 50). No timers, no loss if skipped: it is simply there the next day. The end-of-run card says it was included.
- **Celebration**: a victory or a new record drops confetti on the end card (off with *reduce flashes*).
- **Delete my data** (Settings): erases progress, embers, achievements and records from the device after a second tap to confirm (the confirmation expires after 4 s).
- **My progress** (button in the leaderboard's "your record" panel): leads with eight lifetime numbers that are exact for every game ever played (runs, victories, win rate, best score, deepest floor, endless record, gems, streak), then the achievement closest to done with its real progress, the last eight runs as a list (result icon, mode, floor, day, score, a star on the best), a 14-day strip of days played, a score-trend chart and victories per hero. The device stores the latest 30 runs, and only from the version that introduced it: the screen says so ("showing runs since DATE; your N earlier games are counted in the totals") and never invents runs. The trend chart appears from five stored runs, starts at zero and draws the best score as a dashed line; with fewer runs it says how many more are needed.


## 25. Decisions between floors, abilities and new dangers
- **Gems are a purse.** Every gem collected adds 1 gem to the run's purse (2 with the Greedy Idol). It is kept for the whole run and spent only between floors.
- **Between floors** (an overlay after the floor-complete card, `IntermissionOverlay`): the shop sells +2 arrows for the next floor (3 gems), a shield (5, only when you have none), a detector (4) and a bomb (6); the bag holds at most 3 of each item. An **altar** trades the shield for a second relic pick right after the first. A **fork** offers two doors, each an omen or a plain cave (two different ones, picked deterministically from the run seed and floor); the chosen omen is the floor's omen. There is no fork on the first floor, before the lair, or in the daily challenge (which keeps its seeded omens); the shop and altar are available everywhere. The "go" button arms after 0.35 s so a leftover tap cannot skip the screen.
- **Hero abilities** (button above the pad, ready at the start of every floor, each use takes one action so hunters move and sleepers nearby wake; cooldown 12 actions, except Brace and Magnet: 18): Vael *Scout* reveals a safe unexplored tile beside the explored area that the player could not already deduce (the one with most unexplored neighbours; only when nothing is hidden does it show a known one); Sera *Volley* is a free shot along her facing line that kills up to two guardians within five tiles (a Wumpus in the line takes one heart and stops it); Borin *Brace* raises a shield; Auric *Magnet* collects the nearest gem anywhere (and can clear the floor).
- **One-use items**: the *detector* flags every hostile tile within two steps (the flags work like the player's own: stepping onto one is refused) and costs no action; the *bomb* destroys guardians and vortexes in the 3x3 around the hero (never the Wumpus) and costs an action. Items come only from the shop (nothing is found on the board yet).
- **Undo**: once per floor the last step can be taken back (button appears after a step). Shots, abilities and items clear it; a death, a cleared floor or the next floor do too.
- **Cursed relics** (4, a run carries at most one): *Blood Pact* (+50% gem points, one arrow fewer per floor, never below one), *Hasty Boots* (new tile pays triple, hunters act one action sooner), *Greedy Idol* (gems give double for the shop, two more vortexes on every new floor), *Glass Bow* (arrows fly two tiles farther, half the arrows each floor, never below one; shop arrows are not halved). From floor 3 a draft has a 40% chance of replacing its last offer with one; they show a red frame and a "Cursed" tag. They have no artwork yet and show an emoji.
- **Sleeping guardian**: from floor 6 one guardian per floor sleeps. It is lethal and counts in the clue numbers and the fairness check like a normal guardian, can be shot, and wakes into a stalker when the hero ends any action (step, shot, bomb, ability, a hit absorbed by a shield) within two tiles.
- **Caves** (every three floors, announced by the floor banner and tinting the background): *caves* (1-3) plain; *crystal veins* (4-6) one extra shield on every floor; *magma tunnels* (7-9) one extra vortex and one extra arrow pickup; the lair keeps its own. The endless descent keeps cycling.
