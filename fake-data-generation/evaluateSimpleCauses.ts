/**
 * Live implication-attester pass over designed simple-causes geographic /
 * topical parent pairs. Exits 1 if a designed-yes pair is refused or a
 * designed-no pair is blessed.
 *
 * Usage (from fake-data-generation/): npm run gen:seed:simple-causes-implications
 * Requires OPENROUTER_API_KEY.
 */

import { evaluateImplicationWithLLM } from '@commonality/implication-attester/api';
import { flattenSeedStatements, loadSeedCollections } from './seed-content-format.js';
import { loadEnv } from './loadEnv.js';
import { DEFAULT_MODEL } from './seedImplicationEvaluations.js';

loadEnv();

const COLLECTION_ID = 'simple-causes';
const GROUP_ID = 'local-food-planks';

type Expectation = 'yes' | 'no';

interface DesignedPair {
  fromId: string;
  toId: string;
  expect: Expectation;
  note: string;
}

const DESIGNED_PAIRS: DesignedPair[] = [
  { fromId: 'csa-grey-county-ontario', toId: 'csa-ontario', expect: 'yes', note: 'narrower geography → location container' },
  { fromId: 'csa-grey-county-ontario', toId: 'community-supported-agriculture', expect: 'yes', note: 'conjunction → topical parent' },
  { fromId: 'csa-ontario', toId: 'community-supported-agriculture', expect: 'yes', note: 'place dropped → topical parent' },
  { fromId: 'farmers-markets-grey-county-ontario', toId: 'farmers-markets-ontario', expect: 'yes', note: 'narrower geography → location container' },
  { fromId: 'farmers-markets-grey-county-ontario', toId: 'farmers-markets', expect: 'yes', note: 'conjunction → topical parent' },
  { fromId: 'farmers-markets-ontario', toId: 'farmers-markets', expect: 'yes', note: 'place dropped → topical parent' },
  { fromId: 'csa-ontario', toId: 'csa-grey-county-ontario', expect: 'no', note: 'parent must not imply nested place' },
  { fromId: 'community-supported-agriculture', toId: 'csa-ontario', expect: 'no', note: 'topical parent must not imply a province' },
  { fromId: 'community-supported-agriculture', toId: 'csa-grey-county-ontario', expect: 'no', note: 'topical parent must not imply a county' },
  { fromId: 'farmers-markets-ontario', toId: 'farmers-markets-grey-county-ontario', expect: 'no', note: 'parent must not imply nested place' },
];

function uid(statementId: string): string {
  return `${COLLECTION_ID}/${GROUP_ID}/${statementId}`;
}

async function main(): Promise<void> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  const collections = await loadSeedCollections();
  const records = flattenSeedStatements(collections).filter(
    (record) => record.collection.id === COLLECTION_ID && record.group.id === GROUP_ID,
  );
  const byId = new Map(records.map((record) => [record.statement.id, record]));

  let unexpectedYesRefusal = false;
  let unexpectedNoBlessing = false;

  for (const pair of DESIGNED_PAIRS) {
    const from = byId.get(pair.fromId);
    const to = byId.get(pair.toId);
    if (!from || !to) {
      throw new Error(`Missing statement ${uid(pair.fromId)} or ${uid(pair.toId)}`);
    }

    const result = await evaluateImplicationWithLLM(
      from.statement.text,
      to.statement.text,
      apiKey,
      DEFAULT_MODEL,
    );
    const blessed = result.implies && result.confidence !== 'low';
    const ok = pair.expect === 'yes' ? blessed : !blessed;
    const mark = ok ? 'ok' : 'FAIL';
    console.log(`[${mark}] expect ${pair.expect}  ${uid(pair.fromId)} → ${uid(pair.toId)}`);
    console.log(`       ${pair.note}`);
    console.log(`       implies=${result.implies} confidence=${result.confidence}`);
    console.log(`       ${result.reasoning}`);
    console.log(`       S1: ${from.statement.text}`);
    console.log(`       S2: ${to.statement.text}`);

    if (!ok && pair.expect === 'yes') unexpectedYesRefusal = true;
    if (!ok && pair.expect === 'no') unexpectedNoBlessing = true;
  }

  if (unexpectedYesRefusal) {
    console.error('\nSTOP: attester refused a pair designed to bless. Parent wording may have picked up a universal.');
    process.exit(1);
  }
  if (unexpectedNoBlessing) {
    console.error('\nSTOP: attester blessed a pair designed to refuse.');
    process.exit(1);
  }
  console.log('\nAll designed simple-causes geographic/topical pairs matched expectations.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
