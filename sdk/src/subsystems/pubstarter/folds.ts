import type { Project, ProjectToken, Contribution, Refund, SaleListing, BuyOrder, Trade, TokenBurn } from './types.js';
import type {
  AssuranceContractCreatedEvent,
  AssuranceContractInitializedEvent,
  ContractMetadataUpdatedEvent,
  ERC1155OfferedEvent,
  ERC1155BoughtEvent,
  ERC1155SoldEvent,
  AssuranceContractWithdrawalEvent,
  SaleListingCreatedEvent,
  SaleListingFulfilledEvent,
  SaleListingCancelledEvent,
  BuyOrderCreatedEvent,
  BuyOrderFulfilledEvent,
  BuyOrderCancelledEvent,
  TransferSingleEvent,
  TransferBatchEvent,
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

// ============================================================================
// Secondary market folds
// ============================================================================

/**
 * Discriminated union of all secondary-market events for one marketplace.
 * Caller is responsible for filtering events to a single marketplace address.
 */
export type SecondaryMarketEvent =
  | { type: 'saleListingCreated'; event: SaleListingCreatedEvent }
  | { type: 'saleListingFulfilled'; event: SaleListingFulfilledEvent }
  | { type: 'saleListingCancelled'; event: SaleListingCancelledEvent }
  | { type: 'buyOrderCreated'; event: BuyOrderCreatedEvent }
  | { type: 'buyOrderFulfilled'; event: BuyOrderFulfilledEvent }
  | { type: 'buyOrderCancelled'; event: BuyOrderCancelledEvent };

/**
 * Fold secondary-market events → sale listings, buy orders, and trades.
 *
 * Sale listings and buy orders are keyed by their IDs. Fulfilled events
 * partially or fully fill an existing listing/order (reducing remainingCount)
 * and produce a Trade record. Cancelled events set status to "cancelled".
 * Status transitions to "filled" when remainingCount reaches 0.
 *
 * Caller is responsible for filtering events to a single marketplace address
 * before calling this function. Events must arrive in block/logIndex order.
 */
export function foldSecondaryMarket(events: SecondaryMarketEvent[]): {
  saleListings: SaleListing[];
  buyOrders: BuyOrder[];
  trades: Trade[];
} {
  const saleListingsMap = new Map<string, SaleListing>();
  const buyOrdersMap = new Map<string, BuyOrder>();
  const trades: Trade[] = [];

  for (const { type, event } of events) {
    const marketplaceAddress = event.contractAddress;

    switch (type) {
      case 'saleListingCreated': {
        const listingId = event.saleListingId.toString();
        saleListingsMap.set(listingId, {
          marketplaceAddress,
          listingId,
          seller: event.seller,
          tokenId: event.tokenId.toString(),
          originalCount: event.count.toString(),
          remainingCount: event.count.toString(),
          pricePerToken: event.pricePerToken.toString(),
          status: 'active',
          createdAt: event.blockTimestamp.toString(),
          updatedAt: event.blockTimestamp.toString(),
        });
        break;
      }

      case 'saleListingFulfilled': {
        const listingId = event.saleListingId.toString();
        const listing = saleListingsMap.get(listingId);
        if (listing) {
          const newRemaining = BigInt(listing.remainingCount) - event.count;
          listing.remainingCount = newRemaining.toString();
          listing.status = newRemaining <= 0n ? 'filled' : 'active';
          listing.updatedAt = event.blockTimestamp.toString();

          trades.push({
            id: `${event.transactionHash}-${event.logIndex}`,
            marketplaceAddress,
            orderType: 'sale_listing',
            orderId: listingId,
            buyer: event.buyer,
            seller: listing.seller,
            tokenId: listing.tokenId,
            count: event.count.toString(),
            pricePerToken: listing.pricePerToken,
            totalPrice: (event.count * BigInt(listing.pricePerToken)).toString(),
            createdAt: event.blockTimestamp.toString(),
            blockNumber: event.blockNumber.toString(),
            transactionHash: event.transactionHash,
          });
        }
        break;
      }

      case 'saleListingCancelled': {
        const listingId = event.saleListingId.toString();
        const listing = saleListingsMap.get(listingId);
        if (listing) {
          listing.status = 'cancelled';
          listing.updatedAt = event.blockTimestamp.toString();
        }
        break;
      }

      case 'buyOrderCreated': {
        const orderId = event.buyOrderId.toString();
        buyOrdersMap.set(orderId, {
          marketplaceAddress,
          orderId,
          buyer: event.buyer,
          tokenId: event.tokenId.toString(),
          originalCount: event.count.toString(),
          remainingCount: event.count.toString(),
          pricePerToken: event.pricePerToken.toString(),
          status: 'active',
          createdAt: event.blockTimestamp.toString(),
          updatedAt: event.blockTimestamp.toString(),
        });
        break;
      }

      case 'buyOrderFulfilled': {
        const orderId = event.buyOrderId.toString();
        const order = buyOrdersMap.get(orderId);
        if (order) {
          const newRemaining = BigInt(order.remainingCount) - event.count;
          order.remainingCount = newRemaining.toString();
          order.status = newRemaining <= 0n ? 'filled' : 'active';
          order.updatedAt = event.blockTimestamp.toString();

          trades.push({
            id: `${event.transactionHash}-${event.logIndex}`,
            marketplaceAddress,
            orderType: 'buy_order',
            orderId,
            buyer: order.buyer,
            seller: event.seller,
            tokenId: order.tokenId,
            count: event.count.toString(),
            pricePerToken: order.pricePerToken,
            totalPrice: (event.count * BigInt(order.pricePerToken)).toString(),
            createdAt: event.blockTimestamp.toString(),
            blockNumber: event.blockNumber.toString(),
            transactionHash: event.transactionHash,
          });
        }
        break;
      }

      case 'buyOrderCancelled': {
        const orderId = event.buyOrderId.toString();
        const order = buyOrdersMap.get(orderId);
        if (order) {
          order.status = 'cancelled';
          order.updatedAt = event.blockTimestamp.toString();
        }
        break;
      }
    }
  }

  return {
    saleListings: [...saleListingsMap.values()],
    buyOrders: [...buyOrdersMap.values()],
    trades,
  };
}

// ============================================================================
// Token burn folds
// ============================================================================

/**
 * Fold ERC1155 TransferSingle and TransferBatch events → token burn records.
 *
 * Only processes transfers where `to` is the zero address (burns).
 * Other transfers are ignored.
 *
 * Caller may pass all transfer events; non-burn transfers are filtered out.
 * Events must arrive in block/logIndex order.
 */
export function foldTokenBurns(events: (TransferSingleEvent | TransferBatchEvent)[]): TokenBurn[] {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const burns: TokenBurn[] = [];

  for (const event of events) {
    if (event.to.toLowerCase() !== ZERO_ADDRESS) continue;

    const id = `${event.transactionHash}-${event.logIndex}`;

    if ('ids' in event) {
      // TransferBatchEvent
      const batch = event as TransferBatchEvent;
      burns.push({
        id,
        erc1155Address: batch.contractAddress,
        burner: batch.from,
        tokenIds: JSON.stringify(batch.ids.map((i) => i.toString())),
        tokenCounts: JSON.stringify(batch.values.map((v) => v.toString())),
        createdAt: batch.blockTimestamp.toString(),
        blockNumber: batch.blockNumber.toString(),
        transactionHash: batch.transactionHash,
      });
    } else {
      // TransferSingleEvent
      const single = event as TransferSingleEvent;
      burns.push({
        id,
        erc1155Address: single.contractAddress,
        burner: single.from,
        tokenIds: JSON.stringify([single.id.toString()]),
        tokenCounts: JSON.stringify([single.value.toString()]),
        createdAt: single.blockTimestamp.toString(),
        blockNumber: single.blockNumber.toString(),
        transactionHash: single.transactionHash,
      });
    }
  }

  return burns;
}
