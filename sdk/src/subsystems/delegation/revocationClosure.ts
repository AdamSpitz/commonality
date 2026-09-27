import { decodeEventLog, type Address, type Hex } from 'viem';
import { DelegatableNotesAbi } from '../../abis.js';
import type { RawEventFromCache } from '../../utils/eventCacheClient.js';
import { foldDelegationState, type DelegationEvent } from './folds.js';
import { decodeDelegationEvents } from './queries.js';

export interface RevocableNote {
  id: string;
  noteId: bigint;
  amount: string;
  /** Leaf first, root last. */
  owners: Address[];
  parentId: string | null;
}

/** Child note id → the note it came out of. Does not follow replacement or partial takeback. */
export function closureParents(events: DelegationEvent[]): Map<string, string> {
  const parent = new Map<string, string>();
  const link = (from: bigint, to: bigint) => {
    parent.set(to.toString(), from.toString());
  };
  for (const ev of events) {
    if (ev.type === 'chainSplit') link(ev.event.originalLeafId, ev.event.splitLeafId);
    if (ev.type === 'noteSplitSameChain') link(ev.event.fromNoteId, ev.event.newNoteId);
    if (ev.type === 'refundedIntoNote') link(ev.event.inputNoteId, ev.event.outputNoteId);
    if (ev.type === 'reimbursementClaimedIntoNote') link(ev.event.receiptNoteId, ev.event.reimbursementNoteId);
    if (ev.type === 'erc1155Purchased') {
      const inputs = ev.event.inputNoteIds;
      const outputs = ev.event.outputNoteIds;
      const tokenCount = ev.event.tokenIds.length;
      for (let c = 0; c < inputs.length; c++) {
        for (let t = 0; t < tokenCount; t++) {
          const output = outputs[t * inputs.length + c];
          if (output !== undefined) link(inputs[c], output);
        }
      }
    }
  }
  return parent;
}

/** Notes in the closure that are still delegated (chain longer than the root). */
export function revocableNotesFromEvents(events: DelegationEvent[], originNoteId: bigint): RevocableNote[] {
  const parents = closureParents(events);
  const inClosure = new Set<string>();
  const pending = [originNoteId.toString()];
  while (pending.length > 0) {
    const id = pending.pop();
    if (id === undefined || inClosure.has(id)) continue;
    inClosure.add(id);
    for (const [child, parent] of parents) {
      if (parent === id) pending.push(child);
    }
  }

  const { notes, chains } = foldDelegationState(events);
  const rows: RevocableNote[] = [];
  for (const id of inClosure) {
    const note = notes.get(id);
    const chain = chains.get(id);
    if (!note?.active || !chain || chain.length < 2) continue;
    const rootFirst = [...chain].sort((a, b) => a.position - b.position);
    rows.push({
      id,
      noteId: BigInt(id),
      amount: note.amount,
      owners: rootFirst.map((link) => link.address as Address).reverse(),
      parentId: parents.get(id) ?? null,
    });
  }
  rows.sort((a, b) => (a.noteId < b.noteId ? -1 : 1));
  return rows;
}

interface DelegationLogSource {
  getContractEvents(args: { address: Address; abi: typeof DelegatableNotesAbi; fromBlock: bigint; toBlock: 'latest' }): Promise<readonly unknown[]>;
}

interface DecodedLog {
  eventName: string;
  blockNumber: bigint;
  transactionHash: Hex;
  logIndex: number;
  data: Hex;
  topics: readonly Hex[];
}

function asDecodedLog(value: unknown): DecodedLog | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const log = value as Partial<DecodedLog>;
  if (typeof log.eventName !== 'string' || typeof log.data !== 'string' || !Array.isArray(log.topics)) return undefined;
  if (typeof log.blockNumber !== 'bigint' || typeof log.transactionHash !== 'string' || typeof log.logIndex !== 'number') return undefined;
  return log as DecodedLog;
}

/**
 * Still-delegated notes in `originNoteId`'s closure, from DelegatableNotes logs.
 * The indexer is not consulted.
 */
export async function loadRevocableClosure(
  source: DelegationLogSource,
  contractAddress: Address,
  originNoteId: bigint,
): Promise<RevocableNote[]> {
  const logs = await source.getContractEvents({
    address: contractAddress,
    abi: DelegatableNotesAbi,
    fromBlock: 0n,
    toBlock: 'latest',
  });
  const raw: RawEventFromCache[] = [];
  for (const value of logs) {
    const log = asDecodedLog(value);
    if (!log) continue;
    let eventName = log.eventName;
    try {
      const decoded: unknown = decodeEventLog({
        abi: DelegatableNotesAbi,
        data: log.data,
        topics: log.topics as [Hex, ...Hex[]],
      });
      if (
        typeof decoded !== 'object' ||
        decoded === null ||
        !('eventName' in decoded) ||
        typeof decoded.eventName !== 'string'
      ) continue;
      eventName = decoded.eventName;
    } catch {
      continue;
    }
    raw.push({
      id: `${log.transactionHash}:${log.logIndex}`,
      contractAddress,
      eventName,
      blockNumber: log.blockNumber.toString(),
      blockTimestamp: '0',
      transactionHash: log.transactionHash,
      logIndex: log.logIndex,
      topic0: log.topics[0] ?? null,
      topic1: log.topics[1] ?? null,
      topic2: log.topics[2] ?? null,
      topic3: log.topics[3] ?? null,
      data: log.data,
    });
  }
  raw.sort((a, b) => Number(BigInt(a.blockNumber) - BigInt(b.blockNumber)) || a.logIndex - b.logIndex);
  return revocableNotesFromEvents(decodeDelegationEvents(raw), originNoteId);
}
