# What we've been working on lately

Main thing I want to work on next:
  - ~~Type-safe GraphQL queries in integration tests.~~ **Done.** Created `integration-tests/codegen.ts` (parallel to `sdk/codegen.ts`) pointing at `../sdk/schema.graphql`. Moved all raw query strings from `invariants.ts` into `integration-tests/src/queries/invariant-queries.graphql`. Generated types live in `integration-tests/src/generated/`. Updated `invariants.ts` to import and use the generated `TypedDocumentNode` objects. Fixed two latent bugs caught immediately by codegen: `beliefss(where: { statementCid: ... })` → `statementId` in filter, and `belief.statementCid` → `belief.statementId`.
  - Make sure the codegen output stays fresh. Right now `sdk/schema.graphql` is a manually-copied snapshot of the Ponder-generated schema, and `indexer/generated/schema.graphql` is also stale. Add a build/CI step that regenerates the schema from Ponder and re-runs codegen, so we never end up with stale generated types again.
  - Fix the problems in TODO-smart-contracts.md.

Other big things to do soon:
  - (Not a task for AI.) Can I try out conceptspace manually? e.g. Start up docker-compose locally, maybe do some fake-data generation to populate the system with a bunch of data, and then look at the UI through my web browser?
  - (Not a task for AI.) I need to do a big code review myself, of the whole thing. I don't trust it.
    - Stuff I'm suspicious about:
      - Statement IDs. Are we using the correct CID format? Are we using the CID at all?
  - ?

---

## Miscellaneous TODO.md files

- [ui/TODO.md](ui/TODO.md)
