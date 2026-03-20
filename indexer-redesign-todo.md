# To-do list for the indexer redesign.

See specs/indexer/redesign.md for the fuller picture of what this redesign is about.

## Remaining cleanup

- [ ] **Bug**: Fix `decodeContractMetadataUpdatedEvent` in `sdk/src/utils/eventDecoder.ts:249` — uses `args.uri` but ABI field is named `metadata`. Pubstarter project metadata is silently `undefined` in the event cache path. Fix: `args.uri` → `args.metadata`. (Found in 2026-03-19 review.)
- [ ] **Test**: Add unit tests for `eventDecoder.ts` — the metadata bug above slipped through because fold tests construct events directly, bypassing the decoder. At minimum, add a decoder-roundtrip test for `decodeContractMetadataUpdatedEvent`.
- [ ] Delete `sdk/src/generated/` (3 files: `graphql.ts`, `gql.ts`, `index.ts`) — not imported anywhere, leftover from old GraphQL codegen
- [ ] Delete `sdk/src/subsystems/fundingportals/queries.graphql` — orphaned `.graphql` file with old queries
- [ ] Delete `integration-tests/src/generated/` (`gql.ts`, `graphql.ts`) — analogous leftover generated files
- [ ] Update `ui/e2e/utils/indexer.ts` — still uses old GraphQL `_meta` polling and references deleted `/conceptspace/api/sync-ipfs` endpoint; needs to use Ponder REST `/status` like `sdk/src/indexer-sync.ts` does
- [ ] Update `indexer/README.md` — still describes the old 5-subsystem architecture with GraphQL APIs
- [ ] Update `specs/indexer/redesign.md` Phase 4 section — says "hybrid approach" with some GraphQL remaining, but we've since gone fully GraphQL-free
- [ ] Clean up stale JSDoc comments in `actions.ts` files that reference `graphqlClient`

## Remove registry tables

**Decision: remove them.** The 4 registry tables add business logic to the indexer (CID conversion, dedup checks, registry inserts) for no meaningful performance benefit. All registry data is derivable from raw events at effectively zero cost.

### What to remove

**Indexer side:**
- Delete the 4 registry table definitions from `indexer/schemas/events.schema.ts` (`statementsRegistry`, `projectsRegistry`, `alignmentAttestationsRegistry`, `implicationsRegistry`)
- Strip registry logic from `indexer/src/events-cache/index.ts` — every handler should be just `captureRawEvent()`, nothing else. The handlers for `DirectSupport`, `ImplicationAttestation`, `PubstarterAssuranceContractCreated`, and `AlignmentAttestation` currently do extra registry work; remove it.
- Remove the 4 registry REST endpoints from `indexer/src/api/index.ts` (`/api/statements_registry`, `/api/projects_registry`, `/api/alignment_attestations_registry`, `/api/implications_registry`)

**SDK side:**
- Delete the 4 `fetch*Registry()` functions from `sdk/src/utils/eventCacheClient.ts` and their associated types (`StatementRegistryItem`, `ProjectRegistryItem`, `AlignmentAttestationRegistryItem`, `ImplicationRegistryItem`)
- Update all SDK callers to derive the same data from raw events instead:

### How each registry query maps to events

| Registry query | Replacement | Notes |
|---|---|---|
| `fetchProjectsRegistry()` | `fetchEvents(eventName=PubstarterAssuranceContractCreated)` | 1:1 — one event per project, decode args to get address. No dedup needed. |
| `fetchAlignmentAttestationsRegistry(statementId=X)` | `fetchEvents(eventName=AlignmentAttestation, topic3=X)` | 1:1 — indexed params are in topics. Filter by topic works the same as the registry's query params. |
| `fetchImplicationsRegistry(fromStatementId=X)` | `fetchEvents(eventName=ImplicationAttestation, topic2=X)` | Same — indexed params in topics. |
| `fetchStatementsRegistry()` | Already free — `foldAllStatements` fetches all `DirectSupport` events anyway; statement discovery falls out of the fold. For implications, `ImplicationAttestation` events contain both CIDs in topics. |

**Important:** Verify which topic positions (topic1/topic2/topic3) correspond to which indexed params for each event type before implementing. Check the contract ABIs or the event decoder in `sdk/src/utils/eventDecoder.ts`.
