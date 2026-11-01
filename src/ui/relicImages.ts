import type { ImageSourcePropType } from 'react-native';
import type { RelicId } from '../core/engine/relics';

/** One illustration per relic, cursed ones included. */
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
  blood_pact: require('../assets/sprites/relics/blood_pact.png'),
  hasty_boots: require('../assets/sprites/relics/hasty_boots.png'),
  greedy_idol: require('../assets/sprites/relics/greedy_idol.png'),
  glass_bow: require('../assets/sprites/relics/glass_bow.png'),
  echo_arrow: require('../assets/sprites/relics/echo_arrow.png'),
  piercing: require('../assets/sprites/relics/piercing.png'),
  magnet: require('../assets/sprites/relics/magnet.png'),
  raven_eye: require('../assets/sprites/relics/raven_eye.png'),
  thorns: require('../assets/sprites/relics/thorns.png'),
  bomb_belt: require('../assets/sprites/relics/bomb_belt.png'),
  owl: require('../assets/sprites/relics/owl.png'),
  toll_free: require('../assets/sprites/relics/toll_free.png'),
  gambler: require('../assets/sprites/relics/gambler.png'),
};
