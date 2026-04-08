import assert from 'assert';
import { buildContentAttesterPrompt } from '../src/evaluator.js';
import { extractTextFromStructuredContent, stripHtmlToText } from '../src/content.js';

describe('content attester evaluator', () => {
  it('injects content and perspective context into the prompt template', () => {
    const prompt = buildContentAttesterPrompt(
      'Content:\n{content}\n\nPerspective:\n{declared_perspective_context}',
      'Example content',
      'left-wing',
    );

    assert.match(prompt, /Example content/);
    assert.match(prompt, /Declared perspective from the submitter: left-wing/);
  });

  it('extracts nested text from structured IPFS content', () => {
    const result = extractTextFromStructuredContent(JSON.stringify({
      content: {
        text: 'Nested body text',
      },
    }));

    assert.strictEqual(result, 'Nested body text');
  });

  it('strips HTML to readable text for URL-based evaluation', () => {
    const result = stripHtmlToText('<html><body><h1>Hello</h1><p>world</p></body></html>');
    assert.strictEqual(result, 'Hello world');
  });
});
