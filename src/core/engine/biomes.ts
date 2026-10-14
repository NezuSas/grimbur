import { isLairFloor } from './lair';
import type { GameMode } from './seed';

/**
 * Every three floors the cave changes and brings one rule with it:
 *  - cave:    the plain caves (floors 1-3), no rule.
 *  - crystal: crystal veins (4-6): one more shield lies on every floor.
 *  - magma:   magma tunnels (7-9): one more vortex, but one more arrow lies on the floor.
 *  - lair:    the Wumpus' lair keeps its own look.
 * The endless descent keeps cycling through them. Floors take their biome from the floor number alone.
 */
export type BiomeId = 'cave' | 'crystal' | 'magma' | 'lair';

export interface BiomeEffects {
  extraShields: number;
  extraPits: number;
  extraAmmo: number;
}

export const BIOMES: Record<BiomeId, BiomeEffects> = {
  cave: { extraShields: 0, extraPits: 0, extraAmmo: 0 },
  crystal: { extraShields: 1, extraPits: 0, extraAmmo: 0 },
  magma: { extraShields: 0, extraPits: 1, extraAmmo: 1 },
  lair: { extraShields: 0, extraPits: 0, extraAmmo: 0 },
};

const CYCLE: readonly BiomeId[] = ['cave', 'crystal', 'magma'];

export function biomeFor(level: number, mode: GameMode = 'expedition'): BiomeId {
  if (isLairFloor(mode, level)) return 'lair';
  return CYCLE[Math.floor((Math.max(1, level) - 1) / 3) % CYCLE.length];
}

/** True on the first floor of a biome after the first one (the screen announces it). */
export const isNewBiome = (level: number, mode: GameMode = 'expedition'): boolean =>
  level > 1 && biomeFor(level, mode) !== biomeFor(level - 1, mode);
