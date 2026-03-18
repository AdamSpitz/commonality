# Commonality

## Where to find various files

  - Specs: [specs/README.md](specs/README.md)
  - AI continuity notes: [CONTINUITY.md](CONTINUITY.md)
  - Reviews: [REVIEWS.md](REVIEWS.md)
  - Deployment instructions (including how to run locally): [DEPLOYMENT.md]
  - To-do list: [TODO.md](TODO.md)

## Feedback loops

- `npm run lint` to run various linters
- `npm run build` to make sure everything builds and type-checks
- `npm run test` to run the tests

Note that the build and tests are run by the Git pre-commit hook, and the whole thing takes a few minutes to run, so if you're ready to commit and the only thing left to do is run the build and the tests, it's okay to just attempt to commit and make sure it goes through; no need to run the whole test suite only to have it run again when you commit immediately afterward.

## Artifacts

  - Smart contracts: `hardhat/README.md`
  - Fake-data generation: `fake-data-generation/README.md`
  - Indexer: `indexer/README.md`
  - SDK (used by both integration-tests and ui): `sdk/README.md`
  - Integration tests: `integration-tests/README.md`
  - UI: `ui/README.md`
  - Attester AI: `attester/README.md`

## Other things worth noting

### Local dev done using Docker

We have a Docker Compose setup for running Hardhat and the Ponder indexer. This provides a clean, isolated environment for development and testing.

## High-level overview of current status

- Delegation UI complete with unit tests and E2E test (deposit → delegate → spend flow).
- Funding Portals UI complete with unit tests. Code review done (4 bugs fixed), DRY refactor done. All components tested: AlignedProjectsList, DelegatableNotesSection, AlignmentAttestationsSection, FundingPortalSummary (20 tests each).
- Indexer redesign Phase 1 **complete**: SDK fold functions for all 5 subsystems (Mutable Refs, Funding Portals, Concept Space, Pubstarter Primary+Secondary Market+Burns, Delegation). 194 SDK tests passing.
- Indexer redesign Phase 2 **complete**: SDK now has 11 on-chain read functions (readConditionParams, readProjectETHBalance, readNoteOnChainInfo, readBelief, readHasAlignment, readHasImplication, readExplanation, readMutableRef, readTotalReceivedValue, readConditionStatus, readSaleListing, readBuyOrder, readNextNoteId). 239 SDK tests passing.
- Indexer redesign Phase 3 **complete**: Thin event cache service added to Ponder (events table + registry tables). All contract events captured. Build passes, 239 SDK tests passing.
- Indexer redesign Phase 4 **in progress**: SDK now has event cache client + decoder. Conceptspace queries updated to use event cache + fold when available (falls back to GraphQL). Build passes, 239 SDK tests passing.
- For now, this project hasn't even been deployed yet, so don't worry about backward compatibility.
