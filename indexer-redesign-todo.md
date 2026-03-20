# To-do list for the indexer redesign.

See specs/indexer/redesign.md for the fuller picture of what this redesign is about.

## Remove registry tables ✅

**Decision: remove them.** The 4 registry tables add business logic to the indexer (CID conversion, dedup checks, registry inserts) for no meaningful performance benefit. All registry data is derivable from raw events at effectively zero cost.

Done. All registry tables removed from indexer schema, event handlers, and API. SDK callers updated to derive the same data from raw events. 616 tests passing.
