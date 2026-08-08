import assert from 'node:assert';
import { describe, it } from 'mocha';
import type { IpfsCidV1 } from '@commonality/sdk/utils';
import { getBlockchainClients } from '../src/blockchain.js';
import type { ContentAttesterConfig } from '../src/config.js';

function makeConfig(overrides?: Partial<ContentAttesterConfig>): ContentAttesterConfig {
  return {
    ethereumPrivateKey: '0x' + '11'.repeat(32),
    ethereumRpcUrl: 'http://localhost:8545',
    alignmentAttestationsContractAddress: '0x' + 'aa'.repeat(20),
    alignmentTopicStatementCid: 'bafybeidagx4zc6phhtjng6f3sjzlicqm2ssq4eb6wskinjtuvkt275fmpy' as IpfsCidV1,
    openRouterApiKey: 'test-key',
    openRouterModel: 'test-model',
    ipfsApiUrl: 'http://localhost:5001',
    ipfsGatewayUrl: 'http://localhost:8080',
    port: 3000,
    paymentAddress: '0x' + 'bb'.repeat(20),
    serviceMarginPercent: 20,
    ethUsdPrice: 3000,
    gasPriceMultiplier: 1.2,
    estimatedInputTokens: 2500,
    estimatedOutputTokens: 400,
    rateLimitWindowMs: 60_000,
    rateLimitMaxRequests: 10,
    attesterName: 'test-attester',
    promptTemplate: '{content}',
    ...overrides,
  };
}

describe('content attester blockchain clients', () => {
  it('creates isolated client instances per config', () => {
    const clientA = getBlockchainClients(makeConfig());
    const clientB = getBlockchainClients(makeConfig({
      ethereumPrivateKey: '0x' + '22'.repeat(32),
      alignmentAttestationsContractAddress: '0x' + 'cc'.repeat(20),
    }));

    assert.notStrictEqual(clientA.testClients.account, clientB.testClients.account);
    assert.notStrictEqual(clientA.alignmentAttestationsContract.address, clientB.alignmentAttestationsContract.address);
  });
});
