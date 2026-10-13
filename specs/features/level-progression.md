# Feature: Level Progression

## Description
Handles the transition between levels when the player successfully collects all required items. This involves regenerating the game board and increasing the difficulty (implicitly or explicitly).

## Inputs
- **Coin Count**: The current `coins` state (triggers when it reaches 0).
- **Current Level**: The current `level` number.

## Outputs
- **Updated State**: `level` incremented, `hazardsAndItems` regenerated with new random positions, `visited` reset to `[0]`, `playerIndex` reset to `0`, `coins` reset to `5`.
- **Feedback**: Plays the victory sound effect, displays the character-specific "Win" image in a "Level Up" modal for approximately 5 seconds.

## Rules
- **Trigger**: Progression is strictly bound to the collection of 5 coins (`coins === 0`).
- **Reset Phase**:
    1. Increment `level` (used for display and high score record).
    2. Regenerate `hazardsAndItems` using `randomPositions()`.
    3. Reset Player position to the top-left corner (index 0).
    4. Reset fog of war (`visited` list) to only include the starting cell.
- **Interruption**: Background music (`soundState.jugando`) is stopped during the "Level Up" modal and resumed once the next level begins.

## Edge Cases
- **High Scores**: Level progression does not automatically save a record to the database; this only happens during Game Over if the score is sufficient.
- **Post-Victory Death**: If a player somehow touches a hazard exactly when the victory condition is met, the victory takes precedence due to the immediate modal display and state resets.
