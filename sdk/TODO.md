# SDK TODO

## Documentation

- [ ] Fix README's "Local GraphQL Approach" section -- it describes the old in-process executor architecture, but the code now just uses `graphql-request` to hit the Ponder HTTP endpoint directly
- [ ] Delete or update `src/shared/README.md` -- it's explicitly marked as obsolete ("TODO: this comment is obsolete, we got rid of graphql-queries")

## Code cleanup

- [ ] Remove duplicate type/interface declarations in `src/subsystems/conceptspace/conceptspace-queries.ts` -- `Implication`, `StatementWithContent`, `GetStatementWithContentOptions`, `IndirectSupportInfo`, and `GetUserIndirectSupportOptions` are each defined twice (once near the top and once lower down). They're already in `types.ts`.
- [ ] Remove all callers of `fakeIpfsCidV1()` (there's already a TODO in cid-types.ts for this)
- [ ] `PROJECT_ALIGNMENT_TOPIC` in `src/actions/common.ts` uses `fakeIpfsCidV1` -- replace with a real CID
- [ ] Every funding-portals query returns `fakeIpfsCidV1('whatever')` for `topicStatementCid` (see the repeated `// TODO: what should go here?` comments in `src/subsystems/fundingportals/funding-portals-queries.ts`)

## Minor issues

- [ ] `getIndirectSupporterCount` claims to be "more efficient" but just calls `getIndirectSupporters` and returns `.length` -- either make it actually more efficient or drop the misleading doc
- [x] `normalizeCidV1` in `src/utils/cid-types.ts` has a missing return path if a CID parses but isn't version 0 or 1
- [x] `createAndSignStatement` silently swallows errors when updating the created-statements list (step 3) -- consider at least logging a warning
- [ ] Real IPFS upload in `src/utils/ipfs.ts` silently falls back to mock mode on failure (line ~129) -- could mask real failures in production
