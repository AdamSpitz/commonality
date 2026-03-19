# To-do list for the indexer redesign.

First, take a look at specs/indexer/redesign.md for the fuller picture of what this redesign is about.

The rest of this file should be a to-do list.

## What still uses GraphQL (intentionally kept per hybrid approach)

**In the SDK:**
1. `sdk/src/utils/graphqlClient.ts` — used by:
   - `fundingportals/queries.ts:336` — `GetProjectDetailsDocument` (project threshold/deadline)
   - `fundingportals/queries.ts:383` — `GetParticipantSummariesDocument` (contributor leaderboards)
   - `indexer-sync.ts:67` — `_meta` query (indexer sync status)

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

**Full file deletion list:**

```
sdk/src/generated/graphql.ts
sdk/src/generated/gql.ts
sdk/src/generated/index.ts
sdk/src/utils/graphqlClient.ts
sdk/src/utils/index.ts

indexer/src/conceptspace/api.ts
indexer/src/conceptspace/index.ts
indexer/src/conceptspace/utils/ipfsSyncJob.ts
indexer/src/conceptspace/utils/ipfs.ts
indexer/src/pubstarter/api.ts
indexer/src/pubstarter/index.ts
indexer/src/pubstarter/utils/ipfsSyncJob.ts
indexer/src/pubstarter/utils/ipfs.ts
indexer/src/fundingportal/api.ts
indexer/src/fundingportal/index.ts
indexer/src/delegation/api.ts
indexer/src/delegation/index.ts
indexer/src/mutable-refs/index.ts
indexer/src/utils/ipfsSyncJob.ts
indexer/src/utils/socialSyncJob.ts
indexer/src/utils/socialData.ts
indexer/src/api/index.ts (keep only event cache endpoints, remove sync job calls)
indexer/schemas/conceptspace.schema.ts
indexer/schemas/pubstarter.schema.ts
indexer/schemas/fundingportal.schema.ts
indexer/schemas/delegation.schema.ts
indexer/schemas/mutable-refs.schema.ts
indexer/schemas/social.schema.ts
```

**Remaining work** (not deletable yet without migration):

- `fundingportals/queries.ts:336,383` — two GraphQL calls still needed for aggregated project/participant data. These could be replaced with event cache + chain reads, but that migration isn't done yet.
- `indexer-sync.ts` — `META_STATUS_QUERY` for indexer sync polling (GraphQL-only)
- The entire Ponder indexer infrastructure (`indexer/src/index.ts`, `ponder.config.ts`, etc.) — the hybrid approach keeps Ponder running as the event cache + REST API server, so Ponder itself stays.
