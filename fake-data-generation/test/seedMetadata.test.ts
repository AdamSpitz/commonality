import assert from 'node:assert/strict';
import test from 'node:test';
import { getSeedProjectAlignmentRef, getSeedProjectMetadata } from '../fundingAndDelegationActions.js';
import { buildContractMetadata } from '../contentFundingActions.js';

test('seed LazyGiving projects have human-readable metadata', () => {
  const metadata = getSeedProjectMetadata(0);

  assert.equal(metadata.name, 'Bridge-Building Workshop Series');
  assert.match(metadata.description, /coordinate on shared goals/i);
  assert.equal(metadata.seedProjectKind, 'finding-common-ground');
  assert.deepEqual(getSeedProjectAlignmentRef(0), {
    collectionId: 'fundable-projects',
    groupId: 'finding-common-ground',
    statementId: 'common-ground-across-divides',
  });
  assert.doesNotMatch(metadata.name, /^Project 0x/i);
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
