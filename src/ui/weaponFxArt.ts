import type { ImageSourcePropType } from 'react-native';
import type { CosmeticId } from '../core/cosmetics/cosmetics';

/** The painted weapon effects, four frames each, one recoloured set per embers-shop style (scripts/processWeaponFx.py). */
export type FxFrames = readonly [ImageSourcePropType, ImageSourcePropType, ImageSourcePropType, ImageSourcePropType];

/** Bram's bomb: the flames left on the blast tiles. */
export const FLAME_FX: Record<string, FxFrames> = {
  default: [require('../assets/sprites/fx/Flame_default_0.webp'), require('../assets/sprites/fx/Flame_default_1.webp'), require('../assets/sprites/fx/Flame_default_2.webp'), require('../assets/sprites/fx/Flame_default_3.webp')],
  bomb_ember: [require('../assets/sprites/fx/Flame_bomb_ember_0.webp'), require('../assets/sprites/fx/Flame_bomb_ember_1.webp'), require('../assets/sprites/fx/Flame_bomb_ember_2.webp'), require('../assets/sprites/fx/Flame_bomb_ember_3.webp')],
  bomb_frost: [require('../assets/sprites/fx/Flame_bomb_frost_0.webp'), require('../assets/sprites/fx/Flame_bomb_frost_1.webp'), require('../assets/sprites/fx/Flame_bomb_frost_2.webp'), require('../assets/sprites/fx/Flame_bomb_frost_3.webp')],
  bomb_venom: [require('../assets/sprites/fx/Flame_bomb_venom_0.webp'), require('../assets/sprites/fx/Flame_bomb_venom_1.webp'), require('../assets/sprites/fx/Flame_bomb_venom_2.webp'), require('../assets/sprites/fx/Flame_bomb_venom_3.webp')],
  bomb_storm: [require('../assets/sprites/fx/Flame_bomb_storm_0.webp'), require('../assets/sprites/fx/Flame_bomb_storm_1.webp'), require('../assets/sprites/fx/Flame_bomb_storm_2.webp'), require('../assets/sprites/fx/Flame_bomb_storm_3.webp')],
  bomb_void: [require('../assets/sprites/fx/Flame_bomb_void_0.webp'), require('../assets/sprites/fx/Flame_bomb_void_1.webp'), require('../assets/sprites/fx/Flame_bomb_void_2.webp'), require('../assets/sprites/fx/Flame_bomb_void_3.webp')],
  bomb_royal: [require('../assets/sprites/fx/Flame_bomb_royal_0.webp'), require('../assets/sprites/fx/Flame_bomb_royal_1.webp'), require('../assets/sprites/fx/Flame_bomb_royal_2.webp'), require('../assets/sprites/fx/Flame_bomb_royal_3.webp')],
};

/** Mira's orb: the arcane burst on the lit tiles. */
export const ARCANE_FX: Record<string, FxFrames> = {
  default: [require('../assets/sprites/fx/Arcane_default_0.webp'), require('../assets/sprites/fx/Arcane_default_1.webp'), require('../assets/sprites/fx/Arcane_default_2.webp'), require('../assets/sprites/fx/Arcane_default_3.webp')],
  orb_frost: [require('../assets/sprites/fx/Arcane_orb_frost_0.webp'), require('../assets/sprites/fx/Arcane_orb_frost_1.webp'), require('../assets/sprites/fx/Arcane_orb_frost_2.webp'), require('../assets/sprites/fx/Arcane_orb_frost_3.webp')],
  orb_ember: [require('../assets/sprites/fx/Arcane_orb_ember_0.webp'), require('../assets/sprites/fx/Arcane_orb_ember_1.webp'), require('../assets/sprites/fx/Arcane_orb_ember_2.webp'), require('../assets/sprites/fx/Arcane_orb_ember_3.webp')],
  orb_venom: [require('../assets/sprites/fx/Arcane_orb_venom_0.webp'), require('../assets/sprites/fx/Arcane_orb_venom_1.webp'), require('../assets/sprites/fx/Arcane_orb_venom_2.webp'), require('../assets/sprites/fx/Arcane_orb_venom_3.webp')],
  orb_void: [require('../assets/sprites/fx/Arcane_orb_void_0.webp'), require('../assets/sprites/fx/Arcane_orb_void_1.webp'), require('../assets/sprites/fx/Arcane_orb_void_2.webp'), require('../assets/sprites/fx/Arcane_orb_void_3.webp')],
  orb_stars: [require('../assets/sprites/fx/Arcane_orb_stars_0.webp'), require('../assets/sprites/fx/Arcane_orb_stars_1.webp'), require('../assets/sprites/fx/Arcane_orb_stars_2.webp'), require('../assets/sprites/fx/Arcane_orb_stars_3.webp')],
  orb_royal: [require('../assets/sprites/fx/Arcane_orb_royal_0.webp'), require('../assets/sprites/fx/Arcane_orb_royal_1.webp'), require('../assets/sprites/fx/Arcane_orb_royal_2.webp'), require('../assets/sprites/fx/Arcane_orb_royal_3.webp')],
};

/** The flames of a bomb style (the default set when none is worn). */
export const flameFx = (id: CosmeticId | null | undefined): FxFrames => (id && FLAME_FX[id]) || FLAME_FX.default;
/** The arcane burst of an orb style (the default set when none is worn). */
export const arcaneFx = (id: CosmeticId | null | undefined): FxFrames => (id && ARCANE_FX[id]) || ARCANE_FX.default;
