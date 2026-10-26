# Game design: from endless arcade to deduction roguelite

Goal: a commercial, readable-in-30-seconds, hard-to-put-down mobile game, shippable in one month.
Rationale and evidence: see `market-research.md` (premium/one-time-unlock roguelites are the proven model; ad income
from LATAM users is low; retention is what decides everything).

## The pitch

*Descend 10 floors of a fogged cave, read the clues, grab the gems, survive the guardians, and slay the Grimbur.*
Every run is different, every day has a shared challenge, and every run unlocks something.

## Core loop (one floor, 1-3 minutes)

1. Read the board: revealed tiles show how many guardians / vortexes touch them.
2. Decide: step into the unknown, shoot, or use a vortex gamble.
3. Collect all gems -> floor cleared -> **choose 1 of 3 relics** (week 2) -> next floor.
4. Floor 10: the Grimbur. Kill it to win the expedition.

Death ends the run; the run still pays out meta currency / unlocks (week 3).

## Why it should be addictive (the levers, in order of impact)

| Lever | What we build | Week |
| --- | --- | --- |
| A goal and an ending | 10-floor expedition, Grimbur boss, victory screen | 1 |
| Distinct heroes | 6 heroes with a perk each, unlocked by playing | 1-2 |
| Build variety | Relics: pick 1 of 3 after each floor, stack across the run | 2 |
| "One more run" | Short floors, fast restart, run summary, near-miss feedback | 2-3 |
| Daily habit | Daily challenge + streak (done), daily-only relic seed | 1 (done) |
| Juice | Screen shake, hit-stop, haptics, particle bursts, better audio | 3 |
| Onboarding | Playable tutorial in floor 1, ES/PT localisation | 3 |
| Readability / fairness | Boards solvable by deduction alone (done), exact counts, danger flags (done), colour-blind icons | 3 |

## Heroes (perks are engine flags, see `core/engine/heroes.ts`)

| Hero | Perk |
| --- | --- |
| Vael (Cyan Explorer) | **Trapfinder**: traps never hurt; +1 arrow each floor |
| Sera (Scarlet Archer) | **Piercing arrows**: arrows reach 2 tiles |
| Borin (Moss Warden) | **Stoneskin**: starts every floor with a shield |
| Auric (Gilded Delver) | **Treasure hunter**: gems worth +30%, new-tile bonus doubled |
| Mira (Lantern Keeper) | **Lightbearer**: every floor starts with the area around the start already lit (like the Old Lantern; hazards stay hidden). Ability *Flare*. Unlock: play 5 daily challenges |
| Bram (Blaster) | **Tinkerer**: every run starts with 1 detector and 1 bomb (also on the daily). Ability *Blast*. Unlock: earn 500 embers in total |

Unlocks (implemented): Cyan free; Archer after reaching floor 4; Warden after reaching floor 7; Delver after winning an expedition.
To test every hero, set `GAME_CONFIG.dev.unlockAllHeroes = true` in `src/config/gameConfig.ts` (never ship it on).

## The Grimbur (floor 10)

- 3 HP, one arrow = 1 damage. No gems on this floor: killing the Grimbur clears the floor and wins.
- It hunts: after every 2nd player move it steps one tile toward the player (only onto empty tiles).
- Fury: on its last heart it moves after every action; a hit that does not kill it may call a stalker (50%, max 2 per fight).
- The lair keeps at most 8 guardians and 7 vortexes (it is a fight, not a minefield).
- Touching it is lethal; a shield absorbs one touch and bounces the player back (the Grimbur survives).
- Counts as a guardian for the proximity clues, so the roar gets louder as it closes in.

## Monetisation (decided by evidence, see research)

Free: floors 1-3 and the daily challenge. One-time unlock (~2.99-3.99 USD): the full expedition, all heroes, endless
mode. No forced ads. Optional rewarded revive can be tested after launch.

## Four-week plan

- **Week 1 - the spine** (DONE): expedition + Grimbur boss + victory, hero perks, floor counter UI, generated audio, daily challenge, pause, analytics facade, leaderboard security.
- **Week 2 - variety**: relic draft (DONE), hero unlocks and locked hero select (DONE), new hazard (roaming stalker), bot-driven
  balance simulation, real art from `ART_BRIEF.md`.
- **Week 3 - feel and onboarding**: juice pass, tutorial, ES/PT, accessibility, replace unlicensed audio/art, analytics SDK.
- **Week 4 - ship**: balance pass from simulations, store assets, privacy policy, one-time unlock IAP, closed test
  (12 testers x 14 days is a Google requirement: the first test build must be uploaded by about day 10-12 or the
  month is blown), release candidate.

Gate before spending on marketing (soft launch): D1 >= 30%, D7 >= 6%.

## Balance tooling

`npx tsx scripts/simulate.ts [runsPerFloor] [firstFloor] [lastFloor] [depth] [aim]` plays the real reducer with a careful bot that only uses what a
human sees (clues, visible gems) plus Minesweeper-style deduction, and guesses only when nothing is provably safe.

First run (old curve, safe radius 3): the bot cleared **99-100%** of floors 1-9 and almost never had to guess, i.e. the game
had no tension for an attentive player. Current curve (safe radius 2; enemies/pits denser from floor 3; arrows = 0.7 per
guardian + 1 with up to 4 carried over; early stalkers on floors 4-5; sleepers from floor 6), 150 runs per floor:

| Floor | Hazard density | Standard bot clears | Aiming bot clears | Board forces a guess |
| --- | --- | --- | --- | --- |
| 1-3 | 10-16% | 100% | 100% | 0% |
| 4-5 | 17-23% | 85-86% | 99-100% | 0-1% |
| 6 | 18% | 74% | 99% | 1% |
| 7-10 | 22-24% | 57-68% | 97-99% | 3-8% |
| 11-30 (endless) | 23% -> 27% | 51% -> 18% | 99% -> 83% | 6% -> 43% |

"Standard bot" only shoots a stalker it is already facing; "aiming" (`npx tsx scripts/simulate.ts 150 1 10 0 aim`) turns to shoot any
adjacent stalker, as a quick person would, so it is close to a ceiling for a careful human. Deaths of the standard bot are almost
all stalkers (sleepers wake into stalkers), not blind guesses. Re-run after any change to `difficulty.ts`, the generator or the
scoring (`simulate.ts` also prints deaths by cause and arrows left). Targets: floors 1-3 forgiving (>= 95%), floor 4 the first close call
(85-95% for the standard bot), floors 7-10 genuinely risky.
