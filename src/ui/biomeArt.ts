import type { ImageSourcePropType } from 'react-native';
import type { BiomeId } from '../core/engine/biomes';

/** The look of each cave type: the picture behind the board and the two tiles (fogged and uncovered) the board is made of. */
export interface BiomeArt {
  background: ImageSourcePropType;
  tileHidden: ImageSourcePropType;
  tileRevealed: ImageSourcePropType;
}

export const BIOME_ART: Record<BiomeId, BiomeArt> = {
  cave: {
    background: require('../assets/sprites/backgrounds/Cover_Background.png'),
    tileHidden: require('../assets/sprites/tiles/Tile_Hidden.png'),
    tileRevealed: require('../assets/sprites/tiles/Tile_Revealed.png'),
  },
  crystal: {
    background: require('../assets/sprites/backgrounds/Bg_Crystal.jpg'),
    tileHidden: require('../assets/sprites/tiles/Tile_Hidden_Crystal.png'),
    tileRevealed: require('../assets/sprites/tiles/Tile_Revealed_Crystal.png'),
  },
  magma: {
    background: require('../assets/sprites/backgrounds/Bg_Magma.jpg'),
    tileHidden: require('../assets/sprites/tiles/Tile_Hidden_Magma.png'),
    tileRevealed: require('../assets/sprites/tiles/Tile_Revealed_Magma.png'),
  },
  lair: {
    background: require('../assets/sprites/backgrounds/Bg_Lair.jpg'),
    tileHidden: require('../assets/sprites/tiles/Tile_Hidden_Lair.png'),
    tileRevealed: require('../assets/sprites/tiles/Tile_Revealed_Lair.png'),
  },
};

/** Every picture of every biome (for the start-up preload). */
export const allBiomeImages = (): ImageSourcePropType[] =>
  Object.values(BIOME_ART).flatMap(a => [a.background, a.tileHidden, a.tileRevealed]);
