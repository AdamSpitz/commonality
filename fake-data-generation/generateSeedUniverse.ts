import fs from 'fs/promises';
import path from 'path';
import { buildUniverseFromSeedCollections, DEFAULT_SEED_UNIVERSE_OUTPUT, loadSeedCollections } from './seed-content-format.js';

function parseArgs(args: string[]): { outputPath: string; excludeProliferation: boolean } {
  const excludeProliferation = args.includes('--exclude-proliferation');
  const outputIndex = args.findIndex((arg) => arg === '--output');
  if (outputIndex >= 0) {
    const outputPath = args[outputIndex + 1];
    if (!outputPath) {
      throw new Error('Missing value after --output');
    }
    return { outputPath, excludeProliferation };
  }

  const inlineOutput = args.find((arg) => arg.startsWith('--output='));
  if (inlineOutput) {
    return { outputPath: inlineOutput.slice('--output='.length), excludeProliferation };
  }

  return { outputPath: DEFAULT_SEED_UNIVERSE_OUTPUT, excludeProliferation };
}

async function main(): Promise<void> {
  const { outputPath, excludeProliferation } = parseArgs(process.argv.slice(2));
  const allCollections = await loadSeedCollections();
  const collections = excludeProliferation
    ? allCollections.filter((collection) => collection.id !== 'proliferation')
    : allCollections;
  const universe = buildUniverseFromSeedCollections(collections);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(universe, null, 2) + '\n');

  const statementCount = collections.reduce(
    (count, collection) => count + collection.groups.reduce((groupCount, group) => groupCount + group.statements.length, 0),
    0
  );
  console.log(`Wrote ${outputPath}`);
  console.log(`Collections: ${collections.length}`);
  console.log(`Statements: ${statementCount}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
