import type { LocalStats } from '../stats/runStats';
import { cosmeticInfo, equippedCosmetic, isCosmeticId, type CosmeticId } from './cosmetics';

/** What other players see of someone: the frame around their portrait and the title under their name. */
export interface Look {
  frame?: CosmeticId;
  title?: CosmeticId;
}

/** The player's own public look (only the slots they have filled, so a row without one stays as it always was). */
export function lookOf(stats: LocalStats | null): Look {
  if (!stats) return {};
  const frame = equippedCosmetic(stats, 'frame');
  const title = equippedCosmetic(stats, 'title');
  return { ...(frame ? { frame } : {}), ...(title ? { title } : {}) };
}

/** Reads a look off someone else's row: anything that is not a known frame or title is ignored. */
export function parseLook(data: { frame?: unknown; title?: unknown } | null | undefined): Look {
  const ok = (v: unknown, kind: 'frame' | 'title'): v is CosmeticId => isCosmeticId(v) && cosmeticInfo(v).kind === kind;
  return { ...(ok(data?.frame, 'frame') ? { frame: data!.frame as CosmeticId } : {}), ...(ok(data?.title, 'title') ? { title: data!.title as CosmeticId } : {}) };
}

/** The shape firestore.rules accepts for the optional look fields (it mirrors the id naming, not the catalog). */
export const LOOK_PATTERN = { frame: /^frame_[a-z]{3,12}$/, title: /^title_[a-z]{3,12}$/ } as const;

/** Problems with a row's look fields (empty when fine): a row may carry neither, one or both. */
export function lookProblems(row: { frame?: unknown; title?: unknown }): string[] {
  const out: string[] = [];
  if (row.frame !== undefined && !(typeof row.frame === 'string' && LOOK_PATTERN.frame.test(row.frame))) out.push('frame');
  if (row.title !== undefined && !(typeof row.title === 'string' && LOOK_PATTERN.title.test(row.title))) out.push('title');
  return out;
}
