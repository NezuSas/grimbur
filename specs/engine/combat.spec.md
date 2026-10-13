# Combat Mechanics

## Scenario: Successful attack on an enemy
Given the player is at index 0 and facing 'RIGHT'
And there is an enemy at index 1
And the player has 3 arrows
When the player performs an 'ATTACK'
Then the hazard at index 1 should be removed (replaced with 200)
And the player's arrow count should be 2
And the player position should remain at index 0

## Scenario: Attack missing (no enemy in facing direction)
Given the player is at index 0 and facing 'DOWN'
And there is an enemy at index 1
And the player has 3 arrows
When the player performs an 'ATTACK'
Then the enemy at index 1 should remain
And the player's arrow count should be 2

## Scenario: Attack failure when no arrows remain
Given the player has 0 arrows
When the player performs an 'ATTACK'
Then the game state should remain unchanged
And the arrow count should remain 0
