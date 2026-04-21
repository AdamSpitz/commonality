import assert from 'assert';
import { loadConfig } from './config.js';

const REQUIRED_ENV = {
  NUDGER_PRIVATE_KEY: '0x1234567890123456789012345678901234567890123456789012345678901234',
  ETHEREUM_RPC_URL: 'http://localhost:8545',
  NUDGE_PUBLICATIONS_CONTRACT_ADDRESS: '0x1234567890123456789012345678901234567890',
};

function withEnv(
  overrides: Record<string, string | undefined>,
  run: () => void
): void {
  const keys = Object.keys({ ...REQUIRED_ENV, ...overrides });
  const previous = new Map<string, string | undefined>();

  for (const key of keys) {
    previous.set(key, process.env[key]);
  }

  try {
    for (const [key, value] of Object.entries(REQUIRED_ENV)) {
      process.env[key] = value;
    }

    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    run();
  } finally {
    for (const key of keys) {
      const value = previous.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

describe('loadConfig', () => {
  it('does not require OpenRouter environment variables for implication-graph nudgers', () => {
    withEnv(
      {
        OPENROUTER_API_KEY: undefined,
        OPENROUTER_MODEL: undefined,
      },
      () => {
        const config = loadConfig();

        assert.strictEqual(config.nudgerPrivateKey, REQUIRED_ENV.NUDGER_PRIVATE_KEY);
        assert.strictEqual(config.ethereumRpcUrl, REQUIRED_ENV.ETHEREUM_RPC_URL);
        assert.strictEqual(
          config.nudgePublicationsContractAddress,
          REQUIRED_ENV.NUDGE_PUBLICATIONS_CONTRACT_ADDRESS
        );
        assert.ok(!('openRouterApiKey' in config));
        assert.ok(!('openRouterModel' in config));
      }
    );
  });
});
