# Player Movement

## Scenario: Moving within board boundaries
Given the player is at index 15 (row 1, col 0) on an 8x15 board
And the game is active
When the player moves 'RIGHT'
Then the player index should be 16
And the score should be reduced by 10 points
And cell 16 should be marked as visited

## Scenario: Preventing movement outside the left board boundary
Given the player is at index 15 (row 1, col 0)
When the player moves 'LEFT'
Then the player index should remain 15
And the player should face 'LEFT'
And the score should remain unchanged

## Scenario: Preventing movement outside the top board boundary
Given the player is at index 5 (row 0, col 5)
When the player moves 'UP'
Then the player index should remain 5
And the player should face 'UP'
And the score should remain unchanged

## Scenario: Visited cells tracking
Given the player is at index 0
And the visited cells list contains [0]
When the player moves 'RIGHT' to index 1
Then the visited cells list should be [0, 1]
When the player moves 'LEFT' back to index 0
Then the visited cells list should still be [0, 1] (no duplicates)
