import type { ImageSourcePropType } from 'react-native';
import type { CosmeticId } from '../core/cosmetics/cosmetics';
import type { BiomeId } from '../core/engine/biomes';

/** How a trail looks in flight: its painted arrow, and the two colours its sparks and wake alternate. */
export interface TrailLook {
  arrow: ImageSourcePropType;
  colors: readonly [string, string];
}

export const TRAIL_LOOKS: Partial<Record<CosmeticId, TrailLook>> = {
  trail_fire: { arrow: require('../assets/sprites/cosmetics/Arrow_Fire.png'), colors: ['#FF7A1A', '#FFD54F'] },
  trail_frost: { arrow: require('../assets/sprites/cosmetics/Arrow_Frost.png'), colors: ['#7FDBFF', '#E6F7FF'] },
  trail_storm: { arrow: require('../assets/sprites/cosmetics/Arrow_Storm.png'), colors: ['#FFF59D', '#B3E5FC'] },
  trail_shadow: { arrow: require('../assets/sprites/cosmetics/Arrow_Shadow.png'), colors: ['#7E57C2', '#2A1A40'] },
  trail_stars: { arrow: require('../assets/sprites/cosmetics/Arrow_Stars.png'), colors: ['#FFD54F', '#FFFFFF'] },
};

/** The painted ring drawn around a player's portrait (in rankings, duels and the collection). */
export const FRAME_ART: Partial<Record<CosmeticId, ImageSourcePropType>> = {
  frame_bronze: require('../assets/sprites/cosmetics/Frame_Bronze.png'),
  frame_silver: require('../assets/sprites/cosmetics/Frame_Silver.png'),
  frame_gold: require('../assets/sprites/cosmetics/Frame_Gold.png'),
  frame_frost: require('../assets/sprites/cosmetics/Frame_Frost.png'),
  frame_ember: require('../assets/sprites/cosmetics/Frame_Ember.png'),
  frame_abyss: require('../assets/sprites/cosmetics/Frame_Abyss.png'),
  frame_crown: require('../assets/sprites/cosmetics/Frame_Crown.png'),
  frame_wardrobe: require('../assets/sprites/cosmetics/Frame_Wardrobe.png'),
};

/** The biome whose tiles and backdrop a board theme paints the floor with. */
export const BOARD_BIOME: Partial<Record<CosmeticId, BiomeId>> = {
  board_cave: 'cave',
  board_crystal: 'crystal',
  board_magma: 'magma',
  board_lair: 'lair',
};

export const allCosmeticImages = (): ImageSourcePropType[] => [...Object.values(TRAIL_LOOKS).map(t => t!.arrow), ...Object.values(FRAME_ART) as ImageSourcePropType[]];
