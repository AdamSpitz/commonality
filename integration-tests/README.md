# Integration Tests

This directory contains integration tests for the Commonality system. These tests verify that the blockchain (Hardhat), IPFS node, indexer (Ponder), and GraphQL API work together correctly.

## Test Approach

The tests use invariant checking and state-transition properties to verify system correctness. Actions are wrapped with property checkers that automatically verify consistency after each operation.

See [generative-test-prep.md](generative-test-prep.md) for the framework and [INVARIANT_IMPLEMENTATION.md](INVARIANT_IMPLEMENTATION.md) for implementation guidelines.