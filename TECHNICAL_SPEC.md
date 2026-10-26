# Grimbur — Technical Specification

This document details the technical implementation, algorithms, and architectural decisions of **Grimbur**.

## 1. State Management Strategy

The project employs a hybrid state management strategy to optimize for both high-frequency gameplay updates and cross-screen media persistence.

### A. Gameplay State (useReducer)
Core gameplay logic resides in `src/core/engine/reducer.ts`. 
- **Rationale**: Implementing the rules as a pure reducer ensures that the game engine is deterministic and easily testable. It prevents "state soup" where side-effects interfere with the complex collision logic.
- **Hook**: `useGameEngine` orchestrates the dispatching of actions (`MOVE`, `ATTACK`) and exposes a clean interface to the UI.

### B. Audio State (Zustand)
Global systems (Audio, Global Settings) use **Zustand** in `src/state/sound/store.ts`.
- **Rationale**: Unlike `useReducer`, Zustand state survives screen unmounts. This is critical for background music that must continue from one screen to the next.
- **Reinforcement**: To solve Android's native volume reset bug, the store implements a "Hammer Volume Loop" that repeatedly forces the native `volume` property after any `play()` call.

## 2. Audio Architecture (Event Bus)

The audio system is based on a decentralized **Pub/Sub** pattern:
- **Event Bus (`audioEventBus.ts`)**: A simple `Set` of listeners.
- **Sound Manager (`soundManager.ts`)**: A global listener that translates abstract events (`ENEMY_KILLED`) into concrete audio operations (`ataque.play()`).
- **Decoupling**: This allows developer to add sound to any part of the game by simply importing `emitSound`, without needing to touch native audio refs or hooks.

## 3. World Generation Algorithm

Level generation lives in `src/core/engine/generator.ts` and is **Seeded and Deterministic**:
1. **Entropy Injection**: A `seed` is generated for each level and stored in the `GameState`.
2. **PRNG**: A custom pseudo-random number generator (`src/core/random/prng.ts`) consumes the seed to produce numerical sequences.
3. **Safety Zone**: Every tile within Manhattan distance 3 of the spawn is excluded.
4. **Sequential Placement**:
    - **Enemies**: Placed in random non-excluded tiles.
    - **Pits**: Placed in random non-excluded tiles.
    - **Coins**: Primary objectives.
5. **Validation**: A BFS from the spawn must reach every coin without crossing a hazard. Otherwise the board is regenerated, relaxing hazards on later attempts (a hazard-free board is the guaranteed fallback).

> Traps are a planned mechanic and are not generated yet.

## 4. Infrastructure Systems

To ensure long-term scalability, the engine is instrumented with several structural systems:

### A. Engine Event System (`src/core/events`)
A centralized event emitter that decouples game logic from side-effects. It allows the audio system or UI to react to internal engine triggers (`COIN_COLLECTED`, `ENEMY_KILLED`) without direct coupling.

### B. Analytics & Crash Reporting (`src/services/analytics.ts`)
A vendor-neutral facade with typed events (`game_start`, `game_over`, `level_complete`, ...) and an `AnalyticsProvider` interface. By default events go to the dev console; plug in Firebase Analytics/Crashlytics with `setAnalyticsProvider`. An `ErrorBoundary` and a global JS error handler report crashes through the same facade.

### C. Difficulty Scaling (`src/core/difficulty`)
Implements dynamic difficulty adjustment. It calculates score multipliers and potentially hazard density based on the current `level` index, ensuring a balanced difficulty curve.

### D. Action Replay (`src/core/replay`)
Records all user actions and engine state snapshots. This infrastructure supports future "Replay" features and allows for exact state restoration during debugging sessions.

## 5. Persistence Service
A centralized `highscores.ts` service wraps **Firebase**. 
- All data transformation (sorting top 10) happens at the service level.
- The service is designed to be swappable with zero changes to the UI layer.

## 6. Performance Optimizations
- **Seeded Determination**: By using seeds, we avoid re-generating boards on state resets, ensuring consistency.
- **Memoization**: `BoardView` and `ScoreBar` are wrapped in `React.memo` to prevent redundant re-renders of the 120-tile grid.
- **Asset Preloading**: `expo-asset` downloads all media during initialization to eliminate latency.
