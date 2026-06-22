import assert from 'node:assert';
import { describe, it } from 'mocha';
import {
  OpenRouterInvalidJsonError,
  type OpenRouterJsonRequest,
  type OpenRouterJsonCompletion,
} from '@commonality/attester-core';
import { evaluateImplicationWithLLM, type LlmEvaluationResult } from '../src/evaluator.js';

/**
 * Curated-corpus snapshot/schema tests for the implication attester.
 *
 * The evaluator unit tests cover individual normalization branches with
 * synthetic single cases. This suite commits a small reviewed corpus of
 * representative raw LLM-shaped responses (decision/confidence
 * permutations, string/numeric/alias confidence, missing-field fallbacks,
 * `explanation` alias, and the malformed-JSON recovery path) and asserts
 * that the evaluator's normalization produces the reviewed decision,
 * confidence, and reasoning for each — i.e. corpus-level regression
 * coverage for the mechanical normalization logic without any live model
 * call. If normalization changes drift the corpus, the snapshot fails.
 */

type RawResponse = Record<string, unknown>;

interface CorpusEntry {
  id: string;
  label: string;
  /** Raw JSON object the LLM would have returned, or a marker for the malformed-JSON path. */
  raw: RawResponse | { malformedText: string };
  expected: Pick<LlmEvaluationResult, 'implies' | 'confidence' | 'reasoning'>;
}

const corpus: CorpusEntry[] = [
  {
    id: 'clear-implication-high',
    label: 'clear subset implication, high confidence',
    raw: { implies: true, confidence: 'high', reasoning: 'Strict subset — S2 drops one claim and changes nothing else.' },
    expected: { implies: true, confidence: 'high', reasoning: 'Strict subset — S2 drops one claim and changes nothing else.' },
  },
  {
    id: 'non-implication-high',
    label: 'non-implication with a key difference, high confidence',
    raw: { implies: false, confidence: 'high', reasoning: 'S2 adds a policy claim not present in S1.', key_difference: 'Added policy claim' },
    expected: { implies: false, confidence: 'high', reasoning: 'S2 adds a policy claim not present in S1.' },
  },
  {
    id: 'string-implies-true',
    label: 'implies as string "true" normalizes to boolean true',
    raw: { implies: 'true', confidence: 'medium', reasoning: 'Probable generalization.' },
    expected: { implies: true, confidence: 'medium', reasoning: 'Probable generalization.' },
  },
  {
    id: 'string-implies-false',
    label: 'implies as string "false" normalizes to boolean false',
    raw: { implies: 'false', confidence: 'high', reasoning: 'Reverse hierarchy rule.' },
    expected: { implies: false, confidence: 'high', reasoning: 'Reverse hierarchy rule.' },
  },
  {
    id: 'numeric-confidence-high',
    label: 'numeric confidence 0.9 maps to high',
    raw: { implies: true, confidence: 0.9, reasoning: 'Direct and obvious.' },
    expected: { implies: true, confidence: 'high', reasoning: 'Direct and obvious.' },
  },
  {
    id: 'numeric-confidence-medium',
    label: 'numeric confidence 0.6 maps to medium',
    raw: { implies: true, confidence: 0.6, reasoning: 'Probable but interpretive.' },
    expected: { implies: true, confidence: 'medium', reasoning: 'Probable but interpretive.' },
  },
  {
    id: 'numeric-confidence-low',
    label: 'numeric confidence 0.3 maps to low',
    raw: { implies: true, confidence: 0.3, reasoning: 'Weak and uncertain.' },
    expected: { implies: true, confidence: 'low', reasoning: 'Weak and uncertain.' },
  },
  {
    id: 'alias-confidence-strong',
    label: 'alias confidence "strong" maps to high',
    raw: { implies: false, confidence: 'strong', reasoning: 'Clean rule fit.' },
    expected: { implies: false, confidence: 'high', reasoning: 'Clean rule fit.' },
  },
  {
    id: 'alias-confidence-moderate',
    label: 'alias confidence "moderate" maps to medium',
    raw: { implies: true, confidence: 'moderate', reasoning: 'Some judgment involved.' },
    expected: { implies: true, confidence: 'medium', reasoning: 'Some judgment involved.' },
  },
  {
    id: 'unknown-confidence-falls-to-low',
    label: 'unknown confidence string falls back to low',
    raw: { implies: false, confidence: 'bogus', reasoning: 'Rejected.' },
    expected: { implies: false, confidence: 'low', reasoning: 'Rejected.' },
  },
  {
    id: 'missing-reasoning-fallback',
    label: 'missing reasoning falls back to the documented placeholder',
    raw: { implies: true, confidence: 'high' },
    expected: { implies: true, confidence: 'high', reasoning: 'No reasoning provided' },
  },
  {
    id: 'explanation-alias-for-reasoning',
    label: 'explanation field is used when reasoning is absent',
    raw: { implies: false, confidence: 'high', explanation: 'S2 changes the framing.' },
    expected: { implies: false, confidence: 'high', reasoning: 'S2 changes the framing.' },
  },
  {
    id: 'malformed-json-recovery-positive',
    label: 'malformed JSON text with "implies: true" is recovered as a positive decision',
    raw: { malformedText: 'Hmm, implies: true, high confidence, the subset rule applies.' },
    // extractResultFromText trims reasoning to the first 500 chars of the raw text.
    expected: { implies: true, confidence: 'high', reasoning: 'Hmm, implies: true, high confidence, the subset rule applies.' },
  },
  {
    id: 'malformed-json-recovery-negative',
    label: 'malformed JSON text with "does not imply" is recovered as a negative decision',
    raw: { malformedText: 'The answer is does not imply, medium confidence.' },
    expected: { implies: false, confidence: 'medium', reasoning: 'The answer is does not imply, medium confidence.' },
  },
];

function makeCompletionFn(entry: CorpusEntry) {
  return async <T>(req: OpenRouterJsonRequest): Promise<T | OpenRouterJsonCompletion<T>> => {
    // Sanity: the evaluator must always send an API key and model so a stray
    // non-mocked call would be obvious. This is a schema check on the request.
    assert.ok(typeof req.apiKey === 'string' && req.apiKey.length > 0, 'request must carry an apiKey');
    assert.ok(typeof req.model === 'string' && req.model.length > 0, 'request must carry a model');
    assert.ok(typeof req.systemPrompt === 'string' && req.systemPrompt.length > 0, 'request must carry a systemPrompt');
    assert.ok(typeof req.userPrompt === 'string' && req.userPrompt.length > 0, 'request must carry a userPrompt');

    if ('malformedText' in entry.raw) {
      throw new OpenRouterInvalidJsonError(entry.raw.malformedText) as unknown as Error;
    }
    return entry.raw as unknown as T;
  };
}

describe('evaluateImplicationWithLLM curated-corpus snapshots', () => {
  for (const entry of corpus) {
    it(`normalizes corpus entry "${entry.id}" (${entry.label}) to its reviewed snapshot`, async () => {
      const result = await evaluateImplicationWithLLM(
        'Some statement S1 text.',
        'Some statement S2 text.',
        'test-key',
        'test-model',
        makeCompletionFn(entry),
      );

      // Schema: the normalized result always has the three load-bearing fields.
      assert.strictEqual(typeof result.implies, 'boolean', 'implies must be a boolean');
      assert.ok(['high', 'medium', 'low'].includes(result.confidence), 'confidence must be a normalized tier');
      assert.strictEqual(typeof result.reasoning, 'string', 'reasoning must be a string');

      // Snapshot: the reviewed decision/confidence/reasoning are stable.
      assert.strictEqual(result.implies, entry.expected.implies, `implies drift for ${entry.id}`);
      assert.strictEqual(result.confidence, entry.expected.confidence, `confidence drift for ${entry.id}`);
      assert.strictEqual(result.reasoning, entry.expected.reasoning, `reasoning drift for ${entry.id}`);
    });
  }
});
