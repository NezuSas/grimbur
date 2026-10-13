/**
 * @file featureGenerator.ts
 *
 * AI Feature Generator — Scaffold for New Engine Mechanics
 *
 * This module generates scaffold definitions for new game mechanics
 * using the Feature Template system. It is designed for use by AI
 * development tools (e.g., Antigravity) to produce a consistent,
 * spec-driven blueprint before any code is written.
 *
 * This module has NO runtime dependency on the game engine, reducer,
 * or test files. It only generates metadata and logs guidance.
 *
 * Intended workflow when adding a new mechanic:
 *   1. Call `generateFeature('myFeature')` to produce the scaffold.
 *   2. Author the spec at the path returned by `suggestSpecLocation`.
 *   3. Register the feature in `specRegistry.ts`.
 *   4. Implement the reducer action.
 *   5. Create the test files listed in `suggestTestFiles`.
 */

import { createFeatureTemplate, EngineFeatureTemplate } from './templates/featureTemplate';

/**
 * Generates a scaffold definition for a new engine mechanic and logs
 * the files that should be created as part of the feature implementation.
 *
 * @param name - The camelCase feature name (e.g. "traps", "shield").
 * @returns A complete `EngineFeatureTemplate` scaffold for the mechanic.
 *
 * @example
 * const scaffold = generateFeature('traps');
 * // Logs the spec file, reducer note, and required test paths.
 */
export function generateFeature(name: string): EngineFeatureTemplate {
  const template = createFeatureTemplate(name);

  console.log(`\n[FeatureGenerator] Scaffolding new engine feature: "${name}"`);
  console.log(`  📄 Spec file:           ${template.specFile}`);
  console.log(`  ⚙️  Reducer integration: ${template.reducerIntegration ? 'Required (add action to reducer.ts)' : 'Not required'}`);
  template.requiredTests.forEach((testPath) => {
    console.log(`  🧪 Required test:       ${testPath}`);
  });
  console.log('');

  return template;
}

/**
 * Returns the suggested spec file path for a new feature.
 *
 * @param name - The camelCase feature name.
 * @returns The relative path for the Gherkin spec file.
 *
 * @example
 * suggestSpecLocation('traps'); // → 'specs/engine/traps.spec.md'
 */
export function suggestSpecLocation(name: string): string {
  return `specs/engine/${name}.spec.md`;
}

/**
 * Returns the suggested test file paths for a new feature.
 *
 * @param name - The camelCase feature name.
 * @returns An array of relative paths for unit and simulation tests.
 *
 * @example
 * suggestTestFiles('traps');
 * // → ['tests/engine/traps.test.ts', 'tests/engine/traps-simulation.test.ts']
 */
export function suggestTestFiles(name: string): string[] {
  return [
    `tests/engine/${name}.test.ts`,
    `tests/engine/${name}-simulation.test.ts`,
  ];
}
