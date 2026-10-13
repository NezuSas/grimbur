# Wumpus Adventures

Mobile deduction roguelite built with React Native, Expo (SDK 57) and TypeScript (strict), played in landscape.
Descend 10 fogged floors: clue numbers on explored tiles say how many guardians and vortexes touch them, gems are always
visible, and every board is solvable by deduction alone. Pick a relic after each floor, slay the Wumpus on floor 10, push
deeper with five depths, spend embers in the Forge, and share the daily challenge. English and Spanish.
Design: [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) and [GAMEPLAY_SPEC.md](GAMEPLAY_SPEC.md).

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
| `npm test`          | Jest suite (engine, bosses, relics, i18n, leaderboard rules...) |
| `npm run test:stress` | Randomised reducer invariants           |
| `npx tsx scripts/simulate.ts` | Balance simulation with a deduction bot |
| `node scripts/generateAudio.js` | Regenerate the original music and sound effects |
| `python scripts/processSprites.py [--tiles \| --relics \| --characters Cyan]` | Crop, resize and compress new AI-generated art (see `docs/ART_PROMPTS.md`) |
| `python scripts/buildAppIcons.py` | Rebuild icon, adaptive icon, splash and favicon from `assets/emblem.png` |

## Project layout

```text
src/
├── audio/        Audio event bus + SoundManager (events -> sounds)
├── config/       Tunable scoring/multiplier constants
├── core/
│   ├── difficulty/  Level -> board size, hazards, ammo
│   ├── engine/      Pure reducer, board generator + deduction solver, omens, travel, scoring, useGameEngine hook
│   ├── input/       Swipe/tap gesture classifier
│   ├── stats/       Run stats, achievements, hero unlocks, the Forge
│   ├── leaderboard/ Score and name validation
│   ├── events/      Engine event emitter
│   ├── random/      Seeded PRNG
│   ├── replay/      Action recorder
├── data/         Static data (characters)
├── hooks/        Screen-level hooks (session timer, proximity audio)
├── navigation/   Stack navigator + route param types
├── screens/      Screen orchestrators
├── i18n/         English/Spanish dictionaries, translator, hooks
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
