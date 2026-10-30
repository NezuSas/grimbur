import type { ImageSourcePropType } from 'react-native';
import type { CosmeticId } from '../core/cosmetics/cosmetics';
import type { ArtTheme } from './biomeArt';

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
  trail_venom: { arrow: require('../assets/sprites/cosmetics/Arrow_Venom.png'), colors: ['#7CFF4F', '#2E7D32'] },
  trail_void: { arrow: require('../assets/sprites/cosmetics/Arrow_Void.png'), colors: ['#4DD0E1', '#311B92'] },
  trail_royal: { arrow: require('../assets/sprites/cosmetics/Arrow_Royal.png'), colors: ['#FFD54F', '#BA68C8'] },
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
  frame_jade: require('../assets/sprites/cosmetics/Frame_Jade.png'),
  frame_bone: require('../assets/sprites/cosmetics/Frame_Bone.png'),
  frame_storm: require('../assets/sprites/cosmetics/Frame_Storm.png'),
  frame_royal: require('../assets/sprites/cosmetics/Frame_Royal.png'),
  frame_hoard: require('../assets/sprites/cosmetics/Frame_Hoard.png'),
};

/** The same frames, drawn as a tall arch around the hero's whole figure (hero picker, shared picture). 3 wide by 4 tall. */
export const FRAME_BODY_ART: Partial<Record<CosmeticId, ImageSourcePropType>> = {
  frame_bronze: require('../assets/sprites/cosmetics/FrameBody_Bronze.png'),
  frame_silver: require('../assets/sprites/cosmetics/FrameBody_Silver.png'),
  frame_gold: require('../assets/sprites/cosmetics/FrameBody_Gold.png'),
  frame_frost: require('../assets/sprites/cosmetics/FrameBody_Frost.png'),
  frame_ember: require('../assets/sprites/cosmetics/FrameBody_Ember.png'),
  frame_abyss: require('../assets/sprites/cosmetics/FrameBody_Abyss.png'),
  frame_crown: require('../assets/sprites/cosmetics/FrameBody_Crown.png'),
  frame_wardrobe: require('../assets/sprites/cosmetics/FrameBody_Wardrobe.png'),
  frame_jade: require('../assets/sprites/cosmetics/FrameBody_Jade.png'),
  frame_bone: require('../assets/sprites/cosmetics/FrameBody_Bone.png'),
  frame_storm: require('../assets/sprites/cosmetics/FrameBody_Storm.png'),
  frame_royal: require('../assets/sprites/cosmetics/FrameBody_Royal.png'),
  frame_hoard: require('../assets/sprites/cosmetics/FrameBody_Hoard.png'),
};

/** The painted medallion the attack button wears while it has arrows (an empty quiver always shows the dull stone). */
export const ATTACK_ART: Partial<Record<CosmeticId, ImageSourcePropType>> = {
  attack_frost: require('../assets/sprites/cosmetics/AttackSkin_Frost.png'),
  attack_venom: require('../assets/sprites/cosmetics/AttackSkin_Venom.png'),
  attack_royal: require('../assets/sprites/cosmetics/AttackSkin_Royal.png'),
  attack_shadow: require('../assets/sprites/cosmetics/AttackSkin_Shadow.png'),
};

/** The flag planted on a tile the player marks as dangerous. */
export const FLAG_ART: Partial<Record<CosmeticId, ImageSourcePropType>> = {
  flag_skull: require('../assets/sprites/cosmetics/Flag_Skull.png'),
  flag_crystal: require('../assets/sprites/cosmetics/Flag_Crystal.png'),
  flag_ember: require('../assets/sprites/cosmetics/Flag_Ember.png'),
  flag_royal: require('../assets/sprites/cosmetics/Flag_Royal.png'),
  flag_frost: require('../assets/sprites/cosmetics/Flag_Frost.png'),
  flag_gold: require('../assets/sprites/cosmetics/Flag_Gold.png'),
};

/** The tiles and backdrop a board theme paints the floor with. */
export const BOARD_BIOME: Partial<Record<CosmeticId, ArtTheme>> = {
  board_cave: 'cave',
  board_crystal: 'crystal',
  board_magma: 'magma',
  board_lair: 'lair',
  board_frost: 'frost',
  board_moss: 'moss',
  board_vault: 'vault',
};

/** How a victory is celebrated: which pieces of the game's art, how they move, how big they are, whether they spin. */
export interface CelebrationLook {
  sprites: readonly ImageSourcePropType[];
  motion: 'fall' | 'rise' | 'burst' | 'volley';
  size: readonly [number, number];
  spin: boolean;
}

const GEM = require('../assets/sprites/items/Icon_Gem.png');
const EMBER = require('../assets/sprites/items/Icon_Ember.png');
const STAR = require('../assets/sprites/ui/Icon_Star.png');

/** No celebration worn: the gems and arrows every victory has always rained. */
export const DEFAULT_CELEBRATION: CelebrationLook = { sprites: [GEM, GEM, GEM, require('../assets/sprites/items/Icon_Arrows.png'), GEM, GEM, GEM], motion: 'fall', size: [18, 39], spin: true };

export const CELEBRATION_LOOKS: Partial<Record<CosmeticId, CelebrationLook>> = {
  celeb_embers: { sprites: [EMBER, EMBER, require('../assets/sprites/items/Icon_EmberPile.png')], motion: 'rise', size: [16, 34], spin: false },
  celeb_gems: { sprites: [GEM], motion: 'fall', size: [22, 48], spin: true },
  celeb_stars: { sprites: [STAR], motion: 'burst', size: [18, 40], spin: true },
  celeb_arrows: {
    sprites: [TRAIL_LOOKS.trail_fire!.arrow, TRAIL_LOOKS.trail_frost!.arrow, TRAIL_LOOKS.trail_storm!.arrow, TRAIL_LOOKS.trail_stars!.arrow],
    motion: 'volley',
    size: [22, 34],
    spin: false,
  },
  celeb_relics: {
    sprites: [
      require('../assets/sprites/relics/phoenix.png'),
      require('../assets/sprites/relics/lantern.png'),
      require('../assets/sprites/relics/lucky_coin.png'),
      require('../assets/sprites/relics/quiver.png'),
      require('../assets/sprites/relics/frost.png'),
      require('../assets/sprites/relics/greed.png'),
    ],
    motion: 'fall',
    size: [28, 50],
    spin: false,
  },
  celeb_skulls: { sprites: [require('../assets/sprites/ui/Icon_Skull.png'), require('../assets/sprites/ui/Icon_Monster.png')], motion: 'fall', size: [24, 44], spin: true },
  celeb_hoard: { sprites: [GEM, EMBER, STAR, require('../assets/sprites/relics/lucky_coin.png'), GEM, STAR], motion: 'burst', size: [20, 44], spin: true },
};

export const allCosmeticImages = (): ImageSourcePropType[] => [
  ...Object.values(TRAIL_LOOKS).map(t => t!.arrow),
  ...(Object.values(FRAME_ART) as ImageSourcePropType[]),
  ...(Object.values(FLAG_ART) as ImageSourcePropType[]),
  ...(Object.values(ATTACK_ART) as ImageSourcePropType[]),
];
