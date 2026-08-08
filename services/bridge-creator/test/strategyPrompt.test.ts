import assert from 'node:assert';
import { loadDefaultStrategyPrompt } from '../src/strategyPrompt.js';

describe('default CSM strategy prompt', () => {
  it('documents the mediator-specific synthesis strategy exposed by /strategy-prompt', () => {
    const prompt = loadDefaultStrategyPrompt();

    assert.match(prompt, /Common Sense Majority bridge-creator strategy prompt/);
    assert.match(prompt, /popular-and-sane/);
    assert.match(prompt, /modified-left/);
    assert.match(prompt, /common-ground/);
    assert.match(prompt, /Emit nothing when the context is warming/);
  });
});
