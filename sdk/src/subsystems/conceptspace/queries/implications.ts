import { cidToBytes32, IpfsCidV1 } from '../../../utils/cid-types.js';
import { SDKMachinery } from '../../../machinery.js';
import { foldImplications } from '../folds.js';
import { type Implication } from '../types.js';
import { fetchDecodedImplicationLifecycleEvents } from './fetch.js';

/** If trustedAttesters is undefined or empty, returns all implications unfiltered. */
export function filterByTrustedAttesters(
  implications: Implication[],
  trustedAttesters?: string[]
): Implication[] {
  if (!trustedAttesters || trustedAttesters.length === 0) return implications;
  const lowerAttesters = trustedAttesters.map(a => a.toLowerCase());
  return implications.filter(i => lowerAttesters.includes(i.attester.toLowerCase()));
}

/** Implications originating from a statement (what it implies). */
export async function getImplicationsFrom(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  trustedAttesters?: string[]
): Promise<Implication[]> {
  const decodedEvents = await fetchDecodedImplicationLifecycleEvents(machinery, {
    topic2: cidToBytes32(statementCid),
  });

  return filterByTrustedAttesters(foldImplications(decodedEvents), trustedAttesters);
}

/** Implications pointing to a statement (what implies it). */
export async function getImplicationsTo(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  trustedAttesters?: string[]
): Promise<Implication[]> {
  const decodedEvents = await fetchDecodedImplicationLifecycleEvents(machinery, {
    topic3: cidToBytes32(statementCid),
  });

  return filterByTrustedAttesters(foldImplications(decodedEvents), trustedAttesters);
}

/** A specific implication attestation by attester and statement pair. */
export async function getImplication(
  machinery: SDKMachinery,
  attesterAddress: string,
  fromStatementCid: IpfsCidV1,
  toStatementCid: IpfsCidV1
): Promise<Implication | null> {
  const decodedEvents = await fetchDecodedImplicationLifecycleEvents(machinery, {
    topic2: cidToBytes32(fromStatementCid),
    topic3: cidToBytes32(toStatementCid),
  });

  const attesterLower = attesterAddress.toLowerCase();
  const matching = decodedEvents.filter(e => e.attester.toLowerCase() === attesterLower);

  const active = foldImplications(matching)[0];
  if (!active) return null;

  return {
    ...active,
    createdAt: new Date(Number(active.createdAt) * 1000).toISOString(),
  };
}
