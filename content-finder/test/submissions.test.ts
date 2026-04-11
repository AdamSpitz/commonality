import assert from 'node:assert';
import { submissionKey } from '../src/submissions.js';

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
