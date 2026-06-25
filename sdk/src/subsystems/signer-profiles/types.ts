/** Social identity data resolved for an Ethereum address. */
export interface UserSocialData {
  /** Ethereum address. */
  address: string;
  /** ENS name, if resolved. */
  ensName?: string;
  /** Twitter handle (with @), if linked. */
  twitterHandle?: string;
  /** Twitter follower count, if available. */
  twitterFollowerCount?: number;
  /** Whether the linked Twitter account is verified. */
  isTwitterVerified: boolean;
  /** Which association mechanism produced the Twitter link, if any. */
  twitterAssociationSource?: 'ens' | 'channel-registry';
  /** Whether social data has been fetched (always true in query results). */
  socialDataFetched: boolean;
  /** ISO 8601 timestamp of when the data was fetched. */
  fetchedAt?: string;
}

/** A signer of a statement who has a high Twitter follower count. */
export interface HighProfileSigner {
  /** Ethereum address of the signer. */
  address: string;
  /** ENS name, if resolved. */
  ensName?: string;
  /** Twitter handle (with @), if linked. */
  twitterHandle?: string;
  /** Twitter follower count. */
  followerCount?: number;
}
