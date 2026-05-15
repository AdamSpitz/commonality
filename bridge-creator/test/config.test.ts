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
      BRIDGE_CREATOR_COMMONALITY_STATEMENTS: ' One, Two ,, Three ',
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
    assert.deepStrictEqual(config.commonalityStatements, ['One', 'Two', 'Three']);
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
