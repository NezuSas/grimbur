# Hazard Collisions

## Scenario: Collision with an Enemy
Given an enemy is located at index 5
When the player moves onto index 5
Then the game over state should be triggered (isGameOver = true)

## Scenario: Collision with a Pit
Given a pit is located at index 10
When the player moves onto index 10
Then the game over state should be triggered (isGameOver = true)
