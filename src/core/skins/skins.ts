import { HERO_COUNT } from '../stats/achievements';

/**
 * Hero looks (cosmetic only). A look is an OUTFIT (a different set of clothes, its own art) worn in one of its CHROMAS (the
 * same outfit in another colour). The classic outfit's chromas keep their old ids ('ember', 'frost'...); a newer outfit is
 * its own id in its own colour ('gala') and `<outfit>_<chroma>` for its chromas ('gala_frost'). Keep this union identical
 * to the one in `data/skinArt.ts` (written by scripts/generateSkins.py).
 */
export type ChromaId = 'classic' | 'ember' | 'verdant' | 'frost' | 'royal' | 'shadow' | 'gilded';
export const CHROMA_IDS: readonly ChromaId[] = ['classic', 'ember', 'verdant', 'frost', 'royal', 'shadow', 'gilded'];
export type OutfitId = 'classic' | 'gala';
/** Every outfit, the classic one first. A new outfit is added here once its art exists for every hero. */
export const OUTFIT_IDS: readonly OutfitId[] = ['classic', 'gala'];
type NewOutfit = Exclude<OutfitId, 'classic'>;
type NewChroma = Exclude<ChromaId, 'classic'>;
export type SkinId = ChromaId | NewOutfit | `${NewOutfit}_${NewChroma}`;

/** The look of an outfit in a chroma. */
export const skinIdOf = (outfit: OutfitId, chroma: ChromaId): SkinId =>
  (outfit === 'classic' ? chroma : chroma === 'classic' ? outfit : `${outfit}_${chroma}`) as SkinId;
export const outfitOf = (id: SkinId): OutfitId => {
  const head = id.split('_')[0];
  return (OUTFIT_IDS as readonly string[]).includes(head) && head !== 'classic' ? (head as OutfitId) : 'classic';
};
export const chromaOf = (id: SkinId): ChromaId => {
  if (outfitOf(id) === 'classic') return id as ChromaId;
  const tail = id.split('_')[1];
  return (tail as ChromaId | undefined) ?? 'classic';
};

export const SKIN_IDS: readonly SkinId[] = OUTFIT_IDS.flatMap(o => CHROMA_IDS.map(c => skinIdOf(o, c)));

export type SkinTier = 'free' | 'rare' | 'epic' | 'legendary';
export type SkinUnlock = { kind: 'wins'; count: number } | { kind: 'depthWin'; depth: number };

export interface SkinInfo {
  id: SkinId;
  tier: SkinTier;
  /** Price in embers (0 for the classic outfit). */
  price: number;
  /** A free alternative: reach this goal by playing with the hero and the skin is claimed automatically. */
  unlock?: SkinUnlock;
  /** Reserved for a future real-money offer. While monetization is off these can still be bought with embers. */
  premium: boolean;
  /** Store product id for the future real-money offer. */
  productId?: string;
  /** A chroma of a newer outfit: that outfit must be owned first. */
  requires?: SkinId;
}

/** Tuning knobs. */
export const RARE_SKIN_PRICE = 300;
export const SHADOW_SKIN_PRICE = 900;
export const GILDED_SKIN_PRICE = 1200;
/** A newer outfit (new clothes, its own art), in its own colour. */
export const OUTFIT_PRICE = 1500;
/** One of its chromas, once the outfit is owned (the legendary ones cost more). */
export const OUTFIT_CHROMA_PRICE = 350;
export const OUTFIT_LEGENDARY_CHROMA_PRICE = 700;
export const SHADOW_UNLOCK_WINS = 3;
/** Depth 2 is "Nightmare" (see ascension.ts). */
export const GILDED_UNLOCK_DEPTH = 2;

const rare = (id: SkinId): SkinInfo => ({ id, tier: 'rare', price: RARE_SKIN_PRICE, premium: false });

const CLASSIC_LOOKS: Record<ChromaId, SkinInfo> = {
  classic: { id: 'classic', tier: 'free', price: 0, premium: false },
  ember: rare('ember'),
  verdant: rare('verdant'),
  frost: rare('frost'),
  royal: rare('royal'),
  shadow: {
    id: 'shadow', tier: 'legendary', price: SHADOW_SKIN_PRICE, premium: true, productId: 'skin_shadow',
    unlock: { kind: 'wins', count: SHADOW_UNLOCK_WINS },
  },
  gilded: {
    id: 'gilded', tier: 'legendary', price: GILDED_SKIN_PRICE, premium: true, productId: 'skin_gilded',
    unlock: { kind: 'depthWin', depth: GILDED_UNLOCK_DEPTH },
  },
};

const newOutfitLook = (outfit: NewOutfit, chroma: ChromaId): SkinInfo => {
  const id = skinIdOf(outfit, chroma);
  if (chroma === 'classic') return { id, tier: 'epic', price: OUTFIT_PRICE, premium: true, productId: `outfit_${outfit}` };
  const legendary = chroma === 'shadow' || chroma === 'gilded';
  return { id, tier: legendary ? 'legendary' : 'epic', price: legendary ? OUTFIT_LEGENDARY_CHROMA_PRICE : OUTFIT_CHROMA_PRICE, premium: false, requires: outfit };
};

export const SKINS: Record<SkinId, SkinInfo> = Object.fromEntries(
  SKIN_IDS.map(id => {
    const outfit = outfitOf(id);
    return [id, outfit === 'classic' ? CLASSIC_LOOKS[id as ChromaId] : newOutfitLook(outfit as NewOutfit, chromaOf(id))];
  }),
) as Record<SkinId, SkinInfo>;

/** The theme matching each hero's classic colour is not offered (Vael, Sera, Borin, Auric, Mira has none, Bram). */
const EXCLUDED_BY_HERO: readonly (SkinId | undefined)[] = ['frost', 'ember', 'verdant', 'gilded', undefined, 'ember'];

/** Looks offered to each hero (index = hero index): outfit by outfit, each one's own colour first, then its chromas. */
/**
 * Outfits a hero wears only in their own colour (Bram's gala: beard, skin and coat share one hue, so a recolour can't tell
 * them apart). Keep in sync with NO_CHROMAS in scripts/generateSkins.py.
 */
const OUTFIT_WITHOUT_CHROMAS: Partial<Record<number, readonly OutfitId[]>> = { 5: ['gala'] };

export const SKINS_BY_HERO: readonly (readonly SkinId[])[] = Array.from({ length: HERO_COUNT }, (_, hero) =>
  OUTFIT_IDS.flatMap(o =>
    CHROMA_IDS.filter(c => c !== EXCLUDED_BY_HERO[hero] && (c === 'classic' || !OUTFIT_WITHOUT_CHROMAS[hero]?.includes(o))).map(c => skinIdOf(o, c)),
  ),
);

/** The chromas of one outfit offered to a hero (its own colour first). */
export const chromasOf = (hero: number, outfit: OutfitId): SkinId[] => (SKINS_BY_HERO[hero] ?? []).filter(id => outfitOf(id) === outfit);

export const isSkinId = (v: unknown): v is SkinId => typeof v === 'string' && (SKIN_IDS as readonly string[]).includes(v);
export const isOffered = (hero: number, skin: SkinId): boolean => (SKINS_BY_HERO[hero] ?? []).includes(skin);
export const skinKey = (hero: number, skin: SkinId): string => `${hero}:${skin}`;
