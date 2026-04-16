# Integration tests

Integration tests live in the top-level `integration-tests/` directory. They test the full blockchain + indexer + SDK stack together.

## What they test

The tests exercise real on-chain transactions (on a local Hardhat node), wait for Ponder to index the resulting events, then use the SDK's query/fold functions to verify the indexed state is correct. All user actions go through the same SDK functions that the UI uses, so these tests also serve as integration coverage for the SDK.

## Test approach

Tests are currently handcrafted-scenario tests: define a sequence of actions, run them, verify invariants and state-transition properties afterward. The goal is to move toward a more generic invariant-based model — "run this action, check whatever invariants are meaningful after an action of this type" — rather than ad-hoc per-test assertions. See `integration-tests/generative-test-prep.md` for the framework and `integration-tests/INVARIANT_IMPLEMENTATION.md` for implementation guidelines.

## Infrastructure

The test runner (`scripts/run-integration-tests.sh`) spins up Docker Compose with:
- Local Hardhat node
- Local IPFS node
- Ponder event-cache indexer

After transactions are submitted, the tests poll Ponder's `/status` endpoint to wait for the indexer to catch up before querying results.

## Performance

Tests are slow for two reasons:
- **Docker startup**: full `docker-compose down -v` + `docker-compose up -d --build` cycle adds 15–30+ seconds.
- **Indexer sync waits**: every transaction must be indexed by Ponder before results can be verified. Ponder polls Hardhat every 100ms; tests poll Ponder every 50–100ms. This overhead is architecturally unavoidable.
