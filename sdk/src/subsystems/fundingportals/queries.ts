/**
 * Queries for Funding Portals subsystem (AlignmentAttestations)
 *
 * All queries use event cache + folds + chain reads.
 */

import { fetchEvents } from '../../utils/eventCacheClient.js';
import {
  decodeAlignmentAttestationEvent,
  decodeAssuranceContractInitializedEvent,
  decodeImplicationAttestationEvent,
  decodeSuccessAttestationEvent,
} from '../../utils/eventDecoder.js';
import { foldAlignmentAttestations } from './folds.js';
import { getProject, getProjectContributions, getProjectRefunds } from '../lazy-giving/queries.js';
import { getNote, getNoteIntentAttestationsByStatement } from '../delegation/queries.js';
import {
  type AlignmentAttestation,
  type SuccessAttestation,
  type IndirectSubjectAlignment,
  type IndirectSubjectSuccess,
  type CauseFundingMetrics,
  type ContributorStats,
  type SuccessfulProjectForCause,
} from './types.js';
import { IpfsCidV1, normalizeCidV1, cidToBytes32 } from '../../utils/cid-types.js';
import { padAddressAsTopic } from '../../utils/eventCacheClient.js';
import { SDKMachinery } from '../../machinery.js';
import {
  addCurrencyAmount,
  currencyTotalsToArray,
  ETH_CURRENCY,
  getCurrencyForTokenValue,
  getCurrencyKey,
  type Currency,
  type CurrencyAmountBigInt,
} from '../../utils/currency.js';
import { readProjectFundingSnapshots } from '../../utils/chain-reads.js';

function addAmountToCurrencyList(
  totals: CurrencyAmountBigInt[],
  currency: Currency,
  amount: bigint,
): CurrencyAmountBigInt[] {
  const map = new Map<string, CurrencyAmountBigInt>();
  for (const entry of totals) {
    map.set(getCurrencyKey(entry.currency), { ...entry });
  }
  addCurrencyAmount(map, currency, amount);
  return currencyTotalsToArray(map);
}

function compareCurrencyTotals(
  a: CurrencyAmountBigInt[],
  b: CurrencyAmountBigInt[],
): number | null {
  const normalize = (totals: CurrencyAmountBigInt[]) =>
    [...totals]
      .map((entry) => ({ key: getCurrencyKey(entry.currency), amount: entry.amount }))
      .sort((left, right) => left.key.localeCompare(right.key));

  const normalizedA = normalize(a);
  const normalizedB = normalize(b);

  if (normalizedA.length !== normalizedB.length) {
    return null;
  }

  for (let i = 0; i < normalizedA.length; i += 1) {
    if (normalizedA[i].key !== normalizedB[i].key) {
      return null;
    }
  }

  for (let i = 0; i < normalizedA.length; i += 1) {
    if (normalizedA[i].amount > normalizedB[i].amount) return -1;
    if (normalizedA[i].amount < normalizedB[i].amount) return 1;
  }

  return 0;
}

export type TrustedAddressInput = string | Iterable<string>;

function normalizeTrustedAddresses(
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

function normalizeSubjectIdForTopic(subjectId: string): `0x${string}` {
  if (/^0x[0-9a-fA-F]{40}$/.test(subjectId)) {
    return padAddressAsTopic(subjectId) as `0x${string}`;
  }
  return subjectId.toLowerCase() as `0x${string}`;
}

function cidReferencesSameDigest(left: string, right: string): boolean {
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

function dedupeAlignedProjects<T extends {
  projectAddress: string;
  alignmentType: 'direct' | 'indirect';
}>(projects: T[]): T[] {
  const deduped = new Map<string, T>();

  for (const project of projects) {
    const key = project.projectAddress.toLowerCase();
    const existing = deduped.get(key);

    if (!existing || (existing.alignmentType === 'indirect' && project.alignmentType === 'direct')) {
      deduped.set(key, project);
    }
  }

  return [...deduped.values()];
}

export function noteIntentNoteLookupKey(attestation: { noteContract: string; noteId: string }): string {
  return `${attestation.noteContract.toLowerCase()}:${attestation.noteId}`;
}

// ============================================================================
// AlignmentAttestation Queries (Event Cache + Folds)
// ============================================================================

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
  const events = await fetchEvents(machinery, {
    eventName: 'AlignmentAttestation',
    topic3: cidToBytes32(statementCid),
    limit: 10000,
  });
  
  const decodedEvents = events
    .map(e => decodeAlignmentAttestationEvent(e))
    .filter((e): e is NonNullable<typeof e> => e !== null);
  
  let attestations = foldAlignmentAttestations(decodedEvents);
  
  const trustedAddresses = normalizeTrustedAddresses(trustedAlignmentAttesters);
  if (trustedAddresses) {
    attestations = attestations.filter(a => trustedAddresses.has(a.attester.toLowerCase()));
  }
  
  return attestations.map(a => ({
    attester: a.attester,
    subjectId: a.subjectId,
    statementCid: a.statementCid,
    topicStatementCid,
    createdAt: a.createdAt,
    blockNumber: a.blockNumber,
  }));
}

// Backwards compatibility alias
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
  const events = await fetchEvents(machinery, {
    eventName: 'AlignmentAttestation',
    topic2: normalizeSubjectIdForTopic(subjectId),
    limit: 10000,
  });

  const decodedEvents = events
    .map(e => decodeAlignmentAttestationEvent(e))
    .filter((e): e is NonNullable<typeof e> => e !== null);

  let attestations = foldAlignmentAttestations(decodedEvents);

  if (topicStatementCid) {
    attestations = attestations.filter(a => {
      const foldedTopic = a.topicStatementCid ?? '';
      return foldedTopic === '' || cidReferencesSameDigest(foldedTopic, topicStatementCid);
    });
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

// Backwards compatibility alias
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
  const events = await fetchEvents(machinery, {
    eventName: 'AlignmentAttestation',
    topic3: cidToBytes32(statementCid),
    topic2: normalizeSubjectIdForTopic(subjectId),
    limit: 1000,
  });

  const decodedEvents = events
    .map(e => decodeAlignmentAttestationEvent(e))
    .filter((e): e is NonNullable<typeof e> => e !== null);

  const attesterLower = attesterAddress.toLowerCase();
  const matching = decodedEvents.filter(e => e.attester.toLowerCase() === attesterLower);

  if (matching.length === 0) {
    return null;
  }

  const latest = matching[matching.length - 1];
  return {
    attester: latest.attester,
    subjectId: latest.subjectId,
    statementCid: latest.statementId as IpfsCidV1,
    topicStatementCid,
    createdAt: '',
    blockNumber: '',
  };
}

// Backwards compatibility alias
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
  const events = await fetchEvents(machinery, {
    eventName: 'AlignmentAttestation',
    topic1: padAddressAsTopic(attesterAddress),
    limit: 10000,
  });

  const decodedEvents = events
    .map(e => decodeAlignmentAttestationEvent(e))
    .filter((e): e is NonNullable<typeof e> => e !== null);

  const attestations = foldAlignmentAttestations(decodedEvents);

  return attestations.map(a => ({
    attester: a.attester,
    subjectId: a.subjectId,
    statementCid: normalizeCidV1(a.statementCid),
    topicStatementCid,
    createdAt: a.createdAt,
    blockNumber: a.blockNumber,
  }));
}

// ============================================================================
// Indirect Alignment Queries (via Implication Graph) - Mixed approach
// ============================================================================

/**
 * Get subjects that are indirectly aligned with a statement via the implication graph.
 *
 * A subject is indirectly aligned with statement S2 if:
 * - The subject is directly aligned with statement S1
 * - S1 implies S2 (according to a trusted attester)
 */
export async function getIndirectlyAlignedSubjects(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  trustedImplicationAttesters?: TrustedAddressInput,
  trustedAlignmentAttesters?: TrustedAddressInput
): Promise<IndirectSubjectAlignment[]> {
  // ImplicationAttestation: topic1=attester, topic2=fromStatementCid, topic3=toStatementCid (all bytes32)
  const toEvents = await fetchEvents(machinery, {
    eventName: 'ImplicationAttestation',
    topic3: cidToBytes32(statementCid),
    limit: 10000,
  });

  const decodedImplicationEvents = toEvents.map(e => decodeImplicationAttestationEvent(e)).filter((e): e is NonNullable<typeof e> => e !== null);

  let implications = decodedImplicationEvents;

  const trustedImplicationAttesterSet = normalizeTrustedAddresses(trustedImplicationAttesters);
  if (trustedImplicationAttesterSet) {
    implications = implications.filter(i => trustedImplicationAttesterSet.has(i.attester.toLowerCase()));
  }

  if (implications.length === 0) {
    return [];
  }

  const indirectAlignments: IndirectSubjectAlignment[] = [];

  for (const implication of implications) {
    const fromStatementCid = normalizeCidV1(implication.fromStatementCid);
    const alignments = await getAlignedSubjects(
      machinery,
      fromStatementCid,
      trustedAlignmentAttesters
    );

    for (const alignment of alignments) {
      indirectAlignments.push({
        subjectId: alignment.subjectId,
        directStatementCid: fromStatementCid,
        indirectStatementCid: statementCid,
        attester: alignment.attester,
      });
    }
  }

  return indirectAlignments;
}

// Backwards compatibility alias
export const getIndirectlyAlignedProjects = getIndirectlyAlignedSubjects;

// ============================================================================
// Success Attestation Queries
// ============================================================================

/** Get all success attestations for a specific statement. */
export async function getSuccessfulSubjects(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  trustedSuccessAttesters?: TrustedAddressInput,
  topicStatementCid?: IpfsCidV1,
): Promise<SuccessAttestation[]> {
  const events = await fetchEvents(machinery, {
    eventName: 'SuccessAttestation',
    topic3: cidToBytes32(statementCid),
    limit: 10000,
  });

  const decodedEvents = events
    .map(e => decodeSuccessAttestationEvent(e))
    .filter((e): e is NonNullable<typeof e> => e !== null);

  let attestations = foldAlignmentAttestations(decodedEvents);

  const trustedAddresses = normalizeTrustedAddresses(trustedSuccessAttesters);
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

/** Get successful subjects that propagate to a cause via implication attestations. */
export async function getSubjectSuccessStatements(
  machinery: SDKMachinery,
  subjectAddressOrId: string,
  trustedSuccessAttesters?: TrustedAddressInput,
): Promise<SuccessAttestation[]> {
  const subjectId = subjectAddressOrId.length === 42
    ? padAddressAsTopic(subjectAddressOrId as `0x${string}`)
    : subjectAddressOrId;

  const events = await fetchEvents(machinery, {
    eventName: 'SuccessAttestation',
    topic2: subjectId as `0x${string}`,
    limit: 10000,
  });

  const decodedEvents = events
    .map(e => decodeSuccessAttestationEvent(e))
    .filter((e): e is NonNullable<typeof e> => e !== null);

  let attestations = foldAlignmentAttestations(decodedEvents);
  const trustedAddresses = normalizeTrustedAddresses(trustedSuccessAttesters);
  if (trustedAddresses) {
    attestations = attestations.filter(a => trustedAddresses.has(a.attester.toLowerCase()));
  }

  return attestations.map(a => ({
    attester: a.attester,
    subjectId: a.subjectId,
    statementCid: a.statementCid,
    topicStatementCid: a.topicStatementCid,
    createdAt: a.createdAt,
    blockNumber: a.blockNumber,
  }));
}

export async function getIndirectlySuccessfulSubjects(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  trustedImplicationAttesters?: TrustedAddressInput,
  trustedSuccessAttesters?: TrustedAddressInput,
): Promise<IndirectSubjectSuccess[]> {
  const toEvents = await fetchEvents(machinery, {
    eventName: 'ImplicationAttestation',
    topic3: cidToBytes32(statementCid),
    limit: 10000,
  });

  const decodedImplicationEvents = toEvents.map(e => decodeImplicationAttestationEvent(e)).filter((e): e is NonNullable<typeof e> => e !== null);

  let implications = decodedImplicationEvents;
  const trustedImplicationAttesterSet = normalizeTrustedAddresses(trustedImplicationAttesters);
  if (trustedImplicationAttesterSet) {
    implications = implications.filter(i => trustedImplicationAttesterSet.has(i.attester.toLowerCase()));
  }

  const indirectSuccesses: IndirectSubjectSuccess[] = [];
  for (const implication of implications) {
    const fromStatementCid = normalizeCidV1(implication.fromStatementCid);
    const successes = await getSuccessfulSubjects(machinery, fromStatementCid, trustedSuccessAttesters);
    for (const success of successes) {
      indirectSuccesses.push({
        subjectId: success.subjectId,
        directStatementCid: fromStatementCid,
        indirectStatementCid: statementCid,
        attester: success.attester,
      });
    }
  }

  return indirectSuccesses;
}

function parseJsonBigIntArray(value: string): bigint[] {
  try {
    const parsed = JSON.parse(value) as Array<string | number>;
    return parsed.map((entry) => BigInt(entry));
  } catch {
    return [];
  }
}

/**
 * Per-attester transitive trust weights for success-confidence scoring.
 *
 * Accepts any iterable of `[address, score]` pairs, a `Map<string, number>`, or a plain address->score
 * record. Addresses are normalized to lowercase; scores should be the viewer's cumulative transitive
 * trust score for that attester (0-100, as produced by the Subjectiv trust graph).
 */
export type TrustWeightInput =
  | Iterable<readonly [string, number]>
  | Map<string, number>
  | Record<string, number>;

export function normalizeTrustWeights(trustWeights?: TrustWeightInput): Map<string, number> | null {
  if (!trustWeights) return null;

  const map = new Map<string, number>();
  const add = (address: string, score: number): void => {
    if (Number.isFinite(score) && score > 0) {
      map.set(address.toLowerCase(), score);
    }
  };

  if (trustWeights instanceof Map) {
    for (const [address, score] of trustWeights) add(address, score);
  } else if (Array.isArray(trustWeights)) {
    for (const [address, score] of trustWeights) add(address, score);
  } else {
    for (const [address, score] of Object.entries(trustWeights)) add(address, score);
  }

  return map.size > 0 ? map : null;
}

/**
 * Sum `factor` vouch-units across `attesters`, each scaled by its trust weight (0-100 -> 0-1).
 * A fully-trusted (100) direct vouch contributes `factor` units; weaker trust contributes proportionally
 * less. This keeps the weighted score on the same scale as the count-based score (a project backed only
 * by fully-trusted direct attesters scores the same as `directCount * factor`).
 */
function weightedVouchSum(attesters: Set<string>, weights: Map<string, number>, factor: number): number {
  let sum = 0;
  for (const attester of attesters) {
    const score = weights.get(attester.toLowerCase()) ?? 0;
    sum += (factor * score) / 100;
  }
  return sum;
}

/**
 * Success confidence score used to rank successful projects on a cause board.
 *
 * Without trust weights this is the flat vouch count `directAttesters*2 + indirectAttesters*1`
 * (direct vouches count twice as much as implication-derived vouches). When `trustWeights` are
 * supplied, each vouch is scaled by the viewer's transitive trust score for its attester, so a vouch
 * from the core of the viewer's network counts more than one from the periphery. The weighted score
 * stays on the same scale: if every attester is fully trusted (weight 100) it equals the count-based
 * score, and weaker trust discounts proportionally.
 */
export function calculateSuccessConfidenceScore(
  success: { directAttesters: Iterable<string>; indirectAttesters: Iterable<string> },
  trustWeights?: TrustWeightInput,
): bigint {
  const directAttesters = new Set(success.directAttesters);
  const indirectAttesters = new Set(success.indirectAttesters);
  const weights = normalizeTrustWeights(trustWeights);
  if (weights) {
    const weighted =
      weightedVouchSum(directAttesters, weights, 2) +
      weightedVouchSum(indirectAttesters, weights, 1);
    return BigInt(Math.round(weighted));
  }
  return BigInt(directAttesters.size * 2 + indirectAttesters.size);
}

async function getReceiptReimbursementSnapshot(machinery: SDKMachinery, projectAddress: string) {
  const project = await getProject(machinery, projectAddress);
  if (!project?.erc1155Address) {
    return { outstandingReceipts: 0n, outstandingUnreimbursedAmount: 0n, scoutRecords: [] };
  }

  const contributions = await getProjectContributions(machinery, projectAddress);

  // Receipts are permanent recognition of contributions in the reimbursement model.
  // They are no longer consumed to signal a donation; reimbursement state is tracked
  // separately from receipt-token balances.
  const outstandingReceipts = contributions.reduce((total, contribution) => (
    total + parseJsonBigIntArray(contribution.tokenCounts).reduce((sum, count) => sum + count, 0n)
  ), 0n);

  const scouts = new Map<string, bigint>();
  for (const contribution of contributions) {
    const key = contribution.participant.toLowerCase();
    scouts.set(key, (scouts.get(key) ?? 0n) + BigInt(contribution.totalCost));
  }
  const totalEarlyContributions = [...scouts.values()].reduce((sum, amount) => sum + amount, 0n);

  return {
    outstandingReceipts,
    outstandingUnreimbursedAmount: totalEarlyContributions,
    scoutRecords: [...scouts.entries()].map(([scout, scoutedAmount]) => ({
      scout,
      scoutedAmount: scoutedAmount.toString(),
      reimbursedAmount: '0',
      outstandingAmount: scoutedAmount.toString(),
    })),
  };
}

/**
 * Get projects that have trusted success attestations for a cause and still have outstanding receipts.
 */
export async function getSuccessfulProjectsForCause(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  trustedImplicationAttesters?: TrustedAddressInput,
  trustedSuccessAttesters?: TrustedAddressInput,
  trustWeights?: TrustWeightInput,
): Promise<SuccessfulProjectForCause[]> {
  const weightsMap = normalizeTrustWeights(trustWeights);
  const [directSuccesses, indirectSuccesses] = await Promise.all([
    getSuccessfulSubjects(machinery, statementCid, trustedSuccessAttesters),
    getIndirectlySuccessfulSubjects(machinery, statementCid, trustedImplicationAttesters, trustedSuccessAttesters),
  ]);

  const projectMap = new Map<string, { successType: 'direct' | 'indirect'; directAttesters: Set<string>; indirectAttesters: Set<string> }>();
  for (const success of directSuccesses) {
    const key = success.subjectId.toLowerCase();
    const entry = projectMap.get(key) ?? { successType: 'direct' as const, directAttesters: new Set<string>(), indirectAttesters: new Set<string>() };
    entry.successType = 'direct';
    entry.directAttesters.add(success.attester);
    projectMap.set(key, entry);
  }
  for (const success of indirectSuccesses) {
    const key = success.subjectId.toLowerCase();
    const entry = projectMap.get(key) ?? { successType: 'indirect' as const, directAttesters: new Set<string>(), indirectAttesters: new Set<string>() };
    entry.indirectAttesters.add(success.attester);
    projectMap.set(key, entry);
  }

  const projects = [...projectMap.entries()].map(([subjectId, success]) => ({
    projectAddress: `0x${subjectId.slice(-40)}` as `0x${string}`,
    success,
  }));

  const rows = await Promise.all(projects.map(async ({ projectAddress, success }) => {
    const [project, reimbursement] = await Promise.all([
      getProject(machinery, projectAddress).catch(() => null),
      getReceiptReimbursementSnapshot(machinery, projectAddress).catch(() => ({ outstandingReceipts: 0n, outstandingUnreimbursedAmount: 0n, scoutRecords: [] })),
    ]);
    if (!project || reimbursement.outstandingReceipts <= 0n) return null;
    return {
      projectAddress: project.id,
      successType: success.successType,
      fundingCurrency: project.fundingCurrency,
      totalReceived: project.totalReceived,
      threshold: project.threshold,
      deadline: project.deadline,
      outstandingReceipts: reimbursement.outstandingReceipts.toString(),
      outstandingUnreimbursedAmount: reimbursement.outstandingUnreimbursedAmount.toString(),
      scoutRecords: reimbursement.scoutRecords,
      successConfidenceScore: calculateSuccessConfidenceScore(success, weightsMap ?? undefined).toString(),
      successConfidenceBasis: (weightsMap ? 'trust-weighted' : 'attester-count') as 'trust-weighted' | 'attester-count',
      successAttesters: [...new Set([...success.directAttesters, ...success.indirectAttesters])],
    };
  }));

  return rows
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => {
      const scoreA = BigInt(a.outstandingReceipts) * BigInt(a.successConfidenceScore);
      const scoreB = BigInt(b.outstandingReceipts) * BigInt(b.successConfidenceScore);
      if (scoreA > scoreB) return -1;
      if (scoreA < scoreB) return 1;
      return a.projectAddress.localeCompare(b.projectAddress);
    });
}

// ============================================================================
// Aggregated Funding Metrics (E2) - Event Cache + Chain Reads
// ============================================================================

/**
 * Get total funding raised for a cause (across all aligned projects).
 * Includes both direct and indirect alignments.
 */
export async function getTotalFundingForCause(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  trustedImplicationAttesters?: TrustedAddressInput,
  trustedAlignmentAttesters?: TrustedAddressInput
): Promise<CauseFundingMetrics> {
  const allAlignedProjects = await getAllAlignedProjectsForCause(
    machinery,
    statementCid,
    trustedImplicationAttesters,
    trustedAlignmentAttesters
  );

  const totalRaised = new Map<string, CurrencyAmountBigInt>();
  for (const project of allAlignedProjects) {
    addCurrencyAmount(totalRaised, project.fundingCurrency, BigInt(project.totalReceived));
  }

  const statementCids = new Set<string>([statementCid]);
  const indirectAlignments = await getIndirectlyAlignedSubjects(
    machinery,
    statementCid,
    trustedImplicationAttesters,
    trustedAlignmentAttesters,
  );
  for (const alignment of indirectAlignments) {
    statementCids.add(alignment.directStatementCid);
  }

  const noteAttestations = (
    await Promise.all(
      [...statementCids].map((cid) => getNoteIntentAttestationsByStatement(machinery, cid))
    )
  ).flat();

  const noteTotals = new Map<string, CurrencyAmountBigInt>();
  let noteCount = 0;
  const noteKeys = [...new Set(noteAttestations.map(noteIntentNoteLookupKey))];
  const notes = await Promise.all(noteKeys.map((noteKey) => getNote(machinery, noteKey).catch(() => null)));
  for (const note of notes) {
    if (!note || !note.active) continue;
    addCurrencyAmount(noteTotals, getCurrencyForTokenValue(note), BigInt(note.amount));
    noteCount += 1;
  }

  return {
    totalRaisedAcrossProjects: currencyTotalsToArray(totalRaised),
    totalAvailableFromNotes: currencyTotalsToArray(noteTotals),
    projectCount: allAlignedProjects.length,
    noteCount,
  };
}

/**
 * Get all projects aligned with a cause (both direct and indirect).
 * Returns projects with their alignment type and total raised.
 */
export async function getAllAlignedProjectsForCause(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  trustedImplicationAttesters?: TrustedAddressInput,
  trustedAlignmentAttesters?: TrustedAddressInput
): Promise<Array<{
  projectAddress: string;
  alignmentType: 'direct' | 'indirect';
  fundingCurrency: Currency;
  totalReceived: string;
  threshold: string;
  deadline: string;
}>> {
  const directAlignments = await getAlignedSubjects(
    machinery,
    statementCid,
    trustedAlignmentAttesters
  );

  const indirectAlignments = await getIndirectlyAlignedSubjects(
    machinery,
    statementCid,
    trustedImplicationAttesters,
    trustedAlignmentAttesters
  );

  const projectMap = new Map<string, 'direct' | 'indirect'>();
  directAlignments.forEach(a =>
    projectMap.set(a.subjectId.toLowerCase(), 'direct')
  );
  indirectAlignments.forEach(a => {
    const addr = a.subjectId.toLowerCase();
    if (!projectMap.has(addr)) {
      projectMap.set(addr, 'indirect');
    }
  });

  const alignedProjects = [...projectMap.entries()].map(([subjectId, alignmentType]) => ({
    // subjectId is bytes32 (left-padded address); extract the last 20 bytes as an address
    projectAddress: `0x${subjectId.slice(-40)}` as `0x${string}`,
    alignmentType,
  }));

  if (alignedProjects.length === 0) {
    return [];
  }

  if (machinery.publicClient) {
    const initializedEvents = await Promise.all(
      alignedProjects.map(async ({ projectAddress }) => {
        const events = await fetchEvents(machinery, {
          contractAddress: projectAddress,
          eventName: 'AssuranceContractInitialized',
          limit: 1,
        });

        const decoded = events
          .map((event) => decodeAssuranceContractInitializedEvent(event))
          .find((event): event is NonNullable<typeof event> => event !== null);

        return decoded ? { projectAddress, conditionAddress: decoded.condition } : null;
      }),
    );

    const projectsWithCondition = initializedEvents.filter(
      (project): project is NonNullable<typeof project> => project !== null,
    );

    if (projectsWithCondition.length === 0) {
      return [];
    }

    const projectAlignmentType = new Map(
      alignedProjects.map((project) => [project.projectAddress.toLowerCase(), project.alignmentType]),
    );
    const snapshots = await readProjectFundingSnapshots(machinery, projectsWithCondition);

    return dedupeAlignedProjects(snapshots.map((snapshot) => ({
      projectAddress: snapshot.projectAddress,
      alignmentType: projectAlignmentType.get(snapshot.projectAddress.toLowerCase()) ?? 'direct',
      // Projects are ETH-only today; revisit when smart contracts support multiple currencies.
      fundingCurrency: ETH_CURRENCY,
      totalReceived: snapshot.totalReceived.toString(),
      threshold: snapshot.threshold.toString(),
      deadline: snapshot.deadline.toString(),
    })));
  }

  const projects = await Promise.all(
    alignedProjects.map(async ({ projectAddress, alignmentType }) => {
      const project = await getProject(machinery, projectAddress);
      if (!project) return null;

      return {
        projectAddress: project.id,
        alignmentType,
        fundingCurrency: project.fundingCurrency,
        totalReceived: project.totalReceived,
        threshold: project.threshold,
        deadline: project.deadline,
      };
    }),
  );

  return dedupeAlignedProjects(
    projects.filter((project): project is NonNullable<typeof project> => project !== null),
  );
}

// ============================================================================
// Contributor Leaderboards (E3) - Event Cache + Chain Reads
// ============================================================================

/**
 * Get top contributors for a specific cause (across all aligned projects).
 */
export async function getTopContributorsForCause(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  limit: number = 10,
  trustedImplicationAttesters?: TrustedAddressInput,
  trustedAlignmentAttesters?: TrustedAddressInput
): Promise<ContributorStats[]> {
  const alignedProjects = await getAllAlignedProjectsForCause(
    machinery,
    statementCid,
    trustedImplicationAttesters,
    trustedAlignmentAttesters
  );

  if (alignedProjects.length === 0) {
    return [];
  }

  const participantMap = new Map<string, ContributorStats>();

  const projectHistories = await Promise.all(
    alignedProjects.map(async (project) => {
      const [contributions, refunds] = await Promise.all([
        getProjectContributions(machinery, project.projectAddress),
        getProjectRefunds(machinery, project.projectAddress),
      ]);

      return { project, contributions, refunds };
    }),
  );

  for (const { project, contributions, refunds } of projectHistories) {

    // Build per-participant refund totals for this project
    const refundsByParticipant = new Map<string, bigint>();
    for (const refund of refunds) {
      const addr = refund.participant.toLowerCase();
      refundsByParticipant.set(addr, (refundsByParticipant.get(addr) ?? 0n) + BigInt(refund.totalRefund));
    }

    // Aggregate contributions per participant for this project
    const projectParticipants = new Map<string, { totalContributed: bigint; count: number; firstAt?: bigint; lastAt?: bigint }>();
    for (const c of contributions) {
      const addr = c.participant.toLowerCase();
      const existing = projectParticipants.get(addr);
      const ts = BigInt(c.createdAt);
      if (existing) {
        existing.totalContributed += BigInt(c.totalCost);
        existing.count += 1;
        if (ts < (existing.firstAt ?? ts + 1n)) existing.firstAt = ts;
        if (ts > (existing.lastAt ?? 0n)) existing.lastAt = ts;
      } else {
        projectParticipants.set(addr, { totalContributed: BigInt(c.totalCost), count: 1, firstAt: ts, lastAt: ts });
      }
    }

    // Merge into the cross-project participantMap
    for (const [participant, stats] of projectParticipants.entries()) {
      const totalRefunded = refundsByParticipant.get(participant) ?? 0n;
      const netContribution = stats.totalContributed - totalRefunded;
      const existing = participantMap.get(participant);

      if (existing) {
        existing.totalContributed = addAmountToCurrencyList(
          existing.totalContributed,
          project.fundingCurrency,
          stats.totalContributed,
        );
        existing.totalRefunded = addAmountToCurrencyList(
          existing.totalRefunded,
          project.fundingCurrency,
          totalRefunded,
        );
        existing.netContribution = addAmountToCurrencyList(
          existing.netContribution,
          project.fundingCurrency,
          netContribution,
        );
        existing.contributionCount += stats.count;
        existing.projectsContributedTo += 1;

        if (stats.firstAt !== undefined) {
          if (!existing.firstContributionAt || stats.firstAt < existing.firstContributionAt) {
            existing.firstContributionAt = stats.firstAt;
          }
        }
        if (stats.lastAt !== undefined) {
          if (!existing.lastContributionAt || stats.lastAt > existing.lastContributionAt) {
            existing.lastContributionAt = stats.lastAt;
          }
        }
      } else {
        participantMap.set(participant, {
          participant,
          totalContributed: addAmountToCurrencyList([], project.fundingCurrency, stats.totalContributed),
          totalRefunded: addAmountToCurrencyList([], project.fundingCurrency, totalRefunded),
          netContribution: addAmountToCurrencyList([], project.fundingCurrency, netContribution),
          contributionCount: stats.count,
          firstContributionAt: stats.firstAt,
          lastContributionAt: stats.lastAt,
          projectsContributedTo: 1,
        });
      }
    }
  }

  return Array.from(participantMap.values())
    .sort((a, b) => {
      const comparableAmounts = compareCurrencyTotals(a.netContribution, b.netContribution);
      if (comparableAmounts !== null) {
        return comparableAmounts;
      }

      if (a.projectsContributedTo !== b.projectsContributedTo) {
        return b.projectsContributedTo - a.projectsContributedTo;
      }
      if (a.contributionCount !== b.contributionCount) {
        return b.contributionCount - a.contributionCount;
      }
      if ((a.lastContributionAt ?? 0n) > (b.lastContributionAt ?? 0n)) return -1;
      if ((a.lastContributionAt ?? 0n) < (b.lastContributionAt ?? 0n)) return 1;
      return a.participant.localeCompare(b.participant);
    })
    .slice(0, limit);
}

/**
 * Get a user's contribution rank for a specific cause.
 */
export async function getUserContributionRankForCause(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  userAddress: string,
  trustedImplicationAttesters?: TrustedAddressInput,
  trustedAlignmentAttesters?: TrustedAddressInput
): Promise<{
  rank: number;
  stats: ContributorStats | null;
  totalContributors: number;
} | null> {
  const allContributors = await getTopContributorsForCause(
    machinery,
    statementCid,
    1000000,
    trustedImplicationAttesters,
    trustedAlignmentAttesters
  );

  const userAddr = userAddress.toLowerCase();
  const userIndex = allContributors.findIndex(c => c.participant.toLowerCase() === userAddr);

  if (userIndex === -1) {
    return {
      rank: 0,
      stats: null,
      totalContributors: allContributors.length,
    };
  }

  return {
    rank: userIndex + 1,
    stats: allContributors[userIndex],
    totalContributors: allContributors.length,
  };
}
