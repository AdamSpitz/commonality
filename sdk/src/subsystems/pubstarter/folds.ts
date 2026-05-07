import type { Project, ProjectToken, Contribution, Refund, SaleListing, BuyOrder, Trade, TokenBurn } from './types.js';
import { ETH_CURRENCY, type Currency } from '../../utils/currency.js';
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

export const PROJECT_FOLD_VERSION = 1;
export const CONTRIBUTIONS_FOLD_VERSION = 1;
export const SECONDARY_MARKET_FOLD_VERSION = 1;
export const TOKEN_BURNS_FOLD_VERSION = 1;

/**
 * Mutable accumulator for foldProject — holds the raw (pre-serialized) state
 * so it can be stored and passed back in for incremental/resumable folding.
 */
export interface ProjectAccumulator {
  foldVersion: typeof PROJECT_FOLD_VERSION;
  id: string;
  erc1155Address: string;
  recipient: string;
  conditionAddress: string | null;
  metadataCid: string | undefined;
  createdAt: string | undefined;
  blockNumber: string | undefined;
  lastEventBlockNumber?: string;
  lastEventLogIndex?: number;
  totalReceived: bigint;
}

export interface ContributionsAccumulator {
  foldVersion: typeof CONTRIBUTIONS_FOLD_VERSION;
  contributions: Contribution[];
  refunds: Refund[];
}

export interface SecondaryMarketAccumulator {
  foldVersion: typeof SECONDARY_MARKET_FOLD_VERSION;
  saleListings: SaleListing[];
  buyOrders: BuyOrder[];
  trades: Trade[];
}

export interface TokenBurnAccumulator {
  foldVersion: typeof TOKEN_BURNS_FOLD_VERSION;
  burns: TokenBurn[];
}

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
 *
 * Pass `initialAccumulator` (from a previous call's `accumulator` output) to resume
 * folding from a saved cursor rather than processing all events from scratch.
 */
export function foldProject(
  events: ProjectEvent[],
  initialAccumulator?: ProjectAccumulator,
  fundingCurrency: Currency = ETH_CURRENCY,
): { project: Omit<Project, 'threshold' | 'deadline'> | null; accumulator: ProjectAccumulator } {
  const acc: ProjectAccumulator = initialAccumulator?.foldVersion === PROJECT_FOLD_VERSION
    ? { ...initialAccumulator }
    : {
        foldVersion: PROJECT_FOLD_VERSION,
        id: '',
        erc1155Address: '',
        recipient: '',
        conditionAddress: null,
        metadataCid: undefined,
        createdAt: undefined,
        blockNumber: undefined,
        lastEventBlockNumber: undefined,
        lastEventLogIndex: undefined,
        totalReceived: 0n,
      };

  const hasCursor = initialAccumulator?.foldVersion === PROJECT_FOLD_VERSION && initialAccumulator.lastEventLogIndex !== undefined && initialAccumulator.lastEventBlockNumber !== undefined;
  const lastProcessedBlock = hasCursor ? BigInt(initialAccumulator.lastEventBlockNumber!) : null;
  const lastProcessedLogIndex = hasCursor ? initialAccumulator.lastEventLogIndex! : null;

  for (const { type, event } of events) {
    if (
      lastProcessedBlock !== null &&
      (event.blockNumber < lastProcessedBlock ||
        (event.blockNumber === lastProcessedBlock && lastProcessedLogIndex !== null && event.logIndex <= lastProcessedLogIndex))
    ) {
      continue;
    }

    acc.lastEventBlockNumber = event.blockNumber.toString();
    acc.lastEventLogIndex = event.logIndex;

    switch (type) {
      case 'created':
        acc.id = event.assuranceContract;
        acc.createdAt = event.blockTimestamp.toString();
        acc.blockNumber = event.blockNumber.toString();
        break;
      case 'initialized':
        if (!acc.id) acc.id = event.contractAddress;
        acc.recipient = event.recipient;
        acc.conditionAddress = event.condition;
        break;
      case 'metadataUpdated':
        acc.metadataCid = event.uri || event.metadata;
        break;
      case 'tokenOffered':
        if (!acc.erc1155Address) acc.erc1155Address = event.erc1155Addr;
        break;
      case 'bought':
        acc.totalReceived += event.totalCost;
        break;
      case 'sold':
        acc.totalReceived -= event.totalCost;
        break;
      case 'withdrawal':
        // Withdrawals do not change totalReceived — they represent disbursement of funds
        // after the project succeeds, which is tracked separately.
        break;
    }
  }

  const project: Omit<Project, 'threshold' | 'deadline'> | null = acc.id
    ? {
        id: acc.id,
        erc1155Address: acc.erc1155Address,
        marketplaceAddress: null,
        recipient: acc.recipient,
        fundingCurrency,
        totalReceived: acc.totalReceived.toString(),
        conditionAddress: acc.conditionAddress,
        metadataCid: acc.metadataCid,
        createdAt: acc.createdAt,
        blockNumber: acc.blockNumber,
      }
    : null;

  return { project, accumulator: acc };
}

/**
 * Fold ERC1155Bought and ERC1155Sold events → contribution and refund records.
 *
 * Each bought event becomes one Contribution; each sold event becomes one Refund.
 * IDs are derived from transactionHash + logIndex (matching indexer convention).
 */
export function foldContributionsFromEvents(
  boughtEvents: ERC1155BoughtEvent[],
  soldEvents: ERC1155SoldEvent[],
  initialState?: ContributionsAccumulator,
  fundingCurrency: Currency = ETH_CURRENCY,
): {
  contributions: Contribution[];
  refunds: Refund[];
  accumulator: ContributionsAccumulator;
} {
  const accumulator: ContributionsAccumulator = initialState?.foldVersion === CONTRIBUTIONS_FOLD_VERSION
    ? {
        foldVersion: CONTRIBUTIONS_FOLD_VERSION,
        contributions: [...initialState.contributions],
        refunds: [...initialState.refunds],
      }
    : {
        foldVersion: CONTRIBUTIONS_FOLD_VERSION,
        contributions: [],
        refunds: [],
      };
  const { contributions, refunds } = accumulator;

  for (const event of boughtEvents) {
    const id = `${event.transactionHash}-${event.logIndex}`;
    contributions.push({
      id,
      participant: event.participant,
      projectAddress: event.contractAddress,
      erc1155Address: event.erc1155Addr,
      tokenIds: JSON.stringify(event.ids.map((id) => id.toString())),
      tokenCounts: JSON.stringify(event.counts.map((c) => c.toString())),
      currency: fundingCurrency,
      totalCost: event.totalCost.toString(),
      createdAt: event.blockTimestamp.toString(),
      blockNumber: event.blockNumber.toString(),
      transactionHash: event.transactionHash,
    });
  }

  for (const event of soldEvents) {
    const id = `${event.transactionHash}-${event.logIndex}`;
    refunds.push({
      id,
      participant: event.participant,
      projectAddress: event.contractAddress,
      erc1155Address: event.erc1155Addr,
      tokenIds: JSON.stringify(event.ids.map((id) => id.toString())),
      tokenCounts: JSON.stringify(event.counts.map((c) => c.toString())),
      currency: fundingCurrency,
      totalRefund: event.totalCost.toString(),
      createdAt: event.blockTimestamp.toString(),
      blockNumber: event.blockNumber.toString(),
      transactionHash: event.transactionHash,
    });
  }

  return { contributions, refunds, accumulator };
}

export function foldContributions(
  boughtEvents: ERC1155BoughtEvent[],
  soldEvents: ERC1155SoldEvent[],
  fundingCurrency: Currency = ETH_CURRENCY,
): {
  contributions: Contribution[];
  refunds: Refund[];
} {
  return foldContributionsFromEvents(boughtEvents, soldEvents, undefined, fundingCurrency);
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
export function foldProjectTokens(
  events: ERC1155OfferedEvent[],
  fundingCurrency: Currency = ETH_CURRENCY,
): ProjectToken[] {
  const map = new Map<string, ProjectToken>();

  for (const event of events) {
    const key = `${event.contractAddress.toLowerCase()}:${event.erc1155Addr.toLowerCase()}:${event.id.toString()}`;
    map.set(key, {
      projectAddress: event.contractAddress,
      erc1155Address: event.erc1155Addr,
      tokenId: event.id.toString(),
      currency: fundingCurrency,
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
export function foldSecondaryMarket(
  events: SecondaryMarketEvent[],
  initialState?: SecondaryMarketAccumulator,
  fundingCurrency: Currency = ETH_CURRENCY,
): {
  saleListings: SaleListing[];
  buyOrders: BuyOrder[];
  trades: Trade[];
  accumulator: SecondaryMarketAccumulator;
} {
  const accumulator: SecondaryMarketAccumulator = initialState?.foldVersion === SECONDARY_MARKET_FOLD_VERSION
    ? {
        foldVersion: SECONDARY_MARKET_FOLD_VERSION,
        saleListings: initialState.saleListings.map(l => ({ ...l })),
        buyOrders: initialState.buyOrders.map(o => ({ ...o })),
        trades: [...initialState.trades],
      }
    : {
        foldVersion: SECONDARY_MARKET_FOLD_VERSION,
        saleListings: [],
        buyOrders: [],
        trades: [],
      };
  const saleListingsMap = new Map<string, SaleListing>(
    accumulator.saleListings.map(l => [l.listingId, { ...l }]),
  );
  const buyOrdersMap = new Map<string, BuyOrder>(
    accumulator.buyOrders.map(o => [o.orderId, { ...o }]),
  );
  const trades: Trade[] = [...accumulator.trades];

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
          currency: fundingCurrency,
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
            currency: listing.currency,
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
          currency: fundingCurrency,
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
            currency: order.currency,
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

  accumulator.saleListings = [...saleListingsMap.values()];
  accumulator.buyOrders = [...buyOrdersMap.values()];
  accumulator.trades = trades;

  return {
    saleListings: accumulator.saleListings,
    buyOrders: accumulator.buyOrders,
    trades: accumulator.trades,
    accumulator,
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
export function foldTokenBurns(
  events: (TransferSingleEvent | TransferBatchEvent)[],
  initialState?: TokenBurnAccumulator,
): { burns: TokenBurn[]; accumulator: TokenBurnAccumulator } {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const accumulator: TokenBurnAccumulator = initialState?.foldVersion === TOKEN_BURNS_FOLD_VERSION
    ? {
        foldVersion: TOKEN_BURNS_FOLD_VERSION,
        burns: [...initialState.burns],
      }
    : {
        foldVersion: TOKEN_BURNS_FOLD_VERSION,
        burns: [],
      };
  const { burns } = accumulator;

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

  return { burns, accumulator };
}
