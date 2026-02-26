// ============================================================================
// PONDER SCHEMA - FEDERATED INDEXER ARCHITECTURE
// ============================================================================
// This file imports and re-exports all subsystem schemas.
// Each subsystem is logically independent with its own domain:
//
// - Concept Space: Statements, beliefs, and implication relationships
// - Pubstarter: Individual crowdfunding projects and secondary markets
// - Delegation: Delegatable notes and delegation chains
// - Funding Portal: Cross-cutting views (federates queries to other subsystems)
//
// The subsystems have no direct database dependencies on each other.
// Cross-subsystem queries are handled via GraphQL API federation.
// ============================================================================

// Import and re-export Concept Space schema
export {
  statements,
  beliefs,
  implications,
  users,
  attesters,
  statementsRelations,
  beliefsRelations,
  implicationsRelations,
  usersRelations,
  attestersRelations,
} from "./schemas/conceptspace.schema";

// Import and re-export Pubstarter schema
export {
  projects,
  projectTokens,
  contributions,
  refunds,
  saleListings,
  buyOrders,
  trades,
  participantSummaries,
  tokenBurns,
  projectsRelations,
  projectTokensRelations,
  contributionsRelations,
  refundsRelations,
  participantSummariesRelations,
} from "./schemas/pubstarter.schema";

// Import and re-export Delegation schema
export {
  delegatableNotes,
  delegationChains,
  noteEvents,
  noteIntentAttestations,
  delegatableNotesRelations,
  delegationChainsRelations,
  noteEventsRelations,
  noteIntentAttestationsRelations,
} from "./schemas/delegation.schema";

// Import and re-export Funding Portal schema
export {
  alignmentAttestations,
  alignmentAttestationsRelations,
} from "./schemas/fundingportal.schema";

// Import and re-export Mutable Refs schema
export {
  mutableRefs,
  refUpdates,
  mutableRefsRelations,
  refUpdatesRelations,
} from "./schemas/mutable-refs.schema";
