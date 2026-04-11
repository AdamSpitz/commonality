import {
  fetchEvents,
  type SDKMachinery,
} from '@commonality/sdk';
import {
  decodeDirectSupportEvent,
  decodeImplicationAttestationEvent,
  type DecodedDirectSupportEvent,
  type DecodedImplicationAttestationEvent,
} from '@commonality/sdk';

/**
 * Fetch all DirectSupport events since a given block number.
 * Returns decoded events sorted by block number ascending.
 */
export async function fetchDirectSupportEvents(
  machinery: SDKMachinery,
  sinceBlock: string,
): Promise<DecodedDirectSupportEvent[]> {
  const raw = await fetchEvents(machinery, {
    contractAddress: machinery.contractAddresses!.beliefs,
    eventName: 'DirectSupport',
    blockNumber_gte: sinceBlock,
    limit: 10000,
  });

  const decoded: DecodedDirectSupportEvent[] = [];
  for (const e of raw) {
    const d = decodeDirectSupportEvent(e);
    if (d) decoded.push(d);
  }

  return decoded;
}

/**
 * Fetch all ImplicationAttestation events (to know which pairs are already attested).
 */
export async function fetchExistingImplications(
  machinery: SDKMachinery,
): Promise<DecodedImplicationAttestationEvent[]> {
  const raw = await fetchEvents(machinery, {
    contractAddress: machinery.contractAddresses!.implications,
    eventName: 'ImplicationAttestation',
    limit: 10000,
  });

  const decoded: DecodedImplicationAttestationEvent[] = [];
  for (const e of raw) {
    const d = decodeImplicationAttestationEvent(e);
    if (d) decoded.push(d);
  }

  return decoded;
}
