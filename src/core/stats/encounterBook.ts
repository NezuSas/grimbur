import { ENCOUNTERS, type EncounterId } from '../engine/encounters';

/**
 * The encounter journal: every scene met over all runs (taken or walked past), and the tallies the journal's achievements read.
 */
export interface EncounterBook {
  seen: EncounterId[];
  /** Bets the gambler lost to the player. */
  gamblesWon: number;
  /** Miners freed from the rubble. */
  minersFreed: number;
}

export const EMPTY_ENCOUNTER_BOOK: EncounterBook = { seen: [], gamblesWon: 0, minersFreed: 0 };

const isEncounter = (v: unknown): v is EncounterId => typeof v === 'string' && (ENCOUNTERS as readonly string[]).includes(v);

/** A finished run's scenes added to the journal. */
export function addRunEncounters(book: EncounterBook, log: readonly { id: string; outcome?: string }[] | undefined): EncounterBook {
  if (!log || log.length === 0) return book;
  const seen = [...book.seen];
  let gamblesWon = book.gamblesWon;
  let minersFreed = book.minersFreed;
  for (const e of log) {
    if (!isEncounter(e.id)) continue;
    if (!seen.includes(e.id)) seen.push(e.id);
    if (e.id === 'gambler' && e.outcome === 'win') gamblesWon++;
    if (e.id === 'miner' && (e.outcome === 'win' || e.outcome === 'lose')) minersFreed++;
  }
  return { seen, gamblesWon, minersFreed };
}

export function parseEncounterBook(raw: unknown): EncounterBook {
  if (!raw || typeof raw !== 'object') return EMPTY_ENCOUNTER_BOOK;
  const r = raw as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.trunc(v) : 0);
  return { seen: Array.isArray(r.seen) ? [...new Set(r.seen.filter(isEncounter))] : [], gamblesWon: n(r.gamblesWon), minersFreed: n(r.minersFreed) };
}
