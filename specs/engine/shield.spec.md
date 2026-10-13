# Shield Mechanic Specification

## Feature: Shield protection

The shield allows the player to survive one lethal hazard (enemy or pit)
without triggering game over.

---

### Scenario: Player activates shield
Given the player has a shield available
When the player activates the shield
Then the player shield becomes active

---

### Scenario: Shield blocks enemy collision
Given the player has an active shield
And the player moves onto an enemy tile
Then the enemy does not cause game over
And the shield is consumed

---

### Scenario: Shield blocks pit collision
Given the player has an active shield
And the player moves onto a pit tile
Then the player survives
And the shield is consumed

---

### Scenario: Shield expires after activation
Given the shield has blocked a hazard
Then the shield becomes inactive