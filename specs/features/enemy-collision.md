# Feature: Enemy Collision

## Description
Detects when the player enters the same cell as an enemy (Wumpus/Goomba). This event results in immediate failure and triggers the Game Over sequence.

## Inputs
- **Player Index**: The current `playerIndex`.
- **Enemy Positions**: Indices 0-5 of the `hazardsAndItems` array.

## Outputs
- **Updated State**: `modalGameOver` set to `true`, `flagGameOverOnce` incremented.
- **Feedback**: Stops background music, plays the death sound effect, and displays the character-specific "Lose" image.

## Rules
- **Instant Death**: If `playerIndex` matches any index in `hazardsAndItems.slice(0, 6)`, the Game Over sequence is triggered.
- **Single Trigger**: `flagGameOverOnce` ensures the Game Over logic doesn't re-run multiple times per death.
- **Persistence**: If the player achieves a high score before dying, the High Score modal may take precedence based on the final score.

## Edge Cases
- **Killed Enemy**: If an enemy has been removed (index set to 200), collision at that specific cell no longer triggers Game Over.
- **Simultaneous Events**: Collision checks occur after movement updates, ensuring the player is visually on the enemy cell before the modal appears.
