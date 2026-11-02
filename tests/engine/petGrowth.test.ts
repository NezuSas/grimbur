import { PET_STAGE_FLOORS, addPetFloors, parsePetFloors, petProgress, petStage } from '../../src/core/cosmetics/petGrowth';
import { EMPTY_STATS, mergeRun } from '../../src/core/stats/runStats';

describe('companions grow', () => {
  it('from hatchling to young to adult with the floors played', () => {
    expect(petStage(0)).toBe(0);
    expect(petStage(PET_STAGE_FLOORS[0] - 1)).toBe(0);
    expect(petStage(PET_STAGE_FLOORS[0])).toBe(1);
    expect(petStage(PET_STAGE_FLOORS[1])).toBe(2);
    expect(petProgress(10)).toEqual({ stage: 0, have: 10, need: PET_STAGE_FLOORS[0] });
    expect(petProgress(9999).need).toBeNull();
  });

  it('counts a run only for the companion it wore', () => {
    const after = mergeRun({ ...EMPTY_STATS, petFloors: { pet_fox: 45 } }, { score: 0, level: 7, pet: 'pet_fox', day: '2026-11-01' }).stats;
    expect(after.petFloors.pet_fox).toBe(52);
    expect(addPetFloors({}, null, 5)).toEqual({});
  });

  it('reads stored counts defensively', () => {
    expect(parsePetFloors({ pet_fox: 12, bad: 3, pet_bat: -1, pet_owl: 'x' })).toEqual({ pet_fox: 12 });
  });
});
