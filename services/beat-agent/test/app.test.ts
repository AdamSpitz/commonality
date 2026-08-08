import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { IpfsCidV1 } from '@commonality/sdk/utils';
import {
  createBeatAgentServiceApp,
  findExistingAttestationFromJsonl,
  getSubjectIdForContentCanonicalId,
  type BeatAgentAppConfig,
  type BeatAgentEvaluationLogEntry,
  type BeatAgentExistingAttestation,
} from '../src/index.js';

const testConfig: BeatAgentAppConfig = {
  beatId: 'test-beat',
  capabilities: ['content_attestation'],
  ethUsdPrice: 3000,
  openRouterApiKey: 'test-key',
  ethereumPrivateKey: `0x${'1'.repeat(64)}`,
  ipfsApiUrl: 'http://localhost:5001',
  ipfsGatewayUrl: 'http://localhost:8080',
  paymentAddress: `0x${'3'.repeat(40)}`,
  openRouterModel: 'anthropic/claude-3-sonnet',
  estimatedInputTokens: 3000,
  estimatedOutputTokens: 500,
  serviceMarginPercent: 20,
  rateLimitWindowMs: 60000,
  rateLimitMaxRequests: 100,
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
  resolveContentError: Error;
  evaluateContentHook: () => Promise<void>;
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
    resolveContent: async () => {
      if (overrides?.resolveContentError) {
        throw overrides.resolveContentError;
      }
      return 'Resolved content';
    },
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
    evaluateContent: async () => {
      await overrides?.evaluateContentHook?.();
      return {
        decision: overrides?.decision ?? 'positive',
        confidence: overrides?.confidence ?? 'high',
        reasoning: 'Structured beat-agent reasoning',
        abstainReason: overrides?.decision === 'abstain' ? overrides.abstainReason ?? 'outside_beat' : undefined,
      };
    },
    uploadExplanation: async () => ({ cid: 'bafybeiexplanationcid' }),
    publishAttestation: async () => '0xabc123',
    appendEvaluationLog: async (entry) => {
      logEntries.push(entry);
    },
    findExistingAttestation: overrides?.skipEvaluation
      ? async () => overrides.existingAttestation ?? null
      : undefined,
    queryBeatContext: async ({ topic }) => [
      {
        observation: `Context for ${topic}`,
        observedAt: '2026-05-15T00:00:00.000Z',
        confidence: 'medium',
        supportingExamples: ['twitter:tweet:context'],
      },
    ],
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

describe('findExistingAttestationFromJsonl', () => {
  it('returns the derived on-chain subject ID, not the raw canonical ID', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'beat-agent-jsonl-'));
    const filePath = join(dir, 'evaluations.jsonl');
    await writeFile(filePath, `${JSON.stringify({
      schemaVersion: 1,
      attesterType: 'beat-agent',
      beatId: 'test-beat',
      attesterName: 'test-agent',
      contentCanonicalId: 'twitter:tweet:123',
      statementCid: 'bafybeistatementcid',
      decision: 'positive',
      confidence: 'high',
      reasoning: 'Prior evaluation.',
      localContextUsed: [],
      ambientContextUsed: [],
      timestamp: '2026-05-15T12:00:00.000Z',
      explanationCid: 'bafy-prior-explanation',
      transactionHash: '0xprior-tx',
      processingTime: 10,
    })}\n`, 'utf-8');

    const existing = await findExistingAttestationFromJsonl(filePath)('twitter:tweet:123', 'bafybeistatementcid' as IpfsCidV1);

    assert.equal(existing?.subjectId, getSubjectIdForContentCanonicalId('twitter:tweet:123'));
    assert.notEqual(existing?.subjectId, 'twitter:tweet:123');
  });
});

describe('beat-agent HTTP app', () => {
  it('exposes beat-agent metadata with capabilities', async () => {
    const server = await withServer();
    try {
      const response = await fetch(`${server.baseUrl}/metadata`);
      assert.equal(response.status, 200);
      const json = await response.json() as { serviceType: string; beatId: string; capabilities: string[] };
      assert.equal(json.serviceType, 'beat-agent');
      assert.equal(json.beatId, 'test-beat');
      assert.deepEqual(json.capabilities, ['content_attestation']);
    } finally {
      await server.close();
    }
  });

  it('exposes beat context observations', async () => {
    const server = await withServer();
    try {
      const response = await fetch(`${server.baseUrl}/context?topic=bridge%20caucus`);
      assert.equal(response.status, 200);
      const json = await response.json() as { beatId: string; topic: string; observations: Array<{ observation: string }> };
      assert.equal(json.beatId, 'test-beat');
      assert.equal(json.topic, 'bridge caucus');
      assert.match(json.observations[0]?.observation ?? '', /Context for bridge caucus/);
    } finally {
      await server.close();
    }
  });

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

  it('returns canonical-ID mismatches as invalid requests', async () => {
    const server = await withServer({
      resolveContentError: new Error(
        'Content canonical ID mismatch: request used twitter:uid:attacker:999, but platform API resolved twitter:uid:123:456',
      ),
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
          contentCanonicalId: 'twitter:uid:attacker:999',
          statementCid: 'bafybeistatementcid',
          contentUrl: 'https://x.com/alice/status/456',
        }),
      });

      assert.equal(response.status, 400);
      const json = await response.json() as Record<string, unknown>;
      assert.equal(json.error, 'invalid_request');
      assert.match(json.message as string, /Content canonical ID mismatch/);
      assert.equal(server.logEntries.length, 0);
    } finally {
      await server.close();
    }
  });

  it('returns existing attestations from the status route', async () => {
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
      const response = await fetch(`${server.baseUrl}/status/bafybeistatementcid/twitter:tweet:123`);

      assert.equal(response.status, 200);
      const json = await response.json() as Record<string, unknown>;
      assert.equal(json.exists, true);
      const attestation = json.attestation as Record<string, unknown>;
      assert.equal(attestation.decision, 'positive');
      assert.equal(attestation.explanationCid, 'bafy-prior-explanation');
      const paymentDetails = json.paymentDetails as Record<string, unknown>;
      assert.equal(paymentDetails.description, 'Payment required to check beat-agent attestation status');
    } finally {
      await server.close();
    }
  });

  it('deduplicates concurrent requests for the same content and statement', async () => {
    let evaluateCallCount = 0;
    let signalEvaluationStarted!: () => void;
    const evaluationStarted = new Promise<void>((r) => { signalEvaluationStarted = r; });
    let openGate!: () => void;
    const gate = new Promise<void>((r) => { openGate = r; });

    const server = await withServer({
      evaluateContentHook: async () => {
        evaluateCallCount++;
        signalEvaluationStarted();
        await gate;
      },
    });

    try {
      const body = JSON.stringify({
        contentCanonicalId: 'twitter:tweet:dup',
        statementCid: 'bafybeistatementcid',
        contentText: 'text',
      });
      // Use trusted-finder-key to bypass payment so both requests can use identical headers.
      const headers = { 'content-type': 'application/json', 'x-finder-key': 'trusted-finder-key' };

      // Send first request; wait until it's inside evaluateContent (and therefore in the in-flight map).
      const req1 = fetch(`${server.baseUrl}/evaluate-content`, { method: 'POST', headers, body });
      await evaluationStarted;

      // Send second request while first is in-flight.
      const req2 = fetch(`${server.baseUrl}/evaluate-content`, { method: 'POST', headers, body });

      // Give req2 time to arrive at the server and find req1 in the in-flight map before we release req1.
      await new Promise((r) => setTimeout(r, 30));

      // Release the gate so first request can complete.
      openGate();
      const [res1, res2] = await Promise.all([req1, req2]);

      assert.equal(res1.status, 200);
      assert.equal(res2.status, 200);
      const json1 = await res1.json() as Record<string, unknown>;
      const json2 = await res2.json() as Record<string, unknown>;
      assert.equal(json1.decision, 'positive');
      assert.equal(json2.decision, 'positive');
      // Only one actual LLM evaluation should have happened.
      assert.equal(evaluateCallCount, 1);
      // Second response should be flagged as a deduplicated result, not as an already-published attestation.
      assert.equal(json2.alreadyAttested, false);
      assert.equal(json2.deduplicated, true);
    } finally {
      await server.close();
    }
  });

  it('does not report concurrent deduped abstentions as already attested', async () => {
    let evaluateCallCount = 0;
    let signalEvaluationStarted!: () => void;
    const evaluationStarted = new Promise<void>((r) => { signalEvaluationStarted = r; });
    let openGate!: () => void;
    const gate = new Promise<void>((r) => { openGate = r; });

    const server = await withServer({
      decision: 'abstain',
      confidence: 'medium',
      abstainReason: 'outside_beat',
      evaluateContentHook: async () => {
        evaluateCallCount++;
        signalEvaluationStarted();
        await gate;
      },
    });

    try {
      const body = JSON.stringify({
        contentCanonicalId: 'twitter:tweet:dedup-abstain',
        statementCid: 'bafybeistatementcid',
        contentText: 'text',
      });
      const headers = { 'content-type': 'application/json', 'x-finder-key': 'trusted-finder-key' };

      const req1 = fetch(`${server.baseUrl}/evaluate-content`, { method: 'POST', headers, body });
      await evaluationStarted;
      const req2 = fetch(`${server.baseUrl}/evaluate-content`, { method: 'POST', headers, body });
      await new Promise((r) => setTimeout(r, 30));
      openGate();

      const [res1, res2] = await Promise.all([req1, req2]);
      assert.equal(res1.status, 200);
      assert.equal(res2.status, 200);
      const json2 = await res2.json() as Record<string, unknown>;
      assert.equal(json2.decision, 'abstain');
      assert.equal(json2.transactionHash, null);
      assert.equal(json2.alreadyAttested, false);
      assert.equal(json2.deduplicated, true);
      assert.equal(evaluateCallCount, 1);
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
