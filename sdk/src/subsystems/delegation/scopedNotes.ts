/**
 * Fetch the note events one root or one statement actually needs.
 * Global delegation and project folds stay available for callers that
 * really want every note.
 */

import type { SDKMachinery } from '../../machinery.js';
import {
  fetchEventsByTopicList,
  fetchEventsComplete,
  padAddressAsTopic,
  padUintAsTopic,
  type RawEventFromCache,
} from '../../utils/eventCacheClient.js';
import {
  decodeChainSplitEvent,
  decodeNoteCreatedEvent,
  decodeNoteDelegatedEvent,
  decodeNoteDelegateReplacedEvent,
  decodeNotePartiallyTakenBackEvent,
  decodeNoteSplitSameChainEvent,
  decodeERC1155PurchasedEvent,
  decodeRefundedIntoNoteEvent,
  decodeReimbursementClaimedIntoNoteEvent,
} from '../../utils/eventDecoder.js';
import { cidToBytes32 } from '../../utils/cid-types.js';
import { getProject, type Project } from '../lazy-giving/index.js';

const CHILD_EVENTS = [
  'NoteDelegated',
  'ChainSplit',
  'NoteSplitSameChain',
  'NoteDelegateReplaced',
  'NotePartiallyTakenBack',
] as const;

const NOTE_LIFECYCLE_EVENTS = [
  'NoteCreated',
  'NoteRevoked',
  'FundsReclaimed',
  'NoteConsumed',
  ...CHILD_EVENTS,
] as const;

function dedupe(events: RawEventFromCache[]): RawEventFromCache[] {
  const seen = new Set<string>();
  const unique: RawEventFromCache[] = [];
  for (const event of events) {
    const key = `${event.transactionHash}:${event.logIndex}:${event.eventName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(event);
  }
  return unique;
}

function topicsFor(ids: bigint[]): string[] {
  return ids.map(padUintAsTopic);
}

function childIds(events: RawEventFromCache[]): bigint[] {
  const ids: bigint[] = [];
  for (const raw of events) {
    if (raw.eventName === 'NoteDelegated') {
      const decoded = decodeNoteDelegatedEvent(raw);
      if (decoded && decoded.childNoteId !== decoded.parentNoteId) ids.push(decoded.childNoteId);
    } else if (raw.eventName === 'ChainSplit') {
      const decoded = decodeChainSplitEvent(raw);
      if (decoded) ids.push(decoded.splitLeafId);
    } else if (raw.eventName === 'NoteSplitSameChain') {
      const decoded = decodeNoteSplitSameChainEvent(raw);
      if (decoded) ids.push(decoded.newNoteId);
    } else if (raw.eventName === 'NoteDelegateReplaced') {
      const decoded = decodeNoteDelegateReplacedEvent(raw);
      if (decoded) ids.push(decoded.toNoteId);
    } else if (raw.eventName === 'NotePartiallyTakenBack') {
      const decoded = decodeNotePartiallyTakenBackEvent(raw);
      if (decoded) ids.push(decoded.sliceNoteId);
    }
  }
  return ids;
}

function parentIds(events: RawEventFromCache[]): bigint[] {
  const ids: bigint[] = [];
  for (const raw of events) {
    if (raw.eventName === 'NoteDelegated') {
      const decoded = decodeNoteDelegatedEvent(raw);
      if (decoded && decoded.childNoteId !== decoded.parentNoteId) ids.push(decoded.parentNoteId);
    } else if (raw.eventName === 'ChainSplit') {
      const decoded = decodeChainSplitEvent(raw);
      if (decoded) ids.push(decoded.originalLeafId);
    } else if (raw.eventName === 'NoteSplitSameChain') {
      const decoded = decodeNoteSplitSameChainEvent(raw);
      if (decoded) ids.push(decoded.fromNoteId);
    } else if (raw.eventName === 'NoteDelegateReplaced') {
      const decoded = decodeNoteDelegateReplacedEvent(raw);
      if (decoded) ids.push(decoded.fromNoteId);
    }
  }
  return ids;
}

async function fetchNamed(
  machinery: SDKMachinery,
  names: readonly string[],
  topic: 'topic1' | 'topic2' | 'topic3',
  ids: bigint[],
): Promise<RawEventFromCache[]> {
  if (ids.length === 0) return [];
  const values = topicsFor(ids);
  const pages = await Promise.all(names.map(eventName => fetchEventsByTopicList(machinery, eventName, topic, values)));
  return pages.flat();
}

async function closeNoteSet(
  machinery: SDKMachinery,
  seedIds: bigint[],
  direction: 'children' | 'parents',
): Promise<RawEventFromCache[]> {
  const seen = new Set<string>();
  let frontier = seedIds.filter(id => {
    const key = id.toString();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const collected: RawEventFromCache[] = [];
  while (frontier.length > 0) {
    const page = direction === 'children'
      ? await fetchNamed(machinery, CHILD_EVENTS, 'topic1', frontier)
      : [
        ...await fetchNamed(machinery, CHILD_EVENTS, 'topic2', frontier),
        ...await fetchNamed(machinery, ['ChainSplit'], 'topic3', frontier),
      ];
    collected.push(...page);
    const next = (direction === 'children' ? childIds(page) : parentIds(page)).filter(id => {
      const key = id.toString();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    frontier = next;
  }
  const allIds = [...seen].map(id => BigInt(id));
  collected.push(...await fetchNamed(machinery, NOTE_LIFECYCLE_EVENTS, 'topic1', allIds));
  return dedupe(collected);
}

/**
 * Notes this address currently might own: deposits, delegations received,
 * and delegate replacements. Descendants and ancestors come along so a fold
 * can tell whether the address still holds the leaf and who the root is.
 */
export async function fetchDelegationEventsForOwner(
  machinery: SDKMachinery,
  ownerAddress: string,
): Promise<RawEventFromCache[]> {
  const owner = padAddressAsTopic(ownerAddress);
  const [created, delegated, replaced] = await Promise.all([
    fetchEventsComplete(machinery, { eventName: 'NoteCreated', topic2: owner }),
    fetchEventsComplete(machinery, { eventName: 'NoteDelegated', topic3: owner }),
    fetchEventsComplete(machinery, { eventName: 'NoteDelegateReplaced', topic3: owner }),
  ]);
  const seed: bigint[] = [];
  for (const raw of created) {
    const decoded = decodeNoteCreatedEvent(raw);
    if (decoded) seed.push(decoded.noteId);
  }
  for (const raw of delegated) {
    const decoded = decodeNoteDelegatedEvent(raw);
    if (decoded) seed.push(decoded.childNoteId);
  }
  for (const raw of replaced) {
    const decoded = decodeNoteDelegateReplacedEvent(raw);
    if (decoded) seed.push(decoded.toNoteId);
  }
  const down = await closeNoteSet(machinery, seed, 'children');
  const up = await closeNoteSet(machinery, seed, 'parents');
  return dedupe([...created, ...delegated, ...replaced, ...down, ...up]);
}

/** Notes deposited by `rootAddress`, plus the descendant notes those deposits created. */
export async function fetchDelegationEventsForRoot(
  machinery: SDKMachinery,
  rootAddress: string,
): Promise<{ events: RawEventFromCache[]; noteIds: Set<string> }> {
  const created = await fetchEventsComplete(machinery, {
    eventName: 'NoteCreated',
    topic2: padAddressAsTopic(rootAddress),
  });
  const seed = created.flatMap(raw => {
    const decoded = decodeNoteCreatedEvent(raw);
    return decoded ? [decoded.noteId] : [];
  });
  const events = dedupe([...created, ...await closeNoteSet(machinery, seed, 'children')]);
  const noteIds = new Set(seed.map(id => id.toString()));
  for (const id of childIds(events)) noteIds.add(id.toString());
  return { events, noteIds };
}

function noteIdsMentioned(events: RawEventFromCache[]): bigint[] {
  const ids: bigint[] = [];
  for (const raw of events) {
    if (raw.eventName === 'ERC1155Purchased') {
      const decoded = decodeERC1155PurchasedEvent(raw);
      if (decoded) ids.push(...decoded.inputNoteIds, ...decoded.outputNoteIds);
    } else if (raw.eventName === 'RefundedIntoNote') {
      const decoded = decodeRefundedIntoNoteEvent(raw);
      if (decoded) ids.push(decoded.inputNoteId, decoded.outputNoteId);
    } else if (raw.eventName === 'ReimbursementClaimedIntoNote') {
      const decoded = decodeReimbursementClaimedIntoNoteEvent(raw);
      if (decoded) ids.push(decoded.receiptNoteId);
    } else {
      ids.push(...childIds([raw]), ...parentIds([raw]));
      if (raw.eventName === 'NoteCreated') {
        const decoded = decodeNoteCreatedEvent(raw);
        if (decoded) ids.push(decoded.noteId);
      }
    }
  }
  return ids;
}

/**
 * Output notes are created with a one-link chain. The full chain is copied
 * from the input note when the purchase event is folded. Those three event
 * names are not indexed by note id, so this downloads them and keeps the
 * ones that touch the note set, then walks any newly discovered inputs.
 */
export async function attachPurchaseChainCopies(
  machinery: SDKMachinery,
  events: RawEventFromCache[],
): Promise<RawEventFromCache[]> {
  const purchases = await fetchPurchaseLifecycleEvents(machinery);
  const known = new Set(noteIdsMentioned(events).map(id => id.toString()));
  const kept: RawEventFromCache[] = [...events];
  let grew = true;
  while (grew) {
    grew = false;
    const extraInputs: bigint[] = [];
    for (const raw of purchases) {
      const mentioned = noteIdsMentioned([raw]);
      if (!mentioned.some(id => known.has(id.toString()))) continue;
      kept.push(raw);
      for (const id of mentioned) {
        const key = id.toString();
        if (known.has(key)) continue;
        known.add(key);
        extraInputs.push(id);
        grew = true;
      }
    }
    if (extraInputs.length > 0) {
      const inputHistory = await closeNoteSet(machinery, extraInputs, 'parents');
      kept.push(...inputHistory);
      for (const id of noteIdsMentioned(inputHistory)) known.add(id.toString());
    }
  }
  return dedupe(kept);
}

/** Notes named by intents, plus the ancestor notes required to know their root. */
export async function fetchDelegationEventsForNoteIds(
  machinery: SDKMachinery,
  noteIds: bigint[],
): Promise<RawEventFromCache[]> {
  return closeNoteSet(machinery, noteIds, 'parents');
}

export async function fetchNoteIntentsForStatement(
  machinery: SDKMachinery,
  statementId: string,
): Promise<RawEventFromCache[]> {
  return fetchEventsComplete(machinery, {
    eventName: 'NoteIntentAttested',
    topic2: cidToBytes32(statementId),
  });
}

export async function fetchNoteIntentsForNoteIds(
  machinery: SDKMachinery,
  noteIds: bigint[],
): Promise<RawEventFromCache[]> {
  return fetchEventsByTopicList(machinery, 'NoteIntentAttested', 'topic3', topicsFor(noteIds));
}

/**
 * Purchase, refund, and reimbursement events are not indexed by note id.
 * Callers that already know the note set still have to download these three
 * event names and filter. They do not download the rest of the note history.
 */
export async function fetchPurchaseLifecycleEvents(
  machinery: SDKMachinery,
): Promise<RawEventFromCache[]> {
  const names = ['ERC1155Purchased', 'RefundedIntoNote', 'ReimbursementClaimedIntoNote'] as const;
  const pages = await Promise.all(names.map(eventName => fetchEventsComplete(machinery, { eventName })));
  return pages.flat();
}

function addressFromTopic(topic: string | null): string | null {
  if (!topic || topic.length < 42) return null;
  return `0x${topic.slice(-40)}`.toLowerCase();
}

/** Projects whose receipt token appears on the given purchase events. */
export async function fetchProjectsForPurchases(
  machinery: SDKMachinery,
  purchaseEvents: RawEventFromCache[],
): Promise<Project[]> {
  const tokens = new Set<string>();
  for (const raw of purchaseEvents) {
    const decoded = decodeERC1155PurchasedEvent(raw);
    if (decoded) tokens.add(decoded.erc1155Contract.toLowerCase());
  }
  const projects = await Promise.all([...tokens].map(async token => {
    const created = await fetchEventsComplete(machinery, {
      eventName: 'ProjectCreated',
      topic2: padAddressAsTopic(token),
    });
    const assurance = addressFromTopic(created[0]?.topic3 ?? null);
    if (!assurance) return null;
    return getProject(machinery, assurance);
  }));
  return projects.filter((project): project is Project => project !== null);
}
