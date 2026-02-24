# What we've been working on lately

Main thing I want to work on next:
  - Fix the problems in TODO-smart-contracts.md.

Other big things to do soon:
  - (Not a task for AI.) Can I try out conceptspace manually? e.g. Start up docker-compose locally, maybe do some fake-data generation to populate the system with a bunch of data, and then look at the UI through my web browser?
  - (Not a task for AI.) I need to do a big code review myself, of the whole thing. I don't trust it.
    - Stuff I'm suspicious about:
      - Statement IDs. Are we using the correct CID format? Are we using the CID at all?
  - ?

---

## Integration Test Issues

### GraphQL `attester` field not normalized in SDK (DONE)
The SDK's `getImplicationsFrom` and `getImplicationsTo` functions return `Implication` objects where
`attester` is typed as `string`, but the GraphQL query returns `{ attester: { id: "0x..." } }` (an object).
The SDK should transform this to extract the string value, similar to how it's done in
`integration-tests/src/actions/implication-action-properties.ts` line 62:
  `((imp.attester as any).id || imp.attester).toLowerCase()`

This bug was previously hidden because another issue (passing `attester: null` to GraphQL) caused the
query to return no results, so tests failed before reaching the `.toLowerCase()` call.

---

## Miscellaneous TODO.md files

- [ui/TODO.md](ui/TODO.md)
