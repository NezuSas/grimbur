# Grimbur Domain Model

## Core Entities

### 1. Board
- **Description**: The primary game space where all activities occur. It is structured as a 2D grid but often represented as a flat array for logic processing.
- **Properties**:
    - `rows`: Total vertical units (Default: 8).
    - `cols`: Total horizontal units (Default: 15).
    - `cells`: An array of cell indices representing the grid.
- **Relationships**:
    - Contains multiple **Cells**.
    - Hosts the **Player**, **Enemies**, **Pits**, and **Coins**.

### 2. Cell
- **Description**: A single unit of space on the Board.
- **Properties**:
    - `index`: Unique identifier (0 to 119 in a standard 8x15 board).
    - `coordinates`: (row, col) representation.
    - `state`: VISITED or HIDDEN (fog of war).
- **Relationships**:
    - Part of the **Board**.
    - May contain one or more entities (Hazard, Item, or Player).

### 3. Player
- **Description**: The entity controlled by the user.
- **Properties**:
    - `position`: Current cell index on the board.
    - `score`: Current points accumulated.
    - `attack`: Number of available arrows (Default starts at 3).
    - `coinsToCollect`: Remaining coins needed to advance the level (Starts at 5).
    - `facingDirection`: Current orientation (Up, Down, Left, Right).
- **Relationships**:
    - Uses a **Character** as its avatar.
    - Interacts with **Enemies** (Attack/Death).
    - Interacts with **Pits** (Death).
    - Interacts with **Coins** (Collection).

### 4. Enemy
- **Description**: A mobile hazard (modeled after the classic Grimbur/Goomba).
- **Properties**:
    - `position`: Assigned cell index.
    - `isAlive`: Boolean state (Enemies can be killed).
- **Responsibilities**:
    - Causes "Game Over" if the Player enters its cell.
    - Emits a "ROAR" hint to adjacent cells.
- **Relationships**:
    - Placed on the **Board**.
    - Can be eliminated by a **Player**'s attack if adjacent.

### 5. Pit
- **Description**: A stationary environmental hazard.
- **Properties**:
    - `position`: Assigned cell index.
- **Responsibilities**:
    - Causes "Game Over" if the Player enters its cell.
    - Emits a "HEAT" hint to adjacent cells.
- **Relationships**:
    - Placed on the **Board**.
    - Cannot be eliminated.

### 6. Coin (Gold)
- **Description**: Collectible items required for level advancement.
- **Properties**:
    - `position`: Assigned cell index.
- **Responsibilities**:
    - Increases Player's score when collected.
    - Decrements the required coin count for the current level.
- **Relationships**:
    - Placed on the **Board**.
    - Collected by the **Player**.

### 7. Character
- **Description**: Predefined templates for the Player's avatar.
- **Properties**:
    - `playerName`: Name (e.g., Cyan Explorer, Scarlet Archer, Moss Warden, Gilded Delver).
    - `assets`: specific images for idle, attack, win, and lose states.
    - `arrowColor`: The visual theme for the player's attacks.
- **Relationships**:
    - Selected by the user to instantiate the **Player**.

### 8. HighScore
- **Description**: A record of a completed game session.
- **Properties**:
    - `name`: Player's entered name.
    - `score`: Final score achieved.
    - `level`: Highest level reached.
- **Relationships**:
    - Generated from a finished **Player** session.
