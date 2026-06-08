import { strict as assert } from 'assert';
import { describe, it, beforeEach, afterEach } from 'mocha';

describe('config', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NUDGER_PRIVATE_KEY = '0x' + 'aa'.repeat(32);
    process.env.ETHEREUM_RPC_URL = 'http://localhost:8545';
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.NUDGE_PUBLICATIONS_CONTRACT_ADDRESS = '0x' + 'bb'.repeat(20);
    delete process.env.EXPLORER_STREAM;
    delete process.env.CURATOR_INTERVAL_MS;
    delete process.env.PORT;
    delete process.env.TRUSTED_IMPLICATION_ATTESTERS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('loads with defaults when optional env vars are missing', async () => {
    const { loadConfig } = await import('../src/config.js');
    const config = loadConfig();

    assert.strictEqual(config.stream, 'fundable-project-explorer');
    assert.strictEqual(config.curatorIntervalMs, 6 * 60 * 60 * 1000);
    assert.strictEqual(config.openRouterModel, 'anthropic/claude-3.5-haiku');
  });

  it('reads custom stream, interval, and trusted implication attesters from env', async () => {
    process.env.EXPLORER_STREAM = 'custom-explorer';
    process.env.CURATOR_INTERVAL_MS = '3600000';
    process.env.PORT = '4000';
    process.env.TRUSTED_IMPLICATION_ATTESTERS = '0xabc, 0xdef';

    const { loadConfig } = await import('../src/config.js');
    const config = loadConfig();

    assert.strictEqual(config.stream, 'custom-explorer');
    assert.strictEqual(config.curatorIntervalMs, 3600000);
    assert.deepStrictEqual(config.trustedImplicationAttesters, ['0xabc', '0xdef']);
  });

  it('throws when required env vars are missing', async () => {
    delete process.env.NUDGER_PRIVATE_KEY;

    const { loadConfig } = await import('../src/config.js');
    assert.throws(() => loadConfig(), /Missing environment variable/);
  });
});
