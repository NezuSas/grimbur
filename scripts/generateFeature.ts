#!/usr/bin/env ts-node

/**
 * @file generateFeature.ts
 *
 * CLI script for scaffolding new GameEngine mechanics.
 *
 * Usage:
 *   npm run generate-feature <featureName>
 *
 * Example:
 *   npm run generate-feature traps
 *
 * This script calls the Feature Generator and prints all files
 * that should be created to implement the new mechanic.
 * It does NOT modify any existing files automatically.
 */

import { generateFeature, suggestSpecLocation, suggestTestFiles } from '../src/core/specs/featureGenerator';

const name = process.argv[2];

if (!name) {
  console.error('\n❌  Usage: npm run generate-feature <featureName>');
  console.error('   Example: npm run generate-feature traps\n');
  process.exit(1);
}

const template = generateFeature(name);

console.log('─────────────────────────────────────────────────');
console.log(`  📋  Feature "${name}" scaffold complete`);
console.log('─────────────────────────────────────────────────\n');

console.log(`  1. Create the spec file:`);
console.log(`        ${suggestSpecLocation(name)}\n`);

console.log(`  2. Create the test files:`);
suggestTestFiles(name).forEach((f) => console.log(`        ${f}`));
console.log('');

console.log(`  3. Register the feature in:`);
console.log(`        src/core/specs/specRegistry.ts`);
console.log(`     Add:\n        ${name}: '${template.specFile}'\n`);

console.log(`  4. Implement the reducer action in:`);
console.log(`        src/core/engine/reducer.ts\n`);

console.log('─────────────────────────────────────────────────');
console.log('  ⚠️  No files were modified. All steps above are manual.');
console.log('─────────────────────────────────────────────────\n');
