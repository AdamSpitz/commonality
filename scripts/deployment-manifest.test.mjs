import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildDeploymentManifest,
  indexerDeploymentManifestJson,
  parseStartBlock,
} from './deployment-manifest.mjs';

test('per-contract start block wins over global START_BLOCK', () => {
  assert.equal(
    parseStartBlock(
      { BELIEFS_START_BLOCK: '45000000', START_BLOCK: '42768673' },
      'BELIEFS_START_BLOCK',
      'START_BLOCK',
    ),
    45000000,
  );
});

test('falls back to subsystem then global START_BLOCK', () => {
  assert.equal(
    parseStartBlock(
      { CONTENT_FUNDING_START_BLOCK: '43000000', START_BLOCK: '42768673' },
      'CONTENT_REGISTRY_START_BLOCK',
      'CONTENT_FUNDING_START_BLOCK',
    ),
    43000000,
  );
  assert.equal(
    parseStartBlock({ START_BLOCK: '42768673' }, 'BELIEFS_START_BLOCK', 'START_BLOCK'),
    42768673,
  );
});

test('new contract in the manifest uses its own deploy block', () => {
  const manifest = buildDeploymentManifest('base-sepolia', {
    BELIEFS_CONTRACT_ADDRESS: '0x353d650D50d8a5eA3A5a966FE1690177a8a82D92',
    BELIEFS_START_BLOCK: '42768673',
    START_BLOCK: '42768673',
    PUBLISHED_DATA_CONTRACT_ADDRESS: '0xee860Bb27652a3Be968bf6D351ee0eBb9d995eD3',
    PUBLISHED_DATA_START_BLOCK: '46450000',
  });
  assert.equal(manifest.chains['base-sepolia'].Beliefs[0].startBlock, 42768673);
  assert.equal(manifest.chains['base-sepolia'].PublishedData[0].startBlock, 46450000);
});

test('indexer JSON is compact chains-only', () => {
  const json = indexerDeploymentManifestJson('base-sepolia', {
    BELIEFS_CONTRACT_ADDRESS: '0x353d650D50d8a5eA3A5a966FE1690177a8a82D92',
    BELIEFS_START_BLOCK: '111',
    START_BLOCK: '1',
  });
  const parsed = JSON.parse(json);
  assert.equal(parsed.chains['base-sepolia'].Beliefs[0].startBlock, 111);
  assert.equal(parsed.schema, undefined);
});
