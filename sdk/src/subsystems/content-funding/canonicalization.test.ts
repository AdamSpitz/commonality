import assert from 'assert';
import {
  ContentFundingCanonicalizationError,
  buildCanonicalChannelId,
  buildCanonicalContentId,
  hashCanonicalId,
  parseCanonicalChannelId,
  parseContentFundingUrl,
  parseSubstackPostUrl,
  parseTwitterStatusUrl,
  parseYouTubeVideoUrl,
} from './canonicalization.js';

describe('content-funding canonicalization', () => {
  describe('parseTwitterStatusUrl', () => {
    it('accepts x.com status URLs and strips noise', () => {
      const parsed = parseTwitterStatusUrl('https://x.com/alice/status/18347?s=20&t=abc#m');
      assert.deepStrictEqual(parsed, {
        platform: 'twitter',
        tweetId: '18347',
        handle: '@alice',
      });
    });

    it('accepts i/web/status URLs', () => {
      const parsed = parseTwitterStatusUrl('https://twitter.com/i/web/status/18347');
      assert.deepStrictEqual(parsed, {
        platform: 'twitter',
        tweetId: '18347',
      });
    });

    it('rejects non-status Twitter URLs', () => {
      assert.throws(
        () => parseTwitterStatusUrl('https://x.com/alice'),
        (error: unknown) =>
          error instanceof ContentFundingCanonicalizationError &&
          error.code === 'invalid_twitter_url',
      );
    });
  });

  describe('parseYouTubeVideoUrl', () => {
    it('accepts watch URLs', () => {
      const parsed = parseYouTubeVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s');
      assert.deepStrictEqual(parsed, {
        platform: 'youtube',
        videoId: 'dQw4w9WgXcQ',
      });
    });

    it('accepts shorts URLs', () => {
      const parsed = parseYouTubeVideoUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ');
      assert.deepStrictEqual(parsed, {
        platform: 'youtube',
        videoId: 'dQw4w9WgXcQ',
      });
    });

    it('accepts youtu.be URLs', () => {
      const parsed = parseYouTubeVideoUrl('https://youtu.be/dQw4w9WgXcQ');
      assert.deepStrictEqual(parsed, {
        platform: 'youtube',
        videoId: 'dQw4w9WgXcQ',
      });
    });

    it('rejects playlist URLs without a current video', () => {
      assert.throws(
        () => parseYouTubeVideoUrl('https://www.youtube.com/playlist?list=PL123'),
        (error: unknown) =>
          error instanceof ContentFundingCanonicalizationError &&
          error.code === 'invalid_youtube_url',
      );
    });
  });

  describe('parseSubstackPostUrl', () => {
    it('accepts publication post URLs', () => {
      const parsed = parseSubstackPostUrl('https://example.substack.com/p/my-post?utm_source=twitter');
      assert.deepStrictEqual(parsed, {
        platform: 'substack',
        publication: 'example',
        slug: 'my-post',
      });
    });

    it('rejects custom-domain URLs', () => {
      assert.throws(
        () => parseSubstackPostUrl('https://customdomain.com/p/my-post'),
        (error: unknown) =>
          error instanceof ContentFundingCanonicalizationError &&
          error.code === 'unsupported_substack_custom_domain',
      );
    });
  });

  describe('parseContentFundingUrl', () => {
    it('dispatches by URL host', () => {
      assert.deepStrictEqual(parseContentFundingUrl('https://x.com/alice/status/18347'), {
        platform: 'twitter',
        tweetId: '18347',
        handle: '@alice',
      });
      assert.deepStrictEqual(parseContentFundingUrl('https://youtu.be/dQw4w9WgXcQ'), {
        platform: 'youtube',
        videoId: 'dQw4w9WgXcQ',
      });
      assert.deepStrictEqual(parseContentFundingUrl('https://example.substack.com/p/my-post'), {
        platform: 'substack',
        publication: 'example',
        slug: 'my-post',
      });
    });
  });

  describe('canonical IDs', () => {
    it('builds and parses canonical channel IDs', () => {
      assert.strictEqual(buildCanonicalChannelId('twitter', '12345678'), 'twitter:uid:12345678');
      assert.strictEqual(
        buildCanonicalChannelId('youtube', 'UCuAXFkgsw1L7xaCfnd5JJOw'),
        'youtube:channel:UCuAXFkgsw1L7xaCfnd5JJOw',
      );
      assert.strictEqual(buildCanonicalChannelId('substack', 'Example-Post'), 'substack:example-post');

      assert.deepStrictEqual(parseCanonicalChannelId('twitter:uid:12345678'), {
        platform: 'twitter',
        stableId: '12345678',
      });
    });

    it('builds content IDs with the platform-specific separator', () => {
      assert.strictEqual(
        buildCanonicalContentId('twitter:uid:12345678', '18347'),
        'twitter:uid:12345678:18347',
      );
      assert.strictEqual(
        buildCanonicalContentId('youtube:channel:UCuAXFkgsw1L7xaCfnd5JJOw', 'dQw4w9WgXcQ'),
        'youtube:channel:UCuAXFkgsw1L7xaCfnd5JJOw:dQw4w9WgXcQ',
      );
      assert.strictEqual(
        buildCanonicalContentId('substack:example', 'my-post'),
        'substack:example/my-post',
      );
    });

    it('hashes canonical IDs deterministically', () => {
      assert.strictEqual(
        hashCanonicalId('twitter:uid:12345678:18347'),
        '0xf21c3b8294cec5705ca429d3c6747f5219129af399f9ee04d6f27d9d24bd9a99',
      );
    });

    it('rejects invalid canonical channel IDs and content suffixes', () => {
      assert.throws(
        () => buildCanonicalChannelId('twitter', 'alice'),
        (error: unknown) =>
          error instanceof ContentFundingCanonicalizationError &&
          error.code === 'invalid_channel_id',
      );

      assert.throws(
        () => buildCanonicalContentId('youtube:channel:UCuAXFkgsw1L7xaCfnd5JJOw', 'bad!'),
        (error: unknown) =>
          error instanceof ContentFundingCanonicalizationError &&
          error.code === 'invalid_content_suffix',
      );
    });
  });
});
