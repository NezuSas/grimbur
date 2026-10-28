# AI Project Context

Quick orientation for AI coding assistants. The deeper docs are `README.md`, `architecture.md`,
`GAMEPLAY_SPEC.md`, `TECHNICAL_SPEC.md` and `docs/`.

## What this is
**Grimbur: Cave of Clues** — a landscape-only mobile deduction roguelite (a modern Hunt the Wumpus).
Expo SDK 58 · React Native 0.88 · React 19.3 · strict TypeScript · zustand · React Navigation · Firebase (Firestore,
anonymous auth). English and Spanish via `src/i18n`.

## Ground rules
- `src/core/**` is pure and deterministic: no I/O, no `Math.random` (seeded PRNG in `core/random`), no React imports.
  Side-effects live in hooks/screens/services.
- Every gameplay change needs a Jest test; run `npm test`, `npm run typecheck`, `npm run lint` before committing
  (CI runs them on every push, plus `npm run test:rules` against the Firestore emulator — needs Java 17).
- Firestore writes must satisfy `firestore.rules`; the rules tests in `tests/rules` are the contract.
- UI text goes through `t()` from `src/i18n/useT` with keys in both `en.ts` and `es.ts`; numeric params are
  locale-formatted automatically.
- Animations respect the `reduceFlash` setting (calm mode) from the settings store.
- Do not rename the EAS slug (`wumpusadventures`), AsyncStorage keys (`wumpus.*`) or sprite filenames: they are
  stable identifiers kept on purpose after the game was renamed.

## Layout (short)
- `src/core/engine` reducer + board generator + deduction solver · `core/duel` live duels · `core/stats` forge,
  achievements, missions.
- `src/screens` orchestrators (`screens/game` is the in-run logic) · `src/ui/components` presentation.
- `src/services` Firestore, local stats, saved runs, backups · `src/state` zustand stores.
- `scripts/` art/audio pipelines (Python) and the balance simulator (`npx tsx scripts/simulate.ts`).
- `docs/release/` store listing, operations guide, release checklist.
