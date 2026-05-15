import assert from 'node:assert/strict';
import {
  processBeatAgentEvaluation,
  validateBeatAgentEvaluationRequest,
  type BeatAgentEvaluationContext,
  type BeatAgentEvaluationLogEntry,
  type BeatAgentEvaluationRequest,
  type ProcessBeatAgentEvaluationDependencies,
} from '../src/index.js';

const request: BeatAgentEvaluationRequest = {
  contentCanonicalId: 'twitter:tweet:123',
  statementCid: 'bafy-statement',
  contentText: 'A calm post that builds cross-partisan common ground.',
};

const context: BeatAgentEvaluationContext = {
  localContextUsed: [
    {
      type: 'parent_post',
      contentCanonicalId: 'twitter:tweet:122',
      summary: 'The parent asks for practical compromise.',
    },
  ],
  ambientContextUsed: [
    {
      observation: 'This account has recently used similar language sincerely in the beat.',
      observedAt: '2026-05-12T00:00:00.000Z/2026-05-15T00:00:00.000Z',
      confidence: 'medium',
      supportingExamples: ['twitter:tweet:111'],
    },
  ],
};

describe('beat-agent attester mode', () => {
  it('validates content-attester-compatible request sources', () => {
    assert.equal(validateBeatAgentEvaluationRequest(request), null);
    assert.equal(
      validateBeatAgentEvaluationRequest({
        contentCanonicalId: 'twitter:tweet:123',
        statementCid: 'bafy-statement',
      }),
      'Provide exactly one of contentText, contentUrl, or contentCid',
    );
    assert.equal(
      validateBeatAgentEvaluationRequest({
        contentCanonicalId: 'twitter:tweet:123',
        statementCid: 'bafy-statement',
        contentText: 'text',
        contentUrl: 'https://example.com/post',
      }),
      'Provide exactly one of contentText, contentUrl, or contentCid',
    );
  });

  it('uploads explanation and publishes on-chain attestation for confident positive decisions', async () => {
    const logEntries: BeatAgentEvaluationLogEntry[] = [];
    const published: Array<{ contentCanonicalId: string; statementCid: string; topicStatementCid: string }> = [];
    const dependencies: ProcessBeatAgentEvaluationDependencies = {
      resolveContent: async (source) => source.contentText ?? 'resolved content',
      buildEvaluationContext: async () => context,
      evaluateContent: async () => ({
        decision: 'positive',
        confidence: 'high',
        reasoning: 'The post is constructive and context confirms the phrase is sincere.',
      }),
      uploadExplanation: async (content) => {
        const parsed = JSON.parse(content) as { decision: string; ambientContextUsed: unknown[] };
        assert.equal(parsed.decision, 'positive');
        assert.equal(parsed.ambientContextUsed.length, 1);
        return { cid: 'bafy-explanation' };
      },
      publishAttestation: async (contentCanonicalId, statementCid, topicStatementCid) => {
        published.push({ contentCanonicalId, statementCid, topicStatementCid });
        return '0xtx';
      },
      appendEvaluationLog: async (entry) => {
        logEntries.push(entry);
      },
      now: () => new Date('2026-05-15T12:00:00.000Z'),
    };

    const response = await processBeatAgentEvaluation(
      {
        beatId: 'us-political-twitter',
        attesterName: 'noninflammatory-twitter-beat',
        alignmentTopicStatementCid: 'bafy-topic',
      },
      request,
      dependencies,
    );

    assert.equal(response.decision, 'positive');
    assert.equal(response.explanationCid, 'bafy-explanation');
    assert.equal(response.transactionHash, '0xtx');
    assert.equal(response.logEntry.explanationCid, 'bafy-explanation');
    assert.equal(logEntries.length, 1);
    assert.deepEqual(published, [
      {
        contentCanonicalId: 'twitter:tweet:123',
        statementCid: 'bafy-statement',
        topicStatementCid: 'bafy-topic',
      },
    ]);
  });

  it('charges/logs abstentions without publishing positive attestations', async () => {
    let uploadCalled = false;
    let publishCalled = false;
    const logEntries: BeatAgentEvaluationLogEntry[] = [];
    const response = await processBeatAgentEvaluation(
      {
        beatId: 'us-political-twitter',
        attesterName: 'noninflammatory-twitter-beat',
        alignmentTopicStatementCid: 'bafy-topic',
      },
      request,
      {
        resolveContent: async (source) => source.contentText ?? 'resolved content',
        buildEvaluationContext: async () => ({ localContextUsed: [], ambientContextUsed: [] }),
        evaluateContent: async () => ({
          decision: 'abstain',
          confidence: 'medium',
          reasoning: 'The agent lacks enough ambient context.',
          abstainReason: 'insufficient_ambient_context',
        }),
        uploadExplanation: async () => {
          uploadCalled = true;
          return { cid: 'bafy-explanation' };
        },
        publishAttestation: async () => {
          publishCalled = true;
          return '0xtx';
        },
        appendEvaluationLog: async (entry) => {
          logEntries.push(entry);
        },
        now: () => new Date('2026-05-15T12:00:00.000Z'),
      },
    );

    assert.equal(response.decision, 'abstain');
    assert.equal(response.abstainReason, 'insufficient_ambient_context');
    assert.equal(response.explanationCid, null);
    assert.equal(response.transactionHash, null);
    assert.equal(uploadCalled, false);
    assert.equal(publishCalled, false);
    assert.equal(logEntries.length, 1);
    assert.equal(logEntries[0]?.decision, 'abstain');
    assert.equal(logEntries[0]?.explanationCid, null);
  });
});
