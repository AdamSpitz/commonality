/**
 * Pick the Ponder npm script for a shared or Conceptspace-only indexer.
 * The Conceptspace scripts use ponder.conceptspace.config.ts, which does not
 * import funding contract modules.
 */
export function selectPonderScript(script, contracts = 'all') {
  if (contracts !== 'conceptspace') return script;
  if (script === 'dev:no-ui') return 'dev:conceptspace:no-ui';
  if (script === 'dev') return 'dev:conceptspace';
  if (script === 'start') return 'start:conceptspace';
  return script;
}

if (process.argv[1]?.endsWith('selectPonderScript.mjs')) {
  const script = process.argv[2] ?? 'dev:no-ui';
  const contracts = process.argv[3] ?? 'all';
  process.stdout.write(selectPonderScript(script, contracts));
}
