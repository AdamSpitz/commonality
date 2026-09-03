/**
 * Add prospective / materialized content-funding rounds to an already-seeded
 * local chain (YouTube + Substack channels from generateContentFundingScenarios).
 *
 * Run from fake-data-generation/:
 *   npx tsx seedProspectiveContentRounds.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { publishedDataCidForDocument } from '@commonality/sdk/displayable-documents';
import { generateProspectiveContentRoundScenarios, SEED_CONTENT_ALIGNMENT_REF } from './contentFundingActions.js';
import { CONTRACT_ADDRESSES, loadEnv } from './loadEnv.js';
import {
  createStatementDocumentFromSeed,
  flattenSeedStatements,
  loadSeedCollections,
} from './seed-content-format.js';
import type { User } from './types.js';

const here = path.dirname(fileURLToPath(import.meta.url));

async function resolveLocalFoodPlankCid() {
  const records = flattenSeedStatements(await loadSeedCollections());
  const plank = records.find((record) =>
    record.collection.id === SEED_CONTENT_ALIGNMENT_REF.collectionId
    && record.group.id === SEED_CONTENT_ALIGNMENT_REF.groupId
    && record.statement.id === SEED_CONTENT_ALIGNMENT_REF.statementId);
  if (!plank) throw new Error('Could not find local-food-systems seed statement');
  return publishedDataCidForDocument(createStatementDocumentFromSeed(plank));
}

async function main() {
  loadEnv();
  const users = JSON.parse(fs.readFileSync(path.join(here, 'data/users.json'), 'utf8')) as User[];
  const factory = CONTRACT_ADDRESSES.prospectiveContentRoundFactory as `0x${string}` | undefined;
  if (!factory) throw new Error('PROSPECTIVE_CONTENT_ROUND_FACTORY_ADDRESS is not set');
  if (!CONTRACT_ADDRESSES.channelRegistry || !CONTRACT_ADDRESSES.channelVerifier) {
    throw new Error('Channel registry/verifier addresses are not set');
  }

  const statementCid = await resolveLocalFoodPlankCid();
  await generateProspectiveContentRoundScenarios(
    {
      channelRegistry: CONTRACT_ADDRESSES.channelRegistry as `0x${string}`,
      channelVerifier: CONTRACT_ADDRESSES.channelVerifier as `0x${string}`,
      creatorContractFactory: CONTRACT_ADDRESSES.creatorContractFactory as `0x${string}`,
      prospectiveContentRoundFactory: factory,
      publishedData: CONTRACT_ADDRESSES.publishedData as `0x${string}` | undefined,
      alignmentAttestations: CONTRACT_ADDRESSES.alignmentAttestations as `0x${string}` | undefined,
    },
    users,
    { statementCid },
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
