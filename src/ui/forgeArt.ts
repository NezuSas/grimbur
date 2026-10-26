import type { ImageSourcePropType } from 'react-native';
import type { UpgradeId } from '../core/stats/forge';

/**
 * Painted icons for the Forge upgrades that are not relic-granting (those borrow the relic's own art).
 * Generated as one sheet (consistent style) and cut with scripts/sliceIconGrid.py.
 */
export const FORGE_ICONS: Partial<Record<UpgradeId, ImageSourcePropType>> = {
  whetstone: require('../assets/sprites/forge/whetstone.png'),
  ward: require('../assets/sprites/forge/ward.png'),
  explorer: require('../assets/sprites/forge/explorer.png'),
  scribe: require('../assets/sprites/forge/scribe.png'),
  eagle_eye: require('../assets/sprites/forge/eagle_eye.png'),
  satchel: require('../assets/sprites/forge/satchel.png'),
  swift: require('../assets/sprites/forge/swift.png'),
  second_wind: require('../assets/sprites/forge/second_wind.png'),
  purse: require('../assets/sprites/forge/purse.png'),
  fortune: require('../assets/sprites/forge/fortune.png'),
};
