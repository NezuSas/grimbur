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
- **Attack**: Firing an arrow consumes 1 attack charge and travels exactly 1 tile in the **Facing Direction**.
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
- It needs a **wind-up**: when it reaches you it glows for one action before it can strike, which leaves a bare hero three shots at an adjacent Wumpus. If you move away it loses the charge and has to close in again.
- Touching it (or being struck by it) is fatal; a shield absorbs one touch and, if the player walked into it, throws the player back. The Wumpus survives.
- It counts as a guardian in the proximity clues, so the roar warns you as it closes in.

## 10. Heroes
Each hero has a perk (`core/engine/heroes.ts`), shown on the selection screen:

| Hero | Perk |
| :--- | :--- |
| Cyan Explorer | Trapfinder: traps never hurt; +1 arrow every floor |
| Scarlet Knight | Piercing arrows: arrows fly 2 tiles |
| Moss Golem | Stoneskin: starts every floor with a shield |
| Golden Rogue | Treasure hunter: gems +30%, exploration bonus x2 |

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
