import assert from 'node:assert/strict';
import test from 'node:test';
import { getSeedProjectMetadata } from '../fundingAndDelegationActions.js';
import { buildContractMetadata } from '../contentFundingActions.js';

test('seed Pubstarter projects have human-readable metadata', () => {
  const metadata = getSeedProjectMetadata(0);

  assert.equal(metadata.name, 'Neighborhood Solar Co-op');
  assert.match(metadata.description, /solar/i);
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
