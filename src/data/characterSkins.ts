import characters, { type Character } from './characters';
import { skinArt, type SkinId } from './skinArt';

/** A hero with an outfit on: the same character with the images of that skin (classic = the original art). */
export const characterWithSkin = (heroIndex: number, skin: SkinId = 'classic'): Character => {
  const base = characters[heroIndex] ?? characters[0];
  if (skin === 'classic') return base;
  const art = skinArt(heroIndex, skin);
  // An outfit without its own front / back view (or walk) falls back to its side view (never to the classic colours).
  return { ...base, ...art, frontImage: art.frontImage, backImage: art.backImage, walkImages: art.walkImages, attackFrontImage: art.attackFrontImage, attackBackImage: art.attackBackImage };
};
