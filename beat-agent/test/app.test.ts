import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { IpfsCidV1 } from '@commonality/sdk';
import {
  createBeatAgentServiceApp,
  type BeatAgentAppConfig,
  type BeatAgentEvaluationLogEntry,
  type BeatAgentExistingAttestation,
} from '../src/index.js';

const testConfig: BeatAgentAppConfig = {
  beatId: 'test-beat',
  ethUsdPrice: 3000,
  openRouterApiKey: 'test-key',
  ethereumPrivateKey: `0x${'1'.repeat(64)}`,
  ipfsApiUrl: 'http://localhost:5001',
  ipfsGatewayUrl: 'http://localhost:8080',
  paymentAddress: `0x${'3'.repeat(40)}`,
  openRouterModel: 'anthropic/claude-3.5-haiku',
  estimatedInputTokens: 3000,
  estimatedOutputTokens: 500,
  serviceMarginPercent: 20,
  rateLimitWindowMs: 60000,
  rateLimitMaxRequests: 10,
  alignmentTopicStatementCid: 'bafybeidagx4zc6phhtjng6f3sjzlicqm2ssq4eb6wskinjtuvkt275fmpy' as IpfsCidV1,
  attesterName: 'test-beat-agent',
  minimumConfidence: 'medium',
  trustedFinderKey: 'trusted-finder-key',
};

async function withServer(overrides?: Partial<{
  decision: 'positive' | 'negative' | 'abstain';
  confidence: 'high' | 'medium' | 'low';
  abstainReason: 'outside_beat' | 'insufficient_local_context' | 'insufficient_ambient_context' | 'unsupported_platform' | 'other';
  skipEvaluation: boolean;
  existingAttestation: BeatAgentExistingAttestation | null;
}>): Promise<{ baseUrl: string; logEntries: BeatAgentEvaluationLogEntry[]; close: () => Promise<void> }> {
  const logEntries: BeatAgentEvaluationLogEntry[] = [];
  const app = createBeatAgentServiceApp({
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
      gatewayUrl: config.ipfsGatewayUrl,
    }),
    checkAttesterBalance: async () => ({
      balance: 20_000_000_000_000_000n,
      hasSufficientFunds: true,
      minimumRequired: 10_000_000_000_000_000n,
    }),
    resolveContent: async () => 'Resolved content',
    buildEvaluationContext: async () => ({
      localContextUsed: [],
      ambientContextUsed: [
        {
          observation: 'This phrase has recently been used sincerely in this beat.',
          observedAt: '2026-05-15T00:00:00.000Z',
          confidence: 'medium',
          supportingExamples: ['twitter:tweet:1'],
        },
      ],
    }),
    evaluateContent: async () => ({
      decision: overrides?.decision ?? 'positive',
      confidence: overrides?.confidence ?? 'high',
      reasoning: 'Structured beat-agent reasoning',
      abstainReason: overrides?.decision === 'abstain' ? overrides.abstainReason ?? 'outside_beat' : undefined,
    }),
    uploadExplanation: async () => ({ cid: 'bafybeiexplanationcid' }),
    publishAttestation: async () => '0xabc123',
    appendEvaluationLog: async (entry) => {
      logEntries.push(entry);
    },
    findExistingAttestation: overrides?.skipEvaluation
      ? async () => overrides.existingAttestation ?? null
      : undefined,
    version: 'test-version',
  });

  const server = await new Promise<import('node:http').Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    logEntries,
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
  const response = await fetch(`${baseUrl}/evaluate-content`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contentCanonicalId: 'twitter:tweet:123',
      statementCid: 'bafybeistatementcid',
      contentText: 'seed payment request',
    }),
  });
  const json = await response.json() as Record<string, unknown>;
  const paymentDetails = json.paymentDetails as Record<string, unknown>;
  return `payment:${paymentDetails.paymentId as string}`;
}

describe('beat-agent HTTP app', () => {
  it('requires payment for public evaluations', async () => {
    const server = await withServer();
    try {
      const response = await fetch(`${server.baseUrl}/evaluate-content`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contentCanonicalId: 'twitter:tweet:123',
          statementCid: 'bafybeistatementcid',
          contentText: 'text',
        }),
      });

      assert.equal(response.status, 402);
      const json = await response.json() as Record<string, unknown>;
      assert.equal(json.error, 'payment_required');
    } finally {
      await server.close();
    }
  });

  it('publishes positive high-confidence results and appends an operator log entry', async () => {
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
          contentCanonicalId: 'twitter:tweet:123',
          statementCid: 'bafybeistatementcid',
          contentText: 'text',
        }),
      });

      assert.equal(response.status, 200);
      const json = await response.json() as Record<string, unknown>;
      assert.equal(json.decision, 'positive');
      assert.equal(json.transactionHash, '0xabc123');
      assert.equal(json.explanationCid, 'bafybeiexplanationcid');
      assert.equal(server.logEntries.length, 1);
      assert.equal(server.logEntries[0]?.decision, 'positive');
    } finally {
      await server.close();
    }
  });

  it('charges for abstentions but does not publish an attestation', async () => {
    const server = await withServer({ decision: 'abstain', confidence: 'medium', abstainReason: 'outside_beat' });
    try {
      const paymentProof = await createPaymentProof(server.baseUrl);
      const response = await fetch(`${server.baseUrl}/evaluate-content`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-payment-proof': paymentProof,
        },
        body: JSON.stringify({
          contentCanonicalId: 'twitter:tweet:123',
          statementCid: 'bafybeistatementcid',
          contentText: 'text',
        }),
      });

      assert.equal(response.status, 200);
      const json = await response.json() as Record<string, unknown>;
      assert.equal(json.decision, 'abstain');
      assert.equal(json.abstainReason, 'outside_beat');
      assert.equal(json.transactionHash, null);
      assert.equal(json.explanationCid, null);
      assert.equal(server.logEntries.length, 1);
      assert.equal(server.logEntries[0]?.decision, 'abstain');
    } finally {
      await server.close();
    }
  });

  it('returns alreadyAttested:true without re-evaluating when a prior positive attestation exists', async () => {
    const server = await withServer({
      skipEvaluation: true,
      existingAttestation: {
        decision: 'positive',
        confidence: 'high',
        reasoning: 'Prior evaluation.',
        subjectId: '0xsubject',
        explanationCid: 'bafy-prior-explanation',
        transactionHash: '0xprior-tx',
      },
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
          contentCanonicalId: 'twitter:tweet:123',
          statementCid: 'bafybeistatementcid',
          contentText: 'text',
        }),
      });

      assert.equal(response.status, 200);
      const json = await response.json() as Record<string, unknown>;
      assert.equal(json.alreadyAttested, true);
      assert.equal(json.decision, 'positive');
      assert.equal(json.confidence, 'high');
      assert.equal(json.reasoning, 'Prior evaluation.');
      assert.equal(json.explanationCid, 'bafy-prior-explanation');
      assert.equal(json.transactionHash, '0xprior-tx');
      assert.equal(json.processingTime, 0);
      // No evaluation should have been performed, so no new log entry.
      assert.equal(server.logEntries.length, 0);
    } finally {
      await server.close();
    }
  });
});
