import type { ImageSourcePropType } from 'react-native';
import { SHOT_KIND, equippedCosmetic, type CosmeticId } from '../core/cosmetics/cosmetics';
import type { LocalStats } from '../core/stats/runStats';
import type { WeaponId } from '../core/engine/weapons';
import type { ArtTheme } from './biomeArt';

/** How a trail looks in flight: its painted arrow, and the two colours its sparks and wake alternate. */
export interface TrailLook {
  arrow: ImageSourcePropType;
  colors: readonly [string, string];
}

export const TRAIL_LOOKS: Partial<Record<CosmeticId, TrailLook>> = {
  trail_fire: { arrow: require('../assets/sprites/cosmetics/Arrow_Fire.png'), colors: ['#C8763A', '#C9A55A'] },
  trail_frost: { arrow: require('../assets/sprites/cosmetics/Arrow_Frost.png'), colors: ['#7FDBFF', '#E6F7FF'] },
  trail_storm: { arrow: require('../assets/sprites/cosmetics/Arrow_Storm.png'), colors: ['#FFF59D', '#B9D1DC'] },
  trail_shadow: { arrow: require('../assets/sprites/cosmetics/Arrow_Shadow.png'), colors: ['#77629E', '#2A1A40'] },
  trail_stars: { arrow: require('../assets/sprites/cosmetics/Arrow_Stars.png'), colors: ['#C9A55A', '#FFFFFF'] },
  trail_venom: { arrow: require('../assets/sprites/cosmetics/Arrow_Venom.png'), colors: ['#8CC46A', '#2E7D32'] },
  trail_void: { arrow: require('../assets/sprites/cosmetics/Arrow_Void.png'), colors: ['#6CB0B9', '#311B92'] },
  trail_royal: { arrow: require('../assets/sprites/cosmetics/Arrow_Royal.png'), colors: ['#C9A55A', '#9A72AC'] },
};

/** How Mira's orb looks in flight, drawn in code (no picture): its bright heart and the halo of light around it. */
export interface OrbLook {
  core: string;
  glow: string;
}

export const ORB_LOOKS: Partial<Record<CosmeticId, OrbLook>> = {
  orb_frost: { core: '#E6F7FF', glow: '#7FDBFF' },
  orb_ember: { core: '#FFD27A', glow: '#FF8C2A' },
  orb_venom: { core: '#C8F5A0', glow: '#3FAF4A' },
  orb_void: { core: '#7FD6E0', glow: '#5B3CC4' },
  orb_stars: { core: '#FFFFFF', glow: '#FFE38A' },
  orb_royal: { core: '#F2CF6A', glow: '#9A72AC' },
};

/** How Bram's bomb looks, drawn in code (no picture): the spark on its fuse and the colour of its blast. */
export interface BombLook {
  spark: string;
  blast: string;
}

export const BOMB_LOOKS: Partial<Record<CosmeticId, BombLook>> = {
  bomb_ember: { spark: '#FFD27A', blast: '#FF7A1A' },
  bomb_frost: { spark: '#E6F7FF', blast: '#5FC8F0' },
  bomb_venom: { spark: '#C8F5A0', blast: '#4FA83A' },
  bomb_storm: { spark: '#FFF59D', blast: '#8FB8E0' },
  bomb_void: { spark: '#7FD6E0', blast: '#5B3CC4' },
  bomb_royal: { spark: '#F2CF6A', blast: '#9A72AC' },
};

/** The look of a shot of any weapon. */
export type ShotLook = TrailLook | OrbLook | BombLook;

/**
 * The style the player wears for that weapon's shots: the arrow trail for the bow, the orb style for the orb, the bomb
 * style for the bomb; null when none is worn (the plain shot).
 */
export function shotLookFor(stats: LocalStats | null | undefined, weapon: 'bow'): TrailLook | null;
export function shotLookFor(stats: LocalStats | null | undefined, weapon: 'orb'): OrbLook | null;
export function shotLookFor(stats: LocalStats | null | undefined, weapon: 'bomb'): BombLook | null;
export function shotLookFor(stats: LocalStats | null | undefined, weapon: WeaponId): ShotLook | null;
export function shotLookFor(stats: LocalStats | null | undefined, weapon: WeaponId): ShotLook | null {
  if (!stats) return null;
  const id = equippedCosmetic(stats, SHOT_KIND[weapon]);
  if (!id) return null;
  const looks = weapon === 'orb' ? ORB_LOOKS : weapon === 'bomb' ? BOMB_LOOKS : TRAIL_LOOKS;
  return looks[id] ?? null;
}

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
  pet_firefly: '#DCC48E',
  pet_bat: '#B08DBE',
  pet_golem: '#8FC0C5',
  pet_fox: '#8FBCD2',
  pet_dragon: '#D28663',
  pet_owl: '#C9A55A',
  pet_reindeer: '#C99A5C',
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

/**
 * The painted medallion the attack button wears while it has ammo (an empty one always shows the dull stone), one per weapon:
 * the bow's is painted with an arrow, the orb's with an orb, the bomb's with a bomb. One skin bought dresses every hero.
 */
export const ATTACK_ART_BY_WEAPON: Record<WeaponId, Partial<Record<CosmeticId, ImageSourcePropType>>> = {
  bow: {
    attack_frost: require('../assets/sprites/cosmetics/AttackSkin_Frost.webp'),
    attack_venom: require('../assets/sprites/cosmetics/AttackSkin_Venom.webp'),
    attack_royal: require('../assets/sprites/cosmetics/AttackSkin_Royal.webp'),
    attack_shadow: require('../assets/sprites/cosmetics/AttackSkin_Shadow.webp'),
  },
  orb: {
    attack_frost: require('../assets/sprites/cosmetics/AttackSkin_Frost_Orb.webp'),
    attack_venom: require('../assets/sprites/cosmetics/AttackSkin_Venom_Orb.webp'),
    attack_royal: require('../assets/sprites/cosmetics/AttackSkin_Royal_Orb.webp'),
    attack_shadow: require('../assets/sprites/cosmetics/AttackSkin_Shadow_Orb.webp'),
  },
  bomb: {
    attack_frost: require('../assets/sprites/cosmetics/AttackSkin_Frost_Bomb.webp'),
    attack_venom: require('../assets/sprites/cosmetics/AttackSkin_Venom_Bomb.webp'),
    attack_royal: require('../assets/sprites/cosmetics/AttackSkin_Royal_Bomb.webp'),
    attack_shadow: require('../assets/sprites/cosmetics/AttackSkin_Shadow_Bomb.webp'),
  },
};

/** The bow's medallions (kept for the callers that only show the skin itself). */
export const ATTACK_ART = ATTACK_ART_BY_WEAPON.bow;

/** The medallion an attack skin paints for a weapon (the bow's when that weapon has none); null when the id is not a skin. */
export const attackArtFor = (id: CosmeticId | null | undefined, weapon: WeaponId): ImageSourcePropType | null =>
  id ? ATTACK_ART_BY_WEAPON[weapon][id] ?? ATTACK_ART_BY_WEAPON.bow[id] ?? null : null;

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
  ...Object.values(ATTACK_ART_BY_WEAPON).flatMap(m => Object.values(m) as ImageSourcePropType[]),
];
