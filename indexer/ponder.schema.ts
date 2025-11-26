import { index, onchainTable, primaryKey, relations } from "ponder";

// Belief states (matching Solidity constants)
// 0 = NO_OPINION, 1 = BELIEVES, 2 = DISBELIEVES

/**
 * Statements - cached IPFS content for statements
 * Statements are created when we first see them referenced in events
 */
export const statements = onchainTable("statements", (t) => ({
  // IPFS CID as bytes32 (hex string)
  id: t.hex().primaryKey(),
  // Full IPFS CID string (for fetching)
  cid: t.text(),
  // Cached content from IPFS (JSON string)
  content: t.text(),
  // Parsed fields for querying
  statementType: t.text(),
  title: t.text(),
  // Content excerpt for search/display
  excerpt: t.text(),
  // Counts for quick lookups
  believerCount: t.integer().notNull().default(0),
  disbelieverCount: t.integer().notNull().default(0),
  // First seen timestamp
  createdAt: t.bigint().notNull(),
  // Whether content was successfully fetched from IPFS
  contentFetched: t.boolean().notNull().default(false),
}));

/**
 * Beliefs - tracks user beliefs about statements
 * Updated on each DirectSupport event
 */
export const beliefs = onchainTable(
  "beliefs",
  (t) => ({
    // Composite key: user + statement
    user: t.hex().notNull(),
    statementId: t.hex().notNull(),
    // Belief state: 0=noOpinion, 1=believes, 2=disbelieves
    beliefState: t.integer().notNull(),
    // Last updated
    updatedAt: t.bigint().notNull(),
    // Block number of last update
    blockNumber: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.user, table.statementId] }),
    // Index for finding all believers of a statement
    statementIdx: index().on(table.statementId, table.beliefState),
    // Index for finding all statements a user believes
    userIdx: index().on(table.user, table.beliefState),
  })
);

/**
 * Implications - tracks "S1 implies S2" attestations
 * These are NOT transitive
 */
export const implications = onchainTable(
  "implications",
  (t) => ({
    // Composite key: attester + from + to
    attester: t.hex().notNull(),
    fromStatementId: t.hex().notNull(),
    toStatementId: t.hex().notNull(),
    // When attested
    createdAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({
      columns: [table.attester, table.fromStatementId, table.toStatementId],
    }),
    // Reverse lookup: find all statements that imply a given statement (by attester)
    // This is the key index for computing indirect support
    reverseIdx: index().on(table.toStatementId, table.attester),
    // Forward lookup: find all statements implied by a given statement
    forwardIdx: index().on(table.fromStatementId, table.attester),
    // Find all attestations by an attester
    attesterIdx: index().on(table.attester),
  })
);

/**
 * Users - tracks users who have interacted with the system
 */
export const users = onchainTable("users", (t) => ({
  // User address
  id: t.hex().primaryKey(),
  // Count of statements user believes
  beliefCount: t.integer().notNull().default(0),
  // Count of statements user disbelieves
  disbeliefCount: t.integer().notNull().default(0),
  // First interaction timestamp
  createdAt: t.bigint().notNull(),
}));

/**
 * Attesters - tracks addresses that have published implications
 */
export const attesters = onchainTable("attesters", (t) => ({
  // Attester address
  id: t.hex().primaryKey(),
  // Count of implications published
  implicationCount: t.integer().notNull().default(0),
  // First attestation timestamp
  createdAt: t.bigint().notNull(),
}));

// Relations for easier querying
export const statementsRelations = relations(statements, ({ many }) => ({
  beliefs: many(beliefs),
  implicationsFrom: many(implications, { relationName: "fromStatement" }),
  implicationsTo: many(implications, { relationName: "toStatement" }),
}));

export const beliefsRelations = relations(beliefs, ({ one }) => ({
  statement: one(statements, {
    fields: [beliefs.statementId],
    references: [statements.id],
  }),
  user: one(users, {
    fields: [beliefs.user],
    references: [users.id],
  }),
}));

export const implicationsRelations = relations(implications, ({ one }) => ({
  fromStatement: one(statements, {
    fields: [implications.fromStatementId],
    references: [statements.id],
    relationName: "fromStatement",
  }),
  toStatement: one(statements, {
    fields: [implications.toStatementId],
    references: [statements.id],
    relationName: "toStatement",
  }),
  attester: one(attesters, {
    fields: [implications.attester],
    references: [attesters.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  beliefs: many(beliefs),
}));

export const attestersRelations = relations(attesters, ({ many }) => ({
  implications: many(implications),
}));

// ============================================================================
// PUBSTARTER INDEXER SCHEMA
// ============================================================================
// This section contains tables for the Pubstarter subsystem (crowdfunding projects).
// These tables are logically separate from the Concept Space tables above.
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

// ============================================================================
// DELEGATION INDEXER SCHEMA
// ============================================================================
// This section contains tables for the Delegation subsystem (delegatable notes).
// These tables are logically separate from Concept Space and Pubstarter tables.
// The Delegation indexer tracks:
// - Active notes (deposits of tokens)
// - Full delegation chains for each note
// - Revocations and splits
// - Note metadata (intended statement alignment, token details)
// ============================================================================

/**
 * Notes - tracks active delegatable notes
 * Created when NoteCreated event is emitted
 * Updated when notes are delegated, split, or consumed
 */
export const delegatableNotes = onchainTable("delegation_notes", (t) => ({
  // Note ID (from contract)
  id: t.bigint().primaryKey(),
  // Current owner (leaf of delegation chain)
  owner: t.hex().notNull(),
  // Root owner (original depositor)
  rootOwner: t.hex().notNull(),
  // Token details
  token: t.hex().notNull(), // address(0) for ETH
  tokenType: t.integer().notNull(), // 0 = ERC20/ETH, 1 = ERC1155
  tokenId: t.bigint().notNull().default(0n), // Only relevant for ERC1155
  // Amount in the note
  amount: t.bigint().notNull(),
  // Intended statement alignment (bytes32 as hex)
  intendedStatementId: t.hex().notNull(),
  // Chain hash (commitment to delegation chain)
  chainHash: t.hex().notNull(),
  // Status tracking
  active: t.boolean().notNull().default(true),
  // Parent note (if this was created via split/delegation)
  parentNoteId: t.bigint(),
  // Timestamps
  createdAt: t.bigint().notNull(),
  createdAtBlock: t.bigint().notNull(),
  updatedAt: t.bigint().notNull(),
}), (table) => ({
  // Index for finding notes by current owner
  ownerIdx: index().on(table.owner, table.active),
  // Index for finding notes by root owner
  rootOwnerIdx: index().on(table.rootOwner, table.active),
  // Index for finding notes by intended statement
  statementIdx: index().on(table.intendedStatementId, table.active),
  // Index for finding notes by token
  tokenIdx: index().on(table.token, table.tokenType, table.active),
}));

/**
 * Delegation chains - tracks the full delegation chain for each note
 * Each row represents one position in a chain
 * For a note delegated Alice -> Bob -> Charlie:
 *   - (noteId, 0, Alice)   [root]
 *   - (noteId, 1, Bob)
 *   - (noteId, 2, Charlie) [leaf]
 */
export const delegationChains = onchainTable(
  "delegation_chains",
  (t) => ({
    // Composite key: note + position
    noteId: t.bigint().notNull(),
    position: t.integer().notNull(), // 0 = root, higher = closer to leaf
    // Address at this position
    address: t.hex().notNull(),
    // When this chain entry was created
    createdAt: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.noteId, table.position] }),
    // Index for finding all notes in a chain for a given address
    addressIdx: index().on(table.address),
    // Index for efficient chain reconstruction
    notePositionIdx: index().on(table.noteId, table.position),
  })
);

/**
 * Note events - tracks the full history of note operations
 * Useful for auditing and understanding note lifecycle
 */
export const noteEvents = onchainTable(
  "delegation_note_events",
  (t) => ({
    // Unique ID (transaction hash + log index)
    id: t.text().primaryKey(),
    // Event type: created, delegated, revoked, reclaimed, split, purchased
    eventType: t.text().notNull(),
    // Note ID this event relates to
    noteId: t.bigint().notNull(),
    // Actor (who triggered the event)
    actor: t.hex().notNull(),
    // Parent note (for delegation/split events)
    parentNoteId: t.bigint(),
    // Child note (for delegation/split events)
    childNoteId: t.bigint(),
    // Amount involved
    amount: t.bigint(),
    // Additional data (JSON, for purchase details etc.)
    data: t.text(),
    // Timestamps
    createdAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    // Index for finding events by note
    noteIdx: index().on(table.noteId),
    // Index for finding events by actor
    actorIdx: index().on(table.actor),
    // Index for time-based queries
    timeIdx: index().on(table.createdAt),
  })
);

// Delegation Relations

export const delegatableNotesRelations = relations(delegatableNotes, ({ many, one }) => ({
  chainEntries: many(delegationChains),
  events: many(noteEvents),
  parentNote: one(delegatableNotes, {
    fields: [delegatableNotes.parentNoteId],
    references: [delegatableNotes.id],
  }),
}));

export const delegationChainsRelations = relations(delegationChains, ({ one }) => ({
  note: one(delegatableNotes, {
    fields: [delegationChains.noteId],
    references: [delegatableNotes.id],
  }),
}));

export const noteEventsRelations = relations(noteEvents, ({ one }) => ({
  note: one(delegatableNotes, {
    fields: [noteEvents.noteId],
    references: [delegatableNotes.id],
  }),
}));

// ============================================================================
// FUNDING PORTAL INDEXER SCHEMA
// ============================================================================
// This section contains tables for the Funding Portal subsystem (cross-cutting views).
// These tables are logically separate from the foundational subsystems above.
// The Funding Portal indexer tracks:
// - Project alignment attestations (linking projects to statements)
// - Cached federated query results for performance
// - Aggregated contributor data across aligned projects
// ============================================================================

/**
 * Project alignments - tracks attestations that projects align with statements
 * Created when ProjectAlignmentAttestation event is emitted
 */
export const projectAlignments = onchainTable(
  "fundingportal_project_alignments",
  (t) => ({
    // Composite key: attester + project + statement
    attester: t.hex().notNull(),
    projectAddress: t.hex().notNull(),
    statementId: t.hex().notNull(),
    // When attested
    createdAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({
      columns: [table.attester, table.projectAddress, table.statementId],
    }),
    // Index for finding all projects aligned with a statement (by attester)
    statementIdx: index().on(table.statementId, table.attester),
    // Index for finding all statements a project is aligned with
    projectIdx: index().on(table.projectAddress, table.attester),
    // Index for finding all alignments by an attester
    attesterIdx: index().on(table.attester),
  })
);

// Funding Portal Relations

export const projectAlignmentsRelations = relations(projectAlignments, ({ one }) => ({
  // Note: We don't create foreign key relations to other subsystems
  // because they're logically separate. The Funding Portal federates
  // queries to other subsystems' GraphQL APIs instead.
}));
