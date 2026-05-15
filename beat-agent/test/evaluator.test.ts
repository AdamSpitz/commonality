import assert from 'node:assert/strict';
import {
  buildBeatAgentPrompt,
  normalizeBeatAgentEvaluationResult,
  type EvaluateBeatContentWithLlmParams,
} from '../src/index.js';

const promptParams: EvaluateBeatContentWithLlmParams = {
  beatId: 'us-political-twitter',
  attesterName: 'noninflammatory-twitter-beat',
  content: 'We can solve this without dunking on each other.',
  request: {
    contentCanonicalId: 'twitter:tweet:123',
    declaredPerspective: 'moderate conservative',
  },
  context: {
    localContextUsed: [
      {
        type: 'parent_post',
        contentCanonicalId: 'twitter:tweet:122',
        summary: 'The parent asks for compromise.',
      },
    ],
    ambientContextUsed: [
      {
        observation: 'This phrase is currently used sincerely in the beat.',
        observedAt: '2026-05-12T00:00:00.000Z/2026-05-15T00:00:00.000Z',
        confidence: 'medium',
        supportingExamples: ['twitter:tweet:111'],
      },
    ],
  },
  apiKey: 'test-key',
  promptTemplate:
    'Beat {beat_id}\nContent {content_canonical_id}: {content}\n{declared_perspective_context}\nLocal {local_context_json}\nAmbient {ambient_context_json}',
};

describe('beat-agent LLM evaluator helpers', () => {
  it('builds prompts with content plus local and ambient context placeholders', () => {
    const prompt = buildBeatAgentPrompt(promptParams);

    assert.match(prompt, /Beat us-political-twitter/);
    assert.match(prompt, /twitter:tweet:123/);
    assert.match(prompt, /Declared perspective from the submitter: moderate conservative/);
    assert.match(prompt, /parent_post/);
    assert.match(prompt, /currently used sincerely/);
  });

  it('normalizes positive, negative, and abstain results', () => {
    assert.deepEqual(
      normalizeBeatAgentEvaluationResult({
        decision: true,
        confidence: 0.95,
        reasoning: 'Clearly constructive.',
      }),
      {
        decision: 'positive',
        confidence: 'high',
        reasoning: 'Clearly constructive.',
        abstainReason: undefined,
      },
    );

    assert.deepEqual(
      normalizeBeatAgentEvaluationResult({
        decision: 'negative',
        confidence: 'moderate',
        explanation: 'Inflammatory in context.',
      }),
      {
        decision: 'negative',
        confidence: 'medium',
        reasoning: 'Inflammatory in context.',
        abstainReason: undefined,
      },
    );

    assert.deepEqual(
      normalizeBeatAgentEvaluationResult({
        decision: 'abstain',
        confidence: 'low',
        reasoning: 'Off beat.',
        abstentionReason: 'outside_beat',
      }),
      {
        decision: 'abstain',
        confidence: 'low',
        reasoning: 'Off beat.',
        abstainReason: 'outside_beat',
      },
    );
  });
});
