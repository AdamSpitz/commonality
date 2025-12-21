# Integration Tests

This directory contains integration tests for the Commonality system. These tests verify that the blockchain (Hardhat), IPFS node, indexer (Ponder), and GraphQL API work together correctly.

## To-do list

The tests are currently all handcrafted-scenario kinds of tests. That's fine, but I also want to be able to have the test system be able to handle randomly-generated fake data, so I'm hoping to refactor the tests to make use of more-generic invariants, preconditions/postconditions, etc.

See generative-test-prep.md, INVARIANT_IMPLEMENTATION.md.