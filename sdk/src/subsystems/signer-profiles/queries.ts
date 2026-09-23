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
} from '../../utils/event-decoders/conceptspace.js';
import { foldStatementBeliefs } from '../conceptspace/folds.js';
import { IpfsCidV1, cidToBytes32 } from '../../utils/cid-types.js';
import { fetchAddressSocialData, fetchFollowerCountForTwitterHandle } from '../../utils/twitter.js';
import { requireTwitterApiConfig, SDKMachinery } from '../../machinery.js';
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
  const twitterApiConfig = requireTwitterApiConfig(_machinery);
  const data = await fetchAddressSocialData(twitterApiConfig, address);
  const handleHint = options.twitterHandleHint ?? data.twitterHandle;
  const verifiedAssociation = _machinery.verifiedSocialAssociation
    ? await _machinery.verifiedSocialAssociation(_machinery, address, handleHint)
    : null;
  const twitterHandle = verifiedAssociation?.twitterHandle ?? data.twitterHandle;
  const twitterFollowerCount = verifiedAssociation && data.twitterFollowerCount === undefined
    ? await fetchFollowerCountForTwitterHandle(twitterApiConfig, verifiedAssociation.twitterHandle)
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
