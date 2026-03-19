// ============================================================================
// PONDER SCHEMA
// ============================================================================
// After the indexer redesign, the only tables are:
//   - events: raw event cache (one row per on-chain event)
//   - registry tables: lightweight "what exists" lookups
//
// All derived/aggregated data (beliefs, projects, delegation chains, etc.)
// is now computed client-side by SDK fold functions over the raw events.

export {
  events,
  statementsRegistry,
  projectsRegistry,
  alignmentAttestationsRegistry,
  implicationsRegistry,
} from "./schemas/events.schema";
