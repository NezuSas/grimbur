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

Unlocks (week 2): Cyan free; Knight after clearing floor 5; Golem after the first victory; Rogue after 10,000 points in one run.

## The Wumpus (floor 10)

- 3 HP, one arrow = 1 damage. No gems on this floor: killing the Wumpus clears the floor and wins.
- It hunts: after every 2nd player move it steps one tile toward the player (only onto empty tiles).
- Touching it is lethal; a shield absorbs one touch and bounces the player back (the Wumpus survives).
- Counts as a guardian for the proximity clues, so the roar gets louder as it closes in.

## Monetisation (decided by evidence, see research)

Free: floors 1-3 and the daily challenge. One-time unlock (~2.99-3.99 USD): the full expedition, all heroes, endless
mode. No forced ads. Optional rewarded revive can be tested after launch.

## Four-week plan

- **Week 1 - the spine**: expedition + Wumpus boss + victory (this branch), hero perks, floor counter UI, run summary.
- **Week 2 - variety**: relic draft after every floor, unlock persistence, hero select with locks, new hazard (roaming
  stalker), bot-driven balance simulation.
- **Week 3 - feel and onboarding**: juice pass, tutorial, ES/PT, accessibility, replace unlicensed audio/art, analytics SDK.
- **Week 4 - ship**: balance pass from simulations, store assets, privacy policy, one-time unlock IAP, closed test
  (12 testers x 14 days is a Google requirement: the first test build must be uploaded by about day 10-12 or the
  month is blown), release candidate.

Gate before spending on marketing (soft launch): D1 >= 30%, D7 >= 6%.
