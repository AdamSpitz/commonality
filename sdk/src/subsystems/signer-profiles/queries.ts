/**
 * Signer profiles — social-identity enrichment for addresses and statement signers.
 *
 * This subsystem sits *above* both `conceptspace` (it reads a statement's
 * believers via conceptspace folds) and `content-funding` (it verifies Twitter
 * channel ownership via the channel registry). Keeping it here, rather than in
 * `conceptspace`, keeps the conceptspace substrate a leaf — it must not depend
 * upward into the content-funding vertical.
 */

import { fetchEvents } from '../../utils/eventCacheClient.js';
import {
  decodeDirectSupportEvent,
  type DecodedDirectSupportEvent,
} from '../../utils/eventDecoder.js';
import { foldStatementBeliefs } from '../conceptspace/folds.js';
import { IpfsCidV1, cidToBytes32 } from '../../utils/cid-types.js';
import { fetchAddressSocialData, fetchFollowerCountForTwitterHandle } from '../../utils/twitter.js';
import { SDKMachinery } from '../../machinery.js';
import { fetchAndFoldContentFundingState, getOwnerForCanonicalChannelId } from '../content-funding/queries.js';
import { type UserSocialData, type HighProfileSigner } from './types.js';

/** Options for {@link getHighProfileSigners}. */
export interface GetHighProfileSignersOptions {
  /** Minimum Twitter follower count to qualify as "high-profile" (default: 10000). */
  minFollowers?: number;
}

/**
 * Get high-profile signers (believers) of a statement, ranked by follower count.
 *
 * Fetches all believers for a statement, looks up their social data, and
 * returns those meeting the minimum follower threshold.
 *
 * @param machinery - SDK machinery with event cache and Twitter API configuration
 * @param statementCid - CIDv1 of the statement
 * @param options - Minimum follower count threshold
 * @returns Array of high-profile signers sorted by follower count (descending)
 */
export async function getHighProfileSigners(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  options: GetHighProfileSignersOptions = {}
): Promise<HighProfileSigner[]> {
  const { minFollowers = 10000 } = options;
  const events = await fetchEvents(machinery, {
    eventName: 'DirectSupport',
    topic2: cidToBytes32(statementCid),
    limit: 10000,
  });

  const decodedEvents: DecodedDirectSupportEvent[] = [];
  for (const event of events) {
    const decoded = decodeDirectSupportEvent(event);
    if (decoded) {
      decodedEvents.push(decoded);
    }
  }

  const folded = foldStatementBeliefs(decodedEvents);

  const highProfileSigners: HighProfileSigner[] = [];

  for (const [userAddress, beliefState] of folded.beliefs.entries()) {
    if (beliefState !== 1) continue;

    const socialData = await getUserSocialData(machinery, userAddress);
    if (socialData &&
        socialData.twitterFollowerCount &&
        socialData.twitterFollowerCount >= minFollowers) {
      highProfileSigners.push({
        address: userAddress,
        ensName: socialData.ensName,
        twitterHandle: socialData.twitterHandle,
        followerCount: socialData.twitterFollowerCount,
      });
    }
  }

  return highProfileSigners.sort((a, b) => (b.followerCount || 0) - (a.followerCount || 0));
}

/**
 * Fetch social data (ENS name, Twitter handle, follower count) for an Ethereum address.
 *
 * @param _machinery - SDK machinery with Twitter API configuration
 * @param address - Ethereum address to look up
 * @returns Social data for the address
 */
export async function getUserSocialData(
  _machinery: SDKMachinery,
  address: string,
  options: {
    twitterHandleHint?: string;
  } = {},
): Promise<UserSocialData | null> {
  const data = await fetchAddressSocialData(_machinery.twitterApiConfig, address);
  const verifiedAssociation = await resolveTwitterAssociationViaChannelRegistry(
    _machinery,
    address,
    options.twitterHandleHint ?? data.twitterHandle,
  );
  const twitterHandle = verifiedAssociation?.twitterHandle ?? data.twitterHandle;
  const twitterFollowerCount = verifiedAssociation && data.twitterFollowerCount === undefined
    ? await fetchFollowerCountForTwitterHandle(_machinery.twitterApiConfig, verifiedAssociation.twitterHandle)
    : data.twitterFollowerCount;

  return {
    address,
    ensName: data.ensName,
    twitterHandle,
    twitterFollowerCount,
    isTwitterVerified: verifiedAssociation !== null || data.isTwitterVerified,
    twitterAssociationSource: verifiedAssociation !== null
      ? 'channel-registry'
      : data.twitterHandle
        ? 'ens'
        : undefined,
    socialDataFetched: true,
    fetchedAt: new Date().toISOString(),
  };
}

function normalizeTwitterHandleHint(handle: string): string {
  const trimmed = handle.trim();
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

interface ResolvedTwitterChannel {
  channelId: string;
  handle?: string;
}

async function resolveTwitterChannelAssociation(
  machinery: SDKMachinery,
  handle: string,
): Promise<ResolvedTwitterChannel | null> {
  const baseUrl = machinery.twitterApiConfig.platformApiBaseUrl;
  if (!baseUrl) {
    return null;
  }

  const response = await fetch(`${baseUrl}/resolve/channel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      platform: 'twitter',
      handle: normalizeTwitterHandleHint(handle),
    }),
  });

  if (!response.ok) {
    return null;
  }

  const resolved = await response.json() as ResolvedTwitterChannel;
  return typeof resolved.channelId === 'string' ? resolved : null;
}

async function resolveTwitterAssociationViaChannelRegistry(
  machinery: SDKMachinery,
  address: string,
  handleHint?: string,
): Promise<{ twitterHandle: string } | null> {
  if (!handleHint) {
    return null;
  }

  const contentFunding = await fetchAndFoldContentFundingState(machinery);
  if (!contentFunding) {
    return null;
  }

  const resolvedChannel = await resolveTwitterChannelAssociation(machinery, handleHint);
  if (!resolvedChannel?.channelId) {
    return null;
  }

  const owner = getOwnerForCanonicalChannelId(contentFunding.state, resolvedChannel.channelId);
  if (!owner || owner.toLowerCase() !== address.toLowerCase()) {
    return null;
  }

  return {
    twitterHandle: normalizeTwitterHandleHint(resolvedChannel.handle ?? handleHint),
  };
}
