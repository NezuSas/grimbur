import type { ImageSourcePropType } from 'react-native';
import type { AbilityId } from '../core/engine/abilities';
import type { ShopItem } from '../core/engine/shop';

/** The one-use items and the undo, as pictures (they are drawn on the toolbar, in the shop and in the manual). */
export const TOOL_ART = {
  detector: require('../assets/sprites/tools/Tool_Detector.png'),
  bomb: require('../assets/sprites/tools/Tool_Bomb.png'),
  undo: require('../assets/sprites/tools/Tool_Undo.png'),
} as const satisfies Record<string, ImageSourcePropType>;

/** One picture per hero ability. */
export const ABILITY_ART: Record<AbilityId, ImageSourcePropType> = {
  scout: require('../assets/sprites/tools/Ability_Scout.png'),
  volley: require('../assets/sprites/tools/Ability_Volley.png'),
  brace: require('../assets/sprites/tools/Ability_Brace.png'),
  magnet: require('../assets/sprites/tools/Ability_Magnet.png'),
};

/** What each shop card shows. */
export const SHOP_ART: Record<ShopItem, ImageSourcePropType> = {
  arrows: require('../assets/sprites/tools/Shop_Arrows.png'),
  shield: require('../assets/sprites/items/Icon_Shield.png'),
  detector: TOOL_ART.detector,
  bomb: TOOL_ART.bomb,
};

export const ALTAR_ART: ImageSourcePropType = require('../assets/sprites/tools/Shop_Altar.png');

/** Every picture of this set (for the start-up preload). */
export const allToolImages = (): ImageSourcePropType[] => [
  ...Object.values(TOOL_ART),
  ...Object.values(ABILITY_ART),
  SHOP_ART.arrows,
  ALTAR_ART,
];
