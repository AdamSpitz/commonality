import { type Abi, type Address, type Hash, parseEventLogs } from 'viem';
import { type WriteClients } from '../../utils/ethereum.js';
import { SDKMachinery } from '../../machinery.js';
import { fetchEvents } from '../../utils/eventCacheClient.js';
import {
  decodeStandingPledgeCreatedEvent,
  decodeStandingPledgeExecutedEvent,
  decodeStandingPledgeCancelledEvent,
} from '../../utils/eventDecoder.js';
import { RecurringPledgesAbi } from '../../abis.js';
import type {
  StandingPledgeCreatedEvent,
  StandingPledgeExecutedEvent,
  StandingPledgeCancelledEvent,
} from './events.js';
import type { StandingPledge } from './types.js';

export interface RecurringPledgesContract {
  address: Address;
  abi: Abi;
}

export type RecurringPledgeEvent =
  | { type: 'standingPledgeCreated'; event: StandingPledgeCreatedEvent }
  | { type: 'standingPledgeExecuted'; event: StandingPledgeExecutedEvent }
  | { type: 'standingPledgeCancelled'; event: StandingPledgeCancelledEvent };

function contractScopedId(contractAddress: `0x${string}`, id: bigint | string): string {
  return `${contractAddress.toLowerCase()}:${id.toString()}`;
}

const erc20ApproveAbi = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export function foldStandingPledges(events: RecurringPledgeEvent[]): Map<string, StandingPledge> {
  const pledges = new Map<string, StandingPledge>();

  for (const ev of events) {
    switch (ev.type) {
      case 'standingPledgeCreated': {
        const e = ev.event;
        const id = e.pledgeId.toString();
        const key = contractScopedId(e.contractAddress, e.pledgeId);
        pledges.set(key, {
          id,
          rootOwner: e.rootOwner,
          delegateTo: e.delegateTo,
          token: e.token,
          amountPerPeriod: e.amountPerPeriod.toString(),
          period: e.period.toString(),
          causeRef: e.causeRef,
          backingType: e.backingType,
          lastExecuted: '0',
          active: true,
          createdAt: e.blockTimestamp.toString(),
          createdAtBlock: e.blockNumber.toString(),
          updatedAt: e.blockTimestamp.toString(),
          executedNoteIds: [],
        });
        break;
      }
      case 'standingPledgeExecuted': {
        const e = ev.event;
        const pledge = pledges.get(contractScopedId(e.contractAddress, e.pledgeId));
        if (pledge) {
          pledge.lastExecuted = e.executedAt.toString();
          pledge.updatedAt = e.blockTimestamp.toString();
          pledge.executedNoteIds.push(e.noteId.toString());
        }
        break;
      }
      case 'standingPledgeCancelled': {
        const e = ev.event;
        const pledge = pledges.get(contractScopedId(e.contractAddress, e.pledgeId));
        if (pledge) {
          pledge.active = false;
          pledge.updatedAt = e.blockTimestamp.toString();
        }
        break;
      }
    }
  }

  const bareIdCounts = new Map<string, number>();
  for (const pledge of pledges.values()) {
    bareIdCounts.set(pledge.id, (bareIdCounts.get(pledge.id) ?? 0) + 1);
  }
  for (const [scopedId, pledge] of [...pledges.entries()]) {
    if (bareIdCounts.get(pledge.id) === 1 && !pledges.has(pledge.id)) {
      pledges.set(pledge.id, pledge);
    }
    // Keep the scoped id as the canonical collision-proof key.
    pledges.set(scopedId, pledge);
  }

  return pledges;
}

function uniqueStandingPledges(pledges: Iterable<StandingPledge>): StandingPledge[] {
  return [...new Set(pledges)];
}

export function monthlyPledgedByCause(pledges: Iterable<StandingPledge>): Map<string, bigint> {
  const totals = new Map<string, bigint>();
  for (const pledge of uniqueStandingPledges(pledges)) {
    if (!pledge.active) continue;
    totals.set(
      pledge.causeRef,
      (totals.get(pledge.causeRef) ?? 0n) + BigInt(pledge.amountPerPeriod),
    );
  }
  return totals;
}

function decodeRecurringPledgeEvents(rawEvents: Awaited<ReturnType<typeof fetchEvents>>): RecurringPledgeEvent[] {
  const events: RecurringPledgeEvent[] = [];
  for (const raw of rawEvents) {
    switch (raw.eventName) {
      case 'StandingPledgeCreated': {
        const decoded = decodeStandingPledgeCreatedEvent(raw);
        if (decoded) events.push({ type: 'standingPledgeCreated', event: decoded });
        break;
      }
      case 'StandingPledgeExecuted': {
        const decoded = decodeStandingPledgeExecutedEvent(raw);
        if (decoded) events.push({ type: 'standingPledgeExecuted', event: decoded });
        break;
      }
      case 'StandingPledgeCancelled': {
        const decoded = decodeStandingPledgeCancelledEvent(raw);
        if (decoded) events.push({ type: 'standingPledgeCancelled', event: decoded });
        break;
      }
    }
  }
  return events.sort((a, b) => {
    const blockOrder = Number(a.event.blockNumber - b.event.blockNumber);
    return blockOrder !== 0 ? blockOrder : a.event.logIndex - b.event.logIndex;
  });
}

export async function getStandingPledges(machinery: SDKMachinery): Promise<StandingPledge[]> {
  const address = machinery.contractAddresses?.recurringPledges;
  if (!address) throw new Error('recurringPledges contract address not configured');
  const rawEvents = await fetchEvents(machinery, { contractAddress: address, limit: 10000 });
  return uniqueStandingPledges(foldStandingPledges(decodeRecurringPledgeEvents(rawEvents)).values());
}

export async function getActiveStandingPledgesByUser(
  machinery: SDKMachinery,
  rootOwner: string,
): Promise<StandingPledge[]> {
  const ownerLower = rootOwner.toLowerCase();
  return (await getStandingPledges(machinery)).filter(
    pledge => pledge.active && pledge.rootOwner.toLowerCase() === ownerLower,
  );
}

export async function getMonthlyPledgedByCause(machinery: SDKMachinery): Promise<Map<string, bigint>> {
  return monthlyPledgedByCause(await getStandingPledges(machinery));
}

export async function getDueStandingPledges(machinery: SDKMachinery): Promise<StandingPledge[]> {
  if (!machinery.publicClient) throw new Error('publicClient not configured');
  const block = await machinery.publicClient.getBlock();
  const now = block.timestamp;
  return (await getStandingPledges(machinery)).filter(
    pledge => pledge.active && now >= BigInt(pledge.lastExecuted) + BigInt(pledge.period),
  );
}

export async function isStandingPledgeFundable(
  machinery: SDKMachinery,
  pledgeId: bigint,
): Promise<boolean> {
  if (!machinery.publicClient) throw new Error('publicClient not configured');
  const address = machinery.contractAddresses?.recurringPledges;
  if (!address) throw new Error('recurringPledges contract address not configured');
  return machinery.publicClient.readContract({
    address,
    abi: RecurringPledgesAbi,
    functionName: 'isFundable',
    args: [pledgeId],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any) as Promise<boolean>;
}

export async function approveRecurringPledgeToken(
  clients: WriteClients,
  params: { token: Address; delegatableNotes: Address; amount: bigint },
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: params.token,
    abi: erc20ApproveAbi,
    functionName: 'approve',
    args: [params.delegatableNotes, params.amount],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });
  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function createStandingPledge(
  clients: WriteClients,
  recurringPledgesContract: RecurringPledgesContract,
  params: {
    delegateTo: Address;
    token: Address;
    amountPerPeriod: bigint;
    period: bigint;
    causeRef: string;
  },
): Promise<{ hash: Hash; pledgeId: bigint; firstNoteId: bigint }> {
  const hash = await clients.walletClient.writeContract({
    address: recurringPledgesContract.address,
    abi: recurringPledgesContract.abi,
    functionName: 'createStandingPledge',
    args: [params.delegateTo, params.token, params.amountPerPeriod, params.period, params.causeRef],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });
  const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });
  const created = parseEventLogs({ abi: RecurringPledgesAbi, eventName: 'StandingPledgeCreated', logs: receipt.logs });
  const executed = parseEventLogs({ abi: RecurringPledgesAbi, eventName: 'StandingPledgeExecuted', logs: receipt.logs });
  if (created.length === 0 || executed.length === 0) {
    throw new Error('Failed to find recurring pledge creation/execution events');
  }
  return { hash, pledgeId: created[0].args.pledgeId, firstNoteId: executed[0].args.noteId };
}

export async function cancelStandingPledge(
  clients: WriteClients,
  recurringPledgesContract: RecurringPledgesContract,
  pledgeId: bigint,
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: recurringPledgesContract.address,
    abi: recurringPledgesContract.abi,
    functionName: 'cancelStandingPledge',
    args: [pledgeId],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });
  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function executeDueStandingPledge(
  clients: WriteClients,
  recurringPledgesContract: RecurringPledgesContract,
  pledgeId: bigint,
): Promise<{ hash: Hash; noteId: bigint }> {
  const hash = await clients.walletClient.writeContract({
    address: recurringPledgesContract.address,
    abi: recurringPledgesContract.abi,
    functionName: 'executeDue',
    args: [pledgeId],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });
  const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });
  const executed = parseEventLogs({ abi: RecurringPledgesAbi, eventName: 'StandingPledgeExecuted', logs: receipt.logs });
  if (executed.length === 0) throw new Error('Failed to find StandingPledgeExecuted event');
  return { hash, noteId: executed[0].args.noteId };
}
