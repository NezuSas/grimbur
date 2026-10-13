# Game design: from endless arcade to deduction roguelite

Goal: a commercial, readable-in-30-seconds, hard-to-put-down mobile game, shippable in one month.
Rationale and evidence: see `market-research.md` (premium/one-time-unlock roguelites are the proven model; ad income
from LATAM users is low; retention is what decides everything).

## The pitch

*Descend 10 floors of a fogged cave, read the clues, grab the gems, survive the guardians, and slay the Wumpus.*
Every run is different, every day has a shared challenge, and every run unlocks something.

## Core loop (one floor, 1-3 minutes)

1. Read the board: revealed tiles show how many guardians / vortexes touch them.
2. Decide: step into the unknown, shoot, or use a vortex gamble.
3. Collect all gems -> floor cleared -> **choose 1 of 3 relics** (week 2) -> next floor.
4. Floor 10: the Wumpus. Kill it to win the expedition.

Death ends the run; the run still pays out meta currency / unlocks (week 3).

## Why it should be addictive (the levers, in order of impact)

| Lever | What we build | Week |
| --- | --- | --- |
| A goal and an ending | 10-floor expedition, Wumpus boss, victory screen | 1 |
| Distinct heroes | 4 heroes with a perk each, unlocked by playing | 1-2 |
| Build variety | Relics: pick 1 of 3 after each floor, stack across the run | 2 |
| "One more run" | Short floors, fast restart, run summary, near-miss feedback | 2-3 |
| Daily habit | Daily challenge + streak (done), daily-only relic seed | 1 (done) |
| Juice | Screen shake, hit-stop, haptics, particle bursts, better audio | 3 |
| Onboarding | Playable tutorial in floor 1, ES/PT localisation | 3 |
| Readability / fairness | No-guess generation where possible, exact counts, colour-blind icons | 3 |

## Heroes (perks are engine flags, see `core/engine/heroes.ts`)

| Hero | Perk |
| --- | --- |
| Cyan Explorer | **Trapfinder**: traps never hurt; +1 arrow each floor |
| Scarlet Knight | **Piercing arrows**: arrows reach 2 tiles |
| Moss Golem | **Stoneskin**: starts every floor with a shield |
| Golden Rogue | **Treasure hunter**: gems worth +30%, new-tile bonus doubled |

Unlocks (implemented): Cyan free; Knight after reaching floor 4; Golem after reaching floor 7; Rogue after winning an expedition.
To test every hero, set `GAME_CONFIG.dev.unlockAllHeroes = true` in `src/config/gameConfig.ts` (never ship it on).

## The Wumpus (floor 10)

- 3 HP, one arrow = 1 damage. No gems on this floor: killing the Wumpus clears the floor and wins.
- It hunts: after every 2nd player move it steps one tile toward the player (only onto empty tiles).
- Touching it is lethal; a shield absorbs one touch and bounces the player back (the Wumpus survives).
- Counts as a guardian for the proximity clues, so the roar gets louder as it closes in.

## Monetisation (decided by evidence, see research)

Free: floors 1-3 and the daily challenge. One-time unlock (~2.99-3.99 USD): the full expedition, all heroes, endless
mode. No forced ads. Optional rewarded revive can be tested after launch.

## Four-week plan

- **Week 1 - the spine** (DONE): expedition + Wumpus boss + victory, hero perks, floor counter UI, generated audio, daily challenge, pause, analytics facade, leaderboard security.
- **Week 2 - variety**: relic draft (DONE), hero unlocks and locked hero select (DONE), new hazard (roaming stalker), bot-driven
  balance simulation, real art from `ART_BRIEF.md`.
- **Week 3 - feel and onboarding**: juice pass, tutorial, ES/PT, accessibility, replace unlicensed audio/art, analytics SDK.
- **Week 4 - ship**: balance pass from simulations, store assets, privacy policy, one-time unlock IAP, closed test
  (12 testers x 14 days is a Google requirement: the first test build must be uploaded by about day 10-12 or the
  month is blown), release candidate.

Gate before spending on marketing (soft launch): D1 >= 30%, D7 >= 6%.

## Balance tooling

`npx tsx scripts/simulate.ts [runsPerFloor] [firstFloor] [lastFloor]` plays the real reducer with a careful bot that only uses what a
human sees (clues, visible gems) plus Minesweeper-style deduction, and guesses only when nothing is provably safe.

First run (old curve, safe radius 3): the bot cleared **99-100%** of floors 1-9 and almost never had to guess, i.e. the game
had no tension for an attentive player. Current curve (safe radius 2; enemies/pits denser from floor 5):

| Floors | Hazard density | Bot clears a floor | Board forces a guess |
| --- | --- | --- | --- |
| 1-4 | 10-15% | 95-97% | 3-15% |
| 5-9 | 17-22% | 85-94% | 31-65% |

Reading: a perfect bot reaches the Wumpus about 40% of the time without arrows, relics or hero perks; a human will make more mistakes,
and relics/heroes/arrows add tools the bot does not use. Re-run after any change to `difficulty.ts`, the generator or the
scoring. Targets to keep in mind: floors 1-3 forgiving (>= 95%), floors 7-9 genuinely risky (<= 90%) with the guess rate rising.

