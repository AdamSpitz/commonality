import fs from 'fs/promises';
import path from 'path';
import {
  buildSeedWorkerOutputs,
  DEFAULT_SEED_WORKER_OUTPUTS_PATH,
  verifySeedWorkerOutputs,
} from './seedWorkerOutputs.js';

function parseArgs(args: string[]): { outputPath: string; verifyOnly: boolean } {
  const outputArg = args.find((arg) => arg.startsWith('--output='));
  const outputIndex = args.findIndex((arg) => arg === '--output');
  const outputPath = outputArg
    ? outputArg.slice('--output='.length)
    : outputIndex >= 0
      ? args[outputIndex + 1]
      : DEFAULT_SEED_WORKER_OUTPUTS_PATH;

  if (!outputPath) {
    throw new Error('Missing value after --output');
  }

  return {
    outputPath,
    verifyOnly: args.includes('--verify'),
  };
}

async function main(): Promise<void> {
  const { outputPath, verifyOnly } = parseArgs(process.argv.slice(2));

  if (verifyOnly) {
    await verifySeedWorkerOutputs(outputPath);
    console.log(`${outputPath} matches current seed content and generator.`);
    return;
  }

  const outputs = await buildSeedWorkerOutputs();
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(outputs, null, 2) + '\n');
  console.log(`Wrote ${outputPath}`);
  console.log(`Explorer entries: ${outputs.explorerCollection.entries.length}`);
  console.log(`Nudges: ${outputs.nudgeBatch.nudges.length}`);
  console.log(`Implication-finder pairs: ${outputs.implicationFinder.pairs.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
