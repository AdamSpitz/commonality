import assert from 'node:assert';
import { describe, it } from 'mocha';
import { OpenRouterInvalidJsonError, type OpenRouterJsonRequest } from '@commonality/attester-core';
import { evaluateImplicationWithLLM } from '../src/evaluator.js';

function mockLLM(response: Record<string, unknown>) {
  return async <T>(_req: OpenRouterJsonRequest): Promise<T> => response as T;
}

function capturingLLM(response: Record<string, unknown>, captured: OpenRouterJsonRequest[]) {
  return async <T>(req: OpenRouterJsonRequest): Promise<T> => {
    captured.push(req);
    return response as T;
  };
}

describe('evaluateImplicationWithLLM', () => {
  it('returns properly shaped result for a clear implication', async () => {
    const result = await evaluateImplicationWithLLM(
      'I care about improving Grey County',
      'I care about improving Ontario',
      'test-key',
      'test-model',
      mockLLM({ implies: true, confidence: 'high', reasoning: 'Grey County is in Ontario.' })
    );

    assert.strictEqual(result.implies, true);
    assert.strictEqual(result.confidence, 'high');
    assert.strictEqual(result.reasoning, 'Grey County is in Ontario.');
  });

  it('returns implies=false for a non-implication', async () => {
    const result = await evaluateImplicationWithLLM(
      'I care about improving Ontario',
      'I care about improving Grey County',
      'test-key',
      'test-model',
      mockLLM({ implies: false, confidence: 'high', reasoning: 'Ontario does not imply Grey County.' })
    );

    assert.strictEqual(result.implies, false);
    assert.strictEqual(result.confidence, 'high');
  });

  it('accepts implies="true" string from LLM', async () => {
    const result = await evaluateImplicationWithLLM(
      'S1', 'S2', 'key', 'model',
      mockLLM({ implies: 'true', confidence: 'medium', reasoning: 'test' })
    );

    assert.strictEqual(result.implies, true);
  });

  it('normalizes numeric confidence to high/medium/low', async () => {
    const high = await evaluateImplicationWithLLM(
      'S1', 'S2', 'key', 'model',
      mockLLM({ implies: true, confidence: 0.9, reasoning: 'test' })
    );
    assert.strictEqual(high.confidence, 'high');

    const medium = await evaluateImplicationWithLLM(
      'S1', 'S2', 'key', 'model',
      mockLLM({ implies: true, confidence: 0.6, reasoning: 'test' })
    );
    assert.strictEqual(medium.confidence, 'medium');

    const low = await evaluateImplicationWithLLM(
      'S1', 'S2', 'key', 'model',
      mockLLM({ implies: true, confidence: 0.3, reasoning: 'test' })
    );
    assert.strictEqual(low.confidence, 'low');
  });

  it('normalizes string confidence aliases to high/medium/low', async () => {
    for (const alias of ['strong', 'certain', 'definite']) {
      const result = await evaluateImplicationWithLLM(
        'S1', 'S2', 'key', 'model',
        mockLLM({ implies: true, confidence: alias, reasoning: 'test' })
      );
      assert.strictEqual(result.confidence, 'high', `Expected 'high' for alias '${alias}'`);
    }

    for (const alias of ['moderate', 'somewhat', 'partial']) {
      const result = await evaluateImplicationWithLLM(
        'S1', 'S2', 'key', 'model',
        mockLLM({ implies: true, confidence: alias, reasoning: 'test' })
      );
      assert.strictEqual(result.confidence, 'medium', `Expected 'medium' for alias '${alias}'`);
    }

    const low = await evaluateImplicationWithLLM(
      'S1', 'S2', 'key', 'model',
      mockLLM({ implies: true, confidence: 'uncertain', reasoning: 'test' })
    );
    assert.strictEqual(low.confidence, 'low');
  });

  it('falls back to text extraction when LLM returns invalid JSON (implies=true)', async () => {
    const result = await evaluateImplicationWithLLM(
      'S1', 'S2', 'key', 'model',
      async () => { throw new OpenRouterInvalidJsonError('"implies": true, high confidence'); }
    );

    assert.strictEqual(result.implies, true);
    assert.strictEqual(result.confidence, 'high');
  });

  it('falls back to implies=false for ambiguous non-JSON text', async () => {
    const result = await evaluateImplicationWithLLM(
      'S1', 'S2', 'key', 'model',
      async () => { throw new OpenRouterInvalidJsonError('Unable to process this request.'); }
    );

    assert.strictEqual(result.implies, false);
    assert.strictEqual(result.confidence, 'low');
  });

  it('falls back to implies=true when text says "does not imply" is absent but implies=true present', async () => {
    const result = await evaluateImplicationWithLLM(
      'S1', 'S2', 'key', 'model',
      async () => { throw new OpenRouterInvalidJsonError('yes, statement 1 implies statement 2'); }
    );

    assert.strictEqual(result.implies, true);
  });

  it('re-throws non-JSON errors', async () => {
    await assert.rejects(
      () => evaluateImplicationWithLLM(
        'S1', 'S2', 'key', 'model',
        async () => { throw new Error('network error'); }
      ),
      /network error/
    );
  });

  it('includes the statement contents in the prompt', async () => {
    const captured: OpenRouterJsonRequest[] = [];

    await evaluateImplicationWithLLM(
      'I support universal healthcare',
      'I support covering dental care',
      'test-key',
      'test-model',
      capturingLLM({ implies: false, confidence: 'low', reasoning: 'test' }, captured)
    );

    assert.strictEqual(captured.length, 1);
    const userPrompt = captured[0]!.userPrompt;
    assert.ok(userPrompt.includes('I support universal healthcare'), 'Prompt should include S1');
    assert.ok(userPrompt.includes('I support covering dental care'), 'Prompt should include S2');
  });

  it('includes geographic and conjunction pattern guidance in the system prompt', async () => {
    const captured: OpenRouterJsonRequest[] = [];

    await evaluateImplicationWithLLM(
      'S1', 'S2', 'key', 'model',
      capturingLLM({ implies: false, confidence: 'low', reasoning: 'test' }, captured)
    );

    const systemPrompt = captured[0]!.systemPrompt;
    assert.ok(systemPrompt.includes('geography'), 'System prompt should include geographic guidance');
    assert.ok(systemPrompt.includes('onjunction'), 'System prompt should include conjunction pattern guidance');
    assert.ok(systemPrompt.includes('Reverse') || systemPrompt.includes('reverse'), 'System prompt should clarify non-implications');
  });

  it('instructs the LLM to be conservative and describes confidence levels', async () => {
    const captured: OpenRouterJsonRequest[] = [];

    await evaluateImplicationWithLLM(
      'S1', 'S2', 'key', 'model',
      capturingLLM({ implies: false, confidence: 'low', reasoning: 'test' }, captured)
    );

    const systemPrompt = captured[0]!.systemPrompt;
    assert.ok(/conservativ/i.test(systemPrompt), 'System prompt should emphasize being conservative');
    assert.ok(systemPrompt.includes('"high"') && systemPrompt.includes('"medium"') && systemPrompt.includes('"low"'),
      'System prompt should describe all three confidence levels');
  });

  it('rejects softened / bridge-style rewordings per the guidance', async () => {
    const captured: OpenRouterJsonRequest[] = [];

    await evaluateImplicationWithLLM(
      'S1', 'S2', 'key', 'model',
      capturingLLM({ implies: false, confidence: 'low', reasoning: 'test' }, captured)
    );

    const systemPrompt = captured[0]!.systemPrompt;
    assert.ok(/hedg|softened|bridge/i.test(systemPrompt),
      'System prompt should warn against softened/hedged/bridge rewordings');
  });

  it('uses "explanation" field as fallback for reasoning', async () => {
    const result = await evaluateImplicationWithLLM(
      'S1', 'S2', 'key', 'model',
      mockLLM({ implies: true, confidence: 'medium', explanation: 'Explanation field used.' })
    );

    assert.strictEqual(result.reasoning, 'Explanation field used.');
  });

  it('uses "No reasoning provided" when neither reasoning nor explanation is present', async () => {
    const result = await evaluateImplicationWithLLM(
      'S1', 'S2', 'key', 'model',
      mockLLM({ implies: true, confidence: 'low' })
    );

    assert.strictEqual(result.reasoning, 'No reasoning provided');
  });
});
