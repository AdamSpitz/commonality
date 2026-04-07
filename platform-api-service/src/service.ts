import { randomBytes } from 'crypto';
import {
  buildCanonicalChannelId,
  buildCanonicalContentId,
  hashCanonicalId,
  parseContentFundingUrl,
  type ParsedContentFundingUrl,
} from '@commonality/sdk';
import {
  createPublicClient,
  createWalletClient,
  encodePacked,
  hexToBytes,
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
import type {
  PendingVerificationChallenge,
  ResolvedChannel,
  ResolvedContent,
  TwitterClientLike,
  VerificationConfirmation,
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
      { name: 'verifierSignature', type: 'bytes' },
    ],
    outputs: [],
  },
] as const;

export interface PlatformApiServiceDependencies {
  config: PlatformApiServiceConfig;
  twitterClient: TwitterClientLike;
  youtubeClient: YouTubeClientLike;
  now?: () => number;
  createChallengeCode?: () => string;
}

export class PlatformApiService {
  private readonly channelCache = new MemoryCache<ResolvedChannel>();
  private readonly contentCache: MemoryCache<ResolvedContent>;
  private readonly challengeCache: MemoryCache<PendingVerificationChallenge>;
  private readonly now: () => number;
  private readonly createChallengeCode: () => string;

  constructor(private readonly deps: PlatformApiServiceDependencies) {
    this.contentCache = new MemoryCache(deps.config.contentCacheTtlSeconds * 1000);
    this.challengeCache = new MemoryCache(deps.config.challengeTtlSeconds * 1000);
    this.now = deps.now ?? (() => Date.now());
    this.createChallengeCode = deps.createChallengeCode ?? (() => randomBytes(6).toString('hex'));
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
    tweetTemplate: string;
    deadline: number;
  }> {
    if (request.platform !== 'twitter') {
      throw new HttpError(
        400,
        'invalid_request',
        'verify/challenge currently supports only twitter',
      );
    }

    if (!isAddress(request.claimantAddress)) {
      throw new HttpError(400, 'invalid_request', `Invalid claimant address: ${request.claimantAddress}`);
    }

    const channel = await this.resolveChannel('twitter', request.handle);
    const challengeCode = this.createChallengeCode();
    const nonce = keccak256(
      stringToBytes(`commonality:${challengeCode}:${channel.channelId}:${request.claimantAddress.toLowerCase()}`),
    );
    const deadline = Math.floor(this.now() / 1000) + this.deps.config.challengeTtlSeconds;
    const tweetTemplate = buildTweetTemplate(
      this.deps.config.commonalityTwitterHandle,
      challengeCode,
      this.deps.config.claimPageBaseUrl,
      channel.channelId,
    );

    this.challengeCache.set(nonce, {
      platform: 'twitter',
      channelId: channel.channelId,
      claimantAddress: request.claimantAddress as Address,
      nonce,
      challengeCode,
      deadline,
      createdAtMs: this.now(),
      handle: channel.handle ?? request.handle,
      displayName: channel.displayName,
      tweetTemplate,
    });

    return {
      nonce,
      challengeCode,
      channelId: channel.channelId,
      handle: channel.handle,
      displayName: channel.displayName,
      tweetTemplate,
      deadline,
    };
  }

  async confirmVerification(request: { nonce: string }): Promise<VerificationConfirmation> {
    if (!/^0x[0-9a-fA-F]{64}$/.test(request.nonce)) {
      throw new HttpError(400, 'invalid_request', `Invalid nonce: ${request.nonce}`);
    }

    if (!this.deps.config.verifierPrivateKey) {
      throw new HttpError(
        503,
        'service_unavailable',
        'Verification confirmation is unavailable because VERIFIER_PRIVATE_KEY is not set',
      );
    }

    const challenge = this.challengeCache.get(request.nonce);
    if (!challenge) {
      throw new HttpError(404, 'challenge_not_found', 'Verification challenge not found or expired');
    }

    const matchingPost = await this.deps.twitterClient.findVerificationPost(
      challenge.channelId,
      challenge.challengeCode,
      challenge.createdAtMs,
    );

    if (!matchingPost) {
      throw new HttpError(
        404,
        'verification_post_not_found',
        'Verification post not found yet; try again after posting the tweet',
      );
    }

    const verifierSignature = await signClaimProof(
      this.deps.config.verifierPrivateKey,
      challenge.channelId,
      challenge.claimantAddress,
      challenge.nonce,
      challenge.deadline,
    );

    const txHash = await this.submitVerificationTxIfConfigured({
      channelId: challenge.channelId,
      claimant: challenge.claimantAddress,
      nonce: challenge.nonce,
      deadline: challenge.deadline,
      verifierSignature,
    });

    this.challengeCache.delete(request.nonce);

    return {
      proof: {
        channelId: challenge.channelId,
        claimant: challenge.claimantAddress,
        nonce: challenge.nonce,
        deadline: challenge.deadline,
        verifierSignature,
      },
      txHash,
      observedPostId: matchingPost.id,
    };
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
        },
        substack: {
          resolveConfigured: true,
        },
      },
      verification: {
        canSignProofs: Boolean(this.deps.config.verifierPrivateKey),
        submitVerificationTx: this.deps.config.submitVerificationTx,
        channelRegistryConfigured: Boolean(this.deps.config.channelRegistryAddress),
        ethereumRpcConfigured: Boolean(this.deps.config.ethereumRpcUrl),
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
      return cached;
    }

    const resolved = await resolveChannel(handle);
    this.channelCache.set(cacheKey, resolved);
    return resolved;
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
        proof.verifierSignature,
      ],
      account,
    });

    return await walletClient.writeContract(simulation.request);
  }
}

export async function signClaimProof(
  verifierPrivateKey: Hex,
  channelId: string,
  claimant: Address,
  nonce: Hex,
  deadline: number,
): Promise<Hex> {
  const account = privateKeyToAccount(verifierPrivateKey);
  const packed = encodePacked(
    ['bytes32', 'address', 'bytes32', 'uint256'],
    [hashCanonicalId(channelId), claimant, nonce, BigInt(deadline)],
  );
  const digest = keccak256(packed);
  return await account.signMessage({
    message: {
      raw: hexToBytes(digest),
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
