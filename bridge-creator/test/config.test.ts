import assert from 'node:assert';
import { loadConfig, loadConfigFromEnv } from '../src/config.js';

const baseEnv = {
  BRIDGE_CREATOR_PRIVATE_KEY: '0xbridge',
  ETHEREUM_RPC_URL: 'http://rpc.example',
  OPENROUTER_API_KEY: 'openrouter-key',
  NUDGE_PUBLICATIONS_CONTRACT_ADDRESS: '0xnudges',
};

describe('bridge creator config', () => {
  it('loads bridge-creator-specific env vars consistently', () => {
    const config = loadConfig({
      ...baseEnv,
      BRIDGE_CREATOR_ETHEREUM_RPC_URL: 'http://bridge-rpc.example',
      BRIDGE_CREATOR_INDEXER_URL: 'http://bridge-indexer.example',
      BRIDGE_CREATOR_IPFS_API: 'http://bridge-ipfs-api.example',
      BRIDGE_CREATOR_IPFS_GATEWAY: 'http://bridge-ipfs-gateway.example',
      BRIDGE_CREATOR_OPENROUTER_MODEL: 'bridge-model',
      BRIDGE_CREATOR_NAME: 'Custom Bridge Creator',
      BRIDGE_CREATOR_DESCRIPTION: 'Custom description',
      BRIDGE_CREATOR_SOURCE_TYPE: 'custom-bridge',
      BRIDGE_CREATOR_VERSION: '1.2.3',
      BRIDGE_CREATOR_CSM_CONTEXT_SOURCES: JSON.stringify([
        {
          service_url: 'http://csm.local/',
          expected_signer_address: '0x0000000000000000000000000000000000000001',
        },
      ]),
      BRIDGE_CREATOR_CONTEXT_MAX_AGE_MS: '45678',
      BRIDGE_CREATOR_ANCHOR_STORE_PATH: 'tmp/anchors.json',
      BRIDGE_CREATOR_STRATEGY_PROMPT_URL: 'https://bridge.example/strategy.md',
      BRIDGE_CREATOR_PUBLIC_BASE_URL: 'https://bridge.example',
      BRIDGE_CREATOR_PUBLICATION_DEDUP_STATE_PATH: 'tmp/custom-dedup-state.json',
      BRIDGE_CREATOR_TICK_INTERVAL_MS: '12345',
      BRIDGE_CREATOR_ANCHOR_REFLECTION_INTERVAL_MS: '67890',
      BRIDGE_CREATOR_ANCHOR_REFLECTION_OUTCOME_SUMMARY_PATH: 'tmp/outcomes.md',
      IMPLICATIONS_CONTRACT_ADDRESS: '0x0000000000000000000000000000000000000002',
      BRIDGE_CREATOR_CONTACT: 'ops@example.com',
    });

    assert.strictEqual(config.nudgerPrivateKey, '0xbridge');
    assert.strictEqual(config.ethereumRpcUrl, 'http://bridge-rpc.example');
    assert.strictEqual(config.indexerUrl, 'http://bridge-indexer.example');
    assert.strictEqual(config.ipfsApiUrl, 'http://bridge-ipfs-api.example');
    assert.strictEqual(config.ipfsGatewayUrl, 'http://bridge-ipfs-gateway.example');
    assert.strictEqual(config.openRouterModel, 'bridge-model');
    assert.strictEqual(config.name, 'Custom Bridge Creator');
    assert.strictEqual(config.description, 'Custom description');
    assert.strictEqual(config.sourceType, 'custom-bridge');
    assert.strictEqual(config.version, '1.2.3');
    assert.deepStrictEqual(config.trustedContextSources, [
      {
        serviceUrl: 'http://csm.local',
        expectedSignerAddress: '0x0000000000000000000000000000000000000001',
        maxAgeMs: 45678,
      },
    ]);
    assert.strictEqual(config.contextMaxAgeMs, 45678);
    assert.strictEqual(config.anchorStorePath, 'tmp/anchors.json');
    assert.strictEqual(config.strategyPromptUrl, 'https://bridge.example/strategy.md');
    assert.strictEqual(config.publicBaseUrl, 'https://bridge.example');
    assert.strictEqual(config.publicationDedupStatePath, 'tmp/custom-dedup-state.json');
    assert.strictEqual(config.tickIntervalMs, 12345);
    assert.strictEqual(config.anchorReflectionIntervalMs, 67890);
    assert.strictEqual(config.anchorReflectionOutcomeSummaryPath, 'tmp/outcomes.md');
    assert.strictEqual(config.implicationsContractAddress, '0x0000000000000000000000000000000000000002');
    assert.strictEqual(config.contact, 'ops@example.com');
  });

  it('keeps loadConfigFromEnv as an alias for the single loader implementation', () => {
    assert.deepStrictEqual(loadConfigFromEnv(baseEnv), loadConfig(baseEnv));
  });

  it('does not accept the old generic nudger env var names', () => {
    assert.throws(
      () => loadConfig({
        NUDGER_PRIVATE_KEY: '0xgeneric',
        ETHEREUM_RPC_URL: 'http://rpc.example',
        OPENROUTER_API_KEY: 'openrouter-key',
        NUDGE_PUBLICATIONS_CONTRACT_ADDRESS: '0xnudges',
      }),
      /BRIDGE_CREATOR_PRIVATE_KEY/,
    );
  });
});
