# Integration Tests

This directory contains integration tests for the Commonality system. These tests verify that the blockchain (Hardhat), IPFS node, indexer (Ponder event cache), and SDK (event cache client + fold functions) work together correctly.

## Test Approach

The tests are currently all handcrafted-scenario kinds of tests. That's fine, but I also want to be able to have the test system be able to handle randomly-generated fake data, so I'm hoping to refactor the tests to make use of more-generic invariants, preconditions/postconditions, etc. Like, "run this action and check whatever state-transition properties and global invariants make sense to check after running an action of that type." Rather than "run this action and then do various ad-hoc assertions." Ideally, when we're done, the handcrafter-scenario tests will all just look like "here's a sequence of actions to run" (without any ad-hoc assertions, because the assertions will all be implemented as invariants and state-transition properties that the test runner knows it has to check).

See [generative-test-prep.md](generative-test-prep.md) for the framework and [INVARIANT_IMPLEMENTATION.md](INVARIANT_IMPLEMENTATION.md) for implementation guidelines.

## Test Performance

Tests are slow for two reasons:

1. **Docker startup**: The test script (`scripts/run-integration-tests.sh`) does a full `docker-compose down -v` and `docker-compose up -d --build` cycle, adding 15-30+ seconds of overhead.

2. **Indexer sync waits**: Each transaction must wait for Ponder to index it before the test can verify results. Polling intervals are already optimized (Ponder polls Hardhat every 100ms in `ponder.config.ts`, tests poll Ponder every 50-100ms in `sdk/src/queries/common.ts`). This is architecturally unavoidable—you can't verify indexed data until the indexer processes the block.