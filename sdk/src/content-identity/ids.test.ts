import assert from 'assert';
import {
  ContentIdentityError,
  buildCanonicalChannelId,
  buildCanonicalContentId,
  hashCanonicalId,
  parseCanonicalChannelId,
} from './ids.js';

describe('content identity', () => {
  it('builds a twitter channel id without a funding import', () => {
    assert.strictEqual(buildCanonicalChannelId('twitter', '44196397'), 'twitter:uid:44196397');
    assert.deepStrictEqual(parseCanonicalChannelId('twitter:uid:44196397'), {
      platform: 'twitter',
      stableId: '44196397',
    });
    assert.strictEqual(
      buildCanonicalContentId('twitter:uid:44196397', '18347'),
      'twitter:uid:44196397:18347',
    );
    assert.strictEqual(
      hashCanonicalId('twitter:uid:12345678:18347'),
      '0xf21c3b8294cec5705ca429d3c6747f5219129af399f9ee04d6f27d9d24bd9a99',
    );
  });

  it('rejects a non-numeric twitter user id', () => {
    assert.throws(
      () => buildCanonicalChannelId('twitter', 'alice'),
      (error: unknown) =>
        error instanceof ContentIdentityError && error.code === 'invalid_channel_id',
    );
  });
});
