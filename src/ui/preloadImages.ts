import type { ImageSourcePropType } from 'react-native';
import characters from '../data/characters';
import { RELIC_IMAGES } from './relicImages';
import { SKIN_IDS, skinArt } from '../data/skinArt';
import { allBiomeImages } from './biomeArt';
import { allToolImages } from './toolArt';

/** Every illustration the game shows, loaded once at startup so nothing pops in later. */
export function getPreloadImages(): ImageSourcePropType[] {
  const heroes = characters.flatMap(c => [c.scoreImage, c.attackImage, c.playerImage, c.winImage, c.loseImage]);
  // Every outfit of every hero: the collection shows them all at once and the board swaps them in without a flash.
  const outfits = characters.flatMap((_, hero) =>
    SKIN_IDS.flatMap(skin => {
      const art = skinArt(hero, skin);
      return [art.scoreImage, art.attackImage, art.playerImage];
    }),
  );
  const all: ImageSourcePropType[] = [
    require('../assets/sprites/backgrounds/Cover_Background.png'),
    require('../assets/sprites/tiles/Tile_Hidden.png'),
    require('../assets/sprites/tiles/Tile_Revealed.png'),
    require('../assets/sprites/tiles/Danger_Vortex.png'),
    require('../assets/sprites/enemies/Guardian_Enemy.png'),
    require('../assets/sprites/enemies/Stalker_Enemy.png'),
    require('../assets/sprites/enemies/Sleeper_Enemy.png'),
    require('../assets/sprites/enemies/Grimbur_Boss.png'),
    require('../assets/sprites/items/Icon_Gem.png'),
    require('../assets/sprites/items/Icon_Shield.png'),
    require('../assets/sprites/items/Icon_Arrows.png'),
    ...Object.values(RELIC_IMAGES).filter((source): source is NonNullable<typeof source> => source != null),
    ...heroes,
    ...outfits,
    ...allBiomeImages(),
    ...allToolImages(),
  ];
  // Hero win/lose images repeat the standing pose; load each file once.
  return Array.from(new Set(all));
}
