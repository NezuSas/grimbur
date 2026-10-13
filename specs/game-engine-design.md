# WumpusAdventures Game Engine Design

This document outlines the architecture for the `GameEngine`, designed to extract and centralize the gameplay logic from `GameScreen.tsx`.

## 1. GameEngine Responsibilities
The GameEngine acts as the "Brain" of the application, managing:
- **World Generation**: Creating the board and placing hazards/items.
- **State Integrity**: Managing player position, score, resources, and cell visibility.
- **Rule Enforcement**: Handling movement boundaries, collision logic, and attack results.
- **Flow Control**: Managing transitions between Game Over, Level Up, and Active Play states.

## 2. Core Modules
- **State Generator**: Wraps `createBoard` and `randomPositions` to initialize level state.
- **Action Processor**: Processes high-level commands (`MOVE`, `ATTACK`) and calculates the resulting state.
- **Collision System**: A dedicated internal checker that evaluates player proximity to hazards/items after every action.
- **Score Manager**: Calculates points based on movement, kills, and collections.

## 3. Game Loop Design
Since this is a turn-based grid game, the engine follows an **Event-Driven Loop**:
1. **Input**: UI calls an Engine action (e.g., `engine.move('UP')`).
2. **Process**: Engine updates player position and orientation.
3. **Validate**: Engine checks for collisions and updates health/score/visibility.
4. **Notify**: React hook updates state, triggering a re-render in the UI.

## 4. State Management Strategy
The engine will be implemented as a **Custom React Hook** (`useGameEngine`):
- **Internal State**: Uses `useReducer` or a state management library like **Zustand** for complex object updates.
- **Immutability**: Every action returns a new state object to ensure predictable React renders.
- **Persistence**: Integration with `HighscoreService` for saving results on Game Over.

## 5. Interaction between UI and Engine
- **UI (GameScreen)**: Observes the engine state and maps it to components like `BoardView` and `ScoreBar`.
- **UI (DirectionPad)**: Directly triggers engine methods via callbacks.
- **Engine**: Exposed via a simple interface:
    ```typescript
    const { gameState, move, attack, reset } = useGameEngine(characterIndex);
    ```

## 6. Proposed Folder Structure
```text
src/
├── core/
│   ├── engine/           <-- NEW ENGINE MODULE
│   │   ├── useGameEngine.ts    # Main Hook / Orchestrator
│   │   ├── reducer.ts          # State transition logic
│   │   ├── types.ts            # Engine-specific types
│   │   └── collisions.ts       # Specialized collision logic
│   └── board/
│       ├── matrix.ts
│       └── random.ts
```

## Benefits
- **Testability**: Game logic can be unit-tested without rendering the UI.
- **Maintainability**: `GameScreen.tsx` will shrink significantly, focusing only on presentation and layout.
- **Scalability**: Easier to add new features (e.g., different enemy types) by modifying only the `reducer` and `collisions` modules.
