/**
 * Event-cache reads for conceptspace. Always uses {@link fetchEventsComplete}
 * so a full page is paged by log cursor (or split on older indexers) rather than folded as the whole set.
 */

import { fetchEventsComplete, type EventQueryParams } from '../../../utils/eventCacheClient.js';
import {
  decodeDirectSupportEvent,
  decodeImplicationAttestationEvent,
  decodeImplicationRevokedEvent,
  type DecodedDirectSupportEvent,
  type DecodedImplicationAttestationEvent,
  type DecodedImplicationRevokedEvent,
} from '../../../utils/event-decoders/conceptspace.js';
import { SDKMachinery } from '../../../machinery.js';

export type ConceptspaceEventFilter = Omit<
  EventQueryParams,
  'eventName' | 'limit' | 'blockNumber_gte' | 'blockNumber_lte'
>;

export async function fetchDecodedDirectSupportEvents(
  machinery: SDKMachinery,
  params: ConceptspaceEventFilter = {},
  fromBlock = 0n,
): Promise<DecodedDirectSupportEvent[]> {
  const events = await fetchEventsComplete(machinery, { ...params, eventName: 'DirectSupport' }, fromBlock);
  const decoded: DecodedDirectSupportEvent[] = [];
  for (const event of events) {
    const d = decodeDirectSupportEvent(event);
    if (d) decoded.push(d);
  }
  return decoded;
}

export async function fetchDecodedImplicationLifecycleEvents(
  machinery: SDKMachinery,
  params: ConceptspaceEventFilter = {},
  fromBlock = 0n,
): Promise<Array<DecodedImplicationAttestationEvent | DecodedImplicationRevokedEvent>> {
  const [attestations, revocations] = await Promise.all([
    fetchEventsComplete(machinery, { ...params, eventName: 'ImplicationAttestation' }, fromBlock),
    fetchEventsComplete(machinery, { ...params, eventName: 'ImplicationRevoked' }, fromBlock),
  ]);
  const decoded: Array<DecodedImplicationAttestationEvent | DecodedImplicationRevokedEvent> = [];
  for (const event of attestations) {
    const d = decodeImplicationAttestationEvent(event);
    if (d) decoded.push(d);
  }
  for (const event of revocations) {
    const d = decodeImplicationRevokedEvent(event);
    if (d) decoded.push(d);
  }
  return decoded;
}
