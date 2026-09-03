import { keccak256, stringToBytes } from 'viem';
import type { SDKMachinery } from '../../../machinery.js';
import { fetchEvents } from '../../../utils/eventCacheClient.js';
import { decodeAlignmentAttestationEvent } from '../../../utils/eventDecoder.js';
import { cidToBytes32, type IpfsCidV1 } from '../../../utils/cid-types.js';
import type { ContentItem } from '../folds.js';
import type { ContentAttestationRecord } from './views.js';
import { uniqueContentItems } from './views.js';
import { fetchAndFoldContentFundingState } from './fetch-state.js';

type DecodedAlignmentAttestationEvent = NonNullable<ReturnType<typeof decodeAlignmentAttestationEvent>>;

/**
 * Compute the keccak256 hash of a canonical content ID for use as an AlignmentAttestation subjectId.
 *
 * This matches how the content-attester service computes the subjectId on-chain.
 *
 * @param canonicalContentId - Canonical content ID (e.g. `"twitter:uid:123:456"`)
 * @returns Bytes32 keccak256 hash as a hex string
 */
export function getContentSubjectId(canonicalContentId: string): string {
  return keccak256(stringToBytes(canonicalContentId));
}

/**
 * Select the latest attestation per attester/statement/topic from decoded AlignmentAttestation events.
 *
 * When duplicate attestations exist for the same attester and claim, only the
 * most recent (by block number and log index) is kept.
 *
 * @param decodedEvents - Decoded AlignmentAttestation events
 * @param attesterAddress - Optional filter to a specific attester address
 * @returns Array of latest attestation records, sorted by most recent first
 */
export function selectLatestContentAttestations(
  decodedEvents: DecodedAlignmentAttestationEvent[],
  attesterAddress?: string,
): ContentAttestationRecord[] {
  let matchingEvents = decodedEvents;
  if (attesterAddress) {
    const attesterLower = attesterAddress.toLowerCase();
    matchingEvents = decodedEvents.filter(e => e.attester.toLowerCase() === attesterLower);
  }

  const latestByAttester = new Map<string, DecodedAlignmentAttestationEvent>();

  for (const event of matchingEvents) {
    const key = `${event.attester.toLowerCase()}-${event.statementId}-${event.topicStatementId ?? ''}`;
    const existing = latestByAttester.get(key);
    if (
      !existing ||
      event.blockNumber > existing.blockNumber ||
      (event.blockNumber === existing.blockNumber && event.logIndex > existing.logIndex)
    ) {
      latestByAttester.set(key, event);
    }
  }

  return Array.from(latestByAttester.values())
    .sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) {
        return a.blockNumber > b.blockNumber ? -1 : 1;
      }
      return b.logIndex - a.logIndex;
    })
    .map(event => ({
      attested: true,
      attester: event.attester,
      statementCid: event.statementId,
      topicStatementCid: event.topicStatementId,
      blockNumber: event.blockNumber,
    }));
}

/**
 * Query latest attestation status per attester for a specific content item.
 *
 * Fetches AlignmentAttestation events from the event cache filtered by the
 * content item's subjectId, then returns the latest attestation per attester.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param canonicalContentId - Canonical content ID (e.g. `"twitter:uid:123:456"`)
 * @param attesterAddress - Optional filter to a specific attester address
 * @returns Array of attestation records, or empty if no attestations exist
 */
export async function getContentAttestations(
  machinery: SDKMachinery,
  canonicalContentId: string,
  attesterAddress?: string,
): Promise<ContentAttestationRecord[]> {
  const contracts = machinery.contractAddresses;
  if (!contracts?.alignmentAttestations) {
    return [];
  }

  const subjectId = getContentSubjectId(canonicalContentId);

  const events = await fetchEvents(machinery, {
    eventName: 'AlignmentAttestation',
    topic2: subjectId,
    limit: 100,
  });

  const decodedEvents = events
    .map(e => decodeAlignmentAttestationEvent(e))
    .filter((e): e is DecodedAlignmentAttestationEvent => e !== null);

  if (decodedEvents.length === 0) {
    return [];
  }

  return selectLatestContentAttestations(decodedEvents, attesterAddress);
}

/**
 * Query the single most recent attestation for a specific content item.
 *
 * Convenience wrapper around {@link getContentAttestations} that returns
 * only the latest attestation record (or null if none exist).
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param canonicalContentId - Canonical content ID (e.g. `"twitter:uid:123:456"`)
 * @param attesterAddress - Optional filter to a specific attester address
 * @returns Latest attestation record, or null if no attestations exist
 */
export async function getContentAttestation(
  machinery: SDKMachinery,
  canonicalContentId: string,
  attesterAddress?: string,
): Promise<{ attested: boolean; attester: string; statementCid: string; topicStatementCid?: string } | null> {
  const attestations = await getContentAttestations(machinery, canonicalContentId, attesterAddress);
  const latest = attestations[0];
  if (!latest) {
    return null;
  }

  return {
    attested: latest.attested,
    attester: latest.attester,
    statementCid: latest.statementCid,
    topicStatementCid: latest.topicStatementCid,
  };
}

export interface StatementSupportingContentRecord {
  contentItem: ContentItem;
  supportAttestations: ContentAttestationRecord[];
  noninflammatoryAttestations: ContentAttestationRecord[];
}

export interface StatementSupportingContentOptions {
  noninflammatoryTopicCid?: IpfsCidV1;
  trustedAttesters?: Iterable<string>;
  limit?: number;
}

function filterAttestationsByTrustedAttesters(
  events: DecodedAlignmentAttestationEvent[],
  trustedAttesters?: Iterable<string>,
): DecodedAlignmentAttestationEvent[] {
  if (!trustedAttesters) return events;
  const trusted = new Set(Array.from(trustedAttesters, (address) => address.toLowerCase()));
  if (trusted.size === 0) return [];
  return events.filter(event => trusted.has(event.attester.toLowerCase()));
}

function selectLatestAttestationsBySubjectAndAttester(
  events: DecodedAlignmentAttestationEvent[],
): Map<string, ContentAttestationRecord[]> {
  const latest = new Map<string, DecodedAlignmentAttestationEvent>();

  for (const event of events) {
    const key = `${event.subjectId.toLowerCase()}-${event.attester.toLowerCase()}`;
    const existing = latest.get(key);
    if (
      !existing ||
      event.blockNumber > existing.blockNumber ||
      (event.blockNumber === existing.blockNumber && event.logIndex > existing.logIndex)
    ) {
      latest.set(key, event);
    }
  }

  const bySubject = new Map<string, ContentAttestationRecord[]>();
  for (const event of latest.values()) {
    const subjectKey = event.subjectId.toLowerCase();
    const records = bySubject.get(subjectKey) ?? [];
    records.push({
      attested: true,
      attester: event.attester,
      statementCid: event.statementId,
      topicStatementCid: event.topicStatementId,
      blockNumber: event.blockNumber,
    });
    bySubject.set(subjectKey, records);
  }

  for (const records of bySubject.values()) {
    records.sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) return a.blockNumber > b.blockNumber ? -1 : 1;
      return a.attester.localeCompare(b.attester);
    });
  }

  return bySubject;
}

/**
 * Return content items that have been attested as supporting a statement, joined
 * with standalone noninflammatory attestations for the same content.
 */
export async function getStatementSupportingContent(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  options: StatementSupportingContentOptions = {},
): Promise<StatementSupportingContentRecord[]> {
  const contracts = machinery.contractAddresses;
  if (!contracts?.alignmentAttestations) return [];

  const events = await fetchEvents(machinery, {
    eventName: 'AlignmentAttestation',
    topic3: cidToBytes32(statementCid),
    limit: options.limit ?? 500,
  });

  let supportEvents = events
    .map(e => decodeAlignmentAttestationEvent(e))
    .filter((e): e is DecodedAlignmentAttestationEvent => e !== null);

  if (options.noninflammatoryTopicCid) {
    supportEvents = supportEvents.filter(event => event.topicStatementId === options.noninflammatoryTopicCid);
  }
  supportEvents = filterAttestationsByTrustedAttesters(supportEvents, options.trustedAttesters);
  if (supportEvents.length === 0) return [];

  const contentFunding = await fetchAndFoldContentFundingState(machinery);
  if (!contentFunding) return [];

  const contentBySubject = new Map<string, ContentItem>();
  for (const item of uniqueContentItems(contentFunding.state)) {
    contentBySubject.set(getContentSubjectId(item.canonicalId).toLowerCase(), item);
  }

  const supportBySubject = selectLatestAttestationsBySubjectAndAttester(supportEvents);
  const candidateSubjects = Array.from(supportBySubject.keys()).filter(subject => contentBySubject.has(subject));
  if (candidateSubjects.length === 0) return [];

  const noninflammatoryBySubject = new Map<string, ContentAttestationRecord[]>();
  await Promise.all(candidateSubjects.map(async (subject) => {
    const item = contentBySubject.get(subject);
    if (!item) return;
    const subjectEvents = await fetchEvents(machinery, {
      eventName: 'AlignmentAttestation',
      topic2: getContentSubjectId(item.canonicalId),
      limit: 100,
    });
    let decoded = subjectEvents
      .map(e => decodeAlignmentAttestationEvent(e))
      .filter((e): e is DecodedAlignmentAttestationEvent => e !== null);
    if (options.noninflammatoryTopicCid) {
      decoded = decoded.filter(event => (
        event.statementId === options.noninflammatoryTopicCid &&
        event.topicStatementId === options.noninflammatoryTopicCid
      ));
    }
    decoded = filterAttestationsByTrustedAttesters(decoded, options.trustedAttesters);
    noninflammatoryBySubject.set(subject, selectLatestAttestationsBySubjectAndAttester(decoded).get(subject) ?? []);
  }));

  return candidateSubjects
    .map((subject) => ({
      contentItem: contentBySubject.get(subject)!,
      supportAttestations: supportBySubject.get(subject) ?? [],
      noninflammatoryAttestations: noninflammatoryBySubject.get(subject) ?? [],
    }))
    .filter(record => record.noninflammatoryAttestations.length > 0)
    .sort((a, b) => {
      const aBlock = a.supportAttestations[0]?.blockNumber ?? 0n;
      const bBlock = b.supportAttestations[0]?.blockNumber ?? 0n;
      if (aBlock !== bBlock) return aBlock > bBlock ? -1 : 1;
      return a.contentItem.canonicalId.localeCompare(b.contentItem.canonicalId);
    });
}
