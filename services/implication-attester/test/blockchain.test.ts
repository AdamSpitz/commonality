import assert from 'node:assert';
import { describe, it } from 'mocha';
import { getBlockchainClients } from '../src/blockchain.js';
import type { AttesterConfig } from '../src/config.js';

function makeConfig(overrides?: Partial<AttesterConfig>): AttesterConfig {
  return {
    ethereumPrivateKey: '0x' + '11'.repeat(32),
    ethereumRpcUrl: 'http://localhost:8545',
    implicationsContractAddress: '0x' + 'aa'.repeat(20),
    openRouterApiKey: 'test-key',
    openRouterModel: 'test-model',
    ipfsApiUrl: 'http://localhost:5001',
    ipfsGatewayUrl: 'http://localhost:8080',
    port: 3000,
    paymentAddress: '0x' + 'bb'.repeat(20),
    serviceMarginPercent: 20,
    ethUsdPrice: 3000,
    gasPriceMultiplier: 1.2,
    estimatedInputTokens: 1000,
    estimatedOutputTokens: 200,
    rateLimitWindowMs: 60_000,
    rateLimitMaxRequests: 10,
    ...overrides,
  };
}

describe('implication attester blockchain clients', () => {
  it('creates isolated client instances per config', () => {
    const clientA = getBlockchainClients(makeConfig());
    const clientB = getBlockchainClients(makeConfig({
      ethereumPrivateKey: '0x' + '22'.repeat(32),
      implicationsContractAddress: '0x' + 'cc'.repeat(20),
    }));

    assert.notStrictEqual(clientA.testClients.account, clientB.testClients.account);
    assert.notStrictEqual(clientA.implicationsContract.address, clientB.implicationsContract.address);
  });
});
