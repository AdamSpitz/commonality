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
