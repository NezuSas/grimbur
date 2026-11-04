import type { ImageSourcePropType } from 'react-native';
import type { WeaponId } from '../core/engine/weapons';

/** The picture of each weapon's ammo (HUD, board pickup, shop, encounters): a bundle of arrows, an arcane orb, a lit bomb. */
export const AMMO_ART: Record<WeaponId, ImageSourcePropType> = {
  bow: require('../assets/sprites/items/Icon_Arrows.webp'),
  orb: require('../assets/sprites/items/Icon_Orb.webp'),
  bomb: require('../assets/sprites/items/Icon_Bomb_Ammo.webp'),
};
