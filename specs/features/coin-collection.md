# Feature: Coin Collection

## Description
Allows the player to collect gold coins distributed across the board. Collecting all coins is required to advance to the next level.

## Inputs
- **Player Index**: The current `playerIndex`.
- **Coin Positions**: Indices 12-16 of the `hazardsAndItems` array.

## Outputs
- **Updated State**: `coins` count decremented, `score` incremented, `hazardsAndItems` updated (collected coin index set to 200).
- **Feedback**: Plays the coin collection sound effect.

## Rules
- **Collection**: If `playerIndex` matches any index in `hazardsAndItems.slice(12, 17)`, the coin is collected.
- **Score Reward**: Each coin adds 1010 points to the `score`.
- **Level Progress**: Decrements the `coins` counter (starts at 5 per level). When `coins` reaches 0, the `level-progression` sequence is triggered.
- **Destruction**: Once collected, the coin index is replaced with 200 to prevent re-collection in the same cell.

## Edge Cases
- **Last Coin**: Collecting the final coin instantly triggers the level-up transition logic (see `level-progression.md`).
- **Hidden Coins**: Coins can be collected even if the cell has not been "visited" (revealed) yet, although the UI usually reveals the cell as the player enters it.
