import { onchainTable, primaryKey, relations, index } from "ponder";

// ============================================================================
// PUBSTARTER INDEXER SCHEMA
// ============================================================================
// This subsystem tracks individual crowdfunding projects (Kickstarter-style).
// It is logically independent and has no dependencies on other subsystems.
// The Pubstarter indexer tracks:
// - Individual assurance contract projects
// - Token types and prices per project
// - Contributions (primary market purchases)
// - Refunds
// - Secondary market orders and trades
// ============================================================================

/**
 * Projects - tracks assurance contract crowdfunding projects
 * Created when AssuranceContractInitialized event is emitted
 */
export const projects = onchainTable("pubstarter_projects", (t) => ({
  // Assurance contract address
  id: t.hex().primaryKey(),
  // Associated ERC1155 token contract (set via factory correlation)
  erc1155Address: t.hex(),
  // Associated secondary market address (set via factory correlation)
  marketplaceAddress: t.hex(),
  // Project metadata CID from IPFS
  metadataCid: t.text(),
  // Cached metadata content (JSON)
  metadataContent: t.text(),
  // Whether metadata has been successfully fetched from IPFS
  metadataFetched: t.boolean().notNull().default(false),
  // Funding parameters
  recipient: t.hex().notNull(),
  threshold: t.bigint().notNull(),
  deadline: t.bigint().notNull(),
  // Current funding progress (updated on buys/refunds)
  totalReceived: t.bigint().notNull().default(0n),
  // Whether recipient has withdrawn funds
  withdrawn: t.boolean().notNull().default(false),
  withdrawnAmount: t.bigint(),
  // Computed status: pending, succeeded, failed
  // (computed based on threshold, deadline, and current timestamp)
  // Timestamps
  createdAt: t.bigint().notNull(),
  createdAtBlock: t.bigint().notNull(),
}));

/**
 * Project tokens - tracks ERC1155 token types offered by a project
 * Created when ERC1155Offered event is emitted
 */
export const projectTokens = onchainTable(
  "pubstarter_project_tokens",
  (t) => ({
    // Composite key: project + token contract + token ID
    projectAddress: t.hex().notNull(),
    erc1155Address: t.hex().notNull(),
    tokenId: t.bigint().notNull(),
    // Price per token in wei
    price: t.bigint().notNull(),
    // Timestamps
    createdAt: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({
      columns: [table.projectAddress, table.erc1155Address, table.tokenId],
    }),
    // Index for finding all tokens for a project
    projectIdx: index().on(table.projectAddress),
  })
);

/**
 * Contributions - tracks primary market token purchases
 * Created when ERC1155Bought event is emitted from an assurance contract
 */
export const contributions = onchainTable(
  "pubstarter_contributions",
  (t) => ({
    // Unique ID (transaction hash + log index)
    id: t.text().primaryKey(),
    // Project (assurance contract) address
    projectAddress: t.hex().notNull(),
    // Buyer address
    participant: t.hex().notNull(),
    // ERC1155 token contract
    erc1155Address: t.hex().notNull(),
    // Total cost paid
    totalCost: t.bigint().notNull(),
    // Token IDs and counts (stored as JSON arrays)
    tokenIds: t.text().notNull(), // JSON array of bigints
    tokenCounts: t.text().notNull(), // JSON array of bigints
    // Timestamps
    createdAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    // Index for finding contributions to a project
    projectIdx: index().on(table.projectAddress),
    // Index for finding contributions by a user
    participantIdx: index().on(table.participant),
    // Compound index for project + participant (for leaderboards)
    projectParticipantIdx: index().on(table.projectAddress, table.participant),
  })
);

/**
 * Refunds - tracks primary market token refunds
 * Created when ERC1155Sold event is emitted from an assurance contract
 */
export const refunds = onchainTable(
  "pubstarter_refunds",
  (t) => ({
    // Unique ID (transaction hash + log index)
    id: t.text().primaryKey(),
    // Project (assurance contract) address
    projectAddress: t.hex().notNull(),
    // Participant receiving refund
    participant: t.hex().notNull(),
    // ERC1155 token contract
    erc1155Address: t.hex().notNull(),
    // Total refund amount
    totalRefund: t.bigint().notNull(),
    // Token IDs and counts (stored as JSON arrays)
    tokenIds: t.text().notNull(),
    tokenCounts: t.text().notNull(),
    // Timestamps
    createdAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    projectIdx: index().on(table.projectAddress),
    participantIdx: index().on(table.participant),
  })
);

/**
 * Secondary market sale listings (ask orders)
 * Created when SaleListingCreated event is emitted
 */
export const saleListings = onchainTable(
  "pubstarter_sale_listings",
  (t) => ({
    // Composite key: marketplace + listing ID
    marketplaceAddress: t.hex().notNull(),
    listingId: t.bigint().notNull(),
    // Seller address
    seller: t.hex().notNull(),
    // Token being sold
    tokenId: t.bigint().notNull(),
    // Original count and remaining count
    originalCount: t.bigint().notNull(),
    remainingCount: t.bigint().notNull(),
    // Price per token
    pricePerToken: t.bigint().notNull(),
    // Status: active, fulfilled, cancelled
    status: t.text().notNull().default("active"),
    // Timestamps
    createdAt: t.bigint().notNull(),
    updatedAt: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.marketplaceAddress, table.listingId] }),
    // Index for finding active listings by marketplace
    marketplaceStatusIdx: index().on(table.marketplaceAddress, table.status),
    // Index for finding listings by seller
    sellerIdx: index().on(table.seller),
    // Index for finding listings by token
    tokenIdx: index().on(table.marketplaceAddress, table.tokenId),
  })
);

/**
 * Secondary market buy orders (bid orders)
 * Created when BuyOrderCreated event is emitted
 */
export const buyOrders = onchainTable(
  "pubstarter_buy_orders",
  (t) => ({
    // Composite key: marketplace + order ID
    marketplaceAddress: t.hex().notNull(),
    orderId: t.bigint().notNull(),
    // Buyer address
    buyer: t.hex().notNull(),
    // Token being bought
    tokenId: t.bigint().notNull(),
    // Original count and remaining count
    originalCount: t.bigint().notNull(),
    remainingCount: t.bigint().notNull(),
    // Price per token
    pricePerToken: t.bigint().notNull(),
    // Status: active, fulfilled, cancelled
    status: t.text().notNull().default("active"),
    // Timestamps
    createdAt: t.bigint().notNull(),
    updatedAt: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.marketplaceAddress, table.orderId] }),
    // Index for finding active orders by marketplace
    marketplaceStatusIdx: index().on(table.marketplaceAddress, table.status),
    // Index for finding orders by buyer
    buyerIdx: index().on(table.buyer),
    // Index for finding orders by token
    tokenIdx: index().on(table.marketplaceAddress, table.tokenId),
  })
);

/**
 * Secondary market trades (order fills)
 * Created when SaleListingFulfilled or BuyOrderFulfilled events are emitted
 */
export const trades = onchainTable(
  "pubstarter_trades",
  (t) => ({
    // Unique ID (transaction hash + log index)
    id: t.text().primaryKey(),
    // Marketplace address
    marketplaceAddress: t.hex().notNull(),
    // Order type and ID
    orderType: t.text().notNull(), // "sale_listing" or "buy_order"
    orderId: t.bigint().notNull(),
    // Buyer and seller
    buyer: t.hex().notNull(),
    seller: t.hex().notNull(),
    // Trade details
    tokenId: t.bigint().notNull(),
    count: t.bigint().notNull(),
    pricePerToken: t.bigint().notNull(),
    totalPrice: t.bigint().notNull(),
    // Timestamps
    createdAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    // Index for finding trades by marketplace
    marketplaceIdx: index().on(table.marketplaceAddress),
    // Index for finding trades by buyer or seller
    buyerIdx: index().on(table.buyer),
    sellerIdx: index().on(table.seller),
    // Index for price history by token
    tokenTimeIdx: index().on(table.marketplaceAddress, table.tokenId, table.createdAt),
  })
);

/**
 * Participant summary - aggregated contribution data per user per project
 * Updated on contributions and refunds
 */
export const participantSummaries = onchainTable(
  "pubstarter_participant_summaries",
  (t) => ({
    // Composite key: project + participant
    projectAddress: t.hex().notNull(),
    participant: t.hex().notNull(),
    // Total contributed (gross, before refunds)
    totalContributed: t.bigint().notNull().default(0n),
    // Total refunded
    totalRefunded: t.bigint().notNull().default(0n),
    // Net contribution (contributed - refunded)
    netContribution: t.bigint().notNull().default(0n),
    // Number of contribution transactions
    contributionCount: t.integer().notNull().default(0),
    // First and last contribution timestamps
    firstContributionAt: t.bigint(),
    lastContributionAt: t.bigint(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.projectAddress, table.participant] }),
    // Index for leaderboard queries (by net contribution)
    leaderboardIdx: index().on(table.projectAddress, table.netContribution),
    // Index for finding all projects a user contributed to
    participantIdx: index().on(table.participant),
  })
);

/**
 * Token burns - tracks when users burn their project tokens
 * Created when TransferBatch or TransferSingle events show transfer to zero address
 * Burning tokens converts a user from "investor" to "donor" in the retroactive funding model
 */
export const tokenBurns = onchainTable(
  "pubstarter_token_burns",
  (t) => ({
    // Unique ID (transaction hash + log index)
    id: t.text().primaryKey(),
    // ERC1155 token contract
    erc1155Address: t.hex().notNull(),
    // User who burned tokens
    burner: t.hex().notNull(),
    // Token IDs and counts (stored as JSON arrays)
    tokenIds: t.text().notNull(), // JSON array of bigints
    tokenCounts: t.text().notNull(), // JSON array of bigints
    // Timestamps
    createdAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    // Index for finding burns by ERC1155 contract
    erc1155Idx: index().on(table.erc1155Address),
    // Index for finding burns by user
    burnerIdx: index().on(table.burner),
    // Compound index for ERC1155 + burner
    erc1155BurnerIdx: index().on(table.erc1155Address, table.burner),
  })
);

// Pubstarter Relations

export const projectsRelations = relations(projects, ({ many }) => ({
  tokens: many(projectTokens),
  contributions: many(contributions),
  refunds: many(refunds),
  participantSummaries: many(participantSummaries),
}));

export const projectTokensRelations = relations(projectTokens, ({ one }) => ({
  project: one(projects, {
    fields: [projectTokens.projectAddress],
    references: [projects.id],
  }),
}));

export const contributionsRelations = relations(contributions, ({ one }) => ({
  project: one(projects, {
    fields: [contributions.projectAddress],
    references: [projects.id],
  }),
}));

export const refundsRelations = relations(refunds, ({ one }) => ({
  project: one(projects, {
    fields: [refunds.projectAddress],
    references: [projects.id],
  }),
}));

export const participantSummariesRelations = relations(
  participantSummaries,
  ({ one }) => ({
    project: one(projects, {
      fields: [participantSummaries.projectAddress],
      references: [projects.id],
    }),
  })
);
