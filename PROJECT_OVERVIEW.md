# Grimbur — Project Overview

Welcome to **Grimbur**, a modern mobile adaptation of the classic "Hunt the Wumpus" strategy game. This project is built with **React Native** and **Expo**, emphasizing a clean, layered architecture and Spec-Driven Development (SDD) principles.

## 1. Game Concept
Players navigate a 15x8 grid-based cave system. The goal is to collect all coins in a level while avoiding lethal hazards:
- **Enemies**: Move through the cave; collision results in Game Over unless shielded.
- **Pits**: Stationary lethal traps; collision results in Game Over.
- **Grimbur/Monster**: A localized hazard that can be heard when nearby.

Players can **Move** (spending points) and **Attack** (using limited arrows) to eliminate enemies.

## 2. Core Gameplay Loop
1. **Selection**: Choose a character with unique stats.
2. **Exploration**: Move through the grid. Tiles are revealed as they are visited.
3. **Detection**: Use proximity SFX (Monster loop, Lava loop) to identify nearby hazards.
4. **Action**: Collect coins or attack enemies in your line of sight.
5. **Progression**: Clear all coins to advance to the next level (difficulty scales).

## 3. Technology Stack
- **Core**: React Native (0.86) + Expo (Universal framework).
- **Language**: TypeScript (Strict mode).
- **State Management**: 
    - **Game Logic**: `useReducer` within a custom hook (`useGameEngine`).
    - **Audio Lifecycle**: **Zustand** for persistent across-screen audio players.
- **Audio API**: `expo-audio` + `expo-asset`.
- **Navigation**: React Navigation (Native Stack).
- **Persistence**: Firebase (Highscores service).

## 4. Project Architecture Summary
The project follows a **Layered Architecture** designed for scalability and maintainability:

- **Game Engine Layer**: Pure functional logic (Board Matrix, Movement Reducer) driven by a centralized `GAME_CONFIG`.
- **Infrastructure Layer**: Structural systems for **Difficulty Scaling**, **Telemetry**, **Engine Events**, and **Action Replay**.
- **Audio Layer**: Decentralized **Event Bus** pattern (Emitters → Manager → Store).
- **UI Layer**: Pure React functional components and specialized hooks.
- **Service Layer**: External integrations (Highscores).

## 5. Folder Structure
```text
src/
├── assets/          # Sprites, Music, and SFX
├── audio/           # Audio Event Bus and Sound Manager
├── config/          # Centralized game constants (GAME_CONFIG)
├── core/
│   ├── difficulty/  # Level-based scaling logic
│   ├── engine/      # Main Game Engine (Reducer, Hook, Types)
│   ├── events/      # Internal engine event system
│   ├── random/      # Deterministic PRNG and seed management
│   ├── replay/      # Action history and recording
├── data/            # Static game data (Character stats)
├── hooks/           # Reusable screen hooks (session timer, proximity audio)
├── shared/utils/    # Pure helpers (formatTime)
├── navigation/      # Stack routing configuration
├── screens/         # Major screen orchestrators
├── services/        # External services (Highscores/Firebase)
├── state/
│   └── sound/       # Zustand store for audio lifecycle
└── ui/
    └── components/  # Atomic UI components
```

For more detailed technical information, refer to [architecture.md](architecture.md).
