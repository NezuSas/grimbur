import type { ImageSourcePropType } from 'react-native';
import type { UpgradeId } from '../core/stats/forge';

/**
 * Painted icons for the Forge upgrades that are not relic-granting (those borrow the relic's own art).
 * Generated as one sheet (consistent style) and cut with scripts/sliceIconGrid.py.
 */
export const FORGE_ICONS: Partial<Record<UpgradeId, ImageSourcePropType>> = {
  whetstone: require('../assets/sprites/forge/whetstone.webp'),
  ward: require('../assets/sprites/forge/ward.webp'),
  explorer: require('../assets/sprites/forge/explorer.webp'),
  scribe: require('../assets/sprites/forge/scribe.webp'),
  eagle_eye: require('../assets/sprites/forge/eagle_eye.webp'),
  satchel: require('../assets/sprites/forge/satchel.webp'),
  swift: require('../assets/sprites/forge/swift.webp'),
  second_wind: require('../assets/sprites/forge/second_wind.webp'),
  purse: require('../assets/sprites/forge/purse.webp'),
  fortune: require('../assets/sprites/forge/fortune.webp'),
};
