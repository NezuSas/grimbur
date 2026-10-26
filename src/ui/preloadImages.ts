import type { ImageSourcePropType } from 'react-native';
import characters from '../data/characters';
import { RELIC_IMAGES } from './relicImages';
import { skinArt } from '../data/skinArt';
import { equippedSkin } from '../core/skins/ownership';
import type { LocalStats } from '../core/stats/runStats';
import { allBiomeImages } from './biomeArt';
import { allToolImages } from './toolArt';

/**
 * Every illustration the game shows in its first minutes, loaded once at startup so nothing pops in later.
 * Outfits are NOT all loaded: 155 decoded sprites held ~90 MB of bitmaps in memory on phones that may have
 * 2 GB. Only each hero's equipped outfit comes along; the collection screen loads the rest as it draws them.
 */
export function getPreloadImages(stats: LocalStats | null = null): ImageSourcePropType[] {
  const heroes = characters.flatMap(c => [c.scoreImage, c.attackImage, c.playerImage, c.winImage, c.loseImage]);
  // The outfit each hero wears right now: the cover, the board and the hero screen draw it without a flash.
  const outfits = stats
    ? characters.flatMap((_, hero) => {
        const skin = equippedSkin(stats, hero);
        if (skin === 'classic') return []; // the classic art is the hero's own, already loaded above
        const art = skinArt(hero, skin);
        return [art.scoreImage, art.attackImage, art.playerImage];
      })
    : [];
  const all: ImageSourcePropType[] = [
    require('../assets/sprites/backgrounds/Cover_Background.png'),
    require('../assets/sprites/tiles/Tile_Hidden.png'),
    require('../assets/sprites/tiles/Tile_Revealed.png'),
    require('../assets/sprites/tiles/Danger_Vortex.png'),
    require('../assets/sprites/enemies/Guardian_Enemy.png'),
    require('../assets/sprites/enemies/Stalker_Enemy.png'),
    require('../assets/sprites/enemies/Sleeper_Enemy.png'),
    require('../assets/sprites/enemies/Grimbur_Boss.png'),
    require('../assets/sprites/enemies/Grimbur_Boss_Breathe.png'),
    require('../assets/sprites/enemies/Grimbur_Boss_Attack.png'),
    require('../assets/sprites/enemies/Grimbur_Boss_Hurt.png'),
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
