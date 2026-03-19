/**
 * Pubstarter Indexer Event Handlers
 *
 * This module handles events from the Pubstarter subsystem:
 * - Factory events (new projects, tokens, marketplaces)
 * - Assurance contract events (initialization, contributions, refunds, withdrawals)
 * - Secondary market events (listings, orders, trades)
 *
 * These handlers are logically separate from the Concept Space indexer.
 */

import { ponder } from "ponder:registry";
import {
  projects,
  projectTokens,
  contributions,
  refunds,
  saleListings,
  buyOrders,
  trades,
  participantSummaries,
  tokenBurns,
  events,
  projectsRegistry,
} from "ponder:schema";
import { captureRawEvent } from "../utils/rawEvents";

// ============================================================================
// FACTORY EVENT HANDLERS
// ============================================================================

/**
 * Handle new assurance contract creation from factory
 * Note: The actual project details come from AssuranceContractInitialized event
 */
ponder.on(
  "AssuranceContractFactory:PubstarterAssuranceContractCreated",
  async ({ event, context }) => {
    const projectAddress = event.args.assuranceContract;
    const timestamp = BigInt(event.block.timestamp);
    const blockNumber = BigInt(event.block.number);

    // Capture raw event
    await context.db.insert(events).values(captureRawEvent(event, 'PubstarterAssuranceContractCreated'));

    // Update projects registry (lightweight tracking)
    const existingRegistry = await context.db.find(projectsRegistry, { id: projectAddress });
    if (!existingRegistry) {
      await context.db.insert(projectsRegistry).values({
        id: projectAddress,
        factoryAddress: event.log.address,
        createdAtBlock: blockNumber,
        createdAtTimestamp: timestamp,
      });
    }

    // Create placeholder project record
    // Will be updated when AssuranceContractInitialized is received
    const existing = await context.db.find(projects, { id: projectAddress });
    if (!existing) {
      await context.db.insert(projects).values({
        id: projectAddress,
        erc1155Address: null,
        marketplaceAddress: null,
        metadataCid: null,
        metadataContent: null,
        recipient: "0x0000000000000000000000000000000000000000",
        conditionAddress: null,
        threshold: 0n,
        deadline: 0n,
        totalReceived: 0n,
        withdrawn: false,
        withdrawnAmount: null,
        createdAt: timestamp,
        createdAtBlock: blockNumber,
      });
    }
  }
);

/**
 * Handle new ERC1155 token contract creation from factory
 * We track this to correlate with assurance contracts
 */
ponder.on(
  "ERC1155Factory:PubstarterERC1155ContractCreated",
  async ({ event: _event, context: _context }) => {
    // The ERC1155 contract address is emitted
    // We'll correlate it with the assurance contract via the ERC1155Offered events
    // Note: The correlation happens when prices are set via ERC1155Offered events
    // Logging removed - no action needed for this event
  }
);

/**
 * Handle new marketplace creation from factory
 */
ponder.on(
  "MarketplaceFactory:PubstarterERC1155SecondaryMarketCreated",
  async ({ event: _event, context: _context }) => {
    // Similar to ERC1155 - we'll track marketplaces via their events
    // Logging removed - no action needed for this event
  }
);

// ============================================================================
// ASSURANCE CONTRACT EVENT HANDLERS
// ============================================================================

// Minimal ABI for reading EthThresholdCondition parameters on-chain
const EthThresholdConditionReadAbi = [
  { type: "function", name: "threshold", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "deadline", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

/**
 * Handle assurance contract initialization
 * The event now provides the condition address (not threshold/deadline directly).
 * We do on-chain reads from the condition contract to populate threshold and deadline
 * for EthThresholdCondition-type projects.
 */
ponder.on(
  "AssuranceContract:AssuranceContractInitialized",
  async ({ event, context }) => {
    const projectAddress = event.log.address;
    const timestamp = BigInt(event.block.timestamp);
    const blockNumber = BigInt(event.block.number);

    // Capture raw event
    await context.db.insert(events).values(captureRawEvent(event, 'AssuranceContractInitialized'));

    const { recipient, condition } = event.args;

    // Read threshold and deadline from the condition contract (EthThresholdCondition pattern).
    // Falls back to 0n if the condition doesn't implement these (non-threshold condition types).
    let threshold = 0n;
    let deadline = 0n;
    try {
      threshold = await context.client.readContract({
        address: condition,
        abi: EthThresholdConditionReadAbi,
        functionName: "threshold",
      });
      deadline = await context.client.readContract({
        address: condition,
        abi: EthThresholdConditionReadAbi,
        functionName: "deadline",
      });
    } catch {
      // Non-EthThresholdCondition: threshold/deadline remain 0n
    }

    // Update or create project record
    const existing = await context.db.find(projects, { id: projectAddress });

    if (existing) {
      await context.db.update(projects, { id: projectAddress }).set({
        recipient,
        conditionAddress: condition,
        threshold,
        deadline,
      });
    } else {
      await context.db.insert(projects).values({
        id: projectAddress,
        erc1155Address: null,
        marketplaceAddress: null,
        metadataCid: null,
        metadataContent: null,
        recipient,
        conditionAddress: condition,
        threshold,
        deadline,
        totalReceived: 0n,
        withdrawn: false,
        withdrawnAmount: null,
        createdAt: timestamp,
        createdAtBlock: blockNumber,
      });
    }
  }
);

/**
 * Handle contract metadata update (IPFS CID for project info)
 */
ponder.on(
  "AssuranceContract:ContractMetadataUpdated",
  async ({ event, context }) => {
    // Capture raw event
    await context.db.insert(events).values(captureRawEvent(event, 'ContractMetadataUpdated'));

    const projectAddress = event.log.address;
    const metadataCid = event.args.metadata;

    const existing = await context.db.find(projects, { id: projectAddress });
    if (existing) {
      await context.db.update(projects, { id: projectAddress }).set({
        metadataCid,
      });

      // TODO: Wait, the following comment is misleading. See utils/ipfs.ts etc.
      // TODO: Fetch metadata from IPFS and cache it
      // Similar to how conceptspace fetches statement content
    }
  }
);

/**
 * Handle ERC1155 token price being set
 * This also helps us correlate ERC1155 contracts with assurance contracts
 */
ponder.on("AssuranceContract:ERC1155Offered", async ({ event, context }) => {
  // Capture raw event
  await context.db.insert(events).values(captureRawEvent(event, 'ERC1155Offered'));

  const projectAddress = event.log.address;
  const timestamp = BigInt(event.block.timestamp);

  const { erc1155Addr, id: tokenId, price } = event.args;

  // Update project with ERC1155 address if not already set
  const project = await context.db.find(projects, { id: projectAddress });
  if (project && !project.erc1155Address) {
    await context.db.update(projects, { id: projectAddress }).set({
      erc1155Address: erc1155Addr,
    });
  }

  // Create token record
  const existingToken = await context.db.find(projectTokens, {
    projectAddress,
    erc1155Address: erc1155Addr,
    tokenId,
  });

  if (!existingToken) {
    await context.db.insert(projectTokens).values({
      projectAddress,
      erc1155Address: erc1155Addr,
      tokenId,
      price,
      createdAt: timestamp,
    });
  }
});

/**
 * Handle primary market token purchase (contribution)
 */
ponder.on("AssuranceContract:ERC1155Bought", async ({ event, context }) => {
  // Capture raw event
  await context.db.insert(events).values(captureRawEvent(event, 'ERC1155Bought'));

  const projectAddress = event.log.address;
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);
  const transactionHash = event.transaction.hash;

  const { participant, erc1155Addr, totalCost, ids, counts } = event.args;

  // Create unique ID from transaction hash and log index
  const contributionId = `${transactionHash}-${event.log.logIndex}`;

  // Insert contribution record
  await context.db.insert(contributions).values({
    id: contributionId,
    projectAddress,
    participant,
    erc1155Address: erc1155Addr,
    totalCost,
    tokenIds: JSON.stringify((ids as readonly bigint[]).map(id => id.toString())),
    tokenCounts: JSON.stringify((counts as readonly bigint[]).map(c => c.toString())),
    createdAt: timestamp,
    blockNumber,
    transactionHash,
  });

  // Update project total received
  const project = await context.db.find(projects, { id: projectAddress });
  if (project) {
    await context.db.update(projects, { id: projectAddress }).set({
      totalReceived: project.totalReceived + totalCost,
    });
  }

  // Update participant summary
  await updateParticipantSummary(
    context,
    projectAddress,
    participant,
    totalCost,
    0n,
    timestamp
  );
});

/**
 * Handle primary market refund
 */
ponder.on("AssuranceContract:ERC1155Sold", async ({ event, context }) => {
  // Capture raw event
  await context.db.insert(events).values(captureRawEvent(event, 'ERC1155Sold'));

  const projectAddress = event.log.address;
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);
  const transactionHash = event.transaction.hash;

  const { participant, erc1155Addr, totalCost: totalRefund, ids, counts } = event.args;

  // Create unique ID
  const refundId = `${transactionHash}-${event.log.logIndex}`;

  // Insert refund record
  await context.db.insert(refunds).values({
    id: refundId,
    projectAddress,
    participant,
    erc1155Address: erc1155Addr,
    totalRefund,
    tokenIds: JSON.stringify((ids as readonly bigint[]).map(id => id.toString())),
    tokenCounts: JSON.stringify((counts as readonly bigint[]).map(c => c.toString())),
    createdAt: timestamp,
    blockNumber,
    transactionHash,
  });

  // Update project total received (subtract refund)
  const project = await context.db.find(projects, { id: projectAddress });
  if (project) {
    await context.db.update(projects, { id: projectAddress }).set({
      totalReceived: project.totalReceived - totalRefund,
    });
  }

  // Update participant summary
  await updateParticipantSummary(
    context,
    projectAddress,
    participant,
    0n,
    totalRefund,
    timestamp
  );
});

/**
 * Handle recipient withdrawal (project succeeded)
 */
ponder.on(
  "AssuranceContract:AssuranceContractWithdrawal",
  async ({ event, context }) => {
    // Capture raw event
    await context.db.insert(events).values(captureRawEvent(event, 'AssuranceContractWithdrawal'));

    const projectAddress = event.log.address;
    const { value } = event.args;

    await context.db.update(projects, { id: projectAddress }).set({
      withdrawn: true,
      withdrawnAmount: value,
    });
  }
);

// ============================================================================
// SECONDARY MARKET EVENT HANDLERS
// ============================================================================

/**
 * Handle new sale listing (ask order)
 */
ponder.on("SecondaryMarket:SaleListingCreated", async ({ event, context }) => {
  // Capture raw event
  await context.db.insert(events).values(captureRawEvent(event, 'SaleListingCreated'));

  const marketplaceAddress = event.log.address;
  const timestamp = BigInt(event.block.timestamp);

  const { saleListingId, seller, tokenId, count, pricePerToken } = event.args;

  await context.db.insert(saleListings).values({
    marketplaceAddress,
    listingId: saleListingId,
    seller,
    tokenId,
    originalCount: count,
    remainingCount: count,
    pricePerToken,
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  });
});

/**
 * Handle sale listing fulfillment (partial or full)
 */
ponder.on("SecondaryMarket:SaleListingFulfilled", async ({ event, context }) => {
  // Capture raw event
  await context.db.insert(events).values(captureRawEvent(event, 'SaleListingFulfilled'));

  const marketplaceAddress = event.log.address;
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);
  const transactionHash = event.transaction.hash;

  const { saleListingId, buyer, count } = event.args;

  // Get the listing to find seller and price info
  const listing = await context.db.find(saleListings, {
    marketplaceAddress,
    listingId: saleListingId,
  });

  if (listing) {
    const newRemaining = listing.remainingCount - count;
    const newStatus = newRemaining === 0n ? "fulfilled" : "active";

    // Update listing
    await context.db
      .update(saleListings, {
        marketplaceAddress,
        listingId: saleListingId,
      })
      .set({
        remainingCount: newRemaining,
        status: newStatus,
        updatedAt: timestamp,
      });

    // Record trade
    const tradeId = `${transactionHash}-${event.log.logIndex}`;
    await context.db.insert(trades).values({
      id: tradeId,
      marketplaceAddress,
      orderType: "sale_listing",
      orderId: saleListingId,
      buyer,
      seller: listing.seller,
      tokenId: listing.tokenId,
      count,
      pricePerToken: listing.pricePerToken,
      totalPrice: count * listing.pricePerToken,
      createdAt: timestamp,
      blockNumber,
      transactionHash,
    });
  }
});

/**
 * Handle sale listing cancellation
 */
ponder.on("SecondaryMarket:SaleListingCancelled", async ({ event, context }) => {
  // Capture raw event
  await context.db.insert(events).values(captureRawEvent(event, 'SaleListingCancelled'));

  const marketplaceAddress = event.log.address;
  const timestamp = BigInt(event.block.timestamp);
  const { saleListingId } = event.args;

  await context.db
    .update(saleListings, {
      marketplaceAddress,
      listingId: saleListingId,
    })
    .set({
      status: "cancelled",
      updatedAt: timestamp,
    });
});

/**
 * Handle new buy order (bid order)
 */
ponder.on("SecondaryMarket:BuyOrderCreated", async ({ event, context }) => {
  // Capture raw event
  await context.db.insert(events).values(captureRawEvent(event, 'BuyOrderCreated'));

  const marketplaceAddress = event.log.address;
  const timestamp = BigInt(event.block.timestamp);

  const { buyOrderId, buyer, tokenId, count, pricePerToken } = event.args;

  await context.db.insert(buyOrders).values({
    marketplaceAddress,
    orderId: buyOrderId,
    buyer,
    tokenId,
    originalCount: count,
    remainingCount: count,
    pricePerToken,
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  });
});

/**
 * Handle buy order fulfillment (partial or full)
 */
ponder.on("SecondaryMarket:BuyOrderFulfilled", async ({ event, context }) => {
  // Capture raw event
  await context.db.insert(events).values(captureRawEvent(event, 'BuyOrderFulfilled'));

  const marketplaceAddress = event.log.address;
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);
  const transactionHash = event.transaction.hash;

  const { buyOrderId, seller, count } = event.args;

  // Get the order to find buyer and price info
  const order = await context.db.find(buyOrders, {
    marketplaceAddress,
    orderId: buyOrderId,
  });

  if (order) {
    const newRemaining = order.remainingCount - count;
    const newStatus = newRemaining === 0n ? "fulfilled" : "active";

    // Update order
    await context.db
      .update(buyOrders, {
        marketplaceAddress,
        orderId: buyOrderId,
      })
      .set({
        remainingCount: newRemaining,
        status: newStatus,
        updatedAt: timestamp,
      });

    // Record trade
    const tradeId = `${transactionHash}-${event.log.logIndex}`;
    await context.db.insert(trades).values({
      id: tradeId,
      marketplaceAddress,
      orderType: "buy_order",
      orderId: buyOrderId,
      buyer: order.buyer,
      seller,
      tokenId: order.tokenId,
      count,
      pricePerToken: order.pricePerToken,
      totalPrice: count * order.pricePerToken,
      createdAt: timestamp,
      blockNumber,
      transactionHash,
    });
  }
});

/**
 * Handle buy order cancellation
 */
ponder.on("SecondaryMarket:BuyOrderCancelled", async ({ event, context }) => {
  // Capture raw event
  await context.db.insert(events).values(captureRawEvent(event, 'BuyOrderCancelled'));

  const marketplaceAddress = event.log.address;
  const timestamp = BigInt(event.block.timestamp);
  const { buyOrderId } = event.args;

  await context.db
    .update(buyOrders, {
      marketplaceAddress,
      orderId: buyOrderId,
    })
    .set({
      status: "cancelled",
      updatedAt: timestamp,
    });
});

/**
 * Handle marketplace creation
 * This event is emitted by the marketplace contract itself in its constructor
 * We use it to correlate marketplaces with their ERC1155 tokens (and thus with projects)
 */
ponder.on("SecondaryMarket:ERC1155SecondaryMarketCreated", async ({ event, context }) => {
  // Capture raw event
  await context.db.insert(events).values(captureRawEvent(event, 'ERC1155SecondaryMarketCreated'));

  const marketplaceAddress = event.log.address;
  const { erc1155 } = event.args;

  // Find the project that uses this ERC1155 token
  const projectsWithToken = await context.db.sql.query.projects.findMany({
    where: (projects, { eq }) => eq(projects.erc1155Address, erc1155),
  });

  // Update the project(s) with the marketplace address
  // In practice, there should be only one project per ERC1155 token
  for (const project of projectsWithToken) {
    await context.db.update(projects, { id: project.id }).set({
      marketplaceAddress,
    });
    // Logging removed - marketplace correlated with project
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Update participant summary for a project
 * Tracks total contributed, refunded, and net contribution
 */
async function updateParticipantSummary(
  context: { db: any },
  projectAddress: `0x${string}`,
  participant: `0x${string}`,
  contributionAmount: bigint,
  refundAmount: bigint,
  timestamp: bigint
) {
  const existing = await context.db.find(participantSummaries, {
    projectAddress,
    participant,
  });

  if (existing) {
    const newTotalContributed = existing.totalContributed + contributionAmount;
    const newTotalRefunded = existing.totalRefunded + refundAmount;

    await context.db
      .update(participantSummaries, { projectAddress, participant })
      .set({
        totalContributed: newTotalContributed,
        totalRefunded: newTotalRefunded,
        netContribution: newTotalContributed - newTotalRefunded,
        contributionCount:
          contributionAmount > 0n
            ? existing.contributionCount + 1
            : existing.contributionCount,
        lastContributionAt: contributionAmount > 0n ? timestamp : existing.lastContributionAt,
      });
  } else {
    await context.db.insert(participantSummaries).values({
      projectAddress,
      participant,
      totalContributed: contributionAmount,
      totalRefunded: refundAmount,
      netContribution: contributionAmount - refundAmount,
      contributionCount: contributionAmount > 0n ? 1 : 0,
      firstContributionAt: contributionAmount > 0n ? timestamp : null,
      lastContributionAt: contributionAmount > 0n ? timestamp : null,
    });
  }
}

// ============================================================================
// ERC1155 TOKEN BURN EVENT HANDLERS
// ============================================================================

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Handle single token burn (transfer to zero address)
 * Users burn tokens to convert from "investor" to "donor"
 */
ponder.on("PremintingERC1155:TransferSingle", async ({ event, context }) => {
  const { to, from, id, value } = event.args;

  // Capture raw event
  await context.db.insert(events).values(captureRawEvent(event, 'TransferSingle'));

  // Only track burns (transfers to zero address)
  if (to.toLowerCase() !== ZERO_ADDRESS) {
    return;
  }

  const erc1155Address = event.log.address;
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);
  const transactionHash = event.transaction.hash;

  // Create unique ID
  const burnId = `${transactionHash}-${event.log.logIndex}`;

  // Insert burn record
  await context.db.insert(tokenBurns).values({
    id: burnId,
    erc1155Address,
    burner: from,
    tokenIds: JSON.stringify([id.toString()]),
    tokenCounts: JSON.stringify([value.toString()]),
    createdAt: timestamp,
    blockNumber,
    transactionHash,
  });
});

/**
 * Handle batch token burn (transfer to zero address)
 */
ponder.on("PremintingERC1155:TransferBatch", async ({ event, context }) => {
  const { to, from, ids, values } = event.args;

  // Capture raw event
  await context.db.insert(events).values(captureRawEvent(event, 'TransferBatch'));

  // Only track burns (transfers to zero address)
  if (to.toLowerCase() !== ZERO_ADDRESS) {
    return;
  }

  const erc1155Address = event.log.address;
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);
  const transactionHash = event.transaction.hash;

  // Create unique ID
  const burnId = `${transactionHash}-${event.log.logIndex}`;

  // Insert burn record
  await context.db.insert(tokenBurns).values({
    id: burnId,
    erc1155Address,
    burner: from,
    tokenIds: JSON.stringify(ids.map((id) => id.toString())),
    tokenCounts: JSON.stringify(values.map((v) => v.toString())),
    createdAt: timestamp,
    blockNumber,
    transactionHash,
  });
});
