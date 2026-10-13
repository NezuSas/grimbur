import type { TranslationKey } from './en';
import type { Params } from './translate';
import type { RelicId } from '../core/engine/relics';
import { HERO_UNLOCKS } from '../core/stats/heroUnlocks';
import { ACHIEVEMENTS, AchievementId } from '../core/stats/achievements';
import { UPGRADES, UpgradeId } from '../core/stats/forge';

type T = (key: TranslationKey, params?: Params) => string;

/** Localised hero text. Heroes are addressed by index, same as `data/characters.ts`. */
export const heroText = (t: T, heroIndex: number, part: 'name' | 'title' | 'perk' | 'desc') =>
  t(`hero.${heroIndex}.${part}` as TranslationKey);

/** Localised relic text. */
export const relicText = (t: T, id: RelicId, part: 'name' | 'desc') =>
  t(`relic.${id}.${part}` as TranslationKey);

/** How to unlock a hero, or an empty string for heroes that are free. */
export const unlockText = (t: T, heroIndex: number): string => {
  const rule = HERO_UNLOCKS[heroIndex];
  if (!rule || rule.kind === 'free') return '';
  return rule.kind === 'floor' ? t('heroes.unlockFloor', { floor: rule.floor }) : t('heroes.unlockVictory');
};

/** Localised achievement text; the description is interpolated with the real thresholds. */
export const achievementText = (t: T, id: AchievementId, part: 'name' | 'desc'): string => {
  const info = ACHIEVEMENTS.find(a => a.id === id);
  if (part === 'name') return t(`ach.${id}.name` as TranslationKey);
  // A bespoke description (`ach.<id>.desc`) wins over the shared template.
  const bespokeKey = `ach.${id}.desc` as TranslationKey;
  const bespoke = t(bespokeKey, info?.params ?? {});
  if (bespoke !== bespokeKey) return bespoke;
  if (info?.desc) {
    const params: Params = { ...(info.params ?? {}) };
    if (info.desc === 'depthWin') params.name = t(`ascension.label.${info.params.n}` as TranslationKey);
    if (info.desc === 'heroWin') params.name = t(`hero.${info.params.n}.name` as TranslationKey);
    return t(`ach.d.${info.desc}` as TranslationKey, params);
  }
  return t(`ach.${id}.desc` as TranslationKey, info?.params ?? {});
};

/** Localised Forge upgrade text. */
export const forgeText = (t: T, id: UpgradeId, part: 'name' | 'desc'): string => {
  const params = UPGRADES.find(u => u.id === id)?.params ?? {};
  return t(`forge.${id}.${part}` as TranslationKey, params);
};

/** Localised omen text. */
export const omenText = (t: T, id: string, part: 'name' | 'rule'): string =>
  t(`omen.${id}.${part}` as TranslationKey);
