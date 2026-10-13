# Feature: Player Movement

## Description
Allows the player to navigate the board in four cardinal directions (Up, Down, Left, Right) using the Direction Pad. Movement incurs a score penalty and reveals the destination cell if it was hidden.

## Inputs
- **Directional Commands**: Up, Down, Left, Right from the `DirectionPad` component.
- **Current State**: `playerIndex`, `boardCells`, `visited`, `modalGameOver`.

## Outputs
- **Updated State**: New `playerIndex`, updated `visited` array, updated `score`, updated `facingDir`.
- **Feedback**: Movement sound effect, visual update of the character position.

## Rules
- **Boundary Check**: Movement is restricted by the board edges (e.g., cannot move Left if current index is in `LEFT_ROW`).
- **Score Penalty**: Each successful move deducts 10 points from the current `score`.
- **Visibility**: The destination cell is added to the `visited` list, removing the "fog" in the UI.
- **Orientation**: The `facingDir` property is updated to match the last movement command, which affects the player's arrow indicator.
- **State Guard**: Movement is disabled if `modalGameOver` is active.

## Edge Cases
- **Board Corners**: Player at (0,0) index can only move Right or Down.
- **Rapid Input**: Logic must handle sequential movement calls without state corruption (ensured by React's functional state updates).
- **Collision during Move**: If the player moves into a hazard, the movement logic completes (index updates) before the collision logic triggers the game over state.
