# Feature: Pit Collision

## Description
Detects when the player enters a cell containing a bottomless pit. Similar to enemy collision, this results in immediate failure.

## Inputs
- **Player Index**: The current `playerIndex`.
- **Pit Positions**: Indices 6-11 of the `hazardsAndItems` array.

## Outputs
- **Updated State**: `modalGameOver` set to `true`, `flagGameOverOnce` incremented.
- **Feedback**: Stops background music, plays the death sound effect, and displays the character-specific "Lose" image.

## Rules
- **Instant Death**: If `playerIndex` matches any index in `hazardsAndItems.slice(6, 12)`, the Game Over sequence is triggered.
- **Stationary Hazard**: Pits cannot be destroyed or moved; they remain active for the duration of the level.
- **Hint Layer**: Pits trigger a "HEAT" hint in adjacent cells, visible once the adjacent cell is visited.

## Edge Cases
- **Overlap with Hints**: If a cell is adjacent to both a Pit and an Enemy, both "HEAT" and "ROAR" hints may be displayed simultaneously in `BoardView`.
- **Level Regeneration**: Pit locations are reset during `level-progression`.
