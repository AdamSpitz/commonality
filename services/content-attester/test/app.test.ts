import assert from 'assert';
import type { AddressInfo } from 'node:net';
import type { IpfsCidV1 } from '@commonality/sdk/utils';
import { createContentAttesterServiceApp, type ContentAttesterAppConfig } from '../src/app.js';

const testConfig: ContentAttesterAppConfig = {
  ethUsdPrice: 3000,
  openRouterApiKey: 'test-key',
  ethereumPrivateKey: '0x' + '1'.repeat(64),
  ipfsApiUrl: 'http://localhost:5001',
  ipfsGatewayUrl: 'http://localhost:8080',
  paymentAddress: '0x' + '3'.repeat(40),
  openRouterModel: 'anthropic/claude-3.5-haiku',
  estimatedInputTokens: 2500,
  estimatedOutputTokens: 400,
  serviceMarginPercent: 20,
  rateLimitWindowMs: 60000,
  rateLimitMaxRequests: 10,
  alignmentTopicStatementCid: 'bafybeidagx4zc6phhtjng6f3sjzlicqm2ssq4eb6wskinjtuvkt275fmpy' as IpfsCidV1,
  attesterName: 'test-attester',
  promptTemplate: '{content}\n{declared_perspective_context}',
  trustedFinderKey: 'trusted-finder-key',
};

async function withServer(
  overrides?: Partial<{
    evaluateDecision: boolean;
    evaluateConfidence: 'high' | 'medium' | 'low';
    resolveContent: string;
  }>,
): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const app = createContentAttesterServiceApp({
    getConfig: () => testConfig,
    getCurrentGasPrice: async () => 20_000_000_000n,
    getPaymentConfig: (config) => ({
      openRouterModel: config.openRouterModel,
      estimatedInputTokens: config.estimatedInputTokens,
      estimatedOutputTokens: config.estimatedOutputTokens,
      serviceMarginPercent: config.serviceMarginPercent,
      ethUsdPrice: config.ethUsdPrice,
      paymentAddress: config.paymentAddress,
    }),
    getIpfsConfig: (config) => ({
      apiUrl: config.ipfsApiUrl,
      gatewayUrl: 'http://localhost:8080',
    }),
    checkAttesterBalance: async () => ({
      balance: 20_000_000_000_000_000n,
      hasSufficientFunds: true,
      minimumRequired: 10_000_000_000_000_000n,
    }),
    evaluateContent: async () => ({
      decision: overrides?.evaluateDecision ?? true,
      confidence: overrides?.evaluateConfidence ?? 'high',
      reasoning: 'Structured reasoning',
      dimensions: {
        steelmanning: 'pass',
      },
    }),
    resolveContent: async () => overrides?.resolveContent ?? 'Resolved content',
    resolveStatementText: async () => 'Resolved target statement',
    uploadExplanation: async () => ({ cid: 'bafybeiexplanationcid' }),
    publishAttestation: async () => '0xabc123',
    version: 'test-version',
  });

  const server = await new Promise<import('node:http').Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    }),
  };
}

async function createPaymentProof(baseUrl: string): Promise<string> {
  const quoteResponse = await fetch(`${baseUrl}/quote`);
  const quoteJson = await quoteResponse.json() as Record<string, unknown>;
  const paymentId = (quoteJson.paymentDetails as Record<string, unknown> | undefined)?.paymentId;
  if (typeof paymentId === 'string') {
    return `payment:${paymentId}`;
  }

  const evaluationResponse = await fetch(`${baseUrl}/evaluate-content`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      contentCanonicalId: 'twitter:uid:12345678:18347',
      statementCid: 'bafybeistatementcid',
      contentText: 'seed payment request',
    }),
  });
  const evaluationJson = await evaluationResponse.json() as Record<string, unknown>;
  const paymentDetails = evaluationJson.paymentDetails as Record<string, unknown>;
  return `payment:${paymentDetails.paymentId as string}`;
}

describe('content attester HTTP app', () => {
  it('rejects requests that do not provide exactly one content source', async () => {
    const server = await withServer();

    try {
      const paymentProof = await createPaymentProof(server.baseUrl);
      const response = await fetch(`${server.baseUrl}/evaluate-content`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-payment-proof': paymentProof,
        },
        body: JSON.stringify({
          contentCanonicalId: 'twitter:uid:12345678:18347',
          statementCid: 'bafybeistatementcid',
          contentText: 'text',
          contentUrl: 'https://example.com/post',
        }),
      });

      assert.strictEqual(response.status, 400);
      const json = await response.json() as Record<string, unknown>;
      assert.strictEqual(json.message, 'Provide exactly one of contentText, contentUrl, or contentCid');
    } finally {
      await server.close();
    }
  });

  it('returns a non-attesting result when confidence is low', async () => {
    const server = await withServer({
      evaluateDecision: true,
      evaluateConfidence: 'low',
    });

    try {
      const paymentProof = await createPaymentProof(server.baseUrl);
      const response = await fetch(`${server.baseUrl}/evaluate-content`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-payment-proof': paymentProof,
        },
        body: JSON.stringify({
          contentCanonicalId: 'twitter:uid:12345678:18347',
          statementCid: 'bafybeistatementcid',
          contentText: 'text',
        }),
      });

      assert.strictEqual(response.status, 200);
      const json = await response.json() as Record<string, unknown>;
      assert.strictEqual(json.transactionHash, null);
      assert.strictEqual(json.explanationCid, null);
      assert.strictEqual(json.confidence, 'low');
    } finally {
      await server.close();
    }
  });

  it('publishes an attestation for positive high-confidence results', async () => {
    const server = await withServer();

    try {
      const paymentProof = await createPaymentProof(server.baseUrl);
      const response = await fetch(`${server.baseUrl}/evaluate-content`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-payment-proof': paymentProof,
        },
        body: JSON.stringify({
          contentCanonicalId: 'twitter:uid:12345678:18347',
          statementCid: 'bafybeistatementcid',
          contentText: 'text',
          declaredPerspective: 'right-wing',
        }),
      });

      assert.strictEqual(response.status, 200);
      const json = await response.json() as Record<string, unknown>;
      assert.strictEqual(json.transactionHash, '0xabc123');
      assert.strictEqual(json.explanationCid, 'bafybeiexplanationcid');
      assert.strictEqual(json.decision, true);
      assert.ok(typeof json.subjectId === 'string');
    } finally {
      await server.close();
    }
  });

  it('accepts finder-authenticated batch evaluations without payment proof', async () => {
    const server = await withServer();

    try {
      const response = await fetch(`${server.baseUrl}/evaluate-content-batch`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-finder-key': 'trusted-finder-key',
        },
        body: JSON.stringify({
          evaluations: [
            {
              contentCanonicalId: 'twitter:uid:12345678:18347',
              statementCid: 'bafybeistatementcid',
              contentText: 'text',
            },
          ],
        }),
      });

      assert.strictEqual(response.status, 200);
      const json = await response.json() as Record<string, unknown>;
      assert.strictEqual(json.total, 1);
      assert.strictEqual(json.successful, 1);
      const results = json.results as Array<Record<string, unknown>>;
      assert.strictEqual(results[0]?.success, true);
      assert.strictEqual(results[0]?.transactionHash, '0xabc123');
    } finally {
      await server.close();
    }
  });
});
