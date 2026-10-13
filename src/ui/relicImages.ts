import type { ImageSourcePropType } from 'react-native';
import type { RelicId } from '../core/engine/relics';

/** One illustration per relic. Typed as a full record so a new relic cannot ship without its art. */
export const RELIC_IMAGES: Record<RelicId, ImageSourcePropType> = {
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
