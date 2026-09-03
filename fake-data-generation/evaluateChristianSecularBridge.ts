/**
 * Live implication-attester pass over the designed christian-secular-bridge pairs.
 * Exits 1 if a pair we expected to bless is refused, or if a pair we expected
 * to refuse is blessed. Unexpected refusals of "yes" pairs should stop the seed work.
 *
 * Usage (from fake-data-generation/): npx tsx evaluateChristianSecularBridge.ts
 * Requires OPENROUTER_API_KEY.
 */

import { evaluateImplicationWithLLM } from '@commonality/implication-attester/api';
import { flattenSeedStatements, loadSeedCollections } from './seed-content-format.js';
import { loadEnv } from './loadEnv.js';
import { DEFAULT_MODEL } from './seedImplicationEvaluations.js';

loadEnv();

const COLLECTION_ID = 'christian-secular-bridge';

type Expectation = 'yes' | 'no';

interface DesignedPair {
  fromGroup: string;
  fromId: string;
  toGroup: string;
  toId: string;
  expect: Expectation;
}

const DESIGNED_PAIRS: DesignedPair[] = [
  { fromGroup: 'abortion', fromId: 'modified-christian', toGroup: 'abortion', toId: 'commonality', expect: 'yes' },
  { fromGroup: 'abortion', fromId: 'modified-secular', toGroup: 'abortion', toId: 'commonality', expect: 'yes' },
  { fromGroup: 'markets', fromId: 'modified-christian', toGroup: 'markets', toId: 'commonality', expect: 'yes' },
  { fromGroup: 'markets', fromId: 'modified-secular', toGroup: 'markets', toId: 'commonality', expect: 'yes' },
  { fromGroup: 'lgbt', fromId: 'modified-christian', toGroup: 'lgbt', toId: 'commonality', expect: 'yes' },
  { fromGroup: 'lgbt', fromId: 'modified-secular', toGroup: 'lgbt', toId: 'commonality', expect: 'yes' },
  { fromGroup: 'abortion', fromId: 'natural-christian', toGroup: 'abortion', toId: 'commonality', expect: 'no' },
  { fromGroup: 'abortion', fromId: 'natural-secular', toGroup: 'abortion', toId: 'commonality', expect: 'no' },
  { fromGroup: 'markets', fromId: 'natural-christian', toGroup: 'markets', toId: 'commonality', expect: 'no' },
  { fromGroup: 'lgbt', fromId: 'natural-christian', toGroup: 'lgbt', toId: 'commonality', expect: 'no' },
  { fromGroup: 'abortion', fromId: 'modified-christian', toGroup: 'abortion', toId: 'modified-secular', expect: 'no' },
  { fromGroup: 'scripture', fromId: 'natural-christian', toGroup: 'abortion', toId: 'commonality', expect: 'no' },
];

function uid(groupId: string, statementId: string): string {
  return `${COLLECTION_ID}/${groupId}/${statementId}`;
}

async function main(): Promise<void> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  const collections = await loadSeedCollections();
  const records = flattenSeedStatements(collections).filter(
    (record) => record.collection.id === COLLECTION_ID,
  );
  const byUid = new Map(records.map((record) => [uid(record.group.id, record.statement.id), record]));

  let unexpectedYesRefusal = false;
  let unexpectedNoBlessing = false;

  for (const pair of DESIGNED_PAIRS) {
    const from = byUid.get(uid(pair.fromGroup, pair.fromId));
    const to = byUid.get(uid(pair.toGroup, pair.toId));
    if (!from || !to) {
      throw new Error(`Missing statement ${uid(pair.fromGroup, pair.fromId)} or ${uid(pair.toGroup, pair.toId)}`);
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
    console.log(
      `[${mark}] expect ${pair.expect}  ${uid(pair.fromGroup, pair.fromId)} → ${uid(pair.toGroup, pair.toId)}`,
    );
    console.log(`       implies=${result.implies} confidence=${result.confidence}`);
    console.log(`       ${result.reasoning}`);

    if (!ok && pair.expect === 'yes') unexpectedYesRefusal = true;
    if (!ok && pair.expect === 'no') unexpectedNoBlessing = true;
  }

  if (unexpectedYesRefusal) {
    console.error('\nSTOP: implication attester refused a pair we designed to bless. Debug wording before seeding.');
    process.exit(1);
  }
  if (unexpectedNoBlessing) {
    console.error('\nSTOP: implication attester blessed a pair we designed to refuse. Debug wording before seeding.');
    process.exit(1);
  }
  console.log('\nAll designed pairs matched expectations.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
