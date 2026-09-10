import assert from 'assert';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { recoverTypedDataAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { hashCanonicalId } from '@commonality/sdk/content-funding';
import type { PlatformApiServiceConfig } from './config.js';
import { HttpError } from './errors.js';
import { PlatformApiService } from './service.js';
import { FileContentSubmissionStore, type ContentSubmissionStore } from './submissions.js';
import type {
  LocalContentContext,
  LocalContentContextRequest,
  ResolvedChannel,
  ResolvedContent,
  TwitterClientLike,
  VerificationPostMatch,
  YouTubeClientLike,
} from './types.js';

const verifierPrivateKey = '0x59c6995e998f97a5a0044966f0945388cf9af40f3c81d1dc0f1d5d5d9ecf594f' as const;
const verifierAddress = privateKeyToAccount(verifierPrivateKey).address;
const testBeneficiaryVerifierAddress = '0x000000000000000000000000000000000000c0de' as const;
const testChainId = 31337;
const VALID_STATEMENT_CID = 'bafybeidagx4zc6phhtjng6f3sjzlicqm2ssq4eb6wskinjtuvkt275fmpy' as const;

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
          followerCount: 42,
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
            followerCount: 42,
          };
        }

        if (input === '@alice_new') {
          return {
            platform: 'twitter',
            channelId: 'twitter:uid:12345678',
            handle: '@alice_new',
            displayName: 'Alice Renamed',
            followerCount: 84,
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
      followerCount: 42,
    });
    assert.deepStrictEqual(renamed, {
      platform: 'twitter',
      channelId: 'twitter:uid:12345678',
      handle: '@alice_new',
      displayName: 'Alice Renamed',
      followerCount: 84,
    });
    assert.deepStrictEqual(originalAfterRename, renamed);
  });

  it('caches YouTube channel lookups', async () => {
    let callCount = 0;
    const youtubeClient = createYouTubeClient({
      resolveChannel: async () => {
        callCount += 1;
        return {
          platform: 'youtube',
          channelId: 'youtube:channel:UCuAXFkgsw1L7xaCfnd5JJOw',
          handle: '@alicevideos',
          displayName: 'Alice Videos',
        };
      },
    });

    const service = createService({ youtubeClient });
    const first = await service.resolveChannel('youtube', '@AliceVideos');
    const second = await service.resolveChannel('youtube', '@alicevideos');

    assert.strictEqual(callCount, 1);
    assert.deepStrictEqual(first, second);
  });

  it('caches Twitter content lookups by tweet ID', async () => {
    let callCount = 0;
    const twitterClient = createTwitterClient({
      resolveContent: async () => {
        callCount += 1;
        return {
          platform: 'twitter',
          channelId: 'twitter:uid:12345678',
          contentSuffix: '18347',
          canonicalId: 'twitter:uid:12345678:18347',
          metadata: {
            authorHandle: '@alice',
          },
        };
      },
    });

    const service = createService({ twitterClient });
    const first = await service.resolveContent('https://x.com/alice/status/18347?s=20');
    const second = await service.resolveContent('https://twitter.com/alice/status/18347');

    assert.strictEqual(callCount, 1);
    assert.deepStrictEqual(first, second);
  });

  it('caches YouTube content lookups by video ID', async () => {
    let callCount = 0;
    const youtubeClient = createYouTubeClient({
      resolveContent: async () => {
        callCount += 1;
        return {
          platform: 'youtube',
          channelId: 'youtube:channel:UCuAXFkgsw1L7xaCfnd5JJOw',
          contentSuffix: 'dQw4w9WgXcQ',
          canonicalId: 'youtube:channel:UCuAXFkgsw1L7xaCfnd5JJOw:dQw4w9WgXcQ',
          metadata: {
            title: 'Never Gonna Give You Up',
          },
        };
      },
    });

    const service = createService({ youtubeClient });
    const first = await service.resolveContent('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s');
    const second = await service.resolveContent('https://youtu.be/dQw4w9WgXcQ');

    assert.strictEqual(callCount, 1);
    assert.deepStrictEqual(first, second);
  });

  it('delegates Twitter local-context lookup to the platform client', async () => {
    let observedRequest: LocalContentContextRequest | undefined;
    const localContext: LocalContentContext = {
      target: {
        platform: 'twitter',
        canonicalId: 'twitter:uid:12345678:18347',
        channelId: 'twitter:uid:12345678',
        relationship: 'target',
        text: 'Target post',
      },
      parentPosts: [
        {
          platform: 'twitter',
          canonicalId: 'twitter:uid:12345678:18346',
          channelId: 'twitter:uid:12345678',
          relationship: 'parent_post',
          text: 'Parent post',
        },
      ],
      quotedPosts: [],
      thread: [],
      replies: [],
      authorRecentPosts: [],
    };
    const twitterClient = createTwitterClient({
      getLocalContentContext: async (request) => {
        observedRequest = request;
        return localContext;
      },
    });
    const service = createService({ twitterClient });

    const result = await service.getLocalContentContext({
      url: 'https://x.com/alice/status/18347',
      authorRecentLimit: 5,
    });

    assert.deepStrictEqual(result, localContext);
    assert.deepStrictEqual(observedRequest, {
      url: 'https://x.com/alice/status/18347',
      authorRecentLimit: 5,
    });
  });

  it('delegates Twitter local-context lookup by canonical ID to the platform client', async () => {
    let observedRequest: LocalContentContextRequest | undefined;
    const twitterClient = createTwitterClient({
      getLocalContentContext: async (request) => {
        observedRequest = request;
        return {
          target: {
            platform: 'twitter',
            canonicalId: 'twitter:uid:12345678:18347',
            channelId: 'twitter:uid:12345678',
            relationship: 'target',
            text: 'Target post',
          },
          parentPosts: [],
          quotedPosts: [],
          thread: [],
          replies: [],
          authorRecentPosts: [],
        };
      },
    });
    const service = createService({ twitterClient });

    await service.getLocalContentContext({
      canonicalId: 'twitter:uid:12345678:18347',
      authorRecentLimit: 5,
    });

    assert.deepStrictEqual(observedRequest, {
      canonicalId: 'twitter:uid:12345678:18347',
      authorRecentLimit: 5,
    });
  });

  it('returns a minimal local context for Substack content', async () => {
    const service = createService();

    const context = await service.getLocalContentContext({
      url: 'https://example.substack.com/p/my-post',
    });

    assert.deepStrictEqual(context, {
      target: {
        platform: 'substack',
        canonicalId: 'substack:example/my-post',
        channelId: 'substack:example',
        relationship: 'target',
      },
      parentPosts: [],
      quotedPosts: [],
      thread: [],
      replies: [],
      authorRecentPosts: [],
    });
  });

  it('returns a minimal local context for Substack canonical IDs', async () => {
    const service = createService();

    const context = await service.getLocalContentContext({
      canonicalId: 'substack:example/my-post',
    });

    assert.deepStrictEqual(context.target, {
      platform: 'substack',
      canonicalId: 'substack:example/my-post',
      channelId: 'substack:example',
      relationship: 'target',
    });
  });

  it('rejects unsupported channel-resolution platforms', async () => {
    const service = createService();

    await assert.rejects(
      () => service.resolveChannel('substack', '@alice'),
      (error: unknown) =>
        error instanceof HttpError &&
        error.status === 400 &&
        error.code === 'invalid_request' &&
        error.message === 'resolve/channel currently supports only twitter and youtube',
    );
  });

  it('returns clear errors when channel resolution providers are unconfigured', async () => {
    const twitterUnavailable = createService({
      twitterClient: createTwitterClient({
        isConfigured: () => false,
      }),
    });
    const youtubeUnavailable = createService({
      youtubeClient: createYouTubeClient({
        isConfigured: () => false,
      }),
    });

    await assert.rejects(
      () => twitterUnavailable.resolveChannel('twitter', '@alice'),
      (error: unknown) =>
        error instanceof HttpError &&
        error.status === 503 &&
        error.code === 'service_unavailable' &&
        error.message === 'twitter channel resolution is unavailable because the platform API credentials are not configured',
    );

    await assert.rejects(
      () => youtubeUnavailable.resolveChannel('youtube', '@alice'),
      (error: unknown) =>
        error instanceof HttpError &&
        error.status === 503 &&
        error.code === 'service_unavailable' &&
        error.message === 'youtube channel resolution is unavailable because the platform API credentials are not configured',
    );
  });

  it('returns clear errors when content-validation providers are unconfigured', async () => {
    const twitterUnavailable = createService({
      twitterClient: createTwitterClient({
        isConfigured: () => false,
      }),
    });
    const youtubeUnavailable = createService({
      youtubeClient: createYouTubeClient({
        isConfigured: () => false,
      }),
    });

    await assert.rejects(
      () => twitterUnavailable.resolveContent('https://x.com/alice/status/18347'),
      (error: unknown) =>
        error instanceof HttpError &&
        error.status === 503 &&
        error.code === 'service_unavailable' &&
        error.message === 'Twitter content validation is unavailable because X_API_BEARER_TOKEN is not set',
    );

    await assert.rejects(
      () => youtubeUnavailable.resolveContent('https://youtu.be/dQw4w9WgXcQ'),
      (error: unknown) =>
        error instanceof HttpError &&
        error.status === 503 &&
        error.code === 'service_unavailable' &&
        error.message === 'YouTube content validation is unavailable because YOUTUBE_API_KEY is not set',
    );
  });

  it('rejects invalid verification challenge inputs before calling providers', async () => {
    const service = createService();

    await assert.rejects(
      () => service.createVerificationChallenge({
        platform: 'mastodon',
        handle: '@alice',
        claimantAddress: '0x1234567890123456789012345678901234567890',
      }),
      (error: unknown) =>
        error instanceof HttpError &&
        error.status === 400 &&
        error.code === 'invalid_request' &&
        error.message === 'verify/challenge currently supports only twitter, youtube, substack, and dns',
    );

    await assert.rejects(
      () => service.createVerificationChallenge({
        platform: 'twitter',
        handle: '@alice',
        claimantAddress: 'not-an-address',
      }),
      (error: unknown) =>
        error instanceof HttpError &&
        error.status === 400 &&
        error.code === 'invalid_request' &&
        error.message === 'Invalid claimant address: not-an-address',
    );
  });

  it('rejects blocked platform identities before issuing a verification challenge', async () => {
    const service = createService({
      configOverrides: { blockedChannelIds: ['twitter:uid:12345678'] },
    });

    await assert.rejects(
      () => service.createVerificationChallenge({
        platform: 'twitter',
        handle: '@alice',
        claimantAddress: '0x1234567890123456789012345678901234567890',
      }),
      (error: unknown) =>
        error instanceof HttpError &&
        error.status === 403 &&
        error.code === 'blocked_identity',
    );
  });

  it('rejects a blocked website identity at resolve time', async () => {
    const service = createService({
      configOverrides: { blockedChannelIds: ['dns:example.org'] },
    });

    await assert.rejects(
      () => service.resolveWebsiteBeneficiary('https://www.example.org/'),
      (error: unknown) =>
        error instanceof HttpError &&
        error.status === 403 &&
        error.code === 'blocked_identity',
    );
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
    assert.ok(challenge.verificationPostTemplate.includes('#commonality-abc123def456'));

    const confirmed = await service.confirmVerification({ nonce: challenge.nonce });
    assert.strictEqual(observedChallengeCode, 'abc123def456');
    assert.strictEqual(confirmed.observedPostId, 'tweet-1');
    assert.strictEqual(confirmed.proof.beneficiaryId, 'twitter:uid:12345678');
    assert.strictEqual(confirmed.proof.claimant, '0x1234567890123456789012345678901234567890');

    const recovered = await recoverTypedDataAddress({
      domain: {
        name: 'BeneficiaryVerifier',
        version: '1',
        chainId: testChainId,
        verifyingContract: testBeneficiaryVerifierAddress,
      },
      types: {
        BeneficiaryClaim: [
          { name: 'beneficiaryId', type: 'bytes32' },
          { name: 'namespaceHash', type: 'bytes32' },
          { name: 'claimant', type: 'address' },
          { name: 'nonce', type: 'bytes32' },
          { name: 'deadline', type: 'uint256' },
          { name: 'proofHash', type: 'bytes32' },
        ],
      },
      primaryType: 'BeneficiaryClaim',
      message: {
        beneficiaryId: hashCanonicalId(confirmed.proof.beneficiaryId),
        namespaceHash: `0x${'00'.repeat(32)}`,
        claimant: confirmed.proof.claimant,
        nonce: confirmed.proof.nonce,
        deadline: BigInt(confirmed.proof.deadline),
        proofHash: confirmed.proof.proofHash,
      },
      signature: confirmed.proof.verifierSignature,
    });

    assert.strictEqual(recovered.toLowerCase(), verifierAddress.toLowerCase());
  });

  it('creates a Substack verification challenge without platform credentials', async () => {
    const service = createService({
      configOverrides: {
        challengeTtlSeconds: 1800,
      },
      now: () => 1_700_000_000_000,
      createChallengeCode: () => 'abc123def456',
    });

    const challenge = await service.createVerificationChallenge({
      platform: 'substack',
      handle: 'Example',
      claimantAddress: '0x1234567890123456789012345678901234567890',
    });

    assert.strictEqual(challenge.beneficiaryId, 'substack:example');
    assert.strictEqual(challenge.handle, 'example');
    assert.strictEqual(challenge.displayName, 'example');
    assert.ok(challenge.verificationPostTemplate.includes('#commonality-abc123def456'));
    assert.strictEqual(challenge.deadline, 1_700_003_600);
  });

  it('creates and confirms a domain-control challenge from the well-known document', async () => {
    let publishedDocument = '';
    const service = createService({
      now: () => 1_700_000_000_000,
      createChallengeCode: () => 'abc123def456',
      configOverrides: {
        beneficiaryRegistryAddress: '0x9876543210987654321098765432109876543210',
      },
      fetch: async (input) => {
        assert.strictEqual(String(input), 'https://example.org/.well-known/commonality-claim.json');
        return new Response(publishedDocument, {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    });

    const challenge = await service.createVerificationChallenge({
      platform: 'dns',
      handle: 'https://www.Example.org/',
      claimantAddress: '0x1234567890123456789012345678901234567890',
    });

    assert.strictEqual(challenge.beneficiaryId, 'dns:example.org');
    assert.strictEqual(challenge.handle, 'example.org');
    publishedDocument = challenge.verificationPostTemplate;

    const confirmed = await service.confirmVerification({ nonce: challenge.nonce });
    assert.strictEqual(confirmed.proof.beneficiaryId, 'dns:example.org');
    assert.strictEqual(
      confirmed.observedPostId,
      'https://example.org/.well-known/commonality-claim.json',
    );
  });

  it('confirms a domain-control challenge from a TXT record when well-known is missing', async () => {
    let publishedDocument = '';
    const service = createService({
      configOverrides: {
        beneficiaryRegistryAddress: '0x9876543210987654321098765432109876543210',
      },
      fetch: async () => new Response('', { status: 404 }),
      lookupTxt: async (name) => {
        assert.strictEqual(name, '_commonality.example.org');
        return [publishedDocument.trim()];
      },
    });

    const challenge = await service.createVerificationChallenge({
      platform: 'dns',
      handle: 'example.org',
      claimantAddress: '0x1234567890123456789012345678901234567890',
    });
    publishedDocument = challenge.verificationPostTemplate;

    const confirmed = await service.confirmVerification({ nonce: challenge.nonce });
    assert.strictEqual(confirmed.proof.beneficiaryId, 'dns:example.org');
    assert.strictEqual(confirmed.observedPostId, 'dns-txt:_commonality.example.org');
  });

  it('prefers the well-known document over TXT', async () => {
    let publishedDocument = '';
    let txtLookups = 0;
    const service = createService({
      configOverrides: {
        beneficiaryRegistryAddress: '0x9876543210987654321098765432109876543210',
      },
      fetch: async () => new Response(publishedDocument, {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
      lookupTxt: async () => {
        txtLookups += 1;
        return [];
      },
    });

    const challenge = await service.createVerificationChallenge({
      platform: 'dns',
      handle: 'example.org',
      claimantAddress: '0x1234567890123456789012345678901234567890',
    });
    publishedDocument = challenge.verificationPostTemplate;

    const confirmed = await service.confirmVerification({ nonce: challenge.nonce });
    assert.strictEqual(
      confirmed.observedPostId,
      'https://example.org/.well-known/commonality-claim.json',
    );
    assert.strictEqual(txtLookups, 0);
  });

  it('rejects non-registrable and path-scoped domain beneficiaries', async () => {
    const service = createService({
      configOverrides: {
        beneficiaryRegistryAddress: '0x9876543210987654321098765432109876543210',
      },
    });

    for (const handle of ['co.uk', 'https://example.org/a-project']) {
      await assert.rejects(
        () => service.createVerificationChallenge({
          platform: 'dns',
          handle,
          claimantAddress: '0x1234567890123456789012345678901234567890',
        }),
        (error: unknown) => error instanceof HttpError && error.status === 400,
      );
    }
  });

  it('resolves a website beneficiary and refuses create-time cross-domain redirects', async () => {
    const service = createService({
      fetch: async (input) => {
        const url = String(input);
        const response = new Response('', { status: 200 });
        Object.defineProperty(response, 'url', {
          value: url.includes('example.org')
            ? 'https://www.example.org/'
            : 'https://attacker.example/',
        });
        return response;
      },
    });

    const resolved = await service.resolveWebsiteBeneficiary('https://www.Example.org/');
    assert.deepStrictEqual(resolved, {
      namespace: 'dns',
      canonicalIdentifier: 'example.org',
      reachable: true,
    });

    await assert.rejects(
      () => service.resolveWebsiteBeneficiary('redcross.org'),
      (error: unknown) =>
        error instanceof HttpError &&
        error.status === 400 &&
        error.code === 'invalid_domain_redirect',
    );
  });

  it('treats an unreachable website as unconfirmed rather than a redirect', async () => {
    const service = createService({
      fetch: async () => {
        throw new Error('network down');
      },
    });

    const resolved = await service.resolveWebsiteBeneficiary('example.org');
    assert.deepStrictEqual(resolved, {
      namespace: 'dns',
      canonicalIdentifier: 'example.org',
      reachable: false,
    });
  });

  it('rejects domain claims redirected outside the claimed registrable domain', async () => {
    let publishedDocument = '';
    const service = createService({
      configOverrides: {
        beneficiaryRegistryAddress: '0x9876543210987654321098765432109876543210',
      },
      fetch: async () => {
        const response = new Response(publishedDocument, { status: 200 });
        Object.defineProperty(response, 'url', {
          value: 'https://attacker.example/.well-known/commonality-claim.json',
        });
        return response;
      },
    });
    const challenge = await service.createVerificationChallenge({
      platform: 'dns',
      handle: 'example.org',
      claimantAddress: '0x1234567890123456789012345678901234567890',
    });
    publishedDocument = challenge.verificationPostTemplate;

    await assert.rejects(
      () => service.confirmVerification({ nonce: challenge.nonce }),
      (error: unknown) =>
        error instanceof HttpError &&
        error.status === 400 &&
        error.code === 'invalid_domain_redirect',
    );
  });

  it('queues and lists content submissions', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'commonality-platform-api-'));
    const filePath = join(tempDir, 'submissions.json');
    const service = createService({
      contentSubmissionStore: new FileContentSubmissionStore(filePath),
    });

    try {
      const created = await service.submitContent({
        contentUrl: 'https://x.com/alice/status/18347',
        statementCid: VALID_STATEMENT_CID,
        declaredPerspective: 'supportive',
      });

      assert.deepStrictEqual(created, {
        contentUrl: 'https://x.com/alice/status/18347',
        statementCid: VALID_STATEMENT_CID,
        declaredPerspective: 'supportive',
      });

      assert.deepStrictEqual(await service.listContentSubmissions(), [created]);

      const written = JSON.parse(await readFile(filePath, 'utf-8')) as unknown;
      assert.deepStrictEqual(written, [created]);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('deduplicates identical content submissions', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'commonality-platform-api-'));
    const service = createService({
      contentSubmissionStore: new FileContentSubmissionStore(join(tempDir, 'submissions.json')),
    });

    try {
      const submission = {
        contentUrl: 'https://x.com/alice/status/18347',
        statementCid: VALID_STATEMENT_CID,
      };

      await service.submitContent(submission);

      await assert.rejects(
        () => service.submitContent(submission),
        (error: unknown) =>
          error instanceof HttpError &&
          error.status === 409 &&
          error.code === 'content_submission_exists' &&
          error.message === 'This content submission is already queued',
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('confirms Substack verification from the RSS feed', async () => {
    const observedUrls: string[] = [];
    const feedXml = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
        <channel>
          <item>
            <title>Verification post</title>
            <guid>post-1</guid>
            <pubDate>Tue, 14 Nov 2023 22:30:00 GMT</pubDate>
            <description><![CDATA[Claiming my funded content #commonality-abc123def456]]></description>
          </item>
        </channel>
      </rss>`;
    const service = createService({
      createChallengeCode: () => 'abc123def456',
      now: () => 1_700_000_000_000,
      fetch: async (input) => {
        observedUrls.push(String(input));
        return new Response(feedXml, {
          status: 200,
          headers: {
            'content-type': 'application/rss+xml',
          },
        });
      },
    });

    const challenge = await service.createVerificationChallenge({
      platform: 'substack',
      handle: 'example',
      claimantAddress: '0x1234567890123456789012345678901234567890',
    });

    const confirmed = await service.confirmVerification({ nonce: challenge.nonce });
    assert.deepStrictEqual(observedUrls, ['https://example.substack.com/feed']);
    assert.strictEqual(confirmed.observedPostId, 'post-1');
    assert.strictEqual(confirmed.proof.beneficiaryId, 'substack:example');
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

  it('returns a clear error when the Substack RSS feed does not contain the nonce yet', async () => {
    const service = createService({
      createChallengeCode: () => 'abc123def456',
      now: () => 1_700_000_000_000,
      fetch: async () => new Response(`<?xml version="1.0"?><rss><channel><item><guid>post-1</guid><description>No nonce here</description></item></channel></rss>`, {
        status: 200,
        headers: {
          'content-type': 'application/rss+xml',
        },
      }),
    });

    const challenge = await service.createVerificationChallenge({
      platform: 'substack',
      handle: 'example',
      claimantAddress: '0x1234567890123456789012345678901234567890',
    });

    await assert.rejects(
      () => service.confirmVerification({ nonce: challenge.nonce }),
      (error: unknown) =>
        error instanceof HttpError &&
        error.status === 404 &&
        error.code === 'verification_post_not_found' &&
        error.message === 'Verification post not found yet; try again after publishing the Substack post and waiting for the RSS feed to update',
    );
  });

  it('rejects invalid verification confirmation inputs', async () => {
    const invalidNonceService = createService();
    const missingVerifierKeyService = createService({
      configOverrides: {
        verifierPrivateKey: undefined,
      },
    });

    await assert.rejects(
      () => invalidNonceService.confirmVerification({ nonce: 'bad-nonce' }),
      (error: unknown) =>
        error instanceof HttpError &&
        error.status === 400 &&
        error.code === 'invalid_request' &&
        error.message === 'Invalid nonce: bad-nonce',
    );

    await assert.rejects(
      () => missingVerifierKeyService.confirmVerification({
        nonce: '0x1111111111111111111111111111111111111111111111111111111111111111',
      }),
      (error: unknown) =>
        error instanceof HttpError &&
        error.status === 503 &&
        error.code === 'service_unavailable' &&
        error.message === 'Verification confirmation is unavailable because VERIFIER_PRIVATE_KEY, BENEFICIARY_VERIFIER_ADDRESS, and CHAIN_ID must all be set',
    );
  });
});

function createService(overrides: Partial<{
  configOverrides: Partial<PlatformApiServiceConfig>;
  twitterClient: TwitterClientLike;
  youtubeClient: YouTubeClientLike;
  contentSubmissionStore: ContentSubmissionStore;
  createChallengeCode: () => string;
  now: () => number;
  fetch: typeof fetch;
  lookupTxt: (name: string) => Promise<string[]>;
}> = {}) {
  const config: PlatformApiServiceConfig = {
    port: 3001,
    corsAllowedOrigins: '*',
    commonalityTwitterHandle: '@commonality',
    claimPageBaseUrl: 'https://commonality.example',
    contentSubmissionsFilePath: './platform-api-content-submissions.json',
    xApiBearerToken: 'token',
    xApiBaseUrl: 'https://api.x.com',
    youtubeApiKey: 'key',
    youtubeApiBaseUrl: 'https://www.googleapis.com/youtube/v3',
    verifierPrivateKey,
    ethereumRpcUrl: undefined,
    beneficiaryRegistryAddress: undefined,
    beneficiaryVerifierAddress: testBeneficiaryVerifierAddress,
    chainId: testChainId,
    submitVerificationTx: false,
    challengeTtlSeconds: 1800,
    contentCacheTtlSeconds: 3600,
    resolveRateLimitWindowMs: 60_000,
    resolveRateLimitMaxRequests: 60,
    verifyRateLimitWindowMs: 60_000,
    verifyRateLimitMaxRequests: 5,
    submissionRateLimitWindowMs: 60_000,
    submissionRateLimitMaxRequests: 10,
    onrampRateLimitWindowMs: 60_000,
    onrampRateLimitMaxRequests: 10,
    coinbaseCdpApiKeyId: undefined,
    coinbaseCdpApiKeySecret: undefined,
    baseRpcUrl: undefined,
    blockedChannelIds: [],
    ...overrides.configOverrides,
  };

  return new PlatformApiService({
    config,
    twitterClient: overrides.twitterClient ?? createTwitterClient(),
    youtubeClient: overrides.youtubeClient ?? createYouTubeClient(),
    contentSubmissionStore: overrides.contentSubmissionStore ?? new FileContentSubmissionStore(config.contentSubmissionsFilePath),
    createChallengeCode: overrides.createChallengeCode,
    now: overrides.now,
    fetch: overrides.fetch,
    lookupTxt: overrides.lookupTxt,
  });
}

function createTwitterClient(overrides: Partial<{
  isConfigured: () => boolean;
  normalizeLookupInput: (input: string) => string;
  resolveChannel: (input: string) => Promise<ResolvedChannel>;
  resolveContent: (url: string) => Promise<ResolvedContent>;
  getLocalContentContext: (request: LocalContentContextRequest) => Promise<LocalContentContext>;
  findVerificationPost: (
    channelId: string,
    challengeCode: string,
    issuedAfterMs: number,
  ) => Promise<VerificationPostMatch | null>;
}> = {}): TwitterClientLike {
  return {
    isConfigured: overrides.isConfigured ?? (() => true),
    normalizeLookupInput: overrides.normalizeLookupInput ?? ((input: string) => input.trim().replace(/^@/, '').toLowerCase()),
    resolveChannel: overrides.resolveChannel ?? (async () => ({
      platform: 'twitter',
      channelId: 'twitter:uid:12345678',
      handle: '@alice',
      displayName: 'Alice',
      followerCount: 123,
    })),
    resolveContent: overrides.resolveContent ?? (async () => ({
      platform: 'twitter',
      channelId: 'twitter:uid:12345678',
      contentSuffix: '18347',
      canonicalId: 'twitter:uid:12345678:18347',
      metadata: {},
    })),
    getLocalContentContext: overrides.getLocalContentContext ?? (async () => ({
      target: {
        platform: 'twitter',
        canonicalId: 'twitter:uid:12345678:18347',
        channelId: 'twitter:uid:12345678',
        relationship: 'target',
      },
      parentPosts: [],
      quotedPosts: [],
      thread: [],
      replies: [],
      authorRecentPosts: [],
    })),
    findVerificationPost: overrides.findVerificationPost ?? (async () => null),
  };
}

function createYouTubeClient(overrides: Partial<{
  isConfigured: () => boolean;
  normalizeLookupInput: (input: string) => string;
  resolveChannel: (input: string) => Promise<ResolvedChannel>;
  resolveContent: (url: string) => Promise<ResolvedContent>;
  getLocalContentContext: (request: LocalContentContextRequest) => Promise<LocalContentContext>;
  findVerificationPost: (channelId: string, challengeCode: string, issuedAfterMs: number) => Promise<{
    id: string;
    text: string;
    createdAt?: string;
  } | null>;
}> = {}): YouTubeClientLike {
  return {
    isConfigured: overrides.isConfigured ?? (() => true),
    normalizeLookupInput: overrides.normalizeLookupInput ?? ((input: string) => input.trim().toLowerCase()),
    resolveChannel: overrides.resolveChannel ?? (async () => ({
      platform: 'youtube',
      channelId: 'youtube:channel:UCuAXFkgsw1L7xaCfnd5JJOw',
      handle: '@alice',
      displayName: 'Alice Videos',
    })),
    resolveContent: overrides.resolveContent ?? (async () => ({
      platform: 'youtube',
      channelId: 'youtube:channel:UCuAXFkgsw1L7xaCfnd5JJOw',
      contentSuffix: 'dQw4w9WgXcQ',
      canonicalId: 'youtube:channel:UCuAXFkgsw1L7xaCfnd5JJOw:dQw4w9WgXcQ',
      metadata: {},
    })),
    getLocalContentContext: overrides.getLocalContentContext ?? (async () => ({
      target: {
        platform: 'youtube',
        canonicalId: 'youtube:channel:UCuAXFkgsw1L7xaCfnd5JJOw:dQw4w9WgXcQ',
        channelId: 'youtube:channel:UCuAXFkgsw1L7xaCfnd5JJOw',
        relationship: 'target',
      },
      parentPosts: [],
      quotedPosts: [],
      thread: [],
      replies: [],
      authorRecentPosts: [],
    })),
    findVerificationPost: overrides.findVerificationPost ?? (async () => null),
  };
}
