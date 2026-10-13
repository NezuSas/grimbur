# Wumpus Adventures

Mobile "Hunt the Wumpus"-style game built with React Native, Expo (SDK 54) and TypeScript (strict).
Collect every gem on the board while avoiding guardians and vortexes; shoot guardians with a limited
number of arrows. Difficulty scales per level and high scores are stored in Firebase.

## Getting started

```bash
npm install
npm start            # Expo dev server (use `npm run start:lan` / `start:tunnel` for devices)
npm run android      # native build (needs Android Studio / SDK)
```

## Scripts

| Script              | Purpose                                   |
| ------------------- | ----------------------------------------- |
| `npm run typecheck` | `tsc --noEmit`                            |
| `npm test`          | Jest suite (engine, generator, scoring)   |
| `npm run test:stress` | Randomised reducer invariants           |

## Project layout

```text
src/
├── audio/        Audio event bus + SoundManager (events -> sounds)
├── config/       Tunable scoring/multiplier constants
├── core/
│   ├── difficulty/  Level -> board size, hazards, ammo
│   ├── engine/      Pure reducer, board generator, scoring, proximity, useGameEngine hook
│   ├── events/      Engine event emitter
│   ├── random/      Seeded PRNG
│   ├── replay/      Action recorder
├── data/         Static data (characters)
├── hooks/        Screen-level hooks (session timer, proximity audio)
├── navigation/   Stack navigator + route param types
├── screens/      Screen orchestrators
├── services/     Firebase high scores, local stats, analytics facade
├── shared/       Cross-cutting utilities
├── state/        Zustand stores (sound, settings)
└── ui/           Presentational components (ui/components/game for in-game overlays)
tests/            Jest tests (tests/helpers has state builders)
specs/            Spec-driven design notes
```

Design rule: the reducer in `core/engine/reducer.ts` is pure and deterministic (no I/O, no `Math.random`);
all side-effects (haptics, sound, analytics) live in `useGameEngine` and the screens.
See [architecture.md](architecture.md), [GAMEPLAY_SPEC.md](GAMEPLAY_SPEC.md) and
[TECHNICAL_SPEC.md](TECHNICAL_SPEC.md) for details.
