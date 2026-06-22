import assert from 'node:assert';
import { describe, it } from 'mocha';
import { OpenRouterInvalidJsonError, type OpenRouterJsonRequest } from '@commonality/attester-core';
import {
  evaluateContentWithLLM,
  type ContentAttesterEvaluationResult,
  type RequestJsonCompletionFn,
} from '../src/evaluator.js';

/**
 * Curated-corpus snapshot/schema tests for the content attester.
 *
 * The evaluator unit tests cover prompt construction, untrusted-data
 * wrapping, and a few normalization cases. This suite commits a small
 * reviewed corpus of representative raw LLM-shaped responses (decision
 * and confidence permutations, string/numeric/alias confidence, dimension
 * and supportsStatement normalization, missing-field fallbacks,
 * `explanation` alias, and the malformed-JSON recovery path) and asserts
 * that the evaluator's normalization produces the reviewed decision,
 * confidence, reasoning, dimensions, and supportsStatement for each —
 * corpus-level regression coverage for the mechanical normalization logic
 * with no live model call. If normalization drifts the corpus, the
 * snapshot fails.
 */

type RawResponse = Record<string, unknown>;

type CorpusRaw =
  | { kind: 'json'; response: RawResponse }
  | { kind: 'malformed'; text: string };

/** Terse constructor for a well-formed JSON corpus entry. */
function json(response: RawResponse): CorpusRaw {
  return { kind: 'json', response };
}

/** Terse constructor for a malformed-JSON recovery corpus entry. */
function malformed(text: string): CorpusRaw {
  return { kind: 'malformed', text };
}

interface CorpusEntry {
  id: string;
  label: string;
  raw: CorpusRaw;
  expected: Pick<ContentAttesterEvaluationResult, 'decision' | 'confidence' | 'reasoning'> & {
    dimensions: Record<string, 'pass' | 'fail' | 'partial'>;
    supportsStatement?: 'pass' | 'fail' | 'partial';
  };
}

const corpus: CorpusEntry[] = [
  {
    id: 'positive-high-with-dimensions',
    label: 'positive decision, high confidence, dimensions and supportsStatement pass',
    raw: json({
      decision: true,
      confidence: 'high',
      reasoning: 'The content engages charitably with the statement.',
      dimensions: { steelmanning: 'pass', toxic_framing: 'pass' },
      supports_statement: 'pass',
    }),
    expected: {
      decision: true,
      confidence: 'high',
      reasoning: 'The content engages charitably with the statement.',
      dimensions: { steelmanning: 'pass', toxic_framing: 'pass' },
      supportsStatement: 'pass',
    },
  },
  {
    id: 'negative-with-supports-fail',
    label: 'negative decision, supportsStatement fail',
    raw: json({
      decision: false,
      confidence: 'high',
      reasoning: 'The content mocks the statement rather than engaging with it.',
      dimensions: { steelmanning: 'fail' },
      supports_statement: 'fail',
    }),
    expected: {
      decision: false,
      confidence: 'high',
      reasoning: 'The content mocks the statement rather than engaging with it.',
      dimensions: { steelmanning: 'fail' },
      supportsStatement: 'fail',
    },
  },
  {
    id: 'string-decision-true',
    label: 'decision as string "true" normalizes to boolean true',
    raw: json({ decision: 'true', confidence: 'medium', reasoning: 'Plausibly supportive.', dimensions: {} }),
    expected: { decision: true, confidence: 'medium', reasoning: 'Plausibly supportive.', dimensions: {} },
  },
  {
    id: 'numeric-confidence-high',
    label: 'numeric confidence 0.85 maps to high',
    raw: json({ decision: true, confidence: 0.85, reasoning: 'Clear support.', dimensions: { steelmanning: 'pass' } }),
    expected: { decision: true, confidence: 'high', reasoning: 'Clear support.', dimensions: { steelmanning: 'pass' } },
  },
  {
    id: 'numeric-confidence-medium',
    label: 'numeric confidence 0.5 maps to medium',
    raw: json({ decision: false, confidence: 0.5, reasoning: 'Ambiguous.', dimensions: {} }),
    expected: { decision: false, confidence: 'medium', reasoning: 'Ambiguous.', dimensions: {} },
  },
  {
    id: 'numeric-confidence-low',
    label: 'numeric confidence 0.2 maps to low',
    raw: json({ decision: true, confidence: 0.2, reasoning: 'Barely.', dimensions: {} }),
    expected: { decision: true, confidence: 'low', reasoning: 'Barely.', dimensions: {} },
  },
  {
    id: 'alias-confidence-certain',
    label: 'alias confidence "certain" maps to high',
    raw: json({ decision: false, confidence: 'certain', reasoning: 'Definitely not supportive.', dimensions: {} }),
    expected: { decision: false, confidence: 'high', reasoning: 'Definitely not supportive.', dimensions: {} },
  },
  {
    id: 'alias-confidence-somewhat',
    label: 'alias confidence "somewhat" maps to medium',
    raw: json({ decision: true, confidence: 'somewhat', reasoning: 'Partially.', dimensions: {} }),
    expected: { decision: true, confidence: 'medium', reasoning: 'Partially.', dimensions: {} },
  },
  {
    id: 'unknown-confidence-falls-to-low',
    label: 'unknown confidence string falls back to low',
    raw: json({ decision: false, confidence: 'bogus', reasoning: 'Rejected.', dimensions: {} }),
    expected: { decision: false, confidence: 'low', reasoning: 'Rejected.', dimensions: {} },
  },
  {
    id: 'dimensions-filter-unknown-values',
    label: 'dimension values outside pass/fail/partial are dropped, valid ones kept',
    raw: json({
      decision: true,
      confidence: 'high',
      reasoning: 'Mixed.',
      dimensions: { steelmanning: 'pass', toxic_framing: 'maybe', sourcing: 'partial' },
    }),
    expected: {
      decision: true,
      confidence: 'high',
      reasoning: 'Mixed.',
      dimensions: { steelmanning: 'pass', sourcing: 'partial' },
    },
  },
  {
    id: 'missing-dimensions-empty-object',
    label: 'missing dimensions object normalizes to empty record',
    raw: json({ decision: true, confidence: 'high', reasoning: 'Fine.' }),
    expected: { decision: true, confidence: 'high', reasoning: 'Fine.', dimensions: {} },
  },
  {
    id: 'supports-statement-partial',
    label: 'supports_statement "partial" is preserved',
    raw: json({ decision: true, confidence: 'medium', reasoning: 'Partially supports.', dimensions: {}, supports_statement: 'partial' }),
    expected: { decision: true, confidence: 'medium', reasoning: 'Partially supports.', dimensions: {}, supportsStatement: 'partial' },
  },
  {
    id: 'supports-statement-unknown-dropped',
    label: 'unknown supports_statement value drops to undefined',
    raw: json({ decision: true, confidence: 'high', reasoning: 'Ok.', dimensions: {}, supports_statement: 'maybe' }),
    expected: { decision: true, confidence: 'high', reasoning: 'Ok.', dimensions: {}, supportsStatement: undefined },
  },
  {
    id: 'missing-reasoning-fallback',
    label: 'missing reasoning falls back to the documented placeholder',
    raw: json({ decision: false, confidence: 'high', dimensions: {} }),
    expected: { decision: false, confidence: 'high', reasoning: 'No reasoning provided', dimensions: {} },
  },
  {
    id: 'explanation-alias-for-reasoning',
    label: 'explanation field is used when reasoning is absent',
    raw: json({ decision: true, confidence: 'high', explanation: 'Steelmanned the opponent.', dimensions: {} }),
    expected: { decision: true, confidence: 'high', reasoning: 'Steelmanned the opponent.', dimensions: {} },
  },
  {
    id: 'malformed-json-recovery-positive',
    label: 'malformed JSON text with "decision: true" is recovered as a positive decision',
    raw: malformed('Verdict: "decision": true, high confidence, the post is charitable.'),
    expected: {
      decision: true,
      confidence: 'high',
      reasoning: 'Verdict: "decision": true, high confidence, the post is charitable.',
      dimensions: {},
    },
  },
  {
    id: 'malformed-json-recovery-negative',
    label: 'malformed JSON text without a decision marker defaults to false',
    raw: malformed('I could not decide; medium confidence.'),
    expected: {
      decision: false,
      confidence: 'medium',
      reasoning: 'I could not decide; medium confidence.',
      dimensions: {},
    },
  },
];

function makeCompletionFn(entry: CorpusEntry): RequestJsonCompletionFn {
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

const baseParams = {
  content: 'Some content text.',
  statement: 'Some target statement.',
  declaredPerspective: 'moderate',
  apiKey: 'test-key',
  model: 'test-model',
  promptTemplate: '{content}\n{statement}\n{declared_perspective_context}',
  attesterName: 'test-content-attester',
} as const;

describe('evaluateContentWithLLM curated-corpus snapshots', () => {
  for (const entry of corpus) {
    it(`normalizes corpus entry "${entry.id}" (${entry.label}) to its reviewed snapshot`, async () => {
      const result = await evaluateContentWithLLM({
        ...baseParams,
        requestJsonCompletionFn: makeCompletionFn(entry),
      });

      // Schema: load-bearing fields are always present and well-typed.
      assert.strictEqual(typeof result.decision, 'boolean', 'decision must be a boolean');
      assert.ok(['high', 'medium', 'low'].includes(result.confidence), 'confidence must be a normalized tier');
      assert.strictEqual(typeof result.reasoning, 'string', 'reasoning must be a string');
      assert.ok(result.dimensions && typeof result.dimensions === 'object', 'dimensions must be an object');

      // Snapshot: reviewed normalization is stable.
      assert.strictEqual(result.decision, entry.expected.decision, `decision drift for ${entry.id}`);
      assert.strictEqual(result.confidence, entry.expected.confidence, `confidence drift for ${entry.id}`);
      assert.strictEqual(result.reasoning, entry.expected.reasoning, `reasoning drift for ${entry.id}`);
      assert.deepStrictEqual(result.dimensions, entry.expected.dimensions, `dimensions drift for ${entry.id}`);
      assert.strictEqual(result.supportsStatement, entry.expected.supportsStatement, `supportsStatement drift for ${entry.id}`);
    });
  }
});
