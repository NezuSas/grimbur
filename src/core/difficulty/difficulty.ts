import { GAME_CONFIG } from '../../config/gameConfig';

/** Biggest board: the endless descent gets harder through density and hunters, not through longer floors. */
export const MAX_ROWS = 8;
export const MAX_COLS = 13;

/**
 * Centralized Difficulty scaling for Wumpus Adventures.
 * Based on the refined "Density over Magnitude" progression model.
 */
export function getDifficulty(level: number) {
  // Gentle early floors, a steeper climb later: enemies ~ 2, 3, 4, 5, 7, 8, 10, 11, 13, 14 at floors 1..10
  // (the third floor already gets the extra guardian so the first real tension arrives early).
  const enemies = Math.min(14, 2 + Math.floor((level * level) / 12 + level * 0.4) + (level >= 3 ? 1 : 0) + (level >= 7 ? 1 : 0));
  return {
    // Grid starts small (8x5) and grows gradually per level, up to 8x13
    rows: Math.min(MAX_ROWS, 5 + Math.floor(level / 3)),
    cols: Math.min(MAX_COLS, 8 + Math.floor(level / 2)),
    // Coin count caps at 8
    coins: Math.min(8, 3 + Math.floor(level / 3)),
    // Hazards scale slowly (and cap) to prevent overcrowding
    enemies,
    pits: Math.min(11, 2 + Math.floor(level * 0.8) + (level >= 5 ? 1 : 0)),
    // Roaming stalkers break static Minesweeper deduction: always one from floor 7, two from floor 11 (endless).
    // Floors 4-5 may get a single one (`stalkerChance`, rolled by the generator from the floor seed).
    stalkers: level >= GAME_CONFIG.stalker.minFloor ? Math.min(2, 1 + Math.floor((level - GAME_CONFIG.stalker.minFloor) / 4)) : 0,
    stalkerChance:
      level >= GAME_CONFIG.stalker.earlyFloor && level <= GAME_CONFIG.stalker.earlyLastFloor ? GAME_CONFIG.stalker.earlyChance : 0,
    // Hidden traps appear from level 3 and cap at 4
    traps: level >= 3 ? Math.min(4, Math.floor((level - 1) / 2)) : 0,
    // One shield from level 2 on; one more every 8 levels (max 3)
    shields: level >= 2 ? Math.min(3, 1 + Math.floor(level / 8)) : 0,
    // Extra arrows lying on the board
    ammoPickups: level >= 2 ? Math.min(4, 1 + Math.floor(level / 6)) : 0,
    // Arrows are a resource: about 0.7 per guardian plus one. Unused ones carry over (up to 4) to the next floor.
    attackCharges: attackChargesFor(enemies),
  };
}

/** Arrows a floor starts with for `enemies` guardians. */
export const attackChargesFor = (enemies: number): number => Math.ceil(enemies * 0.7) + 1;
