import { COSMETICS, buyCosmetic, equipCosmetic, equippedCosmetic, ownsCosmetic, parseCosmetics } from '../../src/core/cosmetics/cosmetics';
import { EMPTY_STATS } from '../../src/core/stats/runStats';

describe('companions', () => {
  const pets = COSMETICS.filter(c => c.kind === 'pet');

  it('come seven, some for embers, some earned by achievements and one by Christmas in the cave', () => {
    expect(pets).toHaveLength(7);
    expect(pets.filter(p => p.unlock?.kind === 'event').map(p => p.id)).toEqual(['pet_reindeer']);
    expect(pets.filter(p => p.price > 0).length).toBeGreaterThan(0);
    expect(pets.filter(p => p.unlock?.kind === 'achievement').length).toBeGreaterThan(0);
  });

  it('can be bought, worn and survive a save', () => {
    const rich = { ...EMPTY_STATS, embers: 5000 };
    const bought = buyCosmetic(rich, 'pet_firefly');
    expect(bought).not.toBeNull();
    const worn = equipCosmetic(bought!, 'pet', 'pet_firefly');
    expect(worn && equippedCosmetic(worn, 'pet')).toBe('pet_firefly');
    expect(parseCosmetics(JSON.parse(JSON.stringify(worn!.cosmetics))).equipped.pet).toBe('pet_firefly');
  });

  it('the earned ones come with their achievement', () => {
    expect(ownsCosmetic(EMPTY_STATS, 'pet_owl')).toBe(false);
    expect(ownsCosmetic({ ...EMPTY_STATS, achievements: { bestiary_all: '2026-11-01' } }, 'pet_owl')).toBe(true);
  });
});
