import type { ImageSourcePropType } from 'react-native';
import type { AbilityId } from '../core/engine/abilities';
import type { ShopItem } from '../core/engine/shop';

/** The one-use items and the undo, as pictures (they are drawn on the toolbar, in the shop and in the manual). */
export const TOOL_ART = {
  detector: require('../assets/sprites/tools/Tool_Detector.webp'),
  bomb: require('../assets/sprites/tools/Tool_Bomb.webp'),
  undo: require('../assets/sprites/tools/Tool_Undo.webp'),
} as const satisfies Record<string, ImageSourcePropType>;

/** One picture per hero ability. */
export const ABILITY_ART: Record<AbilityId, ImageSourcePropType> = {
  scout: require('../assets/sprites/tools/Ability_Scout.webp'),
  volley: require('../assets/sprites/tools/Ability_Volley.webp'),
  brace: require('../assets/sprites/tools/Ability_Brace.webp'),
  magnet: require('../assets/sprites/tools/Ability_Magnet.webp'),
  flare: require('../assets/sprites/tools/Ability_Flare.webp'),
  blast: require('../assets/sprites/tools/Ability_Blast.webp'),
};

/** What each shop card shows. */
export const SHOP_ART: Record<ShopItem, ImageSourcePropType> = {
  arrows: require('../assets/sprites/tools/Shop_Arrows.webp'),
  shield: require('../assets/sprites/items/Icon_Shield.webp'),
  detector: TOOL_ART.detector,
  bomb: TOOL_ART.bomb,
};

export const ALTAR_ART: ImageSourcePropType = require('../assets/sprites/tools/Shop_Altar.webp');

/** Every picture of this set (for the start-up preload). */
export const allToolImages = (): ImageSourcePropType[] => [
  ...Object.values(TOOL_ART),
  ...Object.values(ABILITY_ART),
  SHOP_ART.arrows,
  ALTAR_ART,
];
