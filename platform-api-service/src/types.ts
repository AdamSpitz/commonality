import type { ContentFundingPlatform } from '@commonality/sdk';
import type { Address, Hex } from 'viem';

export interface ResolvedChannel {
  platform: ContentFundingPlatform;
  channelId: string;
  handle?: string;
  displayName?: string;
}

export interface ResolvedContent {
  platform: ContentFundingPlatform;
  channelId: string;
  contentSuffix: string;
  canonicalId: string;
  metadata: Record<string, unknown>;
}

export interface VerificationPostMatch {
  id: string;
  text: string;
  createdAt?: string;
}

export interface PendingVerificationChallenge {
  platform: 'twitter' | 'youtube' | 'substack';
  channelId: string;
  claimantAddress: Address;
  nonce: Hex;
  challengeCode: string;
  deadline: number;
  createdAtMs: number;
  handle: string;
  displayName?: string;
  verificationPostTemplate: string;
}

export interface ChannelClaimProof {
  channelId: string;
  claimant: Address;
  nonce: Hex;
  deadline: number;
  verifierSignature: Hex;
}

export interface VerificationConfirmation {
  proof: ChannelClaimProof;
  txHash?: Hex;
  observedPostId?: string;
}

export interface TwitterClientLike {
  isConfigured(): boolean;
  normalizeLookupInput(input: string): string;
  resolveChannel(input: string): Promise<ResolvedChannel>;
  resolveContent(url: string): Promise<ResolvedContent>;
  findVerificationPost(
    channelId: string,
    challengeCode: string,
    issuedAfterMs: number,
  ): Promise<VerificationPostMatch | null>;
}

export interface YouTubeClientLike {
  isConfigured(): boolean;
  normalizeLookupInput(input: string): string;
  resolveChannel(input: string): Promise<ResolvedChannel>;
  resolveContent(url: string): Promise<ResolvedContent>;
  findVerificationPost(
    channelId: string,
    challengeCode: string,
    issuedAfterMs: number,
  ): Promise<VerificationPostMatch | null>;
}

export interface SubstackVerificationPostLookup {
  publication: string;
  challengeCode: string;
  issuedAfterMs: number;
}
