import type { ImageSourcePropType } from 'react-native';
import type { WeaponId } from '../core/engine/weapons';

/**
 * The picture of each weapon's ammo (HUD, board pickup, shop, attack button). Placeholders until the painted orb and bomb
 * art lands: the arrows bundle for the bow, the existing bomb tool for the bomb, a magic glyph for the orb.
 */
export const AMMO_ART: Record<WeaponId, ImageSourcePropType> = {
  bow: require('../assets/sprites/items/Icon_Arrows.webp'),
  orb: require('../assets/sprites/items/Icon_Darkness.webp'),
  bomb: require('../assets/sprites/tools/Tool_Bomb.webp'),
};
