import type { Project, ProjectToken, Contribution, Refund } from './types.js';
import type {
  AssuranceContractCreatedEvent,
  AssuranceContractInitializedEvent,
  ContractMetadataUpdatedEvent,
  ERC1155OfferedEvent,
  ERC1155BoughtEvent,
  ERC1155SoldEvent,
  AssuranceContractWithdrawalEvent,
} from './events.js';

// Discriminated union of all primary-market events for one project.
// Caller is responsible for filtering events to a single assuranceContract address.
export type ProjectEvent =
  | { type: 'created'; event: AssuranceContractCreatedEvent }
  | { type: 'initialized'; event: AssuranceContractInitializedEvent }
  | { type: 'metadataUpdated'; event: ContractMetadataUpdatedEvent }
  | { type: 'tokenOffered'; event: ERC1155OfferedEvent }
  | { type: 'bought'; event: ERC1155BoughtEvent }
  | { type: 'sold'; event: ERC1155SoldEvent }
  | { type: 'withdrawal'; event: AssuranceContractWithdrawalEvent };

/**
 * Fold primary-market events for a single project → Project state.
 *
 * threshold and deadline are omitted because they require on-chain reads (Phase 2).
 * conditionAddress comes from the initialized event.
 * totalReceived is computed as sum(bought.totalCost) - sum(sold.totalRefund).
 * Note: withdrawals do NOT reduce totalReceived (they represent funds leaving after success).
 * metadataCid is last-write-wins (ContractMetadataUpdated events).
 *
 * Caller is responsible for filtering events to a single assuranceContract address
 * before calling this function. Events must arrive in block/logIndex order.
 */
export function foldProject(events: ProjectEvent[]): Omit<Project, 'threshold' | 'deadline'> | null {
  if (events.length === 0) return null;

  let id = '';
  let erc1155Address = '';
  let recipient = '';
  let conditionAddress: string | null = null;
  let metadataCid: string | undefined;
  let createdAt: string | undefined;
  let totalReceived = 0n;

  for (const { type, event } of events) {
    switch (type) {
      case 'created':
        id = event.assuranceContract;
        createdAt = event.blockTimestamp.toString();
        break;
      case 'initialized':
        if (!id) id = event.assuranceContract;
        recipient = event.recipient;
        conditionAddress = event.condition;
        break;
      case 'metadataUpdated':
        metadataCid = event.metadataCid;
        break;
      case 'tokenOffered':
        if (!erc1155Address) erc1155Address = event.erc1155Addr;
        break;
      case 'bought':
        totalReceived += event.totalCost;
        break;
      case 'sold':
        totalReceived -= event.totalRefund;
        break;
      case 'withdrawal':
        // Withdrawals do not change totalReceived — they represent disbursement of funds
        // after the project succeeds, which is tracked separately.
        break;
    }
  }

  return {
    id,
    erc1155Address,
    marketplaceAddress: null,
    recipient,
    totalReceived: totalReceived.toString(),
    conditionAddress,
    metadataCid,
    createdAt,
  };
}

/**
 * Fold ERC1155Bought and ERC1155Sold events → contribution and refund records.
 *
 * Each bought event becomes one Contribution; each sold event becomes one Refund.
 * IDs are derived from transactionHash + logIndex (matching indexer convention).
 *
 * Caller may pass bought and sold events intermixed; they are distinguished by type.
 * Events must arrive in block/logIndex order.
 */
export function foldContributions(events: (ERC1155BoughtEvent | ERC1155SoldEvent)[]): {
  contributions: Contribution[];
  refunds: Refund[];
} {
  const contributions: Contribution[] = [];
  const refunds: Refund[] = [];

  for (const event of events) {
    const id = `${event.transactionHash}-${event.logIndex}`;

    if ('totalCost' in event) {
      // ERC1155BoughtEvent
      contributions.push({
        id,
        participant: event.participant,
        projectAddress: event.assuranceContract,
        erc1155Address: event.erc1155Addr,
        tokenIds: JSON.stringify(event.ids.map((id) => id.toString())),
        tokenCounts: JSON.stringify(event.counts.map((c) => c.toString())),
        totalCost: event.totalCost.toString(),
        createdAt: event.blockTimestamp.toString(),
        blockNumber: event.blockNumber.toString(),
        transactionHash: event.transactionHash,
      });
    } else {
      // ERC1155SoldEvent
      refunds.push({
        id,
        participant: event.participant,
        projectAddress: event.assuranceContract,
        erc1155Address: event.erc1155Addr,
        tokenIds: JSON.stringify(event.ids.map((id) => id.toString())),
        tokenCounts: JSON.stringify(event.counts.map((c) => c.toString())),
        totalRefund: event.totalRefund.toString(),
        createdAt: event.blockTimestamp.toString(),
        blockNumber: event.blockNumber.toString(),
        transactionHash: event.transactionHash,
      });
    }
  }

  return { contributions, refunds };
}

/**
 * Fold ERC1155Offered events → project token records.
 *
 * Each offered event becomes one ProjectToken. If the same (assuranceContract,
 * erc1155Addr, tokenId) is offered multiple times, last-write-wins for price.
 *
 * Caller is responsible for filtering events to a single project if desired.
 * Events must arrive in block/logIndex order.
 */
export function foldProjectTokens(events: ERC1155OfferedEvent[]): ProjectToken[] {
  // Key = projectAddress:erc1155Addr:tokenId — last event wins for price
  const map = new Map<string, ProjectToken>();

  for (const event of events) {
    const key = `${event.assuranceContract.toLowerCase()}:${event.erc1155Addr.toLowerCase()}:${event.tokenId.toString()}`;
    map.set(key, {
      projectAddress: event.assuranceContract,
      erc1155Address: event.erc1155Addr,
      tokenId: event.tokenId.toString(),
      price: event.price.toString(),
      createdAt: event.blockTimestamp.toString(),
    });
  }

  return [...map.values()];
}
