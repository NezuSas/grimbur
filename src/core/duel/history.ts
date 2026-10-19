import type { Standing } from './duel';

/** One finished duel, as this phone remembers it. */
export interface DuelRecord {
  code: string;
  /** When it ended (ms). */
  at: number;
  outcome: 'won' | 'lost' | 'tie';
  placement: number;
  total: number;
  stake: number;
  /** Embers gained (positive) or lost (negative) by the stake: the prize minus the stake for a win, minus the stake for a loss, 0 for a tie. */
  net: number;
}

export const MAX_HISTORY = 30;

/** The record of a decided duel, or null while it is not decided. `prize` is what the winner took home (0 for the others). */
export function recordOf(code: string, standing: Standing, stake: number, prize: number, at: number): DuelRecord | null {
  if (!standing.decided || standing.state === 'leading' || standing.state === 'trailing') return null;
  const outcome = standing.state;
  const net = outcome === 'won' ? prize - stake : outcome === 'lost' ? -stake : 0;
  return { code, at, outcome, placement: standing.placement, total: standing.total, stake, net };
}

/** Adds a record at the front; one duel appears once (the same code replaces its earlier record) and only the last 30 stay. */
export function addRecord(list: readonly DuelRecord[], record: DuelRecord): DuelRecord[] {
  return [record, ...list.filter(r => r.code !== record.code)].slice(0, MAX_HISTORY);
}

export interface DuelSummary {
  played: number;
  won: number;
  lost: number;
  tied: number;
  net: number;
}

export function summarize(list: readonly DuelRecord[]): DuelSummary {
  return list.reduce<DuelSummary>(
    (s, r) => ({ played: s.played + 1, won: s.won + (r.outcome === 'won' ? 1 : 0), lost: s.lost + (r.outcome === 'lost' ? 1 : 0), tied: s.tied + (r.outcome === 'tie' ? 1 : 0), net: s.net + r.net }),
    { played: 0, won: 0, lost: 0, tied: 0, net: 0 },
  );
}

/** What was saved, cleaned: anything that is not a well-formed record is dropped. Never throws. */
export function parseHistory(raw: unknown): DuelRecord[] {
  if (!Array.isArray(raw)) return [];
  const out: DuelRecord[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const x = r as Record<string, unknown>;
    if (typeof x.code !== 'string' || !['won', 'lost', 'tie'].includes(x.outcome as string)) continue;
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
    const at = num(x.at), placement = num(x.placement), total = num(x.total), stake = num(x.stake), net = num(x.net);
    if (at === null || placement === null || total === null || stake === null || net === null) continue;
    out.push({ code: x.code, at, outcome: x.outcome as DuelRecord['outcome'], placement, total, stake, net });
  }
  return out.slice(0, MAX_HISTORY);
}
