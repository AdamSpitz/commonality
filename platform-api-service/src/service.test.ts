import assert from 'assert';
import {
  encodePacked,
  hexToBytes,
  keccak256,
  recoverMessageAddress,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { hashCanonicalId } from '@commonality/sdk';
import type { PlatformApiServiceConfig } from './config.js';
import { HttpError } from './errors.js';
import { PlatformApiService } from './service.js';
import type {
  ResolvedChannel,
  ResolvedContent,
  TwitterClientLike,
  VerificationPostMatch,
  YouTubeClientLike,
} from './types.js';

const verifierPrivateKey = '0x59c6995e998f97a5a0044966f0945388cf9af40f3c81d1dc0f1d5d5d9ecf594f' as const;
const verifierAddress = privateKeyToAccount(verifierPrivateKey).address;

describe('PlatformApiService', () => {
  it('resolves Substack content client-side without platform credentials', async () => {
    const service = createService();

    const resolved = await service.resolveContent('https://example.substack.com/p/my-post?utm_source=twitter');
    assert.deepStrictEqual(resolved, {
      platform: 'substack',
      channelId: 'substack:example',
      contentSuffix: 'my-post',
      canonicalId: 'substack:example/my-post',
      metadata: {
        publication: 'example',
        slug: 'my-post',
      },
    });
  });

  it('caches Twitter channel lookups', async () => {
    let callCount = 0;
    const twitterClient = createTwitterClient({
      resolveChannel: async () => {
        callCount += 1;
        return {
          platform: 'twitter',
          channelId: 'twitter:uid:12345678',
          handle: '@alice',
          displayName: 'Alice',
        };
      },
    });

    const service = createService({ twitterClient });
    const first = await service.resolveChannel('twitter', '@alice');
    const second = await service.resolveChannel('twitter', 'alice');

    assert.strictEqual(callCount, 1);
    assert.deepStrictEqual(first, second);
  });

  it('reuses the latest resolved handle for cached aliases on the same channel', async () => {
    let callCount = 0;
    const twitterClient = createTwitterClient({
      resolveChannel: async (input) => {
        callCount += 1;

        if (input === '@alice') {
          return {
            platform: 'twitter',
            channelId: 'twitter:uid:12345678',
            handle: '@alice',
            displayName: 'Alice',
          };
        }

        if (input === '@alice_new') {
          return {
            platform: 'twitter',
            channelId: 'twitter:uid:12345678',
            handle: '@alice_new',
            displayName: 'Alice Renamed',
          };
        }

        throw new Error(`Unexpected handle lookup: ${input}`);
      },
    });

    const service = createService({ twitterClient });

    const original = await service.resolveChannel('twitter', '@alice');
    const renamed = await service.resolveChannel('twitter', '@alice_new');
    const originalAfterRename = await service.resolveChannel('twitter', '@alice');

    assert.strictEqual(callCount, 2);
    assert.deepStrictEqual(original, {
      platform: 'twitter',
      channelId: 'twitter:uid:12345678',
      handle: '@alice',
      displayName: 'Alice',
    });
    assert.deepStrictEqual(renamed, {
      platform: 'twitter',
      channelId: 'twitter:uid:12345678',
      handle: '@alice_new',
      displayName: 'Alice Renamed',
    });
    assert.deepStrictEqual(originalAfterRename, renamed);
  });

  it('creates a verification challenge and signs a recoverable proof', async () => {
    let observedChallengeCode = '';
    const twitterClient = createTwitterClient({
      findVerificationPost: async (_channelId, challengeCode) => {
        observedChallengeCode = challengeCode;
        return {
          id: 'tweet-1',
          text: `Claiming my funded content #commonality-${challengeCode}`,
        };
      },
    });

    const service = createService({
      twitterClient,
      createChallengeCode: () => 'abc123def456',
      now: () => 1_700_000_000_000,
    });

    const challenge = await service.createVerificationChallenge({
      platform: 'twitter',
      handle: '@alice',
      claimantAddress: '0x1234567890123456789012345678901234567890',
    });

    assert.strictEqual(challenge.challengeCode, 'abc123def456');
    assert.ok(challenge.tweetTemplate.includes('#commonality-abc123def456'));

    const confirmed = await service.confirmVerification({ nonce: challenge.nonce });
    assert.strictEqual(observedChallengeCode, 'abc123def456');
    assert.strictEqual(confirmed.observedPostId, 'tweet-1');
    assert.strictEqual(confirmed.proof.channelId, 'twitter:uid:12345678');
    assert.strictEqual(confirmed.proof.claimant, '0x1234567890123456789012345678901234567890');

    const digest = keccak256(encodePacked(
      ['bytes32', 'address', 'bytes32', 'uint256'],
      [
        hashCanonicalId(confirmed.proof.channelId),
        confirmed.proof.claimant,
        confirmed.proof.nonce,
        BigInt(confirmed.proof.deadline),
      ],
    ));
    const recovered = await recoverMessageAddress({
      message: {
        raw: hexToBytes(digest),
      },
      signature: confirmed.proof.verifierSignature,
    });

    assert.strictEqual(recovered.toLowerCase(), verifierAddress.toLowerCase());
  });

  it('returns a clear error when the verification post is not found', async () => {
    const service = createService({
      createChallengeCode: () => 'abc123def456',
      now: () => 1_700_000_000_000,
    });

    const challenge = await service.createVerificationChallenge({
      platform: 'twitter',
      handle: '@alice',
      claimantAddress: '0x1234567890123456789012345678901234567890',
    });

    await assert.rejects(
      () => service.confirmVerification({ nonce: challenge.nonce }),
      (error: unknown) =>
        error instanceof HttpError &&
        error.status === 404 &&
        error.code === 'verification_post_not_found',
    );
  });
});

function createService(overrides: Partial<{
  twitterClient: TwitterClientLike;
  youtubeClient: YouTubeClientLike;
  createChallengeCode: () => string;
  now: () => number;
}> = {}) {
  const config: PlatformApiServiceConfig = {
    port: 3001,
    commonalityTwitterHandle: '@commonality',
    claimPageBaseUrl: 'https://commonality.example',
    xApiBearerToken: 'token',
    xApiBaseUrl: 'https://api.x.com',
    youtubeApiKey: 'key',
    youtubeApiBaseUrl: 'https://www.googleapis.com/youtube/v3',
    verifierPrivateKey,
    ethereumRpcUrl: undefined,
    channelRegistryAddress: undefined,
    submitVerificationTx: false,
    challengeTtlSeconds: 1800,
    contentCacheTtlSeconds: 3600,
    resolveRateLimitWindowMs: 60_000,
    resolveRateLimitMaxRequests: 60,
    verifyRateLimitWindowMs: 60_000,
    verifyRateLimitMaxRequests: 5,
  };

  return new PlatformApiService({
    config,
    twitterClient: overrides.twitterClient ?? createTwitterClient(),
    youtubeClient: overrides.youtubeClient ?? createYouTubeClient(),
    createChallengeCode: overrides.createChallengeCode,
    now: overrides.now,
  });
}

function createTwitterClient(overrides: Partial<{
  resolveChannel: (input: string) => Promise<ResolvedChannel>;
  resolveContent: (url: string) => Promise<ResolvedContent>;
  findVerificationPost: (
    channelId: string,
    challengeCode: string,
    issuedAfterMs: number,
  ) => Promise<VerificationPostMatch | null>;
}> = {}): TwitterClientLike {
  return {
    isConfigured: () => true,
    normalizeLookupInput: (input: string) => input.trim().replace(/^@/, '').toLowerCase(),
    resolveChannel: overrides.resolveChannel ?? (async () => ({
      platform: 'twitter',
      channelId: 'twitter:uid:12345678',
      handle: '@alice',
      displayName: 'Alice',
    })),
    resolveContent: overrides.resolveContent ?? (async () => ({
      platform: 'twitter',
      channelId: 'twitter:uid:12345678',
      contentSuffix: '18347',
      canonicalId: 'twitter:uid:12345678:18347',
      metadata: {},
    })),
    findVerificationPost: overrides.findVerificationPost ?? (async () => null),
  };
}

function createYouTubeClient(): YouTubeClientLike {
  return {
    isConfigured: () => true,
    normalizeLookupInput: (input: string) => input.trim().toLowerCase(),
    resolveChannel: async () => ({
      platform: 'youtube',
      channelId: 'youtube:channel:UCuAXFkgsw1L7xaCfnd5JJOw',
      handle: '@alice',
      displayName: 'Alice Videos',
    }),
    resolveContent: async () => ({
      platform: 'youtube',
      channelId: 'youtube:channel:UCuAXFkgsw1L7xaCfnd5JJOw',
      contentSuffix: 'dQw4w9WgXcQ',
      canonicalId: 'youtube:channel:UCuAXFkgsw1L7xaCfnd5JJOw:dQw4w9WgXcQ',
      metadata: {},
    }),
  };
}
