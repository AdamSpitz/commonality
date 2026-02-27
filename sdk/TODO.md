# SDK TODO

## Code cleanup

- [ ] Remove all callers of `fakeIpfsCidV1()` (there's already a TODO in cid-types.ts for this)
- [ ] `PROJECT_ALIGNMENT_TOPIC` in `src/actions/common.ts` uses `fakeIpfsCidV1` -- replace with a real CID
- [ ] Every funding-portals query returns `fakeIpfsCidV1('whatever')` for `topicStatementCid` (see the repeated `// TODO: what should go here?` comments in `src/subsystems/fundingportals/funding-portals-queries.ts`)
