# WumpusAdventures — Gameplay Specification

This document defines the rules, mechanics, and systems of **WumpusAdventures**.

## 1. World Structure
- **Play Area**: A grid whose size grows with the level (from 5×8 up to 10×20, see `core/difficulty/difficulty.ts`).
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
| **Pit (Vortex)** | Stationary. | Teleports the player to an empty tile (unexplored first). It never lands on a hazard. |
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
| Lucky Coin | Gems +25% | 3 |
| Iron Boots | Walking costs no points | 1 |
| Old Lantern | Each floor starts with the area around the spawn explored | 1 |
| Phoenix Feather | Survives one deadly touch, then is consumed (a shield is spent first) | 1 |
| Hunter's Mark | Kill combos can climb one step higher | 2 |
| Long Bow | Arrows fly one tile farther | 1 |
| Bulwark | Start every floor with a shield | 1 |
| Dragon Hoard | Clearing a floor pays +50% | 2 |
| Frost Charm | The Wumpus moves one move later | 1 |
| Trap Sense | Traps are disarmed without penalty | 1 |

## 12. Tutorial
The first expedition starts with a guided mini-floor (gem, clue, shooting a guardian, last gem) played on the real engine. It can be skipped and is replayable from the manual (`How to play`). Completion is stored in the settings (`tutorialSeen`).

## 13. Languages and accessibility
English and Spanish (follows the phone language; override in Settings). Settings also include vibration and *reduce flashes*. All controls have labels, touch targets are at least 46 dp and text never scales below 11 sp or above the caps set on the HUD and buttons.

## 14. Stalkers
From floor 7 one extra roaming guardian per floor is a **stalker** (two from floor 11 in endless mode). It looks like a guardian with a violet glow but it walks: after every 4th action it steps toward the player (only onto empty tiles); when it is next to you it winds up for one of its own actions (brighter glow) and then strikes. One arrow kills it (it pays like a guardian), a shield or feather absorbs its strike, and the Frost Charm slows it. Because it moves, the clue icons around you change as it approaches, which is the signal to turn and shoot or walk away.

Design note: moving hazards break static Minesweeper deduction, so they are deliberately rare. Boards are generated as if stalkers were absent (see section 18), so the deduction bot clears 100% of floors 1-6 and about 70-80% of floors 7-10, where stalkers and the Wumpus are the only unavoidable risk.

Whenever the floor is cleared on the same move a hunter was due to strike, the clear wins and nothing strikes.

## 15. Depth (ascension)
After winning an expedition the next **depth** unlocks (1 to 5). On the hero screen the player picks any unlocked depth (it defaults to the deepest). Each depth keeps the earlier penalties:

| Depth | Extra rule |
| :--- | :--- |
| 1 | One arrow fewer on every floor (never below 1) |
| 2 | A stalker already appears from floor 5 |
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
| Bounty | Gems are worth 50% more, one more guardian |
| Calm | One guardian and one vortex fewer (never fewer than one of each) |
| Arsenal | +2 arrows, one more vortex |

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
