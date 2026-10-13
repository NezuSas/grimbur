# Feature: Arrow Attack

## Description
Allows the player to eliminate an adjacent enemy by firing an arrow. This is the primary combat mechanic used to clear the path and earn bonus points.

## Inputs
- **Attack Command**: "Attack" button from the `DirectionPad` component.
- **Player State**: `playerIndex`, `attack` (available arrows), `facingDir`.
- **Enemy State**: Indices 0-5 of `hazardsAndItems`.

## Outputs
- **Updated State**: `attack` count decremented, `hazardsAndItems` updated (enemy removed), `score` incremented.
- **Feedback**: Plays the death/kill sound effect.

## Rules
- **Resource Limit**: Firing an arrow requires `attack > 0`.
- **Proximity Check**: The attack only affects enemies in adjacent cells (Up, Down, Left, Right). It does NOT use the current `facingDir` for range/direction (legacy logic checks all 4 neighbors and kills the first one found).
- **Resource Consumption**: Each attack attempt (successful or not) consumes 1 arrow.
- **Elimination**: A killed enemy has its index in `hazardsAndItems` set to 200.
- **Score Reward**: Successfully killing an enemy adds 1500 points to the `score`.

## Edge Cases
- **No Enemy Adjacent**: If an arrow is fired but no enemy is adjacent, the arrow is still consumed, but no score is added and no sound is played.
- **Multiple Enemies**: If multiple enemies are adjacent, the logic currently identifies and kills the first one it finds in the check order.
- **Diagonal Enemies**: Attacks do not affect enemies in diagonal positions.
