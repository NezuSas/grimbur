import type { ImageSourcePropType } from 'react-native';
import characters from '../data/characters';
import { RELIC_IMAGES } from './relicImages';
import { FORGE_ICONS } from './forgeArt';
import { GLYPHS } from './glyphArt';
import { skinArt } from '../data/skinArt';
import { equippedSkin } from '../core/skins/ownership';
import type { LocalStats } from '../core/stats/runStats';
import { allBiomeImages } from './biomeArt';
import { allToolImages } from './toolArt';
import { allAchievementArt } from './achievementArt';
import { allCosmeticImages } from './cosmeticArt';
import { ARCANE_FX, FLAME_FX } from './weaponFxArt';
import { AMMO_ART } from './weaponArt';

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
    require('../assets/sprites/backgrounds/Cover_Background.jpg'),
    require('../assets/sprites/tiles/Tile_Hidden.webp'),
    require('../assets/sprites/tiles/Tile_Revealed.webp'),
    require('../assets/sprites/tiles/Danger_Vortex.png'),
    require('../assets/sprites/enemies/Guardian_Enemy.webp'),
    require('../assets/sprites/enemies/Guardian_Enemy_Breathe.webp'),
    require('../assets/sprites/enemies/Stalker_Enemy.webp'),
    require('../assets/sprites/enemies/Stalker_Enemy_Breathe.webp'),
    require('../assets/sprites/enemies/Sleeper_Enemy.webp'),
    require('../assets/sprites/enemies/Sleeper_Enemy_Breathe.webp'),
    require('../assets/sprites/enemies/Grimbur_Boss.webp'),
    require('../assets/sprites/enemies/Grimbur_Boss_Breathe.webp'),
    require('../assets/sprites/enemies/Grimbur_Boss_Attack.webp'),
    require('../assets/sprites/enemies/Grimbur_Boss_Hurt.webp'),
    require('../assets/sprites/items/Icon_Gem.webp'),
    require('../assets/sprites/items/Icon_Shield.webp'),
    require('../assets/sprites/items/Icon_Arrows.webp'),
    require('../assets/sprites/items/Icon_Ember.webp'),
    require('../assets/sprites/items/Icon_EmberPile.webp'),
    require('../assets/sprites/ui/Clue_Guardian.webp'),
    require('../assets/sprites/ui/Clue_Vortex.webp'),
    require('../assets/sprites/ui/Logo_Grimbur.png'),
    require('../assets/sprites/ui/Attack_Ready.webp'),
    require('../assets/sprites/ui/Attack_Empty.webp'),
    require('../assets/sprites/ui/Attack_Arrow.webp'),
    ...Object.values(FORGE_ICONS).filter((source): source is NonNullable<typeof source> => source != null),
    ...Object.values(GLYPHS),
    ...Object.values(RELIC_IMAGES).filter((source): source is NonNullable<typeof source> => source != null),
    ...heroes,
    ...outfits,
    ...allBiomeImages(),
    ...allToolImages(),
    ...allAchievementArt(),
    ...allCosmeticImages(),
    // The weapons: their ammo and the painted effects a bomb or an orb leaves on the tiles.
    ...Object.values(AMMO_ART),
    ...Object.values(FLAME_FX).flat(),
    ...Object.values(ARCANE_FX).flat(),
  ];
  // Hero win/lose images repeat the standing pose; load each file once.
  return Array.from(new Set(all));
}
