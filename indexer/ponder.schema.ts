// ============================================================================
// PONDER SCHEMA
// ============================================================================
// After the indexer redesign, the only table is:
//   - events: raw event cache (one row per on-chain event)
//
// All derived/aggregated data (beliefs, projects, delegation chains, etc.)
// is computed client-side by SDK fold functions over the raw events.

export { events } from "./schemas/events.schema";
