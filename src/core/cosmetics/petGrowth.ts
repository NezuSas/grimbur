/**
 * Companions grow with the floors played while they are worn: a hatchling, then young (an aura of its colour), then adult (its
 * own painted form). Each companion keeps its own count, so the one taken along most is the most grown. A look only: a grown
 * companion gives nothing in the cave.
 */
export type PetStage = 0 | 1 | 2;

/** Floors played with a companion worn that make it young, then adult. */
export const PET_STAGE_FLOORS: readonly [number, number] = [50, 200];

export function petStage(floors: number | undefined): PetStage {
  const n = Math.max(0, Math.trunc(floors ?? 0));
  return n >= PET_STAGE_FLOORS[1] ? 2 : n >= PET_STAGE_FLOORS[0] ? 1 : 0;
}

/** Where a companion stands on its way to the next stage (null once adult). */
export function petProgress(floors: number | undefined): { stage: PetStage; have: number; need: number | null } {
  const have = Math.max(0, Math.trunc(floors ?? 0));
  const stage = petStage(have);
  return { stage, have, need: stage === 2 ? null : PET_STAGE_FLOORS[stage] };
}

/** The floors map with a run's floors added to the companion it wore. */
export function addPetFloors(map: Readonly<Record<string, number>> | undefined, pet: string | null | undefined, floors: number): Record<string, number> {
  const out = { ...(map ?? {}) };
  if (!pet || floors <= 0) return out;
  out[pet] = (out[pet] ?? 0) + Math.trunc(floors);
  return out;
}

export function parsePetFloors(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (/^pet_[a-z]{2,12}$/.test(k) && typeof v === 'number' && Number.isFinite(v) && v > 0) out[k] = Math.min(1_000_000, Math.trunc(v));
  }
  return out;
}
