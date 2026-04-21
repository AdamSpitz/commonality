import assert from 'node:assert';
import { loadSubmissionsFromApi, submissionKey } from '../src/submissions.js';

describe('content submission keys', () => {
  it('includes the perspective when present', () => {
    assert.strictEqual(
      submissionKey({
        contentUrl: 'https://x.com/alice/status/123',
        statementCid: 'bafy123',
        declaredPerspective: 'left',
      }),
      'bafy123:https://x.com/alice/status/123:left',
    );
  });

  it('uses an empty trailing segment when perspective is absent', () => {
    assert.strictEqual(
      submissionKey({
        contentUrl: 'https://x.com/alice/status/123',
        statementCid: 'bafy123',
      }),
      'bafy123:https://x.com/alice/status/123:',
    );
  });
});

describe('loadSubmissionsFromApi', () => {
  it('parses API responses using the same schema as file-backed submissions', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify([
        {
          contentUrl: 'https://x.com/alice/status/123',
          statementCid: 'bafy123',
          declaredPerspective: 'left',
        },
      ]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })) as typeof fetch;

    try {
      const submissions = await loadSubmissionsFromApi('http://localhost:3001/content-submission');

      assert.deepStrictEqual(submissions, [
        {
          contentUrl: 'https://x.com/alice/status/123',
          statementCid: 'bafy123',
          declaredPerspective: 'left',
        },
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
