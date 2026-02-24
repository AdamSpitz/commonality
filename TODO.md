# What we've been working on lately

Main thing I want to work on next:
  - Type-safe GraphQL queries in integration tests. Currently the integration tests (in `integration-tests/src/utils/invariants.ts`) build GraphQL queries as raw strings with a `query<T>()` helper that does no schema validation — so field name mismatches (e.g. `statementCid` vs the actual schema field `statementId`) aren't caught until runtime. Fix: extend the SDK's existing graphql-codegen pipeline to also cover the integration test queries. Move the raw query strings into `.graphql` document files, add them to the codegen config (or a parallel one for integration-tests), and use the generated `TypedDocumentNode` objects instead of raw strings. This way the type-checker will catch field name mismatches at compile time.
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
