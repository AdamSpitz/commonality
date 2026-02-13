# General stuff to review every so often

I'm worried about this code base getting away from me. So let's try making a list of big important stuff to check.

## Most recent reviews

None yet. (So any of the usual types of review would be good to do, and record here.)

## Areas to review

### Quick health checks

Run these commands to verify the build is healthy:

```bash
npm run build       # Should pass (includes all workspaces + UI)
npm run test        # Should pass (hardhat unit tests)
npm run integration-tests  # Should pass (full stack)
```

### Smart contracts (hardhat/)

This is the most important part of the system to get right. Bugs here can lose people's money.

- [ ] Do the contracts compile? (`npm run build` in hardhat/)
- [ ] Do the unit tests pass and look reasonably comprehensive? (`npm run test` in hardhat/)
- [ ] Are there any obvious security issues? (reentrancy, unchecked calls, integer overflow, access control)
- [ ] Do event emissions match what the indexer expects? (Check ponder.schema.ts against contract events)
- [ ] Are there any hardcoded addresses that should be configurable?

### Indexer (indexer/)

- [ ] Does the indexer start without errors? (`npm run dev` in indexer/)
- [ ] Does the schema (ponder.schema.ts) match the contracts' event structures?
- [ ] Are ABIs in sync with contracts? (`npm run sync-abis` in indexer/)
- [ ] Are all relevant events being indexed?
- [ ] Do GraphQL queries return expected data shapes?

### SDK (sdk/)

- [ ] Does it build? (`npm run build` in sdk/)
- [ ] Are all public exports documented in index.ts?
- [ ] Do the integration tests use the SDK correctly? (SDK should be the authoritative API)
- [ ] Is there any logic duplicated between SDK and UI that should be consolidated?
- [ ] Are environment variables handled correctly for both Node and browser contexts?

### Integration tests (integration-tests/)

- [ ] Do the integration tests pass? (`npm run integration-tests` from root)
- [ ] Is there reasonable coverage of the main user flows?
- [ ] Are tests using the SDK (not raw contract calls) where possible?
- [ ] Are indexer sync waits handled correctly? (waitForIndexerSync after transactions)
- [ ] Do tests clean up after themselves? (Docker volumes cleared between runs)

### UI (ui/)

- [ ] Does it build? (`npm run build` in ui/)
- [ ] Does it run locally? (`npm run dev` in ui/)
- [ ] Are all SDK exports that the UI needs actually exported?
- [ ] Is user input properly validated and sanitized?
- [ ] Are error states handled gracefully?
- [ ] Is the code organized into subsystem directories? (conceptspace/, pubstarter/, delegation/, fundingportal/)

### Documentation

- [ ] Is all documentation reachable from README.md? (no orphaned .md files)
- [ ] Are the feedback loops documented? (build, test commands)
- [ ] Is progress.txt being used for short-term notes?
- [ ] Does TODO.md reflect current priorities?

### Cross-cutting concerns

- [ ] Are there any TypeScript errors in `npm run build`?
- [ ] Are there any console warnings/errors when running locally?
- [ ] Is the pre-commit hook catching issues? (UI build is now included)
- [ ] Are contract ABIs in sync between hardhat/, indexer/, and sdk/?

