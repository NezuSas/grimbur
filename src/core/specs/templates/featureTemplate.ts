/**
 * @file featureTemplate.ts
 *
 * Feature Template — AI-Assisted Engine Feature Generator
 *
 * This module defines the structure required for any new engine mechanic
 * and provides a `createFeatureTemplate` helper that produces skeleton
 * definitions ready for spec authoring, reducer integration, and testing.
 *
 * Intended for use by AI tools (e.g., Antigravity) to scaffold new game
 * mechanics in a consistent, spec-driven way. Adding a new mechanic should
 * always begin by creating a template here and authoring its spec file.
 *
 * Workflow for a new mechanic:
 *   1. Call `createFeatureTemplate('myFeature')` to generate the skeleton.
 *   2. Author the spec file at `specFile`.
 *   3. Register the feature in `specRegistry.ts`.
 *   4. Implement the reducer action in `reducer.ts`.
 *   5. Write the required tests listed in `requiredTests`.
 */

/**
 * Defines the structure required for any new engine feature within
 * the Wumpus Adventures GameEngine.
 */
export interface EngineFeatureTemplate {
  /** Unique camelCase identifier for the mechanic (e.g. "traps"). */
  name: string;
  /** Human-readable description of what the mechanic does. */
  description: string;
  /** Relative path where the Gherkin spec file should be created. */
  specFile: string;
  /** Whether this mechanic modifies the game reducer (true for gameplay logic). */
  reducerIntegration: boolean;
  /** Relative paths to the test files that must be created for this mechanic. */
  requiredTests: string[];
}

/**
 * Generates a skeleton `EngineFeatureTemplate` for a new game mechanic.
 *
 * @param name - The camelCase feature name (e.g. "traps", "shield", "teleport").
 * @returns A fully-populated template skeleton ready to be customised.
 *
 * @example
 * const trapsTemplate = createFeatureTemplate('traps');
 * // {
 * //   name: 'traps',
 * //   description: 'Describe what traps does to the game state.',
 * //   specFile: 'specs/engine/traps.spec.md',
 * //   reducerIntegration: true,
 * //   requiredTests: [
 * //     'tests/engine/traps.test.ts',
 * //     'tests/engine/traps-simulation.test.ts',
 * //   ],
 * // }
 */
export function createFeatureTemplate(name: string): EngineFeatureTemplate {
  return {
    name,
    description: `Describe what ${name} does to the game state.`,
    specFile: `specs/engine/${name}.spec.md`,
    reducerIntegration: true,
    requiredTests: [
      `tests/engine/${name}.test.ts`,
      `tests/engine/${name}-simulation.test.ts`,
    ],
  };
}
