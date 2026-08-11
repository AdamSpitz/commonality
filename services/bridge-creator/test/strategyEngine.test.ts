import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { runStatementStrategy, type StatementStrategy } from '../src/strategyEngine.js';

describe('statement strategy engine', () => {
  it('keeps tenant strategy and input separate while sharing provider execution', async () => {
    const strategy: StatementStrategy<{ rough: string }, string> = {
      name: 'test-strategy',
      systemPrompt: 'tenant-owned strategy',
      renderInput: (input) => ({ rough_description: input.rough }),
      normalize: (output) => (output as { result: string }).result,
    };
    const result = await runStatementStrategy(strategy, { rough: 'a bundle' }, {
      apiKey: 'key', baseUrl: 'https://example.test/v1', model: 'model',
    }, {
      requestJsonCompletion: async <T>(request) => {
        assert.equal(request.systemPrompt, 'tenant-owned strategy');
        assert.match(request.userPrompt, /rough_description/);
        return { result: 'normalized' } as T;
      },
    });
    assert.equal(result, 'normalized');
  });
});
