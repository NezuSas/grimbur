# Level Progression

## Scenario: Triggering Level Up
Given the player has 1 coin remaining in the level
When the player collects the last coin
Then the 'isLevelUp' state should be set to true

## Scenario: Resetting state on Level Up
Given the game is in 'isLevelUp' state
When the 'LEVEL_UP' action is dispatched
Then the level count should increment
And the player position should reset to 0
And the visited cells should be reset to [0]
And a new board and hazard layout should be generated
And the current score should be preserved
And the remaining arrows should be preserved
And the coin count should reset to 5
