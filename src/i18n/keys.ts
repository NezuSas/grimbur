import type { CosmeticId } from "../core/cosmetics/cosmetics";
import type { TranslationKey } from './en';
import type { Params } from './translate';
import type { RelicId } from '../core/engine/relics';
import { chromaOf, outfitOf, type OutfitId, type SkinId } from '../core/skins/skins';
import { HERO_UNLOCKS } from '../core/stats/heroUnlocks';
import { HERO_QUESTS } from '../core/stats/heroQuests';
import { ACHIEVEMENTS, AchievementId } from '../core/stats/achievements';
import { BEASTS } from '../core/stats/bestiary';
import { UPGRADES, UpgradeId } from '../core/stats/forge';
import type { WeaponId } from '../core/engine/weapons';
import { weaponLine } from './weaponText';

type T = (key: TranslationKey, params?: Params) => string;

/** Localised hero text. Heroes are addressed by index, same as `data/characters.ts`. */
export const heroText = (t: T, heroIndex: number, part: 'name' | 'title' | 'perk' | 'desc') =>
  t(`hero.${heroIndex}.${part}` as TranslationKey);

/** Localised hero skin name. */
/** A look's name: the chroma for the classic outfit ("Brasa"), the outfit and its chroma for a newer one ("Traje de Gala · Brasa"). */
export const skinText = (t: T, id: SkinId): string => {
  const outfit = outfitOf(id);
  if (outfit === 'classic') return t(`skin.${id}.name` as TranslationKey);
  const chroma = chromaOf(id);
  const name = t(`skin.outfit.${outfit}` as TranslationKey);
  return chroma === 'classic' ? name : `${name} · ${t(`skin.${chroma}.name` as TranslationKey)}`;
};
/** An outfit's name ("Traje de Gala"). */
export const outfitText = (t: T, outfit: OutfitId): string => t(`skin.outfit.${outfit}` as TranslationKey);
/** A chroma's name alone ("Brasa"; the outfit's own colour reads "Clásico"). */
export const chromaText = (t: T, id: SkinId): string => t(`skin.${chromaOf(id)}.name` as TranslationKey);

/**
 * Localised relic text. With a weapon, the description is the one of that weapon (`relic.<id>.desc.<weapon>`) when its
 * effect differs, else the shared `relic.<id>.desc`.
 */
export const relicText = (t: T, id: RelicId, part: 'name' | 'desc', weapon?: WeaponId) =>
  part === 'desc' && weapon ? weaponLine(t, `relic.${id}.desc` as TranslationKey, weapon) : t(`relic.${id}.${part}` as TranslationKey);

/** How to unlock a hero, or an empty string for heroes that are free. */
export const unlockText = (t: T, heroIndex: number): string => {
  const rule = HERO_UNLOCKS[heroIndex];
  if (!rule || rule.kind === 'free') return '';
  switch (rule.kind) {
    case 'floor':
      return t('heroes.unlockFloor', { floor: rule.floor });
    case 'daily':
      return t('heroes.unlockDaily', { count: rule.count });
    case 'embers':
      return t('heroes.unlockEmbers', { count: rule.amount });
    default:
      return t('heroes.unlockVictory');
  }
};

/** Localised achievement text; the description is interpolated with the real thresholds. */
export const achievementText = (t: T, id: AchievementId, part: 'name' | 'desc'): string => {
  const info = ACHIEVEMENTS.find(a => a.id === id);
  // An unknown id (an old save, a newer version's achievement) is left out rather than shown as a raw key.
  if (!info) return '';
  if (part === 'name') return t(`ach.${id}.name` as TranslationKey);
  // A bespoke description (`ach.<id>.desc`) wins over the shared template.
  const bespokeKey = `ach.${id}.desc` as TranslationKey;
  const bespoke = t(bespokeKey, info?.params ?? {});
  if (bespoke !== bespokeKey) return bespoke;
  if (info?.desc) {
    const params: Params = { ...(info.params ?? {}) };
    if (info.desc === 'depthWin') params.name = t(`ascension.label.${info.params.n}` as TranslationKey);
    if (info.desc === 'heroWin') params.name = t(`hero.${info.params.n}.name` as TranslationKey);
    if (info.desc === 'beast') params.name = t(`bestiary.${BEASTS[info.params.b] ?? 'enemy'}.name` as TranslationKey);
    // "Play 1 daily challenges" reads wrong: the singular has its own text
    const one = (info.desc === 'dailyRuns' || info.desc === 'dailyWins' || info.desc === 'secrets' || info.desc === 'puzzles' || info.desc === 'quickWins') && info.params.n === 1 ? '1' : '';
    return t(`ach.d.${info.desc}${one}` as TranslationKey, params);
  }
  return t(`ach.${id}.desc` as TranslationKey, info?.params ?? {});
};

/** A hero challenge's text; `{name}` is the depth called `n` (for the "win at a depth" challenges). */
export const questText = (t: T, hero: number, k: number): string => {
  const n = HERO_QUESTS[hero]?.[k]?.n ?? 0;
  return t(`quest.${hero}.${k}` as TranslationKey, { n, name: t(`ascension.label.${Math.min(5, Math.max(0, Math.trunc(n)))}` as TranslationKey) });
};

/** Localised Forge upgrade text. */
export const forgeText =(t: T, id: UpgradeId, part: 'name' | 'desc'): string => {
  const params = UPGRADES.find(u => u.id === id)?.params ?? {};
  return t(`forge.${id}.${part}` as TranslationKey, params);
};

/** Localised omen text (the rule in the words of the hero's weapon when one is given). */
export const omenText = (t: T, id: string, part: 'name' | 'rule', weapon?: WeaponId): string =>
  weaponLine(t, `omen.${id}.${part}` as TranslationKey, weapon);

/** The name of a trail, frame, title or board theme. */
export const cosmeticText = (t: T, id: CosmeticId): string => t(`cosmetic.${id}.name` as TranslationKey);
