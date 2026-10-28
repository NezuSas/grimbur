# Grimbur

[![CI](https://github.com/NezuSas/grimbur/actions/workflows/ci.yml/badge.svg)](https://github.com/NezuSas/grimbur/actions/workflows/ci.yml)

**Grimbur: Cave of Clues** — a bite-sized deduction roguelite for phones, built with React Native, Expo (SDK 58) and
strict TypeScript, played in landscape. Descend 10 fogged floors: clue numbers on explored tiles say how many guardians
and vortexes touch them, gems are always visible, and every board is solvable by deduction alone. Pick a relic after
each floor, slay the Grimbur on floor 10, push deeper with five ascension depths, spend embers in the Forge, and come
back for the daily cave. English and Spanish.

**Modes:** 10-floor expedition · endless descent · daily challenge (same cave for everyone) · friend challenges by code
· live 2–4 player duels with ember stakes. Global, daily and weekly leaderboards, cloud backup by key and anonymous
Firebase auth — no sign-up.

Design: [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) and [GAMEPLAY_SPEC.md](GAMEPLAY_SPEC.md).

## Getting started

```bash
npm install
npm start            # Expo dev server (use `npm run start:lan` / `start:tunnel` for devices)
npm run android      # native build (needs Android Studio / SDK + JDK 17)
npm run web          # browser preview (react-native-web): handy for checking layouts at any window size
```

## Scripts

| Script              | Purpose                                   |
| ------------------- | ----------------------------------------- |
| `npm run typecheck` | `tsc --noEmit`                            |
| `npm run lint`      | eslint over `src` and `App.tsx`           |
| `npm test`          | Jest suite (engine, duels, relics, i18n, achievements...) |
| `npm run test:rules` | Firestore security rules against the emulator (needs Java) |
| `npm run test:stress` | Randomised reducer invariants           |
| `npx tsx scripts/simulate.ts` | Balance simulation with a deduction bot |
| `python scripts/makeSfx.py` | Regenerate the synthesised sound effects |
| `python scripts/optimizePngs.py` | Quantise and compress the sprite PNGs |
| `python scripts/buildAppIcons.py` | Rebuild icon, adaptive icon, splash and favicon from `assets/emblem.png` |

Continuous integration (`.github/workflows/ci.yml`) runs typecheck, lint, the full Jest suite and the Firestore rules
on every push.

## Project layout

```text
src/
├── audio/        Audio event bus + SoundManager (events -> sounds)
├── config/       Tunable scoring/multiplier constants
├── core/
│   ├── difficulty/  Level -> board size, hazards, ammo
│   ├── engine/      Pure reducer, board generator + deduction solver, relics, scoring, useGameEngine hook
│   ├── challenge/   Friend-challenge codes and seeds
│   ├── duel/        Live duel standing, stakes, payouts
│   ├── stats/       Run stats, achievements, missions, the Forge
│   ├── leaderboard/ Score and name validation
│   ├── skins/       Outfit catalog, ownership and unlocks
│   ├── random/      Seeded PRNG · replay/ action recorder · events/ engine emitter
├── data/         Static data (heroes, skins)
├── hooks/        Screen-level hooks (proximity audio, session clock, travel)
├── navigation/   Stack navigator + route param types
├── screens/      Screen orchestrators (screens/game, screens/forge, screens/manual...)
├── i18n/         English/Spanish dictionaries, translator, number formatting
├── services/     Firebase (scores, duels, backup, crash reports), local stats, saved runs
├── shared/       Cross-cutting utilities
├── state/        Zustand stores (sound, settings, entitlements)
└── ui/           Presentational components (ui/components/game for in-game overlays)
tests/            Jest tests (tests/rules needs the Firestore emulator)
specs/            Spec-driven design notes
```

Design rule: the reducer in `core/engine/reducer.ts` is pure and deterministic (no I/O, no `Math.random`);
all side-effects (haptics, sound, analytics) live in `useGameEngine` and the screens.
See [architecture.md](architecture.md), [GAMEPLAY_SPEC.md](GAMEPLAY_SPEC.md) and
[TECHNICAL_SPEC.md](TECHNICAL_SPEC.md) for details.
