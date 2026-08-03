import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CSM_MISSION_STATEMENT_CID,
  CSM_MISSION_STATEMENT_DOCUMENT,
  CSM_MISSION_STATEMENT_TEXT,
} from '../../sdk/src/subsystems/conceptspace/constants.js';
import { publishDocument } from '../../sdk/src/subsystems/displayable-documents/displayable-document.js';
import { getSeedProjectAlignmentRef, getSeedProjectMetadata } from '../fundingAndDelegationActions.js';
import { buildContractMetadata } from '../contentFundingActions.js';
import { createStatementDocumentFromSeed, flattenSeedStatements, loadSeedCollections } from '../seed-content-format.js';

test('seed LazyGiving projects have human-readable metadata', () => {
  const metadata = getSeedProjectMetadata(1);

  assert.equal(metadata.name, 'Bridge-Building Workshop Series');
  assert.match(metadata.description, /coordinate on shared goals/i);
  assert.equal(metadata.seedProjectKind, 'finding-common-ground');
  assert.deepEqual(getSeedProjectAlignmentRef(1), {
    collectionId: 'fundable-projects',
    groupId: 'finding-common-ground',
    statementId: 'common-ground-across-divides',
  });
  assert.doesNotMatch(metadata.name, /^Project 0x/i);
});

test('the first seed LazyGiving project is a local public-goods storyline', async () => {
  // Project 0 is the one the deterministic funding/success seeding covers, so the local
  // storyline has to sit there for use cases A1/A5/E2 to be demonstrable in the UI.
  const metadata = getSeedProjectMetadata(0);
  const alignmentRef = getSeedProjectAlignmentRef(0);

  assert.equal(metadata.name, 'Riverside Community Garden');
  assert.equal(metadata.seedProjectKind, 'local-community');
  assert.equal(alignmentRef.groupId, 'local-community');

  // The cause statement it aligns to must actually exist in the seed content.
  const records = flattenSeedStatements(await loadSeedCollections());
  const aligned = records.find((record) =>
    record.collection.id === alignmentRef.collectionId &&
    record.group.id === alignmentRef.groupId &&
    record.statement.id === alignmentRef.statementId);
  assert.ok(aligned, `seed content has no statement for ${JSON.stringify(alignmentRef)}`);
});

test('every seed project alignment ref resolves to a seed statement', async () => {
  const records = flattenSeedStatements(await loadSeedCollections());

  for (let index = 0; index < 6; index++) {
    const ref = getSeedProjectAlignmentRef(index);
    const match = records.find((record) =>
      record.collection.id === ref.collectionId &&
      record.group.id === ref.groupId &&
      record.statement.id === ref.statementId);
    assert.ok(match, `seed project ${index} aligns to a missing statement ${JSON.stringify(ref)}`);
  }
});

test('CSM mission statement seed content matches the well-known SDK constant and CID', async () => {
  const csmRecords = flattenSeedStatements(await loadSeedCollections()).filter((record) => record.collection.id === 'csm');

  assert.equal(csmRecords.length, 1);
  assert.equal(csmRecords[0]!.statement.text, CSM_MISSION_STATEMENT_TEXT);
  assert.deepEqual(createStatementDocumentFromSeed(csmRecords[0]!), CSM_MISSION_STATEMENT_DOCUMENT);
  assert.equal(
    await publishDocument({ shouldUseMock: true }, createStatementDocumentFromSeed(csmRecords[0]!)),
    CSM_MISSION_STATEMENT_CID,
  );
});

test('content-funding seed contracts use uploadable metadata instead of fake IPFS IDs', () => {
  const metadata = buildContractMetadata(
    'substack:smartwriter',
    ['my-first-big-piece'],
    false,
  );

  assert.equal(metadata.name, 'Smart Writer creator content fund');
  assert.equal(metadata.creatorDisplayName, 'Smart Writer');
  assert.equal(metadata.contractType, 'creator');
  assert.deepEqual(metadata.contentSuffixes, ['my-first-big-piece']);
  assert.doesNotMatch(JSON.stringify(metadata), /fake-metadata/);
});
