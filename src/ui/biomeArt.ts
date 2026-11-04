import type { ImageSourcePropType } from 'react-native';
import type { BiomeId } from '../core/engine/biomes';

/** The look of each cave type: the picture behind the board and the two tiles (fogged and uncovered) the board is made of. */
export interface BiomeArt {
  background: ImageSourcePropType;
  tileHidden: ImageSourcePropType;
  tileRevealed: ImageSourcePropType;
}

/**
 * The tiles painted as stone blocks (the top face and, below it, the block's front edge) for the tilted board: a flat
 * top-down tile tilted reads as a bent photo, a block reads as a table. Caves without them yet keep their flat tiles.
 */
export const BLOCK_ART: Partial<Record<ArtTheme, Pick<BiomeArt, 'tileHidden' | 'tileRevealed'>>> = {
  cave: {
    tileHidden: require('../assets/sprites/tiles/Tile_Hidden_Block.webp'),
    tileRevealed: require('../assets/sprites/tiles/Tile_Revealed_Block.webp'),
  },
};

/** A look the floor can be painted with: every cave type, plus the board themes that are looks only (Collection). */
export type ArtTheme = BiomeId | 'frost' | 'moss' | 'vault';

export const BIOME_ART: Record<ArtTheme, BiomeArt> = {
  cave: {
    background: require('../assets/sprites/backgrounds/Cover_Background.jpg'),
    tileHidden: require('../assets/sprites/tiles/Tile_Hidden.webp'),
    tileRevealed: require('../assets/sprites/tiles/Tile_Revealed.webp'),
  },
  crystal: {
    background: require('../assets/sprites/backgrounds/Bg_Crystal.jpg'),
    tileHidden: require('../assets/sprites/tiles/Tile_Hidden_Crystal.webp'),
    tileRevealed: require('../assets/sprites/tiles/Tile_Revealed_Crystal.webp'),
  },
  magma: {
    background: require('../assets/sprites/backgrounds/Bg_Magma.jpg'),
    tileHidden: require('../assets/sprites/tiles/Tile_Hidden_Magma.webp'),
    tileRevealed: require('../assets/sprites/tiles/Tile_Revealed_Magma.webp'),
  },
  lair: {
    background: require('../assets/sprites/backgrounds/Bg_Lair.jpg'),
    tileHidden: require('../assets/sprites/tiles/Tile_Hidden_Lair.webp'),
    tileRevealed: require('../assets/sprites/tiles/Tile_Revealed_Lair.webp'),
  },
  // Board themes with tiles of their own, over the backdrop of the cave they suit best.
  frost: {
    background: require('../assets/sprites/backgrounds/Bg_Crystal.jpg'),
    tileHidden: require('../assets/sprites/tiles/Tile_Hidden_Frost.webp'),
    tileRevealed: require('../assets/sprites/tiles/Tile_Revealed_Frost.webp'),
  },
  moss: {
    background: require('../assets/sprites/backgrounds/Cover_Background.jpg'),
    tileHidden: require('../assets/sprites/tiles/Tile_Hidden_Moss.webp'),
    tileRevealed: require('../assets/sprites/tiles/Tile_Revealed_Moss.webp'),
  },
  vault: {
    background: require('../assets/sprites/backgrounds/Bg_Magma.jpg'),
    tileHidden: require('../assets/sprites/tiles/Tile_Hidden_Vault.webp'),
    tileRevealed: require('../assets/sprites/tiles/Tile_Revealed_Vault.webp'),
  },
};

/** Every picture of every biome (for the start-up preload). */
export const allBiomeImages = (): ImageSourcePropType[] =>
  Object.values(BIOME_ART).flatMap(a => [a.background, a.tileHidden, a.tileRevealed]);
