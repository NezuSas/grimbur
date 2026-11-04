import type { TranslationKey } from './en';
import type { Params } from './translate';
import { BOMB_REACH, type WeaponId } from '../core/engine/weapons';

type T = (key: TranslationKey, params?: Params) => string;

/**
 * The text of `key` in the words of `weapon`: the archers read the base key as it always was; Mira and Bram read
 * `<key>.orb` / `<key>.bomb` when that variant exists, and the base text otherwise (a line that does not talk about the ammo).
 */
export function weaponLine(t: T, key: TranslationKey, weapon: WeaponId = 'bow', params?: Params): string {
  if (weapon !== 'bow') {
    const variant = `${key}.${weapon}` as TranslationKey;
    const text = t(variant, params);
    if (text !== variant) return text;
  }
  return t(key, params);
}

/** The ammo's name ("Arrows" / "Orbs" / "Bombs"), or its singular ("Arrow") when `count` is 1. */
export const ammoName = (t: T, weapon: WeaponId = 'bow', count?: number): string =>
  t(`weapon.${weapon}.${count === 1 ? 'ammoOne' : 'ammo'}` as TranslationKey);

/** "3 orbs left" (screen readers). */
export const ammoLeftText = (t: T, weapon: WeaponId = 'bow', n: number): string => t(`a11y.ammoLeft.${weapon}` as TranslationKey, { n });

/** The attack verb of the weapon ("Shoot an arrow" / "Cast an orb" / "Throw a bomb"). */
export const attackVerb = (t: T, weapon: WeaponId = 'bow'): string => t(`weapon.${weapon}.attack` as TranslationKey);

/** The attack button's label: the verb, then what is left. */
export const attackLabel = (t: T, weapon: WeaponId = 'bow', n: number): string => `${attackVerb(t, weapon)}. ${ammoLeftText(t, weapon, n)}`;

/** The one-line rule of the weapon (hero screen, manual). */
export const weaponRule = (t: T, weapon: WeaponId = 'bow'): string => t(`weapon.${weapon}.desc` as TranslationKey, { reach: BOMB_REACH });

/** The weapon's name ("Bow" / "Arcane orb" / "Bombs"). */
export const weaponName = (t: T, weapon: WeaponId = 'bow'): string => t(`weapon.${weapon}.name` as TranslationKey);
