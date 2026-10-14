import { HERO_COUNT } from '../stats/achievements';

/** Hero outfits (cosmetic only). Keep this union identical to the one in `data/skinArt.ts`. */
export type SkinId = 'classic' | 'ember' | 'verdant' | 'frost' | 'royal' | 'shadow' | 'gilded';
export const SKIN_IDS: readonly SkinId[] = ['classic', 'ember', 'verdant', 'frost', 'royal', 'shadow', 'gilded'];

export type SkinTier = 'free' | 'rare' | 'legendary';
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
}

/** Tuning knobs. */
export const RARE_SKIN_PRICE = 300;
export const SHADOW_SKIN_PRICE = 900;
export const GILDED_SKIN_PRICE = 1200;
export const SHADOW_UNLOCK_WINS = 3;
/** Depth 2 is "Nightmare" (see ascension.ts). */
export const GILDED_UNLOCK_DEPTH = 2;

const rare = (id: SkinId): SkinInfo => ({ id, tier: 'rare', price: RARE_SKIN_PRICE, premium: false });

export const SKINS: Record<SkinId, SkinInfo> = {
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

/** The theme matching each hero's classic colour is not offered (Vael, Sera, Borin, Auric). */
const EXCLUDED_BY_HERO: readonly SkinId[] = ['frost', 'ember', 'verdant', 'gilded'];

/** Skins offered to each hero (index = hero index): classic first, then the catalog order. */
export const SKINS_BY_HERO: readonly (readonly SkinId[])[] = Array.from({ length: HERO_COUNT }, (_, hero) =>
  SKIN_IDS.filter(id => id !== EXCLUDED_BY_HERO[hero]),
);

export const isSkinId = (v: unknown): v is SkinId => typeof v === 'string' && (SKIN_IDS as readonly string[]).includes(v);
export const isOffered = (hero: number, skin: SkinId): boolean => (SKINS_BY_HERO[hero] ?? []).includes(skin);
export const skinKey = (hero: number, skin: SkinId): string => `${hero}:${skin}`;
