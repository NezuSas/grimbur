import { relicStacks, trayView } from '../../src/ui/components/relicStacks';
import type { RelicId } from '../../src/core/engine/relics';

describe('the relic tray', () => {
  const ids = ['lantern', 'raven_eye', 'quiver', 'lantern', 'bulwark', 'reaper', 'gambler', 'glass_bow', 'blood_pact'] as RelicId[];

  it('stacks duplicates in pick order', () => {
    expect(relicStacks(ids).slice(0, 2)).toEqual([['lantern', 2], ['raven_eye', 1]]);
    expect(relicStacks(ids)).toHaveLength(8);
  });

  it('shows everything while it fits', () => {
    expect(trayView(relicStacks(ids), 8)).toEqual({ shown: relicStacks(ids), hidden: 0 });
    expect(trayView(relicStacks(ids)).hidden).toBe(0);
  });

  it('past its tiles, shows the newest relics and a "+N" tile for the rest', () => {
    const { shown, hidden } = trayView(relicStacks(ids), 6);
    expect(shown).toHaveLength(5);
    expect(hidden).toBe(3);
    expect(shown[shown.length - 1][0]).toBe('blood_pact');
    expect(shown.length + 1).toBe(6);
  });
});
