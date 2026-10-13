import type { TranslationKey } from './en';
import type { Params } from './translate';
import type { RelicId } from '../core/engine/relics';
import { HERO_UNLOCKS } from '../core/stats/heroUnlocks';

type T = (key: TranslationKey, params?: Params) => string;

/** Localised hero text. Heroes are addressed by index, same as `data/characters.ts`. */
export const heroText = (t: T, heroIndex: number, part: 'name' | 'perk' | 'desc') =>
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
