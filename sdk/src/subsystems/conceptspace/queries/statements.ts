import { cidToBytes32, IpfsCidV1 } from '../../../utils/cid-types.js';
import { SDKMachinery } from '../../../machinery.js';
import { foldStatementBeliefs } from '../folds.js';
import { type Statement, type UserBelief } from '../types.js';
import { fetchDecodedDirectSupportEvents } from './fetch.js';

/**
 * Get a statement's on-chain metadata by its CID.
 *
 * Fetches DirectSupport events for the statement and folds them to compute
 * believer/disbeliever counts and creation timestamp.
 */
export async function getStatement(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1
): Promise<Statement | null> {
  const decodedEvents = await fetchDecodedDirectSupportEvents(machinery, {
    topic2: cidToBytes32(statementCid),
  });

  const folded = foldStatementBeliefs(decodedEvents);

  if (decodedEvents.length === 0) {
    return null;
  }

  const earliestEvent = decodedEvents.reduce((min, e) => e.blockNumber < min.blockNumber ? e : min);

  return {
    id: statementCid,
    cid: statementCid,
    believerCount: folded.believerCount,
    disbelieverCount: folded.disbelieverCount,
    createdAt: new Date(Number(earliestEvent.blockTimestamp) * 1000).toISOString(),
  };
}

/**
 * Get a user's current belief state for a specific statement.
 *
 * Returns the latest belief state: 0 = no opinion, 1 = believes, 2 = disbelieves.
 */
export async function getUserBelief(
  machinery: SDKMachinery,
  userAddress: string,
  statementCid: IpfsCidV1
): Promise<UserBelief | null> {
  const decodedEvents = await fetchDecodedDirectSupportEvents(machinery, {
    topic2: cidToBytes32(statementCid),
  });

  const userAddressLower = userAddress.toLowerCase();
  const userEvents = decodedEvents.filter(e => e.user.toLowerCase() === userAddressLower);

  if (userEvents.length === 0) {
    return { statementCid, beliefState: 0 };
  }

  // Event cache does not guarantee order; pick latest by (blockNumber, logIndex).
  const latestEvent = userEvents.reduce((best, e) => {
    if (e.blockNumber !== best.blockNumber) {
      return e.blockNumber > best.blockNumber ? e : best;
    }
    return e.logIndex > best.logIndex ? e : best;
  });
  return {
    statementCid,
    beliefState: latestEvent.beliefState,
  };
}
