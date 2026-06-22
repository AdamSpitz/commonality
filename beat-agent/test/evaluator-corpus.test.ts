import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { OpenRouterInvalidJsonError, type OpenRouterJsonRequest } from '@commonality/attester-core';
import {
  evaluateBeatContentWithLLM,
  type BeatRequestJsonCompletionFn,
  type BeatAgentEvaluationContext,
  type BeatAgentEvaluationRequest,
} from '../src/index.js';

/**
 * Curated-corpus snapshot/schema tests for the beat-agent content attester.
 *
 * The beat-agent evaluator/attester tests cover prompt construction,
 * untrusted-data wrapping, abstain semantics, and publication shape on
 * synthetic cases. This suite commits a small reviewed corpus of
 * representative raw LLM-shaped responses (decision/confidence
 * permutations, string/numeric/alias confidence, boolean and string
 * decision markers, abstain-reason normalization, missing-field fallbacks,
 * `explanation` alias, and the malformed-JSON recovery path) and asserts
 * that the evaluator's normalization + validation produces the reviewed
 * decision, confidence, reasoning, and abstainReason for each —
 * corpus-level regression coverage for the mechanical normalization logic
 * with no live model call. If normalization drifts the corpus, the
 * snapshot fails.
 */

type RawResponse = Record<string, unknown>;

type CorpusRaw =
  | { kind: 'json'; response: RawResponse }
  | { kind: 'malformed'; text: string };

function json(response: RawResponse): CorpusRaw {
  return { kind: 'json', response };
}

function malformed(text: string): CorpusRaw {
  return { kind: 'malformed', text };
}

interface CorpusEntry {
  id: string;
  label: string;
  raw: CorpusRaw;
  expected: {
    decision: 'positive' | 'negative' | 'abstain';
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
    abstainReason?: string;
  };
}

const corpus: CorpusEntry[] = [
  {
    id: 'positive-high',
    label: 'positive decision, high confidence',
    raw: json({ decision: 'positive', confidence: 'high', reasoning: 'Calm, bridge-building post within the beat.' }),
    expected: { decision: 'positive', confidence: 'high', reasoning: 'Calm, bridge-building post within the beat.' },
  },
  {
    id: 'negative-medium',
    label: 'negative decision, medium confidence',
    raw: json({ decision: 'negative', confidence: 'medium', reasoning: 'Inflammatory framing.' }),
    expected: { decision: 'negative', confidence: 'medium', reasoning: 'Inflammatory framing.' },
  },
  {
    id: 'abstain-outside-beat',
    label: 'abstain with a recognized abstain reason',
    raw: json({ decision: 'abstain', confidence: 'low', reasoning: 'Topic is outside the beat.', abstainReason: 'outside_beat' }),
    expected: { decision: 'abstain', confidence: 'low', reasoning: 'Topic is outside the beat.', abstainReason: 'outside_beat' },
  },
  {
    id: 'abstain-unknown-reason',
    label: 'abstain with an unrecognized reason normalizes to "other"',
    raw: json({ decision: 'abstain', confidence: 'low', reasoning: 'Unclear.', abstainReason: 'some-new-reason' }),
    expected: { decision: 'abstain', confidence: 'low', reasoning: 'Unclear.', abstainReason: 'other' },
  },
  {
    id: 'abstain-abstention-alias',
    label: 'abstentionReason alias is accepted alongside abstainReason',
    raw: json({ decision: 'abstain', confidence: 'low', reasoning: 'Not enough ambient context.', abstentionReason: 'insufficient_ambient_context' }),
    expected: { decision: 'abstain', confidence: 'low', reasoning: 'Not enough ambient context.', abstainReason: 'insufficient_ambient_context' },
  },
  {
    id: 'decision-boolean-true',
    label: 'decision boolean true normalizes to positive',
    raw: json({ decision: true, confidence: 'high', reasoning: 'Supportive.' }),
    expected: { decision: 'positive', confidence: 'high', reasoning: 'Supportive.' },
  },
  {
    id: 'decision-boolean-false',
    label: 'decision boolean false normalizes to negative',
    raw: json({ decision: false, confidence: 'high', reasoning: 'Hostile.' }),
    expected: { decision: 'negative', confidence: 'high', reasoning: 'Hostile.' },
  },
  {
    id: 'numeric-confidence-high',
    label: 'numeric confidence 0.9 maps to high',
    raw: json({ decision: 'positive', confidence: 0.9, reasoning: 'Clear.' }),
    expected: { decision: 'positive', confidence: 'high', reasoning: 'Clear.' },
  },
  {
    id: 'numeric-confidence-medium',
    label: 'numeric confidence 0.55 maps to medium',
    raw: json({ decision: 'negative', confidence: 0.55, reasoning: 'Likely.' }),
    expected: { decision: 'negative', confidence: 'medium', reasoning: 'Likely.' },
  },
  {
    id: 'numeric-confidence-low',
    label: 'numeric confidence 0.2 maps to low',
    raw: json({ decision: 'abstain', confidence: 0.2, reasoning: 'Unsure.', abstainReason: 'other' }),
    expected: { decision: 'abstain', confidence: 'low', reasoning: 'Unsure.', abstainReason: 'other' },
  },
  {
    id: 'alias-confidence-definite',
    label: 'alias confidence "definite" maps to high',
    raw: json({ decision: 'positive', confidence: 'definite', reasoning: 'Unambiguous.' }),
    expected: { decision: 'positive', confidence: 'high', reasoning: 'Unambiguous.' },
  },
  {
    id: 'alias-confidence-partial',
    label: 'alias confidence "partial" maps to medium',
    raw: json({ decision: 'negative', confidence: 'partial', reasoning: 'Somewhat.' }),
    expected: { decision: 'negative', confidence: 'medium', reasoning: 'Somewhat.' },
  },
  {
    id: 'unknown-confidence-falls-to-low',
    label: 'unknown confidence string falls back to low',
    raw: json({ decision: 'abstain', confidence: 'bogus', reasoning: 'Cannot tell.', abstainReason: 'other' }),
    expected: { decision: 'abstain', confidence: 'low', reasoning: 'Cannot tell.', abstainReason: 'other' },
  },
  {
    id: 'missing-reasoning-fallback',
    label: 'missing reasoning falls back to the documented placeholder',
    raw: json({ decision: 'positive', confidence: 'high' }),
    expected: { decision: 'positive', confidence: 'high', reasoning: 'No reasoning provided' },
  },
  {
    id: 'explanation-alias-for-reasoning',
    label: 'explanation field is used when reasoning is absent',
    raw: json({ decision: 'negative', confidence: 'high', explanation: 'Attacked the other side.' }),
    expected: { decision: 'negative', confidence: 'high', reasoning: 'Attacked the other side.' },
  },
  {
    id: 'malformed-json-recovery-positive',
    label: 'malformed JSON text containing "positive" recovers as a positive decision',
    raw: malformed('I would say positive, high confidence, the post builds common ground.'),
    expected: {
      decision: 'positive',
      confidence: 'high',
      reasoning: 'I would say positive, high confidence, the post builds common ground.',
    },
  },
  {
    id: 'malformed-json-recovery-abstain',
    label: 'malformed JSON text with no decision marker recovers as abstain with reason "other"',
    raw: malformed('I cannot tell from this context; medium confidence.'),
    expected: {
      decision: 'abstain',
      confidence: 'medium',
      reasoning: 'I cannot tell from this context; medium confidence.',
      abstainReason: 'other',
    },
  },
];

function makeCompletionFn(entry: CorpusEntry): BeatRequestJsonCompletionFn {
  return async <T>(req: OpenRouterJsonRequest): Promise<T> => {
    assert.ok(typeof req.apiKey === 'string' && req.apiKey.length > 0, 'request must carry an apiKey');
    assert.ok(typeof req.model === 'string' && req.model.length > 0, 'request must carry a model');
    assert.ok(typeof req.systemPrompt === 'string' && req.systemPrompt.length > 0, 'request must carry a systemPrompt');
    assert.ok(typeof req.userPrompt === 'string' && req.userPrompt.length > 0, 'request must carry a userPrompt');

    if (entry.raw.kind === 'malformed') {
      throw new OpenRouterInvalidJsonError(entry.raw.text);
    }
    return entry.raw.response as unknown as T;
  };
}

const context: BeatAgentEvaluationContext = {
  localContextUsed: [
    { type: 'parent_post', contentCanonicalId: 'twitter:tweet:122', summary: 'The parent asks for practical compromise.' },
  ],
  ambientContextUsed: [
    {
      observation: 'This account has recently used similar language sincerely in the beat.',
      observedAt: '2026-05-12T00:00:00.000Z/2026-05-15T00:00:00.000Z',
      confidence: 'medium',
      supportingExamples: ['twitter:tweet:111'],
      sourceAuthorCount: 2,
      timeSpanHours: 72,
      diversityScore: 0.8,
    },
  ],
};

const request: Pick<BeatAgentEvaluationRequest, 'contentCanonicalId' | 'declaredPerspective'> = {
  contentCanonicalId: 'twitter:tweet:123',
  declaredPerspective: undefined,
};

const baseParams = {
  beatId: 'us-politics',
  attesterName: 'test-beat-agent',
  content: 'A calm post that builds cross-partisan common ground.',
  request,
  context,
  apiKey: 'test-key',
  model: 'test-model',
  promptTemplate: '{beat_id}\n{content_canonical_id}\n{content}\n{declared_perspective_context}\n{local_context_json}\n{ambient_context_json}',
} as const;

describe('evaluateBeatContentWithLLM curated-corpus snapshots', () => {
  for (const entry of corpus) {
    it(`normalizes corpus entry "${entry.id}" (${entry.label}) to its reviewed snapshot`, async () => {
      const result = await evaluateBeatContentWithLLM({
        ...baseParams,
        requestJsonCompletionFn: makeCompletionFn(entry),
      });

      // Schema: load-bearing fields are always present and well-typed.
      assert.ok(['positive', 'negative', 'abstain'].includes(result.decision), 'decision must be a normalized value');
      assert.ok(['high', 'medium', 'low'].includes(result.confidence), 'confidence must be a normalized tier');
      assert.equal(typeof result.reasoning, 'string', 'reasoning must be a string');
      assert.ok(result.reasoning.trim().length > 0, 'reasoning must be non-empty after validation');

      // Snapshot: reviewed normalization is stable.
      assert.equal(result.decision, entry.expected.decision, `decision drift for ${entry.id}`);
      assert.equal(result.confidence, entry.expected.confidence, `confidence drift for ${entry.id}`);
      assert.equal(result.reasoning, entry.expected.reasoning, `reasoning drift for ${entry.id}`);
      assert.equal(result.abstainReason, entry.expected.abstainReason, `abstainReason drift for ${entry.id}`);
    });
  }
});
