/**
 * Centralized Difficulty scaling for Wumpus Adventures.
 * Based on the refined "Density over Magnitude" progression model.
 */
export function getDifficulty(level: number) {
  const enemies = Math.min(12, 1 + Math.floor(level / 2));
  return {
    // Grid starts small (8x5) and grows gradually per level
    rows: Math.min(10, 5 + Math.floor(level / 3)),
    cols: Math.min(20, 8 + Math.floor(level / 2)),
    // Coin count caps at 8
    coins: Math.min(8, 3 + Math.floor(level / 3)),
    // Hazards scale slowly (and cap) to prevent overcrowding
    enemies,
    pits: Math.min(10, 2 + Math.floor(level / 2.5)),
    // Hidden traps appear from level 3 and cap at 4
    traps: level >= 3 ? Math.min(4, Math.floor((level - 1) / 2)) : 0,
    // One shield from level 2 on; one more every 8 levels (max 3)
    shields: level >= 2 ? Math.min(3, 1 + Math.floor(level / 8)) : 0,
    // Extra arrows lying on the board
    ammoPickups: level >= 2 ? Math.min(4, 1 + Math.floor(level / 6)) : 0,
    // Ample ammo provided for a fair mid-game (1.5x enemies)
    attackCharges: Math.ceil(enemies * 1.5),
  };
}
