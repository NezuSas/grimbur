# Trap Tiles

## Scenario: Player steps on a trap tile
Given the player is at index 0
And there is a trap at index 1
And the current score is 1000
When the player moves 'RIGHT' onto index 1
Then the player index should be 1
And the score should decrease by 500
And the trap at index 1 should disappear (replaced with 200)
And isGameOver should remain false
And the game should continue normally

## Scenario: Multiple traps on the board
Given there are traps at indices 1 and 2
When the player steps on index 1
Then only the trap at index 1 is removed
And the trap at index 2 remains

## Scenario: Stepping on a trap when score is below 500
Given the player is at index 0
And there is a trap at index 1
And the current score is 200
When the player moves 'RIGHT' onto index 1
Then the score should not go below 0
And the game should continue (not game over)
