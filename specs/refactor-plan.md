# WumpusAdventures Refactoring Plan

This document provides a step-by-step plan to migrate game logic from `GameScreen.tsx` to the `GameEngine` architecture specified in [game-engine-design.md](game-engine-design.md).

## 1. Extraction Steps from GameScreen.tsx

The logic in `GameScreen.tsx` will be extracted in the following clusters:
1.  **State Declaration**: Move `boardCells`, `hazardsAndItems`, `playerIndex`, `score`, `attack`, `coins`, etc., into the engine's internal state.
2.  **Initialization Logic**: Extract the `useEffect` that calls `createBoard()` and `randomPositions()`.
3.  **Action Handlers**: Extract `moveX()` and `attemptAttack()` functions.
4.  **Collision Logic**: Extract the inline hazard/item checks (lines 281-298) into a centralized system.
5.  **Progression Logic**: Move the `coins === 0` effect into the engine's state transition logic.

## 2. Order of Migration (Phases)

### Phase 1: Infrastructure & State
1.  Create the folder structure: `src/core/engine/`.
2.  Define types and the initial state in `reducer.ts`.
3.  Implement the shell of the `useGameEngine` hook.

### Phase 2: World Generation
1.  Move initialization logic into the engine.
2.  Expose an `initialize()` or `reset()` function.
3.  **Testing**: Verify the board and hazards still spawn correctly after calling the engine.

### Phase 3: Basic Movement
1.  Implement `MOVE` actions in the reducer.
2.  Update `GameScreen.tsx` to use `engine.move()` instead of local `moveUp/Down/Left/Right`.
3.  **Testing**: Verify player movement, boundary checks, and score deduction.

### Phase 4: Combat & Collection
1.  Implement `ATTACK` and `COLLECT` logic.
2.  Migrate `hazardsAndItems` state updates into the engine.
3.  **Testing**: Verify enemies can be killed and coins can be collected.

### Phase 5: Progression & Persistence
1.  Migrate level-up logic and high-score submission triggers.
2.  Clean up `GameScreen.tsx` by removing all legacy state and effects.
3.  **Testing**: Full game loop verification (Start -> Play -> Level Up -> Game Over).

## 3. Risk Areas
- **Sound Sync**: Audio triggers are currently deeply embedded in movement functions. We must ensure the UI layer (or an engine callback) still triggers sounds correctly during/after state transitions.
- **State Stale-ness**: Rapid inputs might lead to race conditions if React state updates aren't handled carefully (use of the functional update pattern is critical).
- **Landscape Layout**: DPAD scaling depends on window dimensions; the engine must remain agnostic of layout while the screen handles the visual scaling.

## 4. Testing Strategy
- **Unit Tests**: Create `tests/engine/` to test move logic, boundary checks, and collision detection in isolation.
- **Integration Tests**: Verify that `useGameEngine` correctly updates the `BoardView` and `ScoreBar`.
- **Manual Smoke Test**: Play through Level 1 to 2 to ensure no regressions in hazard behavior or coin counting.

## 5. Final Expected Architecture
- **`GameScreen.tsx`**: Responsible only for layout, sizing, and rendering child components.
- **`useGameEngine.ts`**: The single source of truth for "how the game works."
- **Components**: Receive props from the engine state and emit events (turn, attack) back to the engine.
