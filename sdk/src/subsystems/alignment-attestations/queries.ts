/**
 * Reads for AlignmentAttestations. No project, note, or assurance funding.
 */

import {
  fetchEvents,
  padAddressAsTopic,
  type EventQueryParams,
} from '../../utils/eventCacheClient.js';
import {
  decodeAlignmentAttestationEvent,
  decodeAlignmentRevokedEvent,
} from '../../utils/event-decoders/alignment-attestations.js';
import { foldAlignmentAttestations } from './folds.js';
import { type AlignmentAttestation } from './types.js';
import { IpfsCidV1, normalizeCidV1, cidToBytes32 } from '../../utils/cid-types.js';
import { SDKMachinery } from '../../machinery.js';

export type TrustedAddressInput = string | Iterable<string>;

export function normalizeTrustedAddresses(
  trustedAddresses?: TrustedAddressInput
): Set<string> | null {
  if (!trustedAddresses) return null;

  if (typeof trustedAddresses === 'string') {
    return new Set([trustedAddresses.toLowerCase()]);
  }

  const normalized = new Set<string>();
  for (const address of trustedAddresses) {
    normalized.add(address.toLowerCase());
  }

  return normalized.size > 0 ? normalized : null;
}

async function fetchDecodedAlignmentLifecycleEvents(
  machinery: SDKMachinery,
  params: Omit<EventQueryParams, 'eventName'>,
) {
  const [attestations, revocations] = await Promise.all([
    fetchEvents(machinery, { ...params, eventName: 'AlignmentAttestation' }),
    fetchEvents(machinery, { ...params, eventName: 'AlignmentRevoked' }),
  ]);
  return [
    ...attestations.map(decodeAlignmentAttestationEvent).filter(
      (event): event is NonNullable<typeof event> => event !== null,
    ),
    ...revocations.map(decodeAlignmentRevokedEvent).filter(
      (event): event is NonNullable<typeof event> => event !== null,
    ),
  ];
}

function normalizeSubjectIdForTopic(subjectId: string): `0x${string}` {
  if (/^0x[0-9a-fA-F]{40}$/.test(subjectId)) {
    return padAddressAsTopic(subjectId) as `0x${string}`;
  }
  return subjectId.toLowerCase() as `0x${string}`;
}

export function cidReferencesSameDigest(left: string, right: string): boolean {
  if (left.toLowerCase() === right.toLowerCase()) return true;

  try {
    // AlignmentAttestations stores only the CID multihash digest in bytes32.
    // Decoding therefore cannot preserve whether the original CID used raw or
    // dag-pb codecs (bafkrei… vs bafybei…), so compare their stored digests.
    return cidToBytes32(left) === cidToBytes32(right);
  } catch {
    return false;
  }
}

/**
 * Get all alignment attestations for a specific statement (by attester if provided)
 */
export async function getAlignedSubjects(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  trustedAlignmentAttesters?: TrustedAddressInput,
  topicStatementCid?: IpfsCidV1
): Promise<AlignmentAttestation[]> {
  // AlignmentAttestation(address indexed attester, bytes32 indexed subjectId, bytes32 indexed statementId, bytes32 topicStatementId)
  // topic1=attester, topic2=subjectId, topic3=statementId (bytes32)
  const decodedEvents = await fetchDecodedAlignmentLifecycleEvents(machinery, {
    topic3: cidToBytes32(statementCid),
    limit: 10000,
  });

  let attestations = foldAlignmentAttestations(decodedEvents);

  if (topicStatementCid) {
    attestations = attestations.filter((attestation) =>
      cidReferencesSameDigest(attestation.topicStatementCid, topicStatementCid),
    );
  }

  const trustedAddresses = normalizeTrustedAddresses(trustedAlignmentAttesters);
  if (trustedAddresses) {
    attestations = attestations.filter(a => trustedAddresses.has(a.attester.toLowerCase()));
  }

  return attestations.map(a => ({
    attester: a.attester,
    subjectId: a.subjectId,
    statementCid: a.statementCid,
    topicStatementCid: a.topicStatementCid || topicStatementCid,
    createdAt: a.createdAt,
    blockNumber: a.blockNumber,
  }));
}

export const getAlignedProjects = getAlignedSubjects;

/**
 * Get all statement alignments for a specific subject (by attester if provided)
 *
 * @param subjectId bytes32 subject identifier. For address subjects, use toSubjectId(address).
 */
export async function getSubjectStatements(
  machinery: SDKMachinery,
  subjectId: string,
  attesterAddress?: string,
  topicStatementCid?: IpfsCidV1
): Promise<AlignmentAttestation[]> {
  const decodedEvents = await fetchDecodedAlignmentLifecycleEvents(machinery, {
    topic2: normalizeSubjectIdForTopic(subjectId),
    limit: 10000,
  });

  let attestations = foldAlignmentAttestations(decodedEvents);

  if (topicStatementCid) {
    attestations = attestations.filter(a =>
      cidReferencesSameDigest(a.topicStatementCid, topicStatementCid),
    );
  }

  if (attesterAddress) {
    const attesterLower = attesterAddress.toLowerCase();
    attestations = attestations.filter(a => a.attester.toLowerCase() === attesterLower);
  }

  return attestations.map(a => ({
    attester: a.attester,
    subjectId: a.subjectId,
    statementCid: a.statementCid,
    topicStatementCid: a.topicStatementCid || topicStatementCid,
    createdAt: a.createdAt,
    blockNumber: a.blockNumber,
  }));
}

export const getProjectStatements = getSubjectStatements;

/**
 * Get a specific alignment attestation
 *
 * @param subjectId bytes32 subject identifier. For address subjects, use toSubjectId(address).
 */
export async function getAlignmentAttestation(
  machinery: SDKMachinery,
  attesterAddress: string,
  subjectId: string,
  statementCid: IpfsCidV1,
  topicStatementCid?: IpfsCidV1
): Promise<AlignmentAttestation | null> {
  const decodedEvents = await fetchDecodedAlignmentLifecycleEvents(machinery, {
    topic3: cidToBytes32(statementCid),
    topic2: normalizeSubjectIdForTopic(subjectId),
    limit: 1000,
  });

  const attesterLower = attesterAddress.toLowerCase();
  const matching = decodedEvents.filter(e => e.attester.toLowerCase() === attesterLower);

  const active = foldAlignmentAttestations(matching).find((attestation) =>
    !topicStatementCid
    || cidReferencesSameDigest(attestation.topicStatementCid, topicStatementCid),
  );
  if (!active) return null;

  return {
    ...active,
    topicStatementCid: topicStatementCid ?? active.topicStatementCid,
  };
}

export const getProjectAlignment = getAlignmentAttestation;

/**
 * Get all alignments by a specific attester
 */
export async function getAlignmentsByAttester(
  machinery: SDKMachinery,
  attesterAddress: string,
  topicStatementCid?: IpfsCidV1
): Promise<AlignmentAttestation[]> {
  // AlignmentAttestation: topic1=attester, topic2=subjectId, topic3=statementId
  const decodedEvents = await fetchDecodedAlignmentLifecycleEvents(machinery, {
    topic1: padAddressAsTopic(attesterAddress),
    limit: 10000,
  });

  let attestations = foldAlignmentAttestations(decodedEvents);
  if (topicStatementCid) {
    attestations = attestations.filter((attestation) =>
      cidReferencesSameDigest(attestation.topicStatementCid, topicStatementCid),
    );
  }

  return attestations.map(a => ({
    attester: a.attester,
    subjectId: a.subjectId,
    statementCid: normalizeCidV1(a.statementCid),
    topicStatementCid: a.topicStatementCid || topicStatementCid,
    createdAt: a.createdAt,
    blockNumber: a.blockNumber,
  }));
}
