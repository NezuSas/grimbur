import type { ImageSourcePropType } from 'react-native';
import type { RelicId } from '../core/engine/relics';

/** One illustration per relic. The cursed relics have no art yet: the screens fall back to their emoji. */
export const RELIC_IMAGES: Partial<Record<RelicId, ImageSourcePropType>> = {
  quiver: require('../assets/sprites/relics/quiver.png'),
  lucky_coin: require('../assets/sprites/relics/lucky_coin.png'),
  iron_boots: require('../assets/sprites/relics/iron_boots.png'),
  lantern: require('../assets/sprites/relics/lantern.png'),
  phoenix: require('../assets/sprites/relics/phoenix.png'),
  hunter: require('../assets/sprites/relics/hunter.png'),
  long_bow: require('../assets/sprites/relics/long_bow.png'),
  bulwark: require('../assets/sprites/relics/bulwark.png'),
  greed: require('../assets/sprites/relics/greed.png'),
  frost: require('../assets/sprites/relics/frost.png'),
  trap_sense: require('../assets/sprites/relics/trap_sense.png'),
};
