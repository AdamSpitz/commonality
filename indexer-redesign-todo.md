# To-do list for the indexer redesign.

First, take a look at specs/indexer/redesign.md for the fuller picture of what this redesign is about.

The rest of this file should be a to-do list.

## What still uses GraphQL (intentionally kept per hybrid approach)

**In the SDK:**
1. ~~`sdk/src/utils/graphqlClient.ts`~~ ✅ Deleted — all usages migrated:
   - ~~`fundingportals/queries.ts:336` — `GetProjectDetailsDocument` (project threshold/deadline)~~ ✅ Replaced with `getProject()` chain reads
   - ~~`fundingportals/queries.ts:383` — `GetParticipantSummariesDocument` (contributor leaderboards)~~ ✅ Replaced with `getProjectContributions()` + `getProjectRefunds()` fold
   - ~~`indexer-sync.ts:67` — `_meta` query (indexer sync status)~~ ✅ Replaced with Ponder REST `/status` endpoint

## What can be deleted

### SDK side — fully removable

| File | Reason |
|------|--------|
| `sdk/src/generated/graphql.ts` | All types used only by remaining GraphQL queries |
| `sdk/src/generated/gql.ts` | All operation documents used only by remaining GraphQL queries |
| `sdk/src/generated/index.ts` | Re-exports gql.ts |
| `sdk/src/utils/graphqlClient.ts` | Only serves the two fundingportal aggregated queries above |
| `sdk/src/utils/index.ts` | Re-exports graphqlClient.ts |

To remove GraphQL from the remaining two fundingportal functions, replace them with chain reads:
- `GetProjectDetailsDocument` → `readConditionParams` (already exists in `chain-reads.ts`) + on-chain balance reads
- `GetParticipantSummariesDocument` → fold from `fetchAllBoughtEvents` + `fetchAllSoldEvents` (already in event cache client)

### Indexer side — fully removable

**REST custom endpoints** (were replacing GraphQL for complex queries, now done client-side in SDK):

| File | Endpoints |
|------|-----------|
| `indexer/src/conceptspace/api.ts` | `/api/indirect-supporters`, `/api/statement-support`, `/api/suggestions`, `/api/high-profile-signers` |
| `indexer/src/fundingportal/api.ts` | `/api/aligned-projects`, `/api/available-funding`, `/api/contributor-leaderboard`, `/api/project-statements` |
| `indexer/src/delegation/api.ts` | `/api/delegation-chain`, `/api/active-notes`, `/api/available-funding`, `/api/notes-by-root-owner`, `/api/note-history` |
| `indexer/src/pubstarter/api.ts` | Only GraphQL passthrough — delete entire file |

**Background sync jobs** (client fetches IPFS directly per phase 2):

| File | Used by |
|------|---------|
| `indexer/src/utils/ipfsSyncJob.ts` | `conceptspace/utils/ipfsSyncJob.ts`, `pubstarter/utils/ipfsSyncJob.ts` |
| `indexer/src/conceptspace/utils/ipfsSyncJob.ts` | `conceptspace/api.ts` |
| `indexer/src/conceptspace/utils/ipfs.ts` | `ipfsSyncJob.ts` |
| `indexer/src/pubstarter/utils/ipfsSyncJob.ts` | `pubstarter/api.ts` |
| `indexer/src/pubstarter/utils/ipfs.ts` | `ipfsSyncJob.ts` |
| `indexer/src/utils/socialSyncJob.ts` | `api/index.ts` |
| `indexer/src/utils/socialData.ts` | `socialSyncJob.ts` |
| `indexer/src/api/index.ts` lines 170-177 | Calls `startIpfsSyncJobs` and `startSocialSyncJob` |

**Old derived-table event handlers** (business logic moved to SDK folds, raw events captured by `events-cache/index.ts`):

| File | Note |
|------|------|
| `indexer/src/conceptspace/index.ts` | Belief/implication aggregation handlers — logic moved to SDK folds |
| `indexer/src/pubstarter/index.ts` | Project/token/contribution/trade aggregation handlers |
| `indexer/src/fundingportal/index.ts` | Alignment attestation handlers |
| `indexer/src/delegation/index.ts` | Note/delegation chain aggregation handlers |

These handlers maintain the old derived tables (beliefs, implications, contributions, participantSummaries, etc.) which are no longer queried by the SDK.

**Old schema tables** (derived data now computed by SDK folds):

| Table | In schema file |
|-------|----------------|
| `statements` | `conceptspace.schema.ts` — replaced by `statements_registry` |
| `beliefs` | `conceptspace.schema.ts` — replaced by SDK fold from events |
| `implications` | `conceptspace.schema.ts` — replaced by SDK fold from events |
| `users` | `conceptspace.schema.ts` — replaced by `userSocialData` (but that needs review) |
| `attesters` | `conceptspace.schema.ts` — only used by GraphQL federation |
| `projects` | `pubstarter.schema.ts` — replaced by SDK fold + chain reads |
| `projectTokens` | `pubstarter.schema.ts` — replaced by SDK fold |
| `contributions` | `pubstarter.schema.ts` — replaced by SDK fold |
| `refunds` | `pubstarter.schema.ts` — replaced by SDK fold |
| `saleListings` | `pubstarter.schema.ts` — replaced by SDK fold |
| `buyOrders` | `pubstarter.schema.ts` — replaced by SDK fold |
| `trades` | `pubstarter.schema.ts` — replaced by SDK fold |
| `participantSummaries` | `pubstarter.schema.ts` — replaced by SDK fold |
| `tokenBurns` | `pubstarter.schema.ts` — replaced by SDK fold |
| `delegatableNotes` | `delegation.schema.ts` — replaced by SDK fold |
| `delegationChains` | `delegation.schema.ts` — replaced by SDK fold |
| `noteEvents` | `delegation.schema.ts` — replaced by SDK fold |
| `noteIntentAttestations` | `delegation.schema.ts` — replaced by SDK fold |
| `alignmentAttestations` | `fundingportal.schema.ts` — replaced by SDK fold |
| `mutableRefs` | `mutable-refs.schema.ts` — replaced by SDK fold |
| `refUpdates` | `mutable-refs.schema.ts` — replaced by SDK fold |

**Schema files** (only keep the new event cache schema):

| File | Status |
|------|--------|
| `schemas/events.schema.ts` | ✅ Keep (event cache) |
| `schemas/statements_registry`, `projects_registry`, etc. | ✅ Keep (registry tables) |
| `schemas/conceptspace.schema.ts` | Delete (derived tables) |
| `schemas/pubstarter.schema.ts` | Delete (derived tables) |
| `schemas/fundingportal.schema.ts` | Delete (derived tables) |
| `schemas/delegation.schema.ts` | Delete (derived tables) |
| `schemas/mutable-refs.schema.ts` | Delete (derived tables) |
| `schemas/social.schema.ts` | Delete |

**Full file deletion list:** ✅ ALL DONE

```
~~sdk/src/generated/graphql.ts~~ ✅ deleted
~~sdk/src/generated/gql.ts~~ ✅ deleted
~~sdk/src/generated/index.ts~~ ✅ deleted
~~sdk/src/utils/graphqlClient.ts~~ ✅ deleted
~~sdk/src/utils/index.ts (graphqlClient re-export removed)~~ ✅

~~indexer/src/conceptspace/api.ts~~ ✅ deleted
~~indexer/src/conceptspace/index.ts~~ ✅ deleted
~~indexer/src/conceptspace/utils/ipfsSyncJob.ts~~ ✅ deleted
~~indexer/src/conceptspace/utils/ipfs.ts~~ ✅ deleted
~~indexer/src/pubstarter/api.ts~~ ✅ deleted
~~indexer/src/pubstarter/index.ts~~ ✅ deleted
~~indexer/src/pubstarter/utils/ipfsSyncJob.ts~~ ✅ deleted
~~indexer/src/pubstarter/utils/ipfs.ts~~ ✅ deleted
~~indexer/src/fundingportal/api.ts~~ ✅ deleted
~~indexer/src/fundingportal/index.ts~~ ✅ deleted
~~indexer/src/delegation/api.ts~~ ✅ deleted
~~indexer/src/delegation/index.ts~~ ✅ deleted
~~indexer/src/mutable-refs/index.ts~~ ✅ deleted
~~indexer/src/utils/ipfsSyncJob.ts~~ ✅ deleted
~~indexer/src/utils/socialSyncJob.ts~~ ✅ deleted
~~indexer/src/utils/socialData.ts~~ ✅ deleted
~~indexer/src/api/index.ts (keep only event cache endpoints, remove sync job calls)~~ ✅ stripped
~~indexer/schemas/conceptspace.schema.ts~~ ✅ deleted
~~indexer/schemas/pubstarter.schema.ts~~ ✅ deleted
~~indexer/schemas/fundingportal.schema.ts~~ ✅ deleted
~~indexer/schemas/delegation.schema.ts~~ ✅ deleted
~~indexer/schemas/mutable-refs.schema.ts~~ ✅ deleted
~~indexer/schemas/social.schema.ts~~ ✅ deleted
```

Also deleted (unused after above removals):
- `indexer/src/constants.ts`
- `indexer/src/utils/validation.ts`
- `indexer/src/utils/logger.ts`
- `integration-tests/src/queries/invariant-queries.graphql`

**Remaining work** (not deletable yet without migration):

- ~~`fundingportals/queries.ts:336,383` — two GraphQL calls still needed for aggregated project/participant data.~~ ✅ Done — replaced with `getProject()` + `getProjectContributions()`/`getProjectRefunds()`.
- ~~`indexer-sync.ts` — `META_STATUS_QUERY` for indexer sync polling (GraphQL-only)~~ ✅ Done — replaced with Ponder REST `/status` endpoint.
- ~~The SDK generated GraphQL files and `graphqlClient.ts` can be deleted once `indexer-sync.ts` is also migrated.~~ ✅ Done — deleted `sdk/src/generated/`, `sdk/src/utils/graphqlClient.ts`.
- The entire Ponder indexer infrastructure (`indexer/src/index.ts`, `ponder.config.ts`, etc.) — the hybrid approach keeps Ponder running as the event cache + REST API server, so Ponder itself stays.

## Make fold functions resumable-ready

The "resumable folds" pattern described in `specs/indexer/redesign.md` requires fold functions to have the signature `(previousState, newEvents) => newState`. Most already work this way in spirit; a few need their signatures adjusted so they can accept an existing accumulator instead of always building from scratch.

Not urgent — the current from-scratch folds work fine at expected scale. But when the time comes to add cursor-based incremental folding (client-side or server-side), these are the functions that need attention.

### Already resumable (no changes needed)

These are all Map-based or last-write-wins folds. You can split the event stream at any point, fold the first half, then fold the second half starting from the first half's output, and get the same result.

| Function | File | Pattern |
|----------|------|---------|
| `foldStatementBeliefs` | `conceptspace/folds.ts` | Map: user → beliefState |
| `foldUserBeliefs` | `conceptspace/folds.ts` | Map: statementId → beliefState |
| `foldAllStatements` | `conceptspace/folds.ts` | Map: (user, statement) → beliefState, then aggregate |
| `foldImplications` | `conceptspace/folds.ts` | Map: (attester, from, to) → implication |
| `foldAlignmentAttestations` | `fundingportals/folds.ts` | Map: (attester, subject, statement) → attestation |
| `foldMutableRef` | `mutable-refs/folds.ts` | Last-write-wins |
| `foldRefHistory` | `mutable-refs/folds.ts` | Append-only list |
| `foldProjectTokens` | `pubstarter/folds.ts` | Map: (contract, addr, tokenId) → token |
| `foldNoteIntentAttestations` | `delegation/folds.ts` | Map: (attester, contract, noteId) → attestation |

### Need signature change (easy)

These build their accumulator internally from scratch. The fix is to accept an optional previous state and start from that instead of empty. The loop logic doesn't change at all.

| Function | File | What to change |
|----------|------|----------------|
| `foldProject` | `pubstarter/folds.ts` | Extract local variables (`id`, `totalReceived`, etc.) into a typed `ProjectAccumulator` and accept it as an optional param. Return both the accumulator (for cursor storage) and the `Project`. |
| `foldSecondaryMarket` | `pubstarter/folds.ts` | Accept optional `{ saleListingsMap, buyOrdersMap, trades }` as starting state instead of always creating empty maps. |
| `foldContributionsFromEvents` | `pubstarter/folds.ts` | Append-only lists — accept optional existing `{ contributions, refunds }` and concat new entries. Trivial. |
| `foldTokenBurns` | `pubstarter/folds.ts` | Append-only list — accept optional existing burns array and concat. Trivial. |

### Needs more thought

| Function | File | Issue |
|----------|------|-------|
| `foldDelegationState` | `delegation/folds.ts` | The underlying fold *is* resumable — the `stateMap` accumulator handles new events correctly on existing state. The issue is `foldNote`, which wraps `foldDelegationState` and extracts a single note. To make `foldNote` incremental, you'd need to persist the full `stateMap` (not just the one note), because a new event for a *different* note (e.g., `erc1155Purchased`) might copy chains into the note you care about. In practice: make `foldDelegationState` accept an optional starting `stateMap`, and have callers hold onto the full map rather than discarding it after extracting one note. |
