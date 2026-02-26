# SDK TODO

## Code cleanup

- [ ] Remove duplicate type/interface declarations in `src/subsystems/conceptspace/conceptspace-queries.ts` -- `Implication`, `StatementWithContent`, `GetStatementWithContentOptions`, `IndirectSupportInfo`, and `GetUserIndirectSupportOptions` are each defined twice (once near the top and once lower down). They're already in `types.ts`.
- [ ] Remove all callers of `fakeIpfsCidV1()` (there's already a TODO in cid-types.ts for this)
- [ ] `PROJECT_ALIGNMENT_TOPIC` in `src/actions/common.ts` uses `fakeIpfsCidV1` -- replace with a real CID
- [ ] Every funding-portals query returns `fakeIpfsCidV1('whatever')` for `topicStatementCid` (see the repeated `// TODO: what should go here?` comments in `src/subsystems/fundingportals/funding-portals-queries.ts`)
