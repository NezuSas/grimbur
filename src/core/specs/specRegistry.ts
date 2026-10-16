/**
 * @file specRegistry.ts
 *
 * Spec Registry — Source of Truth for Game Mechanics Specifications
 *
 * This registry maps each game feature domain to its corresponding
 * Gherkin-style specification file under `specs/engine/`.
 *
 * Used by AI-assisted development (e.g., Antigravity) to reference
 * the correct behavioral spec when implementing or modifying engine
 * features. This file has NO runtime dependency on the game engine.
 *
 * When adding a new engine feature:
 *   1. Write a spec file in `specs/engine/`
 *   2. Register it here
 *   3. Implement the feature in `reducer.ts`
 *   4. Write tests in `tests/engine/`
 */

export const specRegistry = {
  /** Player movement, boundary rules, score penalty, and visited cell tracking. */
  movement: 'specs/engine/movement.spec.md',

  /** Arrow-based attack, direction targeting, and arrow consumption. */
  combat: 'specs/engine/combat.spec.md',

  /** Coin collection, score reward, and hazardsAndItems updates. */
  coins: 'specs/engine/coins.spec.md',

  /** Enemy and pit collision causing game over. */
  hazards: 'specs/engine/hazards.spec.md',

  /** Level up trigger, state reset, and score/arrow preservation. */
  levelProgression: 'specs/engine/level-progression.spec.md',

  /** Trap tiles that deal 500 score damage on contact without ending the game. */
  traps: 'specs/engine/traps.spec.md',

  /** Shield protection against lethal hazards. */
  shield: 'specs/engine/shield.spec.md',
} as const;

export type SpecFeature = keyof typeof specRegistry;

/**
 * Returns the path to the spec file for a given feature domain.
 * @param feature - The feature key from the spec registry.
 * @returns The relative path to the corresponding spec file.
 */
export function getSpec(feature: SpecFeature): string {
  return specRegistry[feature];
}

/**
 * Returns all registered feature domains and their spec file paths.
 * @returns An array of [feature, path] tuples.
 */
export function listSpecs(): [SpecFeature, string][] {
  return Object.entries(specRegistry) as [SpecFeature, string][];
}
