import type { ImageSourcePropType } from 'react-native';
import characters from '../data/characters';
import { RELIC_IMAGES } from './relicImages';

/** Every illustration the game shows, loaded once at startup so nothing pops in later. */
export function getPreloadImages(): ImageSourcePropType[] {
  const heroes = characters.flatMap(c => [c.scoreImage, c.attackImage, c.playerImage, c.winImage, c.loseImage]);
  const all: ImageSourcePropType[] = [
    require('../assets/sprites/backgrounds/Cover_Background.png'),
    require('../assets/sprites/tiles/Tile_Hidden.png'),
    require('../assets/sprites/tiles/Tile_Revealed.png'),
    require('../assets/sprites/tiles/Danger_Vortex.png'),
    require('../assets/sprites/enemies/Guardian_Enemy.png'),
    require('../assets/sprites/enemies/Wumpus_Boss.png'),
    require('../assets/sprites/items/Icon_Gem.png'),
    require('../assets/sprites/items/Icon_Shield.png'),
    require('../assets/sprites/items/Icon_Arrows.png'),
    ...Object.values(RELIC_IMAGES),
    ...heroes,
  ];
  // Hero win/lose images repeat the standing pose; load each file once.
  return Array.from(new Set(all));
}
