# Coin Collection

## Scenario: Collecting a coin
Given the player is at index 0
And there is a coin at index 1
And the current score is 1000
And the remaining coins count is 5
When the player moves 'RIGHT' onto index 1
Then the coin at index 1 should be collected
And the item at that index in hazardsAndItems should be replaced with 200
And the score should increase by 1000 net points
And the remaining coins count should be 4
