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

## 6. Level Progression
- **Victory Condition**: Collect **all coins** on the current board (3 at level 1, capped at 8).
- **Level Up**: Clears the board, resets player to starting position, and generates a new, more difficult level.
- **Difficulty Scaling**: Board size, enemies, pits and coins grow with the level. Every generated board is validated so that all coins are reachable without crossing a hazard.

## 7. Game Modes
- **Endless**: the default run. Each run gets a random run seed; every level derives its own board seed from it, so a run is fully reproducible.
- **Daily Challenge**: the run seed is derived from the current UTC date, so every player gets the same boards that day. Retrying replays the same cave. Results are kept locally (best of the day, attempts) together with a streak of consecutive days, and can be shared as text. Daily runs never enter the global Top 10.

## 8. Pause
A pause button sits next to the timer. Android's Back button pauses (and resumes) instead of abandoning the run, and sending the app to the background pauses automatically. The timer stops while paused.

