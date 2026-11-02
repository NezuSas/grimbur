import { HERO_QUESTS, QUEST_EMBERS, allQuestsDone, newQuests, parseQuests, questDone, withQuests } from '../../src/core/stats/heroQuests';
import { EMPTY_STATS, mergeRun } from '../../src/core/stats/runStats';
import { ownsCosmetic } from '../../src/core/cosmetics/cosmetics';

describe('hero challenges', () => {
  it('has three for every hero', () => {
    expect(HERO_QUESTS).toHaveLength(6);
    for (const q of HERO_QUESTS) expect(q).toHaveLength(3);
  });

  it('completes the challenges a run meets, for its own hero only, once', () => {
    const run = { score: 0, level: 6, heroIndex: 0, secrets: 2 };
    expect(newQuests([0, 0, 0, 0, 0, 0], run)).toEqual([0, 1]);
    expect(newQuests([3, 0, 0, 0, 0, 0], run)).toEqual([]);
    expect(newQuests([0, 0, 0, 0, 0, 0], { ...run, heroIndex: 1 })).toEqual([]);
  });

  it('pays embers for each and gives the title and frame once all three are done', () => {
    const before = { ...EMPTY_STATS, heroQuests: [3, 0, 0, 0, 0, 0] };
    expect(ownsCosmetic(before, 'title_questvael')).toBe(false);
    const run = { score: 0, level: 10, heroIndex: 0, victory: true, ascension: 2, mode: 'expedition' as const };
    const merged = mergeRun(before, run);
    expect(merged.payout.quests).toBe(QUEST_EMBERS);
    expect(allQuestsDone(merged.stats.heroQuests[0])).toBe(true);
    expect(ownsCosmetic(merged.stats, 'title_questvael')).toBe(true);
    expect(ownsCosmetic(merged.stats, 'frame_questvael')).toBe(true);
  });

  it('reads stored masks defensively', () => {
    expect(parseQuests([1, 9, -1, 'x'])).toEqual([1, 0, 0, 0, 0, 0]);
    expect(questDone(withQuests(undefined, 2, [1])[2], 1)).toBe(true);
  });
});
