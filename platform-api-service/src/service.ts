import { randomBytes } from 'crypto';
import { buildCanonicalChannelId, buildCanonicalContentId, hashCanonicalId, parseContentFundingUrl, type ParsedContentFundingUrl } from '@commonality/sdk/content-funding';
import type { IpfsCidV1 } from '@commonality/sdk/utils';
import {
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  keccak256,
  stringToBytes,
  type Address,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { MemoryCache } from './cache.js';
import type { PlatformApiServiceConfig } from './config.js';
import { HttpError } from './errors.js';
import { createCoinbaseOnrampSession, getBaseUsdcBalance } from './onramp.js';
import type { ContentSubmissionStore } from './submissions.js';
import type {
  LocalContentContext,
  LocalContentContextRequest,
  PendingVerificationChallenge,
  ResolvedChannel,
  ResolvedContent,
  SubstackVerificationPostLookup,
  TwitterClientLike,
  VerificationConfirmation,
  VerificationPostMatch,
  YouTubeClientLike,
} from './types.js';

const channelRegistryAbi = [
  {
    type: 'function',
    name: 'verifyChannel',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'channelId', type: 'bytes32' },
      { name: 'claimant', type: 'address' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'deadline', type: 'uint256' },
      { name: 'proofHash', type: 'bytes32' },
      { name: 'verifierSignature', type: 'bytes' },
    ],
    outputs: [],
  },
] as const;

export interface PlatformApiServiceDependencies {
  config: PlatformApiServiceConfig;
  twitterClient: TwitterClientLike;
  youtubeClient: YouTubeClientLike;
  contentSubmissionStore: ContentSubmissionStore;
  now?: () => number;
  createChallengeCode?: () => string;
  fetch?: typeof fetch;
}

export class PlatformApiService {
  private readonly channelCache = new MemoryCache<ResolvedChannel>();
  private readonly contentCache: MemoryCache<ResolvedContent>;
  private readonly challengeCache: MemoryCache<PendingVerificationChallenge>;
  private readonly now: () => number;
  private readonly createChallengeCode: () => string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly deps: PlatformApiServiceDependencies) {
    this.contentCache = new MemoryCache(deps.config.contentCacheTtlSeconds * 1000);
    this.challengeCache = new MemoryCache(deps.config.challengeTtlSeconds * 1000);
    this.now = deps.now ?? (() => Date.now());
    this.createChallengeCode = deps.createChallengeCode ?? (() => randomBytes(6).toString('hex'));
    this.fetchImpl = deps.fetch ?? fetch;
  }

  async resolveChannel(platform: string, handle: string): Promise<ResolvedChannel> {
    if (platform === 'twitter') {
      return await this.resolveChannelWithCache(
        'twitter',
        handle,
        this.deps.twitterClient.normalizeLookupInput.bind(this.deps.twitterClient),
        this.deps.twitterClient.resolveChannel.bind(this.deps.twitterClient),
        this.deps.twitterClient.isConfigured.bind(this.deps.twitterClient),
      );
    }

    if (platform === 'youtube') {
      return await this.resolveChannelWithCache(
        'youtube',
        handle,
        this.deps.youtubeClient.normalizeLookupInput.bind(this.deps.youtubeClient),
        this.deps.youtubeClient.resolveChannel.bind(this.deps.youtubeClient),
        this.deps.youtubeClient.isConfigured.bind(this.deps.youtubeClient),
      );
    }

    throw new HttpError(
      400,
      'invalid_request',
      'resolve/channel currently supports only twitter and youtube',
    );
  }

  async resolveContent(url: string): Promise<ResolvedContent> {
    const parsed = parseContentFundingUrl(url);
    const cacheKey = this.getContentCacheKey(parsed);
    const cached = this.contentCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    let resolved: ResolvedContent;
    switch (parsed.platform) {
      case 'twitter':
        if (!this.deps.twitterClient.isConfigured()) {
          throw new HttpError(
            503,
            'service_unavailable',
            'Twitter content validation is unavailable because X_API_BEARER_TOKEN is not set',
          );
        }
        resolved = await this.deps.twitterClient.resolveContent(url);
        break;
      case 'youtube':
        if (!this.deps.youtubeClient.isConfigured()) {
          throw new HttpError(
            503,
            'service_unavailable',
            'YouTube content validation is unavailable because YOUTUBE_API_KEY is not set',
          );
        }
        resolved = await this.deps.youtubeClient.resolveContent(url);
        break;
      case 'substack': {
        const channelId = buildCanonicalChannelId('substack', parsed.publication);
        resolved = {
          platform: 'substack',
          channelId,
          contentSuffix: parsed.slug,
          canonicalId: buildCanonicalContentId(channelId, parsed.slug),
          metadata: {
            publication: parsed.publication,
            slug: parsed.slug,
          },
        };
        break;
      }
    }

    this.contentCache.set(cacheKey, resolved);
    return resolved;
  }

  async getLocalContentContext(request: LocalContentContextRequest): Promise<LocalContentContext> {
    const parsed = request.url
      ? parseContentFundingUrl(request.url)
      : parseCanonicalContentIdForLocalContext(request.canonicalId);

    if (parsed.platform === 'twitter') {
      if (!this.deps.twitterClient.isConfigured()) {
        throw new HttpError(
          503,
          'service_unavailable',
          'Twitter local-context lookup is unavailable because X_API_BEARER_TOKEN is not set',
        );
      }
      return await this.deps.twitterClient.getLocalContentContext(request);
    }

    if (parsed.platform === 'youtube') {
      if (!this.deps.youtubeClient.isConfigured()) {
        throw new HttpError(
          503,
          'service_unavailable',
          'YouTube local-context lookup is unavailable because YOUTUBE_API_KEY is not set',
        );
      }
      return await this.deps.youtubeClient.getLocalContentContext(request);
    }

    const resolved = request.url
      ? await this.resolveContent(request.url)
      : resolveCanonicalContentIdForLocalContext(request.canonicalId);
    return {
      target: {
        platform: resolved.platform,
        canonicalId: resolved.canonicalId,
        channelId: resolved.channelId,
        relationship: 'target',
      },
      parentPosts: [],
      quotedPosts: [],
      thread: [],
      replies: [],
      authorRecentPosts: [],
    };
  }

  async createCoinbaseOnrampSession(request: {
    address: string;
    clientIp?: string;
    presetFiatAmount?: string;
    fiatCurrency?: string;
  }) {
    return await createCoinbaseOnrampSession(
      {
        apiKeyId: this.deps.config.coinbaseCdpApiKeyId,
        apiKeySecret: this.deps.config.coinbaseCdpApiKeySecret,
      },
      request,
      this.fetchImpl,
    );
  }

  async getBaseUsdcBalance(address: string) {
    return await getBaseUsdcBalance({ baseRpcUrl: this.deps.config.baseRpcUrl }, address);
  }

  async createVerificationChallenge(request: {
    platform: string;
    handle: string;
    claimantAddress: string;
  }): Promise<{
    nonce: Hex;
    challengeCode: string;
    channelId: string;
    handle?: string;
    displayName?: string;
    verificationPostTemplate: string;
    deadline: number;
  }> {
    if (
      request.platform !== 'twitter' &&
      request.platform !== 'youtube' &&
      request.platform !== 'substack'
    ) {
      throw new HttpError(
        400,
        'invalid_request',
        'verify/challenge currently supports only twitter, youtube, and substack',
      );
    }

    if (!isAddress(request.claimantAddress)) {
      throw new HttpError(400, 'invalid_request', `Invalid claimant address: ${request.claimantAddress}`);
    }

    const channel = request.platform === 'substack'
      ? resolveSubstackPublication(request.handle)
      : await this.resolveChannel(request.platform, request.handle);

    if ((this.deps.config.blockedChannelIds ?? []).includes(channel.channelId)) {
      throw new HttpError(403, 'blocked_identity', 'This platform identity cannot claim funds through Commonality.');
    }

    const challengeCode = this.createChallengeCode();
    const nonce = keccak256(
      stringToBytes(`commonality:${challengeCode}:${channel.channelId}:${request.claimantAddress.toLowerCase()}`),
    );
    const deadline = Math.floor(this.now() / 1000) + this.getChallengeTtlSeconds(request.platform);
    
    let verificationPostTemplate: string;
    
    if (request.platform === 'twitter') {
      verificationPostTemplate = buildTweetTemplate(
        this.deps.config.commonalityTwitterHandle,
        challengeCode,
        this.deps.config.claimPageBaseUrl,
        channel.channelId,
      );
    } else if (request.platform === 'youtube') {
      verificationPostTemplate = buildVideoDescriptionTemplate(
        challengeCode,
        this.deps.config.claimPageBaseUrl,
        channel.channelId,
      );
    } else {
      verificationPostTemplate = buildSubstackPostTemplate(
        this.deps.config.commonalityTwitterHandle,
        challengeCode,
        this.deps.config.claimPageBaseUrl,
        channel.channelId,
      );
    }

    this.challengeCache.set(nonce, {
      platform: request.platform,
      channelId: channel.channelId,
      claimantAddress: request.claimantAddress as Address,
      nonce,
      challengeCode,
      deadline,
      createdAtMs: this.now(),
      handle: channel.handle ?? request.handle,
      displayName: channel.displayName,
      verificationPostTemplate,
    });

    return {
      nonce,
      challengeCode,
      channelId: channel.channelId,
      handle: channel.handle,
      displayName: channel.displayName,
      verificationPostTemplate,
      deadline,
    };
  }

  async confirmVerification(request: { nonce: string }): Promise<VerificationConfirmation> {
    if (!/^0x[0-9a-fA-F]{64}$/.test(request.nonce)) {
      throw new HttpError(400, 'invalid_request', `Invalid nonce: ${request.nonce}`);
    }

    if (
      !this.deps.config.verifierPrivateKey ||
      !this.deps.config.channelVerifierAddress ||
      !this.deps.config.chainId
    ) {
      throw new HttpError(
        503,
        'service_unavailable',
        'Verification confirmation is unavailable because VERIFIER_PRIVATE_KEY, CHANNEL_VERIFIER_ADDRESS, and CHAIN_ID must all be set',
      );
    }

    const challenge = this.challengeCache.get(request.nonce);
    if (!challenge) {
      throw new HttpError(404, 'challenge_not_found', 'Verification challenge not found or expired');
    }

    const matchingPost = await this.findVerificationPost(challenge);

    if (!matchingPost) {
      throw new HttpError(
        404,
        'verification_post_not_found',
        challenge.platform === 'twitter'
          ? 'Verification tweet not found yet; try again after posting the tweet'
          : challenge.platform === 'youtube'
            ? 'Verification video not found yet; try again after adding the challenge to your video description'
            : 'Verification post not found yet; try again after publishing the Substack post and waiting for the RSS feed to update',
      );
    }

    const proofUrl = matchingPost.publicUrl ?? this.publicProofUrl(challenge.platform, challenge.handle, matchingPost.id);
    const proofHash = keccak256(stringToBytes(proofUrl));

    const verifierSignature = await signClaimProof(
      this.deps.config.verifierPrivateKey,
      this.deps.config.channelVerifierAddress,
      this.deps.config.chainId,
      challenge.channelId,
      challenge.claimantAddress,
      challenge.nonce,
      challenge.deadline,
      proofHash,
    );

    const txHash = await this.submitVerificationTxIfConfigured({
      channelId: challenge.channelId,
      claimant: challenge.claimantAddress,
      nonce: challenge.nonce,
      deadline: challenge.deadline,
      proofHash,
      verifierSignature,
    });

    this.challengeCache.delete(request.nonce);

    return {
      proof: {
        channelId: challenge.channelId,
        claimant: challenge.claimantAddress,
        nonce: challenge.nonce,
        deadline: challenge.deadline,
        proofHash,
        verifierSignature,
      },
      txHash,
      observedPostId: matchingPost.id,
    };
  }

  async listContentSubmissions() {
    return await this.deps.contentSubmissionStore.list();
  }

  async submitContent(submission: {
    contentUrl: string;
    statementCid: IpfsCidV1;
    declaredPerspective?: string;
  }) {
    return await this.deps.contentSubmissionStore.enqueue({
      contentUrl: submission.contentUrl,
      statementCid: submission.statementCid,
      declaredPerspective: submission.declaredPerspective,
    });
  }

  health(): Record<string, unknown> {
    return {
      ok: true,
      providers: {
        twitter: {
          resolveConfigured: this.deps.twitterClient.isConfigured(),
          verifyConfigured: this.deps.twitterClient.isConfigured(),
        },
        youtube: {
          resolveConfigured: this.deps.youtubeClient.isConfigured(),
          verifyConfigured: this.deps.youtubeClient.isConfigured(),
        },
        substack: {
          resolveConfigured: true,
          verifyConfigured: true,
        },
      },
      verification: {
        canSignProofs: Boolean(this.deps.config.verifierPrivateKey),
        submitVerificationTx: this.deps.config.submitVerificationTx,
        channelRegistryConfigured: Boolean(this.deps.config.channelRegistryAddress),
        ethereumRpcConfigured: Boolean(this.deps.config.ethereumRpcUrl),
      },
      contentSubmissions: {
        enabled: true,
      },
      cache: {
        channelEntries: this.channelCache.size(),
        contentEntries: this.contentCache.size(),
        pendingChallenges: this.challengeCache.size(),
      },
    };
  }

  private async resolveChannelWithCache(
    platform: 'twitter' | 'youtube',
    handle: string,
    normalizeInput: (input: string) => string,
    resolveChannel: (input: string) => Promise<ResolvedChannel>,
    isConfigured: () => boolean,
  ): Promise<ResolvedChannel> {
    if (!isConfigured()) {
      throw new HttpError(
        503,
        'service_unavailable',
        `${platform} channel resolution is unavailable because the platform API credentials are not configured`,
      );
    }

    const normalizedInput = normalizeInput(handle).toLowerCase();
    const cacheKey = `channel:${platform}:${normalizedInput}`;
    const cached = this.channelCache.get(cacheKey);
    if (cached) {
      const canonical = this.channelCache.get(this.getChannelIdCacheKey(platform, cached.channelId));
      return canonical ?? cached;
    }

    const resolved = await resolveChannel(handle);
    this.channelCache.set(cacheKey, resolved);
    this.channelCache.set(this.getChannelIdCacheKey(platform, resolved.channelId), resolved);
    return resolved;
  }

  private getChannelIdCacheKey(platform: 'twitter' | 'youtube', channelId: string): string {
    return `channel-by-id:${platform}:${channelId}`;
  }

  private getContentCacheKey(parsed: ParsedContentFundingUrl): string {
    switch (parsed.platform) {
      case 'twitter':
        return `content:twitter:${parsed.tweetId}`;
      case 'youtube':
        return `content:youtube:${parsed.videoId}`;
      case 'substack':
        return `content:substack:${parsed.publication}/${parsed.slug}`;
    }
  }

  private async submitVerificationTxIfConfigured(proof: {
    channelId: string;
    claimant: Address;
    nonce: Hex;
    deadline: number;
    proofHash: Hex;
    verifierSignature: Hex;
  }): Promise<Hex | undefined> {
    if (!this.deps.config.submitVerificationTx) {
      return undefined;
    }

    if (
      !this.deps.config.verifierPrivateKey ||
      !this.deps.config.ethereumRpcUrl ||
      !this.deps.config.channelRegistryAddress
    ) {
      throw new HttpError(
        503,
        'service_unavailable',
        'On-chain verification submission requires VERIFIER_PRIVATE_KEY, ETHEREUM_RPC_URL, and CHANNEL_REGISTRY_ADDRESS',
      );
    }

    const account = privateKeyToAccount(this.deps.config.verifierPrivateKey);
    const publicClient = createPublicClient({
      transport: http(this.deps.config.ethereumRpcUrl),
    });
    const walletClient = createWalletClient({
      account,
      transport: http(this.deps.config.ethereumRpcUrl),
    });

    const simulation = await publicClient.simulateContract({
      address: this.deps.config.channelRegistryAddress,
      abi: channelRegistryAbi,
      functionName: 'verifyChannel',
      args: [
        hashCanonicalId(proof.channelId),
        proof.claimant,
        proof.nonce,
        BigInt(proof.deadline),
        proof.proofHash,
        proof.verifierSignature,
      ],
      account,
    });

    return await walletClient.writeContract(simulation.request);
  }

  private getChallengeTtlSeconds(platform: 'twitter' | 'youtube' | 'substack'): number {
    if (platform === 'substack') {
      return Math.max(this.deps.config.challengeTtlSeconds, 3600);
    }

    return this.deps.config.challengeTtlSeconds;
  }

  private publicProofUrl(platform: PendingVerificationChallenge['platform'], handle: string, postId: string): string {
    if (/^https?:\/\//i.test(postId)) return postId;
    switch (platform) {
      case 'twitter':
        return `https://x.com/${handle.replace(/^@/, '')}/status/${postId}`;
      case 'youtube':
        return `https://www.youtube.com/watch?v=${postId}`;
      case 'substack':
        return postId;
    }
  }

  private async findVerificationPost(
    challenge: PendingVerificationChallenge,
  ): Promise<VerificationPostMatch | null> {
    if (challenge.platform === 'twitter') {
      return await this.deps.twitterClient.findVerificationPost(
        challenge.channelId,
        challenge.challengeCode,
        challenge.createdAtMs,
      );
    }

    if (challenge.platform === 'youtube') {
      return await this.deps.youtubeClient.findVerificationPost(
        challenge.channelId,
        challenge.challengeCode,
        challenge.createdAtMs,
      );
    }

    return await this.findSubstackVerificationPost({
      publication: parseSubstackPublicationFromChannelId(challenge.channelId),
      challengeCode: challenge.challengeCode,
      issuedAfterMs: challenge.createdAtMs,
    });
  }

  private async findSubstackVerificationPost(
    lookup: SubstackVerificationPostLookup,
  ): Promise<VerificationPostMatch | null> {
    const response = await this.fetchImpl(`https://${lookup.publication}.substack.com/feed`);
    if (!response.ok) {
      throw new HttpError(
        502,
        'substack_feed_unavailable',
        `Substack RSS feed lookup failed for ${lookup.publication}: HTTP ${response.status}`,
      );
    }

    const xml = await response.text();
    const items = parseSubstackFeedItems(xml);
    for (const item of items) {
      if (!item.text.includes(lookup.challengeCode)) {
        continue;
      }

      if (item.createdAt) {
        const publishedAtMs = Date.parse(item.createdAt);
        if (Number.isFinite(publishedAtMs) && publishedAtMs < lookup.issuedAfterMs) {
          continue;
        }
      }

      return item;
    }

    return null;
  }
}

export async function signClaimProof(
  verifierPrivateKey: Hex,
  channelVerifierAddress: Address,
  chainId: number,
  channelId: string,
  claimant: Address,
  nonce: Hex,
  deadline: number,
  proofHash: Hex,
): Promise<Hex> {
  const account = privateKeyToAccount(verifierPrivateKey);
  return await account.signTypedData({
    domain: {
      name: 'ChannelVerifier',
      version: '1',
      chainId,
      verifyingContract: channelVerifierAddress,
    },
    types: {
      ChannelClaim: [
        { name: 'channelId', type: 'bytes32' },
        { name: 'claimant', type: 'address' },
        { name: 'nonce', type: 'bytes32' },
        { name: 'deadline', type: 'uint256' },
        { name: 'proofHash', type: 'bytes32' },
      ],
    },
    primaryType: 'ChannelClaim',
    message: {
      channelId: hashCanonicalId(channelId),
      claimant,
      nonce,
      deadline: BigInt(deadline),
      proofHash,
    },
  });
}

function buildTweetTemplate(
  commonalityHandle: string,
  challengeCode: string,
  claimPageBaseUrl: string | undefined,
  channelId: string,
): string {
  const claimLink = claimPageBaseUrl
    ? ` ${claimPageBaseUrl}/channels/${encodeURIComponent(channelId)}`
    : '';
  return `Claiming my funded content on ${commonalityHandle}${claimLink} #commonality-${challengeCode}`;
}

function buildVideoDescriptionTemplate(
  challengeCode: string,
  claimPageBaseUrl: string | undefined,
  channelId: string,
): string {
  const claimLink = claimPageBaseUrl
    ? `${claimPageBaseUrl}/channels/${encodeURIComponent(channelId)}`
    : '';
  return `Commonality verification: ${challengeCode}${claimLink ? ` ${claimLink}` : ''}`;
}

function buildSubstackPostTemplate(
  commonalityHandle: string,
  challengeCode: string,
  claimPageBaseUrl: string | undefined,
  channelId: string,
): string {
  const claimLink = claimPageBaseUrl
    ? ` ${claimPageBaseUrl}/channels/${encodeURIComponent(channelId)}`
    : '';
  return `Claiming my funded content on ${commonalityHandle}${claimLink} #commonality-${challengeCode}`;
}

function resolveSubstackPublication(handle: string): ResolvedChannel {
  const publication = normalizeSubstackPublication(handle);
  return {
    platform: 'substack',
    channelId: buildCanonicalChannelId('substack', publication),
    handle: publication,
    displayName: publication,
  };
}

function normalizeSubstackPublication(handle: string): string {
  const trimmed = handle.trim().toLowerCase();
  const withoutProtocol = trimmed.replace(/^https?:\/\//, '');
  const withoutHostSuffix = withoutProtocol.replace(/\.substack\.com(?:\/.*)?$/, '');
  const publication = withoutHostSuffix.replace(/^@/, '').split('/')[0];

  if (!/^[a-z0-9-]+$/.test(publication)) {
    throw new HttpError(400, 'invalid_request', `Invalid Substack publication: ${handle}`);
  }

  return publication;
}

type ParsedLocalContextContentId =
  | { platform: 'twitter'; userId: string; tweetId: string }
  | { platform: 'youtube'; channelId: string; videoId: string }
  | { platform: 'substack'; publication: string; slug: string };

function parseCanonicalContentIdForLocalContext(canonicalId: string | undefined): ParsedLocalContextContentId {
  if (!canonicalId) {
    throw new HttpError(400, 'invalid_request', 'Missing required field: url or canonicalId');
  }

  const twitterMatch = /^twitter:uid:(\d+):(\d+)$/.exec(canonicalId);
  if (twitterMatch) {
    return { platform: 'twitter', userId: twitterMatch[1], tweetId: twitterMatch[2] };
  }

  const youtubeMatch = /^(youtube:channel:UC[A-Za-z0-9_-]+):([A-Za-z0-9_-]{11})$/.exec(canonicalId);
  if (youtubeMatch) {
    return { platform: 'youtube', channelId: youtubeMatch[1], videoId: youtubeMatch[2] };
  }

  const substackMatch = /^substack:([a-z0-9-]+)\/([a-z0-9-]+)$/.exec(canonicalId);
  if (substackMatch) {
    return { platform: 'substack', publication: substackMatch[1], slug: substackMatch[2] };
  }

  throw new HttpError(400, 'invalid_request', `Invalid canonical content ID: ${canonicalId}`);
}

function resolveCanonicalContentIdForLocalContext(canonicalId: string | undefined): ResolvedContent {
  const parsed = parseCanonicalContentIdForLocalContext(canonicalId);
  switch (parsed.platform) {
    case 'twitter':
      return {
        platform: 'twitter',
        channelId: buildCanonicalChannelId('twitter', parsed.userId),
        contentSuffix: parsed.tweetId,
        canonicalId: canonicalId!,
        metadata: {},
      };
    case 'youtube':
      return {
        platform: 'youtube',
        channelId: parsed.channelId,
        contentSuffix: parsed.videoId,
        canonicalId: canonicalId!,
        metadata: {},
      };
    case 'substack':
      return {
        platform: 'substack',
        channelId: buildCanonicalChannelId('substack', parsed.publication),
        contentSuffix: parsed.slug,
        canonicalId: canonicalId!,
        metadata: {},
      };
  }
}

function parseSubstackPublicationFromChannelId(channelId: string): string {
  const parsed = /^substack:([a-z0-9-]+)$/.exec(channelId);
  if (!parsed) {
    throw new HttpError(500, 'internal_error', `Invalid Substack channel ID: ${channelId}`);
  }

  return parsed[1];
}

function parseSubstackFeedItems(xml: string): VerificationPostMatch[] {
  const items = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)];
  return items.map((match, index) => {
    const itemXml = match[0];
    const title = decodeXmlEntities(extractXmlTag(itemXml, 'title') ?? '');
    const description = decodeXmlEntities(extractXmlTag(itemXml, 'description') ?? '');
    const encoded = decodeXmlEntities(extractXmlTag(itemXml, 'content:encoded') ?? '');
    const guid = decodeXmlEntities(extractXmlTag(itemXml, 'guid') ?? `substack-item-${index}`);
    const link = decodeXmlEntities(extractXmlTag(itemXml, 'link') ?? guid);
    const createdAt = decodeXmlEntities(extractXmlTag(itemXml, 'pubDate') ?? '');

    return {
      id: guid || link,
      text: [title, description, encoded].filter(Boolean).join('\n'),
      createdAt: createdAt || undefined,
      publicUrl: link,
    };
  });
}

function extractXmlTag(xml: string, tagName: string): string | undefined {
  const escaped = tagName.replace(':', '\\:');
  const match = new RegExp(`<${escaped}\\b[^>]*>([\\s\\S]*?)<\\/${escaped}>`, 'i').exec(xml);
  if (!match) {
    return undefined;
  }

  return match[1]
    .replace(/^<!\[CDATA\[/, '')
    .replace(/\]\]>$/, '')
    .trim();
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, '\'')
    .replace(/&amp;/g, '&');
}
