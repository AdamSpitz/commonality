import assert from 'node:assert/strict';
import {
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
});
