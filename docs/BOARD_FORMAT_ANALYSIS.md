# Board format analysis: is the finite per-floor board right?

Date: 2026-10-13. Sources: `market-research-notes/board_format_evidence.md`,
`market-research-notes/run_structure_engagement.md` (both thin on hard retention data, see their gaps
sections) and our own bot simulation (`npx tsx scripts/simulate.ts`).

## Verdict

**Keep the finite board.** Nothing in the evidence argues against it, and the most successful
games in this niche (Dragonsweeper, Dungelot, Dungeon Squire, Desktop Dungeons, Slay the Spire's
bounded maps) are all bounded. The endless Minesweeper-likes we found are rated lower and are
mostly free-with-ads products. The evidence is correlational and the sample is small.

What the evidence does say is that the genre's main complaint is **luck / forced guesses**, not
board size or shape.

## Our own numbers (careful bot, no relics, no perks)

| Floors | Clear rate | Needed at least one guess | Avg moves | Walking over explored tiles |
|---|---|---|---|---|
| 1-4 | 95-99 % | 3-21 % | 29-50 | 13-23 % |
| 5-6 | 88-90 % | 37-49 % | 52-66 | 28-33 % |
| 7-10 | 58-65 % | 44-62 % | 63-80 | 34-39 % |

Reading:

1. **Floor length is already a micro-session** (roughly 1-3 minutes). No need to shorten boards.
2. **Late floors are padded with walking**: up to 39 % of moves step onto tiles that give no new
   information. This is tedium, not decisions. Fix shipped: tap-to-travel.
3. **From floor 5 on, about half the boards require a guess.** This is the real risk for reviews.
   Arrows, shields and relics soften it, but we have not tuned it. Needs device playtesting
   before changing density.

## What we changed (addictiveness levers backed by the notes)

| Change | Why |
|---|---|
| Tap-to-travel over explored empty tiles | Removes the walking tedium measured above; brakes on any change |
| Omens (Bounty / Calm / Arsenal) + floor banner | Gap noted in the research: no mid-run rule variety. Adds risk/reward flavour and a breather without altering the board format |
| Near-miss lines on the run summary | "Just 1 gem from clearing floor 6", "N points short of your best": the retry cost is already one tap |

## Not done (candidates, in the order we would try them)

1. A guess-reduction pass: a solver check on generated boards, or lower hazard density on floors 5-9.
2. An in-run decision beyond the relic draft: a fork between two next floors, or a descend-vs-bank choice.
3. Daily leaderboard and share card.
4. Undo-free "mark tile" tool for suspected hazards.
5. Endless mode as a secondary mode, only if retention data asks for it.
