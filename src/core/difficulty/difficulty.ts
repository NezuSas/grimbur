/**
 * Centralized Difficulty scaling for Wumpus Adventures.
 * Based on the refined "Density over Magnitude" progression model.
 */
export function getDifficulty(level: number) {
  return {
    // Grid starts small (8x5) and grows gradually per level
    rows: Math.min(10, 5 + Math.floor(level / 3)),
    cols: Math.min(20, 8 + Math.floor(level / 2)),
    // Coin count caps at 8
    coins: Math.min(8, 3 + Math.floor(level / 3)),
    // Hazards scale slowly to prevent overcrowding
    enemies: 1 + Math.floor(level / 2),
    pits: 2 + Math.floor(level / 2.5),
    // Ample ammo provided for a fair mid-game (1.5x enemies)
    attackCharges: Math.ceil((1 + Math.floor(level / 2)) * 1.5)
  };
}
