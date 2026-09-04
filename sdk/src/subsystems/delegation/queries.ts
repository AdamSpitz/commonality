/**
 * Delegation queries — event cache + folds (no GraphQL)
 */

import {
  type Note,
  type NoteIntentAttestation,
  type DelegationChainLink,
  type DelegationChainLinkWithNote,
  type NoteEvent,
  type NoteIntentAggregate,
  type DonationActivity,
  type StandingPledge,
} from './types.js';
import type { NoteIntentAttestedEvent } from './events.js';
import { SDKMachinery } from '../../machinery.js';
import { fetchAllDelegationEvents, fetchAllDelegationEventsComplete, fetchAllNoteIntentEvents, fetchAllNoteIntentEventsComplete } from '../../utils/eventCacheClient.js';
import {
  decodeNoteCreatedEvent,
  decodeNoteDelegatedEvent,
  decodeChainSplitEvent,
  decodeNoteRevokedEvent,
  decodeFundsReclaimedEvent,
  decodeNoteConsumedEvent,
  decodeERC1155PurchasedEvent,
  decodeRefundedIntoNoteEvent,
  decodeReimbursementClaimedIntoNoteEvent,
  decodeNoteIntentAttestedEvent,
} from '../../utils/eventDecoder.js';
import { foldDelegationState, foldNote, foldNoteIntentAttestations, uniqueNotes, type DelegationEvent } from './folds.js';
import { getAllProjects, type Project } from '../lazy-giving/index.js';
import { getStandingPledges } from './recurring-pledges.js';

function decodeDelegationEvents(rawEvents: Awaited<ReturnType<typeof fetchAllDelegationEvents>>): DelegationEvent[] {
  const events: DelegationEvent[] = [];
  for (const raw of rawEvents) {
    switch (raw.eventName) {
      case 'NoteCreated': {
        const d = decodeNoteCreatedEvent(raw);
        if (d) events.push({ type: 'noteCreated', event: d });
        break;
      }
      case 'NoteDelegated': {
        const d = decodeNoteDelegatedEvent(raw);
        if (d) events.push({ type: 'noteDelegated', event: d });
        break;
      }
      case 'ChainSplit': {
        const d = decodeChainSplitEvent(raw);
        if (d) events.push({ type: 'chainSplit', event: d });
        break;
      }
      case 'NoteRevoked': {
        const d = decodeNoteRevokedEvent(raw);
        if (d) events.push({ type: 'noteRevoked', event: d });
        break;
      }
      case 'FundsReclaimed': {
        const d = decodeFundsReclaimedEvent(raw);
        if (d) events.push({ type: 'fundsReclaimed', event: d });
        break;
      }
      case 'NoteConsumed': {
        const d = decodeNoteConsumedEvent(raw);
        if (d) events.push({ type: 'noteConsumed', event: d });
        break;
      }
      case 'ERC1155Purchased': {
        const d = decodeERC1155PurchasedEvent(raw);
        if (d) events.push({ type: 'erc1155Purchased', event: d });
        break;
      }
      case 'RefundedIntoNote': {
        const d = decodeRefundedIntoNoteEvent(raw);
        if (d) events.push({ type: 'refundedIntoNote', event: d });
        break;
      }
      case 'ReimbursementClaimedIntoNote': {
        const d = decodeReimbursementClaimedIntoNoteEvent(raw);
        if (d) events.push({ type: 'reimbursementClaimedIntoNote', event: d });
        break;
      }
    }
  }
  return events.sort((a, b) => {
    const bn = Number(a.event.blockNumber - b.event.blockNumber);
    return bn !== 0 ? bn : a.event.logIndex - b.event.logIndex;
  });
}

function atOrBefore(event: { blockNumber: bigint; logIndex: number }, boundary: { blockNumber: bigint; logIndex: number }) {
  return event.blockNumber < boundary.blockNumber
    || (event.blockNumber === boundary.blockNumber && event.logIndex <= boundary.logIndex);
}

/**
 * Project allocations attributable to a root depositor, folded from note lineage.
 * One record represents one purchase transaction; subsequent receipt lifecycle
 * events update its status instead of becoming duplicate activity rows.
 */
export function foldDonationActivityByRoot(
  rootAddress: string,
  events: DelegationEvent[],
  intentEvents: NoteIntentAttestedEvent[],
  projects: Project[],
  standingPledges: StandingPledge[] = [],
): DonationActivity[] {
  const root = rootAddress.toLowerCase();
  const { notes } = foldDelegationState(events);
  const noteFor = (contract: string, id: bigint) => notes.get(`${contract.toLowerCase()}:${id}`);
  const projectByReceipt = new Map(projects.map(project => [project.erc1155Address.toLowerCase(), project]));
  const purchases = events.filter((event): event is Extract<DelegationEvent, { type: 'erc1155Purchased' }> => event.type === 'erc1155Purchased');

  return purchases.flatMap(({ event: purchase }) => {
    const contract = purchase.contractAddress.toLowerCase();
    const rootedInputs = purchase.inputNoteIds.filter(id => noteFor(contract, id)?.rootOwner.toLowerCase() === root);
    if (rootedInputs.length === 0) return [];
    const rootedInputSet = new Set(rootedInputs.map(String));
    const allInputsRootedHere = rootedInputs.length === purchase.inputNoteIds.length;
    const consumedAmount = events
      .filter((entry): entry is Extract<DelegationEvent, { type: 'noteConsumed' }> => entry.type === 'noteConsumed')
      .filter(({ event }) => event.contractAddress.toLowerCase() === contract
        && event.transactionHash.toLowerCase() === purchase.transactionHash.toLowerCase()
        && rootedInputSet.has(event.noteId.toString()))
      .reduce((sum, { event }) => sum + event.amountConsumed, 0n);
    const receiptNoteIds = purchase.outputNoteIds
      .filter(id => noteFor(contract, id)?.rootOwner.toLowerCase() === root)
      .map(String);
    const receiptSet = new Set(receiptNoteIds);
    const refunds = events.filter((entry): entry is Extract<DelegationEvent, { type: 'refundedIntoNote' }> =>
      entry.type === 'refundedIntoNote'
      && entry.event.contractAddress.toLowerCase() === contract
      && receiptSet.has(entry.event.inputNoteId.toString()));
    const reimbursements = events.filter((entry): entry is Extract<DelegationEvent, { type: 'reimbursementClaimedIntoNote' }> =>
      entry.type === 'reimbursementClaimedIntoNote'
      && entry.event.contractAddress.toLowerCase() === contract
      && receiptSet.has(entry.event.receiptNoteId.toString()));
    const intents = foldNoteIntentAttestations(intentEvents.filter(intent =>
      intent.noteContract.toLowerCase() === contract
      && rootedInputSet.has(intent.noteId.toString())
      && atOrBefore(intent, purchase),
    ));
    const inputNotes = rootedInputs.map(id => noteFor(contract, id)).filter((note): note is Note => Boolean(note));
    const sourceNoteIds = new Set(rootedInputs.map(String));
    for (const inputId of rootedInputs) {
      let note = noteFor(contract, inputId);
      while (note?.parentNoteId && !sourceNoteIds.has(note.parentNoteId)) {
        sourceNoteIds.add(note.parentNoteId);
        note = noteFor(contract, BigInt(note.parentNoteId));
      }
    }
    const pledgeIds = standingPledges
      .filter(pledge => pledge.rootOwner.toLowerCase() === root
        && pledge.executedNoteIds.some(id => sourceNoteIds.has(id)))
      .map(pledge => `${pledge.contractAddress.toLowerCase()}:${pledge.id}`);
    const reimbursedAmount = reimbursements.reduce((sum, entry) => sum + entry.event.amount, 0n);
    const status = refunds.length > 0 ? 'refunded' : reimbursements.length > 0 ? 'reimbursed' : 'receipt active';
    const project = projectByReceipt.get(purchase.erc1155Contract.toLowerCase());

    return [{
      id: `${contract}:${purchase.transactionHash.toLowerCase()}:${purchase.logIndex}:${root}`,
      transactionHash: purchase.transactionHash,
      createdAt: purchase.blockTimestamp.toString(),
      blockNumber: purchase.blockNumber.toString(),
      directedBy: purchase.buyer,
      amount: (consumedAmount || (allInputsRootedHere ? purchase.totalCost : 0n)).toString(),
      currency: project?.fundingCurrency ?? {
        kind: inputNotes[0]?.token === '0x0000000000000000000000000000000000000000' ? 'native' : 'erc20',
        symbol: inputNotes[0]?.token === '0x0000000000000000000000000000000000000000' ? 'ETH' : 'tokens',
        decimals: 18,
        tokenAddress: inputNotes[0]?.token === '0x0000000000000000000000000000000000000000' ? null : inputNotes[0]?.token ?? null,
        tokenType: 0,
      },
      projectAddress: project?.id ?? null,
      ...(project?.metadataCid ? { projectMetadataCid: project.metadataCid } : {}),
      receiptContract: purchase.erc1155Contract,
      receiptNoteIds,
      inputNoteIds: rootedInputs.map(String),
      intendedStatementIds: [...new Set(intents.map(intent => intent.intendedStatementId).filter((id): id is string => Boolean(id)))],
      standingPledgeIds: pledgeIds,
      status,
      reimbursedAmount: reimbursedAmount.toString(),
    } satisfies DonationActivity];
  }).sort((a, b) => Number(BigInt(b.blockNumber) - BigInt(a.blockNumber)));
}

export async function getDonationActivityByRoot(
  machinery: SDKMachinery,
  rootAddress: string,
): Promise<DonationActivity[]> {
  const [delegationRaw, intentRaw, projects, standingPledges] = await Promise.all([
    fetchAllDelegationEvents(machinery),
    fetchAllNoteIntentEvents(machinery),
    getAllProjects(machinery),
    machinery.contractAddresses?.recurringPledges ? getStandingPledges(machinery) : Promise.resolve([]),
  ]);
  const intentEvents = intentRaw
    .map(decodeNoteIntentAttestedEvent)
    .filter((event): event is NoteIntentAttestedEvent => event !== null);
  return foldDonationActivityByRoot(
    rootAddress,
    decodeDelegationEvents(delegationRaw),
    intentEvents,
    projects,
    standingPledges,
  );
}

// ============================================================================
// Delegation Queries
// ============================================================================

/**
 * Get a delegatable note by its ID.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param noteId - Unique identifier of the note
 * @returns The note, or null if not found
 */
export async function getNote(
  machinery: SDKMachinery,
  noteId: string
): Promise<Note | null> {
  const rawEvents = await fetchAllDelegationEvents(machinery);
  const events = decodeDelegationEvents(rawEvents);
  const result = foldNote(noteId, events);
  return result?.note ?? null;
}

/**
 * Get all active notes currently owned by a specific address (as leaf owner).
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param ownerAddress - Ethereum address of the current note owner
 * @returns Array of active notes owned by this address
 */
export async function getNotesByOwner(
  machinery: SDKMachinery,
  ownerAddress: string
): Promise<Note[]> {
  const rawEvents = await fetchAllDelegationEvents(machinery);
  const events = decodeDelegationEvents(rawEvents);
  const { notes } = foldDelegationState(events);

  const ownerLower = ownerAddress.toLowerCase();
  return uniqueNotes(notes.values()).filter(
    n => n.active && n.owner.toLowerCase() === ownerLower
  );
}

/**
 * Get all notes originally deposited by a specific address (as root owner).
 *
 * Includes both active and consumed/revoked notes.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param rootAddress - Ethereum address of the root depositor
 * @returns Array of notes where this address is the root owner
 */
export async function getNotesByRoot(
  machinery: SDKMachinery,
  rootAddress: string
): Promise<Note[]> {
  const rawEvents = await fetchAllDelegationEvents(machinery);
  const events = decodeDelegationEvents(rawEvents);
  const { notes } = foldDelegationState(events);

  const rootLower = rootAddress.toLowerCase();
  return uniqueNotes(notes.values()).filter(
    n => n.rootOwner.toLowerCase() === rootLower
  );
}

/**
 * Get the full delegation chain for a note.
 *
 * Returns an ordered list of chain links from root to current owner,
 * showing each delegation step.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param noteId - Unique identifier of the note
 * @returns Array of delegation chain links (empty if note not found)
 */
export async function getDelegationChain(
  machinery: SDKMachinery,
  noteId: string
): Promise<DelegationChainLink[]> {
  const rawEvents = await fetchAllDelegationEvents(machinery);
  const events = decodeDelegationEvents(rawEvents);
  const result = foldNote(noteId, events);
  return result?.chain ?? [];
}

// ============================================================================
// Note Intent Queries
// ============================================================================

/**
 * Get a specific note intent attestation by attester, note contract, and note ID.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param attester - Ethereum address of the attester
 * @param noteContract - Address of the note contract
 * @param noteId - Unique identifier of the note
 * @returns The attestation, or null if not found
 */
export async function getNoteIntentAttestation(
  machinery: SDKMachinery,
  attester: string,
  noteContract: string,
  noteId: string
): Promise<NoteIntentAttestation | null> {
  const rawEvents = (await fetchAllNoteIntentEventsComplete(machinery)).filter(raw => {
    const decoded = decodeNoteIntentAttestedEvent(raw);
    return decoded?.noteContract.toLowerCase() === noteContract.toLowerCase();
  });
  const events: NoteIntentAttestedEvent[] = [];
  for (const raw of rawEvents) {
    const d = decodeNoteIntentAttestedEvent(raw);
    if (d && d.noteId.toString() === noteId && d.attester.toLowerCase() === attester.toLowerCase()) {
      events.push(d);
    }
  }
  if (events.length === 0) return null;
  events.sort((a, b) => {
    const bn = Number(a.blockNumber - b.blockNumber);
    return bn !== 0 ? bn : a.logIndex - b.logIndex;
  });
  const attestations = foldNoteIntentAttestations(events);
  return attestations[0] ?? null;
}

/**
 * Get all note intent attestations for a specific note across all attesters.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param noteContract - Address of the note contract
 * @param noteId - Unique identifier of the note
 * @returns Array of intent attestations for this note
 */
export async function getNoteIntentAttestationsByNote(
  machinery: SDKMachinery,
  noteContract: string,
  noteId: string
): Promise<NoteIntentAttestation[]> {
  const rawEvents = (await fetchAllNoteIntentEventsComplete(machinery)).filter(raw => {
    const decoded = decodeNoteIntentAttestedEvent(raw);
    return decoded?.noteContract.toLowerCase() === noteContract.toLowerCase();
  });
  const events: NoteIntentAttestedEvent[] = [];
  for (const raw of rawEvents) {
    const d = decodeNoteIntentAttestedEvent(raw);
    if (d && d.noteId.toString() === noteId) {
      events.push(d);
    }
  }
  events.sort((a, b) => {
    const bn = Number(a.blockNumber - b.blockNumber);
    return bn !== 0 ? bn : a.logIndex - b.logIndex;
  });
  return foldNoteIntentAttestations(events);
}

/**
 * Get all note intent attestations targeting a specific statement.
 *
 * Since `intendedStatementId` is not indexed on-chain, this fetches all
 * NoteIntentAttested events and filters client-side.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param intendedStatementId - CID of the intended statement
 * @returns Array of intent attestations targeting this statement
 */
export async function getNoteIntentAttestationsByStatement(
  machinery: SDKMachinery,
  intendedStatementId: string
): Promise<NoteIntentAttestation[]> {
  // intendedStatementId is non-indexed, so we fetch all and filter client-side
  const rawEvents = await fetchAllNoteIntentEvents(machinery);
  const events: NoteIntentAttestedEvent[] = [];
  for (const raw of rawEvents) {
    const d = decodeNoteIntentAttestedEvent(raw);
    if (d) events.push(d);
  }
  events.sort((a, b) => {
    const bn = Number(a.blockNumber - b.blockNumber);
    return bn !== 0 ? bn : a.logIndex - b.logIndex;
  });
  return foldNoteIntentAttestations(events).filter(a => a.intendedStatementId === intendedStatementId);
}

type AggregateFetchCacheEntry = {
  expiresAt: number;
  delegation?: Promise<Awaited<ReturnType<typeof fetchAllDelegationEventsComplete>>>;
  intents: Promise<Awaited<ReturnType<typeof fetchAllNoteIntentEventsComplete>>>;
};
const aggregateFetchCache = new WeakMap<SDKMachinery, AggregateFetchCacheEntry>();

function getAggregateRawEvents(machinery: SDKMachinery) {
  const cached = aggregateFetchCache.get(machinery);
  if (cached && cached.expiresAt > Date.now()) return cached;
  const next: AggregateFetchCacheEntry = {
    expiresAt: Date.now() + 15_000,
    intents: fetchAllNoteIntentEventsComplete(machinery),
  };
  aggregateFetchCache.set(machinery, next);
  return next;
}

/** Fold every note and latest intent once, then apply the normative validity filters. */
export async function getNoteIntentAggregate(
  machinery: SDKMachinery,
  statementId: string,
): Promise<NoteIntentAggregate> {
  const cached = getAggregateRawEvents(machinery);
  const intentRaw = await cached.intents;
  const decodedIntents = intentRaw
    .map(decodeNoteIntentAttestedEvent)
    .filter((event): event is NoteIntentAttestedEvent => event !== null)
    .sort((a, b) => Number(a.blockNumber - b.blockNumber) || a.logIndex - b.logIndex);
  const latest = foldNoteIntentAttestations(decodedIntents);
  if (!latest.some(attestation => attestation.intendedStatementId === statementId)) {
    return { statementId, currencies: [], contributorCount: 0, noteCount: 0 };
  }

  cached.delegation ??= fetchAllDelegationEventsComplete(machinery);
  const delegationRaw = await cached.delegation;
  const { notes } = foldDelegationState(decodeDelegationEvents(delegationRaw));

  const noteContract = machinery.contractAddresses?.delegatableNotes?.toLowerCase();
  const supportedTokens = new Set([
    '0x0000000000000000000000000000000000000000',
    ...(machinery.settlementTokenAddresses ?? []).map(address => address.toLowerCase()),
  ]);
  const chainId = machinery.defaultChainId ?? 31337;
  const currencyGroups = new Map<string, { amount: bigint; contributors: Set<string> }>();
  const allContributors = new Set<string>();
  let noteCount = 0;

  for (const attestation of latest) {
    if (attestation.intendedStatementId !== statementId) continue;
    if (!noteContract || attestation.noteContract.toLowerCase() !== noteContract) continue;
    const note = notes.get(`${noteContract}:${attestation.noteId}`);
    if (!note || !note.active || note.tokenType !== 0 || !supportedTokens.has(note.token.toLowerCase())) continue;
    if (attestation.attester.toLowerCase() !== note.rootOwner.toLowerCase()) continue;
    const attestationBlock = BigInt(attestation.blockNumber);
    const birthBlock = BigInt(note.createdAtBlock);
    if (attestationBlock < birthBlock || (attestationBlock === birthBlock && attestation.logIndex <= (note.createdAtLogIndex ?? -1))) continue;

    const tokenAddress = note.token.toLowerCase();
    const key = `${chainId}:${tokenAddress}`;
    const group = currencyGroups.get(key) ?? { amount: 0n, contributors: new Set<string>() };
    group.amount += BigInt(note.amount);
    group.contributors.add(note.rootOwner.toLowerCase());
    currencyGroups.set(key, group);
    allContributors.add(note.rootOwner.toLowerCase());
    noteCount += 1;
  }

  return {
    statementId,
    currencies: [...currencyGroups.entries()].map(([key, group]) => ({
      chainId,
      tokenAddress: key.slice(key.indexOf(':') + 1),
      amount: group.amount.toString(),
      contributorCount: group.contributors.size,
    })),
    contributorCount: allContributors.size,
    noteCount,
  };
}

// ============================================================================
// Cross-subsystem: Purchased Note Events (for leaderboard delegation chains)
// ============================================================================

/**
 * Get ERC1155Purchased note events matching a set of transaction hashes.
 *
 * Used to identify which crowdfunding contributions were made via delegatable notes,
 * typically for building leaderboard delegation chains.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param transactionHashes - Transaction hashes to match against
 * @returns Array of NoteEvent records (one per input note used in each purchase)
 */
export async function getPurchasedNoteEventsByTxHashes(
  machinery: SDKMachinery,
  transactionHashes: string[]
): Promise<NoteEvent[]> {
  if (transactionHashes.length === 0) return [];

  const rawEvents = await fetchAllDelegationEvents(machinery);
  const txHashSet = new Set(transactionHashes.map(h => h.toLowerCase()));

  const noteEvents: NoteEvent[] = [];
  for (const raw of rawEvents) {
    if (raw.eventName !== 'ERC1155Purchased') continue;
    if (!txHashSet.has(raw.transactionHash.toLowerCase())) continue;

    const d = decodeERC1155PurchasedEvent(raw);
    if (!d) continue;

    // Each input note gets a NoteEvent record
    for (const inputNoteId of d.inputNoteIds) {
      noteEvents.push({
        noteId: inputNoteId.toString(),
        noteContract: d.contractAddress,
        transactionHash: d.transactionHash,
        data: JSON.stringify({
          inputNoteIds: d.inputNoteIds.map(id => id.toString()),
          outputNoteIds: d.outputNoteIds.map(id => id.toString()),
          erc1155Contract: d.erc1155Contract,
          tokenIds: d.tokenIds.map(id => id.toString()),
          counts: d.counts.map(c => c.toString()),
          totalCost: d.totalCost.toString(),
        }),
      });
    }
  }
  return noteEvents;
}

/**
 * Batch-fetch delegation chains for multiple note IDs.
 *
 * Returns chain links enriched with the noteId for grouping. Sorted by
 * noteId then position within the chain.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param noteIds - Array of note IDs to fetch chains for
 * @returns Array of chain links with noteId, sorted by noteId then position
 */
export async function getDelegationChainsForNotes(
  machinery: SDKMachinery,
  noteIds: string[]
): Promise<DelegationChainLinkWithNote[]> {
  if (noteIds.length === 0) return [];

  const rawEvents = await fetchAllDelegationEvents(machinery);
  const events = decodeDelegationEvents(rawEvents);
  const { notes, chains } = foldDelegationState(events);

  const noteIdSet = new Set(noteIds);
  const result: DelegationChainLinkWithNote[] = [];

  for (const [noteKey, chain] of chains) {
    const [maybeContract, maybeBareId] = noteKey.split(':');
    const isScopedKey = /^0x[0-9a-fA-F]{40}$/.test(maybeContract ?? '') && maybeBareId !== undefined;
    if (!isScopedKey) continue;

    const noteId = maybeBareId;
    if (!noteIdSet.has(noteKey) && !noteIdSet.has(noteId)) continue;
    const note = notes.get(noteKey);
    if (!note) continue;
    for (const link of chain) {
      result.push({ ...link, noteId, noteContract: note.contractAddress });
    }
  }

  // Sort by noteId then position for consistent ordering
  result.sort((a, b) => {
    const nCmp = a.noteId.localeCompare(b.noteId);
    return nCmp !== 0 ? nCmp : a.position - b.position;
  });

  return result;
}
