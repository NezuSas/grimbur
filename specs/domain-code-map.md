# Grimbur Domain-Code Mapping

This document maps the entities defined in the [Domain Model](domain.md) to their physical implementation in the Grimbur codebase.

## Entity Mapping

### 1. Board
- **Source Files**: 
    - `src/core/board/matrix.ts`
    - `src/screens/GameScreen.tsx`
- **Modules/Functions**:
    - `createBoard()`: Generates the board structure.
    - `Board` type: Defines the grid metadata.
    - `setBoardCells`: State hook in `GameScreen` manages the active board array.
- **Validation**: **Match**. The implementation uses a flat array and coordinate conversion logic as specified.

### 2. Cell
- **Source Files**:
    - `src/core/board/matrix.ts`
    - `src/ui/components/BoardView.tsx`
- **Modules/Functions**:
    - `indexToCoord()`, `coordToIndex()`: Handles cell addressing.
    - `renderGroundTile()`, `renderFogTile()`: Handles individual cell rendering and visibility state.
- **Validation**: **Match**. Cells are treated as indices with dynamic state (visited/hidden) in the UI layer.

### 3. Player
- **Source Files**:
    - `src/screens/GameScreen.tsx`
    - `src/ui/components/BoardView.tsx`
- **Modules/Functions**:
    - State hooks: `playerIndex`, `score`, `attack`, `coins`, `facingDir`.
    - `moveUp()`, `moveDown()`, `moveLeft()`, `moveRight()`: Logic for position and score updates.
    - `attemptAttack()`: Logic for using arrows.
- **Validation**: **Match**. All properties (score, attack, facing) are implemented as reactive state in the main game screen.

### 4. Enemy
- **Source Files**:
    - `src/core/board/random.ts`
    - `src/screens/GameScreen.tsx`
    - `src/ui/components/BoardView.tsx`
- **Modules/Functions**:
    - `randomPositions()`: Places enemies (indices 0-5 of `hazardsAndItems`).
    - `attemptAttack()`: Logic for eliminating enemies (setting value to 200).
    - `isEnemyAdjacent()` & `renderHintLayer()`: Responsible for the "ROAR" hint.
- **Validation**: **Match**. Collision logic in movement functions and attack logic in `GameScreen` align with the entity description.

### 5. Pit
- **Source Files**:
    - `src/core/board/random.ts`
    - `src/screens/GameScreen.tsx`
    - `src/ui/components/BoardView.tsx`
- **Modules/Functions**:
    - `randomPositions()`: Places pits (indices 6-11 of `hazardsAndItems`).
    - `isPitAdjacent()` & `renderHintLayer()`: Responsible for the "HEAT" hint.
- **Validation**: **Match**. Stationary nature and death collision are implemented as described.

### 6. Coin (Gold)
- **Source Files**:
    - `src/core/board/random.ts`
    - `src/screens/GameScreen.tsx`
    - `src/ui/components/BoardView.tsx`
- **Modules/Functions**:
    - `randomPositions()`: Places coins (indices 12-16 of `hazardsAndItems`).
    - Collision logic in `GameScreen` (lines 281-291) handles collection, score increase, and coin count decrement.
- **Validation**: **Match**. Responsibilities for score and level advancement (triggering level increase when `coins === 0`) are fulfilled.

### 7. Character
- **Source Files**:
    - `src/data/characters.ts`
    - `src/screens/GameScreen.tsx`
- **Modules/Functions**:
    - `Character` interface: Defines character properties.
    - `characters` array: The static data source.
- **Validation**: **Match**. Used as a template for the Player's visual and thematic properties.

### 8. HighScore
- **Source Files**:
    - `src/services/highscores.ts`
    - `src/screens/GameScreen.tsx`
- **Modules/Functions**:
    - `HighscoreRow` type: Defines the data schema (name, score, level).
    - `addHighscore()`: Dispatches data to Firebase.
    - `saveNewRecord()`: Local handler in `GameScreen` to trigger submission.
- **Validation**: **Match**. Successfully links game results to external persistent storage.

## Summary table

| Entity | Implementation Status | Core File |
| :--- | :--- | :--- |
| Board | Validated | `matrix.ts` |
| Cell | Validated | `BoardView.tsx` |
| Player | Validated | `GameScreen.tsx` |
| Enemy | Validated | `GameScreen.tsx` |
| Pit | Validated | `GameScreen.tsx` |
| Coin | Validated | `GameScreen.tsx` |
| Character | Validated | `characters.ts` |
| HighScore | Validated | `highscores.ts` |
