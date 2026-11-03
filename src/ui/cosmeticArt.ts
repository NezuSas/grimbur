import type { ImageSourcePropType } from 'react-native';
import type { CosmeticId } from '../core/cosmetics/cosmetics';
import type { ArtTheme } from './biomeArt';

/** How a trail looks in flight: its painted arrow, and the two colours its sparks and wake alternate. */
export interface TrailLook {
  arrow: ImageSourcePropType;
  colors: readonly [string, string];
}

export const TRAIL_LOOKS: Partial<Record<CosmeticId, TrailLook>> = {
  trail_fire: { arrow: require('../assets/sprites/cosmetics/Arrow_Fire.png'), colors: ['#FF7A1A', '#D9B45A'] },
  trail_frost: { arrow: require('../assets/sprites/cosmetics/Arrow_Frost.png'), colors: ['#7FDBFF', '#E6F7FF'] },
  trail_storm: { arrow: require('../assets/sprites/cosmetics/Arrow_Storm.png'), colors: ['#FFF59D', '#B9D1DC'] },
  trail_shadow: { arrow: require('../assets/sprites/cosmetics/Arrow_Shadow.png'), colors: ['#7E57C2', '#2A1A40'] },
  trail_stars: { arrow: require('../assets/sprites/cosmetics/Arrow_Stars.png'), colors: ['#D9B45A', '#FFFFFF'] },
  trail_venom: { arrow: require('../assets/sprites/cosmetics/Arrow_Venom.png'), colors: ['#7CFF4F', '#2E7D32'] },
  trail_void: { arrow: require('../assets/sprites/cosmetics/Arrow_Void.png'), colors: ['#6CB0B9', '#311B92'] },
  trail_royal: { arrow: require('../assets/sprites/cosmetics/Arrow_Royal.png'), colors: ['#D9B45A', '#9A72AC'] },
};

/** The two frames of each companion (cut from one sheet: scripts/sliceIconGrid.py). */
export const PET_ART: Partial<Record<CosmeticId, readonly [ImageSourcePropType, ImageSourcePropType]>> = {
  pet_firefly: [require('../assets/sprites/cosmetics/Pet_Firefly_A.png'), require('../assets/sprites/cosmetics/Pet_Firefly_B.png')],
  pet_bat: [require('../assets/sprites/cosmetics/Pet_Bat_A.png'), require('../assets/sprites/cosmetics/Pet_Bat_B.png')],
  pet_golem: [require('../assets/sprites/cosmetics/Pet_Golem_A.png'), require('../assets/sprites/cosmetics/Pet_Golem_B.png')],
  pet_fox: [require('../assets/sprites/cosmetics/Pet_Fox_A.png'), require('../assets/sprites/cosmetics/Pet_Fox_B.png')],
  pet_dragon: [require('../assets/sprites/cosmetics/Pet_Dragon_A.png'), require('../assets/sprites/cosmetics/Pet_Dragon_B.png')],
  pet_owl: [require('../assets/sprites/cosmetics/Pet_Owl_A.png'), require('../assets/sprites/cosmetics/Pet_Owl_B.png')],
  pet_reindeer: [require('../assets/sprites/cosmetics/Pet_Reindeer_A.png'), require('../assets/sprites/cosmetics/Pet_Reindeer_B.png')],
};

/** The grown-up form of each companion (its stage 2, scripts/slicePairSheet.py). */
export const PET_ADULT_ART: Partial<Record<CosmeticId, readonly [ImageSourcePropType, ImageSourcePropType]>> = {
  pet_firefly: [require('../assets/sprites/cosmetics/PetAdult_Firefly_A.png'), require('../assets/sprites/cosmetics/PetAdult_Firefly_B.png')],
  pet_bat: [require('../assets/sprites/cosmetics/PetAdult_Bat_A.png'), require('../assets/sprites/cosmetics/PetAdult_Bat_B.png')],
  pet_golem: [require('../assets/sprites/cosmetics/PetAdult_Golem_A.png'), require('../assets/sprites/cosmetics/PetAdult_Golem_B.png')],
  pet_fox: [require('../assets/sprites/cosmetics/PetAdult_Fox_A.png'), require('../assets/sprites/cosmetics/PetAdult_Fox_B.png')],
  pet_dragon: [require('../assets/sprites/cosmetics/PetAdult_Dragon_A.png'), require('../assets/sprites/cosmetics/PetAdult_Dragon_B.png')],
  pet_owl: [require('../assets/sprites/cosmetics/PetAdult_Owl_A.png'), require('../assets/sprites/cosmetics/PetAdult_Owl_B.png')],
  pet_reindeer: [require('../assets/sprites/cosmetics/PetAdult_Reindeer_A.png'), require('../assets/sprites/cosmetics/PetAdult_Reindeer_B.png')],
};

/** The colour of each companion's aura once it is young. */
export const PET_TINT: Partial<Record<CosmeticId, string>> = {
  pet_firefly: '#E6CC88',
  pet_bat: '#B08DBE',
  pet_golem: '#8FC0C5',
  pet_fox: '#8FBCD2',
  pet_dragon: '#D28663',
  pet_owl: '#D9B45A',
  pet_reindeer: '#DCA45A',
};

/** The two frames a companion shows at a stage (adult art from stage 2). */
export const petLook = (id: CosmeticId, stage: number) => (stage >= 2 ? PET_ADULT_ART[id] ?? PET_ART[id] : PET_ART[id]);

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
  frame_questvael: require('../assets/sprites/cosmetics/Frame_QuestVael.png'),
  frame_questsera: require('../assets/sprites/cosmetics/Frame_QuestSera.png'),
  frame_questborin: require('../assets/sprites/cosmetics/Frame_QuestBorin.png'),
  frame_questauric: require('../assets/sprites/cosmetics/Frame_QuestAuric.png'),
  frame_questmira: require('../assets/sprites/cosmetics/Frame_QuestMira.png'),
  frame_questbram: require('../assets/sprites/cosmetics/Frame_QuestBram.png'),
  frame_yule: require('../assets/sprites/cosmetics/Frame_Yule.png'),
  frame_legend: require('../assets/sprites/cosmetics/Frame_Legend.png'),
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
  frame_questvael: require('../assets/sprites/cosmetics/FrameBody_QuestVael.png'),
  frame_questsera: require('../assets/sprites/cosmetics/FrameBody_QuestSera.png'),
  frame_questborin: require('../assets/sprites/cosmetics/FrameBody_QuestBorin.png'),
  frame_questauric: require('../assets/sprites/cosmetics/FrameBody_QuestAuric.png'),
  frame_questmira: require('../assets/sprites/cosmetics/FrameBody_QuestMira.png'),
  frame_questbram: require('../assets/sprites/cosmetics/FrameBody_QuestBram.png'),
  frame_yule: require('../assets/sprites/cosmetics/FrameBody_Yule.png'),
  frame_legend: require('../assets/sprites/cosmetics/FrameBody_Legend.png'),
};

/** The painted medallion the attack button wears while it has arrows (an empty quiver always shows the dull stone). */
export const ATTACK_ART: Partial<Record<CosmeticId, ImageSourcePropType>> = {
  attack_frost: require('../assets/sprites/cosmetics/AttackSkin_Frost.webp'),
  attack_venom: require('../assets/sprites/cosmetics/AttackSkin_Venom.webp'),
  attack_royal: require('../assets/sprites/cosmetics/AttackSkin_Royal.webp'),
  attack_shadow: require('../assets/sprites/cosmetics/AttackSkin_Shadow.webp'),
};

/** The flag planted on a tile the player marks as dangerous. */
export const FLAG_ART: Partial<Record<CosmeticId, ImageSourcePropType>> = {
  flag_skull: require('../assets/sprites/cosmetics/Flag_Skull.webp'),
  flag_crystal: require('../assets/sprites/cosmetics/Flag_Crystal.webp'),
  flag_ember: require('../assets/sprites/cosmetics/Flag_Ember.webp'),
  flag_royal: require('../assets/sprites/cosmetics/Flag_Royal.webp'),
  flag_frost: require('../assets/sprites/cosmetics/Flag_Frost.webp'),
  flag_gold: require('../assets/sprites/cosmetics/Flag_Gold.webp'),
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

const GEM = require('../assets/sprites/items/Icon_Gem.webp');
const EMBER = require('../assets/sprites/items/Icon_Ember.webp');
const STAR = require('../assets/sprites/ui/Icon_Star.webp');

/** No celebration worn: the gems and arrows every victory has always rained. */
export const DEFAULT_CELEBRATION: CelebrationLook = { sprites: [GEM, GEM, GEM, require('../assets/sprites/items/Icon_Arrows.webp'), GEM, GEM, GEM], motion: 'fall', size: [18, 39], spin: true };

export const CELEBRATION_LOOKS: Partial<Record<CosmeticId, CelebrationLook>> = {
  celeb_embers: { sprites: [EMBER, EMBER, require('../assets/sprites/items/Icon_EmberPile.webp')], motion: 'rise', size: [16, 34], spin: false },
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
      require('../assets/sprites/relics/phoenix.webp'),
      require('../assets/sprites/relics/lantern.webp'),
      require('../assets/sprites/relics/lucky_coin.webp'),
      require('../assets/sprites/relics/quiver.webp'),
      require('../assets/sprites/relics/frost.webp'),
      require('../assets/sprites/relics/greed.webp'),
    ],
    motion: 'fall',
    size: [28, 50],
    spin: false,
  },
  celeb_skulls: { sprites: [require('../assets/sprites/ui/Icon_Skull.webp'), require('../assets/sprites/ui/Icon_Monster.webp')], motion: 'fall', size: [24, 44], spin: true },
  celeb_hoard: { sprites: [GEM, EMBER, STAR, require('../assets/sprites/relics/lucky_coin.webp'), GEM, STAR], motion: 'burst', size: [20, 44], spin: true },
};

export const allCosmeticImages = (): ImageSourcePropType[] => [
  ...Object.values(TRAIL_LOOKS).map(t => t!.arrow),
  ...(Object.values(FRAME_ART) as ImageSourcePropType[]),
  ...(Object.values(FLAG_ART) as ImageSourcePropType[]),
  ...(Object.values(ATTACK_ART) as ImageSourcePropType[]),
];
