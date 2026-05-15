import assert from 'node:assert/strict';
import {
  createBeatAgentEvaluationLogEntry,
  createBeatAgentExplanationDocument,
  shouldPublishBeatAgentAttestation,
  validateBeatAgentEvaluationResult,
  type BeatAgentEvaluationResult,
} from '../src/index.js';

describe('beat-agent result semantics', () => {
  it('publishes only positive decisions meeting the confidence threshold', () => {
    assert.equal(
      shouldPublishBeatAgentAttestation({
        decision: 'positive',
        confidence: 'high',
        reasoning: 'Clearly aligns with the target statement.',
      }),
      true,
    );

    assert.equal(
      shouldPublishBeatAgentAttestation({
        decision: 'positive',
        confidence: 'low',
        reasoning: 'Weak signal only.',
      }),
      false,
    );

    assert.equal(
      shouldPublishBeatAgentAttestation({
        decision: 'negative',
        confidence: 'high',
        reasoning: 'Does not align.',
      }),
      false,
    );

    assert.equal(
      shouldPublishBeatAgentAttestation({
        decision: 'abstain',
        confidence: 'high',
        reasoning: 'Outside the configured beat.',
        abstainReason: 'outside_beat',
      }),
      false,
    );
  });

  it('requires abstainReason exactly for abstentions', () => {
    const validAbstention: BeatAgentEvaluationResult = {
      decision: 'abstain',
      confidence: 'medium',
      reasoning: 'The agent lacks enough ambient context for this post.',
      abstainReason: 'insufficient_ambient_context',
    };

    assert.equal(validateBeatAgentEvaluationResult(validAbstention), null);
    assert.equal(
      validateBeatAgentEvaluationResult({
        decision: 'abstain',
        confidence: 'medium',
        reasoning: 'The agent lacks enough ambient context for this post.',
      }),
      'abstainReason is required when decision is abstain',
    );
    assert.equal(
      validateBeatAgentEvaluationResult({
        decision: 'positive',
        confidence: 'medium',
        reasoning: 'Looks aligned.',
        abstainReason: 'other',
      }),
      'abstainReason is only valid when decision is abstain',
    );
  });

  it('builds explanation documents and operator-visible log entries for every decision', () => {
    const request = {
      contentCanonicalId: 'twitter:uid:123:456',
      statementCid: 'bafy-statement',
    } as const;
    const context = {
      localContextUsed: [
        {
          type: 'parent_post' as const,
          contentCanonicalId: 'twitter:uid:123:455',
          summary: 'The parent post establishes the immediate claim being answered.',
        },
      ],
      ambientContextUsed: [
        {
          observation: 'This phrase is currently used sincerely in the configured beat.',
          observedAt: '2026-05-01T00:00:00Z/2026-05-15T00:00:00Z',
          confidence: 'medium' as const,
          supportingExamples: ['twitter:uid:111:222'],
        },
      ],
    };
    const result: BeatAgentEvaluationResult = {
      decision: 'negative',
      confidence: 'high',
      reasoning: 'The post attacks an outgroup rather than steelmanning it.',
    };

    const explanation = createBeatAgentExplanationDocument({
      beatId: 'us-political-twitter',
      attesterName: 'noninflammatory-twitter-beat',
      request,
      result,
      context,
      timestamp: '2026-05-15T12:00:00.000Z',
    });

    assert.equal(explanation.attesterType, 'beat-agent');
    assert.equal(explanation.decision, 'negative');
    assert.equal(explanation.localContextUsed.length, 1);
    assert.equal(explanation.ambientContextUsed.length, 1);

    const logEntry = createBeatAgentEvaluationLogEntry({
      beatId: 'us-political-twitter',
      attesterName: 'noninflammatory-twitter-beat',
      request,
      result,
      context,
      timestamp: '2026-05-15T12:00:00.000Z',
      explanationCid: null,
      transactionHash: null,
      processingTime: 1234,
    });

    assert.equal(logEntry.schemaVersion, 1);
    assert.equal(logEntry.explanationCid, null);
    assert.equal(logEntry.transactionHash, null);
    assert.equal(logEntry.processingTime, 1234);
  });
});
