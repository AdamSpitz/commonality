import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { scaffoldMediatorConfig } from './mediatorConfig.js';

export function runScaffoldCli(argv: string[]): string {
  const outputIndex = argv.indexOf('--output');
  const statementIndex = argv.indexOf('--founding-statement');
  const nameIndex = argv.indexOf('--name');
  const output = outputIndex >= 0 ? argv[outputIndex + 1] : undefined;
  const statement = statementIndex >= 0 ? argv[statementIndex + 1] : undefined;
  const name = nameIndex >= 0 ? argv[nameIndex + 1] : undefined;
  if (!output || !statement) {
    throw new Error('Usage: scaffold --founding-statement "..." --output mediator.json [--name "..."]');
  }
  const artifact = scaffoldMediatorConfig(statement, name);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(artifact, null, 2)}\n`, { flag: 'wx' });
  return output;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try { console.log(`Created ${runScaffoldCli(process.argv.slice(2))}`); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
