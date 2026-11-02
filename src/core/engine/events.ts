import { omenEffects, type OmenEffects, type OmenId } from './omens';

/**
 * The week's event: one rule twist that holds on every floor of every expedition played that week, the same for everyone.
 * It stacks on the floor's omen. The daily challenge, friend challenges, duels and the endless descent never get it: they
 * must stay the same cave for everyone whatever the week.
 */
export type EventId = 'vortex' | 'hunt' | 'gold' | 'dark' | 'wanderers';

export const EVENT_IDS: readonly EventId[] = ['vortex', 'hunt', 'gold', 'dark', 'wanderers'];

/** What an event adds to every floor (on top of the omen). */
export const EVENTS: Record<EventId, Partial<OmenEffects>> = {
  // The week of the vortex: one more vortex on every floor, every gem pays double.
  vortex: { pitDelta: 1, gemMultiplier: 2 },
  // The hunt: one more guardian on every floor and one more arrow to face it; gems pay 50% more.
  hunt: { enemyDelta: 1, arrowBonus: 1, gemMultiplier: 1.5 },
  // Gem fever: one more gem on every floor and the shop pays 50% more, but a stalker roams every floor.
  gold: { coinDelta: 1, shopGemEvery: 2, stalkerDelta: 1 },
  // The dark week: every floor is dark (clues only beside the hero); every gem pays double.
  dark: { dark: true, gemMultiplier: 2 },
  // The week of the wanderers: the cave is crowded with scenes (see ENCOUNTER_CHANCE_WANDERERS in encounters.ts); gems pay 25% more.
  wanderers: { gemMultiplier: 1.25 },
};

/** Runs a newcomer plays before the week's event joins in (the first caves stay the plain ones the guide explains). */
export const EVENT_MIN_RUNS = 3;

export const isEventId = (v: unknown): v is EventId => typeof v === 'string' && (EVENT_IDS as readonly string[]).includes(v);

/** The event of an ISO week key (`2026-W44`): they take turns week after week. */
export function eventForWeek(week: string | null | undefined): EventId | null {
  const m = week ? /^(\d{4})-W(\d{2})$/.exec(week) : null;
  if (!m) return null;
  const n = Number(m[1]) * 53 + Number(m[2]);
  return EVENT_IDS[n % EVENT_IDS.length];
}

/** The floor's omen and the week's event as one set of effects. */
export function floorEffects(omen: OmenId | null | undefined, event: EventId | null | undefined): OmenEffects {
  const base = omenEffects(omen);
  const ev = event ? EVENTS[event] : null;
  if (!ev) return base;
  const every = [base.shopGemEvery, ev.shopGemEvery ?? 0].filter(n => n > 0);
  return {
    ...base,
    gemMultiplier: base.gemMultiplier * (ev.gemMultiplier ?? 1),
    shopGemEvery: every.length ? Math.min(...every) : 0,
    enemyDelta: base.enemyDelta + (ev.enemyDelta ?? 0),
    pitDelta: base.pitDelta + (ev.pitDelta ?? 0),
    coinDelta: base.coinDelta + (ev.coinDelta ?? 0),
    stalkerDelta: base.stalkerDelta + (ev.stalkerDelta ?? 0),
    arrowBonus: base.arrowBonus + (ev.arrowBonus ?? 0),
    dark: base.dark || ev.dark,
  };
}
