import { strict as assert } from 'node:assert';
import { loadConfig } from './config.js';

describe('policy configuration pairing', () => {
  const saved = {
    bundle: process.env.POLICY_BUNDLE_URL,
    gateway: process.env.POLICY_CONTENT_GATEWAY_URL,
  };

  afterEach(() => {
    restore('POLICY_BUNDLE_URL', saved.bundle);
    restore('POLICY_CONTENT_GATEWAY_URL', saved.gateway);
  });

  it('boots with only a content gateway configured, as render.yaml ships it', () => {
    delete process.env.POLICY_BUNDLE_URL;
    process.env.POLICY_CONTENT_GATEWAY_URL = 'https://ipfs.io/ipfs';

    const config = loadConfig();

    assert.equal(config.policyBundleUrl, undefined);
    assert.equal(config.policyContentGatewayUrl, 'https://ipfs.io/ipfs');
  });

  it('fails closed when a policy bundle has no gateway to fetch its content from', () => {
    process.env.POLICY_BUNDLE_URL = 'https://commonality.works/civility-policy-bundle.json';
    delete process.env.POLICY_CONTENT_GATEWAY_URL;

    assert.throws(() => loadConfig(), /POLICY_BUNDLE_URL requires POLICY_CONTENT_GATEWAY_URL/);
  });
});

function restore(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

describe('sponsored gas configuration', () => {
  it('loads statement sponsorship independently of creator sponsorship', () => {
    const keys = ['CREATOR_GAS_TANK_ADDRESS', 'STATEMENT_GAS_TANK_ADDRESS', 'BELIEFS_CONTRACT_ADDRESS'] as const;
    const saved = keys.map((key) => process.env[key]);
    try {
      delete process.env.CREATOR_GAS_TANK_ADDRESS;
      process.env.STATEMENT_GAS_TANK_ADDRESS = '0x6666666666666666666666666666666666666666';
      process.env.BELIEFS_CONTRACT_ADDRESS = '0x7777777777777777777777777777777777777777';
      const config = loadConfig();
      assert.equal(config.creatorGasTankAddress, undefined);
      assert.equal(config.statementGasTankAddress, process.env.STATEMENT_GAS_TANK_ADDRESS);
      assert.equal(config.beliefsAddress, process.env.BELIEFS_CONTRACT_ADDRESS);
    } finally {
      keys.forEach((key, index) => restore(key, saved[index]));
    }
  });
});
