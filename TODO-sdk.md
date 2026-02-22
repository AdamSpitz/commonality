# SDK Refactoring: Replace wrapper functions with typed GraphQL client

## Problem

The SDK currently has two query layers, stacked on top of each other:

1. **`indexer-queries/`** (internal) — ~50 wrapper functions that use a thin `GraphQLClient` (just a URL + `fetch`) to query the Ponder indexer's GraphQL API directly. Hand-written query strings, manually-defined result types.

2. **`graphql-server/` + `graphql-queries/`** (public API) — A second GraphQL layer that builds a local in-process schema (`@graphql-tools/schema` + `graphql-js`) with its own type definitions (`type-defs.ts`) and resolvers. The resolvers mostly just call down into `indexer-queries/` and pass through results. Consumers access this via `SDKMachinery` / `executeSDKQuery`. A few functions here do real composite work (multi-step queries, IPFS fetching, aggregation).

The `indexer-queries/` layer is **not a public API** — it's only imported by the `graphql-server/` resolvers (and one action file). External consumers (integration tests, UI, attester, fake-data-generation) go through the `graphql-queries/` exports and `SDKMachinery`.

Problems with this architecture:
- Query strings are **unvalidated until runtime** — typos in field names fail silently or at runtime
- Result types are **manually defined** in `shared/types/` and can drift from the actual Ponder schema
- The `graphql-server/` layer **re-declares the entire schema** in `type-defs.ts`, duplicating what Ponder already provides
- Field selections are **copy-pasted** across queries (e.g., the StatementListItem fields appear in ~8 places)
- Two layers of indirection for what is usually a **passthrough** — most resolvers just call `indexer-queries/` and return the result unchanged
- Every new query requires changes in **three places**: `indexer-queries/`, `type-defs.ts`, and a resolver

## Target architecture

Replace both query layers with:

1. **`graphql-request`** — Lightweight typed GraphQL client, replaces both `utils/graphqlClient.ts` (raw fetch) and the in-process executor (`graphql-server/server.ts`)
2. **`@graphql-codegen`** — Generates TypeScript types and typed document nodes from the Ponder GraphQL schema, replacing both `shared/types/` and the hand-written query strings

After refactoring, the SDK's role becomes:
- **Contract actions** (viem-based, unchanged)
- **Re-export generated GraphQL types and operations** from codegen
- **Complex composite functions** that orchestrate multiple queries (e.g., `getUserIndirectSupport`, `getStatementWithContent`, `getTotalFundingForCause`)
- **IPFS utilities** (unchanged)
- **Indexer sync utilities** (unchanged)

Consumers can either:
- Use the composite functions for complex operations
- Use `graphql-request` directly with generated typed document nodes for simple queries (no wrapper function needed)

## What gets deleted

- `sdk/src/graphql-server/` — entire directory (server.ts, schema/, resolvers/)
- `sdk/src/machinery.ts` — `SDKMachinery`, `createSDKMachinery`, `executeSDKQuery`
- `sdk/src/shared/types/` — manual type definitions (replaced by codegen)
- `sdk/src/indexer-queries/` — all wrapper functions (replaced by direct graphql-request + codegen)
- `sdk/src/graphql-queries/` — the public query re-exports (replaced by codegen + composite functions)
- Dependencies: `@apollo/server`, `@graphql-tools/schema`

## What stays (but gets simplified)

- `sdk/src/actions/` — contract interaction functions (no change)
- `sdk/src/abis.ts` — ABI definitions (no change)
- `sdk/src/indexer-sync.ts` — block/tx sync utilities (no change)
- `sdk/src/displayable-document.ts` — IPFS content types (no change)
- Complex composite functions move to use generated queries instead of hand-written ones:
  - `getStatementWithContent()` — multi-step: fetch statement, fetch IPFS, optionally fetch metrics
  - `getUserIndirectSupport()` — multi-step: beliefs → implications → filter → fetch statements
  - `getIndirectSupporters()` — multi-step: implications → believers → filter disbelievers
  - `getTotalFundingForCause()` — multi-step: alignments → project totals
  - `getAllAlignedProjectsForCause()` — multi-step: direct + indirect alignments → project details
  - `getTopContributorsForCause()` — multi-step: aligned projects → participant summaries → aggregate
  - `getIndirectlyAlignedSubjects()` — multi-step: implications → alignments
  - `getProjectsFiltered()` — dynamic query construction + client-side sorting

## Incremental migration plan

### Phase 1: Set up the new tooling ✅ DONE

- ✅ Installed `graphql-request` (SDK dependency)
- ✅ Installed `@graphql-codegen/cli`, `@graphql-codegen/client-preset` (SDK dev dependencies)
- ✅ Wrote `sdk/codegen.ts` — points at `sdk/schema.graphql`, outputs to `sdk/src/generated/`
- ✅ Added `npm run codegen` script to `sdk/package.json`
- ✅ Committed `sdk/schema.graphql` — a copy of `indexer/generated/schema.graphql` (the Ponder-generated schema is gitignored in the indexer, so we keep our own committed copy here; update it when `ponder.schema.ts` changes)
- ✅ `sdk/src/generated/` is gitignored (derived output); run `npm run codegen` from `sdk/` to regenerate
- ✅ Generated types verified: all schema entity types present, `BigInt` → `bigint`, build passes

**Key implementation notes for Phase 2:**
- `sdk/schema.graphql` = the schema file codegen reads. Keep it in sync with Ponder.
- To add a typed document node for a query: create a `.graphql` file anywhere under `sdk/src/`, then run `npm run codegen`. The generated typed document node goes into `sdk/src/generated/graphql.ts` and can be used with `graphql-request`'s `request(url, document, variables)`.
- Example usage pattern (for Phase 2):
  ```ts
  import { request } from 'graphql-request';
  import { graphql } from '../generated/index.js';

  const GetUserRefDocument = graphql(`
    query GetUserRef($owner: String!, $name: String!) {
      mutableRefs(owner: $owner, name: $name) { owner name value updatedAt }
    }
  `);
  // result is fully typed from the schema
  const result = await request(url, GetUserRefDocument, { owner, name });
  ```

### Phase 2: Replace `indexer-queries/` internals (no public API changes) ✅ DONE

`indexer-queries/` is a leaf dependency — only consumed by `graphql-server/` resolvers and one action file. We can swap its implementation without changing any public API or external consumer.

For each subsystem, rewrite the query functions to use `graphql-request` + generated typed document nodes instead of raw `fetch` + hand-written query strings. Keep the same function signatures so the resolvers don't need to change yet.

1. ✅ **Mutable Refs** (`mutable-refs-queries.ts`) — 4 functions
2. ✅ **Delegation** (`delegation-queries.ts`) — 4 functions
3. ✅ **Conceptspace** (`conceptspace-queries.ts`) — ~12 functions
4. ✅ **Pubstarter** (`pubstarter-queries.ts`) — ~20 functions, `getProjectsFiltered` replaced dynamic query construction with a static document node using optional filter variables (null = no filter)
5. ✅ **Funding Portals** (`funding-portals-queries.ts`) — simple queries + complex composite functions

All subsystems now use `request()` from `graphql-request` with typed document nodes from `sdk/src/generated/graphql.ts`. `as unknown as ManualType` casts at extraction points handle BigInt→string mismatches (BigInt fields arrive as strings from JSON; `shared/types/` declares them as `string`).

**Schema discoveries during Phase 2:**
- `sdk/schema.graphql` uses `projectAlignments`/`projectAddress` naming (the Ponder schema source has been renamed to `alignmentAttestations`/`subjectAddress` but the generated schema isn't regenerated yet). The funding-portals queries now use the correct schema names and map `projectAddress → subjectAddress` in the TypeScript layer.
- `implications` no longer has `explanationCid` in the schema. The `Implication` manual type still declares it; it will be undefined at runtime (pre-existing, fix in Phase 4 when manual types are deleted).
- The old `funding-portals-queries.ts` used `alignmentAttestationss` (non-existent in schema) — those queries were silently broken. Phase 2 fixes them.

Build passes: `npm run build` exits cleanly.

### Phase 3: Expose `indexer-queries/` directly to consumers

Now that `indexer-queries/` is backed by proper typed queries, start routing consumers through it directly instead of through the `graphql-server/` middleman:

- Update `sdk/src/index.ts` to export from `indexer-queries/` instead of `graphql-queries/`
- For simple queries (get-by-id, list-with-filters), consumers can call these directly
- Move composite functions (`getStatementWithContent`, `getUserIndirectSupport`, `getIndirectSupporters`, `getTotalFundingForCause`, etc.) out of `graphql-queries/conceptspace.ts` to use `indexer-queries/` directly instead of going through `SDKMachinery`/`executeSDKQuery`

### Phase 4: Delete the `graphql-server/` layer

Once nothing goes through the old executor:

- Delete `graphql-server/` (server.ts, schema/, resolvers/)
- Delete `machinery.ts`
- Delete `graphql-queries/`
- Delete `shared/types/` (replaced by codegen)
- Remove `@apollo/server`, `@graphql-tools/schema` dependencies

### Phase 5: Update consumers

- Update integration tests to use new imports
- Update UI to use new imports (may be able to use generated types directly)
- Update attester to use new imports
- Update fake-data-generation to use new imports

## Open questions

- **Schema introspection**: Resolved — `indexer/generated/schema.graphql` is what we need, but it's gitignored in the indexer. Solution: `sdk/schema.graphql` is a committed copy. Update it when the Ponder schema changes.
- **Custom REST endpoints**: The indexer has REST endpoints (`/api/indirect-supporters/`, `/api/suggestions/`, `/api/sync-ipfs`). Should these move into the GraphQL schema, or stay as REST?
- **Resolver computation**: Some `graphql-server/` resolvers do real work beyond passthrough (e.g., `indirectSupporterCount` aggregates data, `statementSuggestions` does multi-step logic). That computation needs to move into composite functions that use the new client directly.
- **`mutable-refs-actions.ts`**: This action file imports `getUserRef` from `indexer-queries/`. After migration it should use the new client instead.
