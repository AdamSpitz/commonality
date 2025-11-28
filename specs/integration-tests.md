# Integration test specs

We've been trying to write some tests for the indexer, but they ended up being fragile and more trouble than they were worth, so I've deleted them and now I'd like to start over more slowly and carefully.

The general approach I'd like to try is: I'll start a fresh hardhat node in one terminal (so there's no data in it), a fresh indexer in a second terminal, and then in a third terminal I'll run the tests.

The tests are meant to be normal "unit test" style tests - we're not generating random fake data yet, we're just writing down some basic scenarios and running them, then waiting for the indexer to catch up (I think Ponder has a way to check which block number it's up to, or something like that), and making sure that the indexer's API returns the correct data.

The tests will run various user actions, involving:
  - Writing data to IFPS. (Just use whatever IPFS system we're using for the app - Pinata, I think.)
  - Executing onchain transactions using the system's smart contracts (see the top-level "hardhat" directory to find the contracts).
  - Plus any other kind I've forgotten.

The tests will also need some way of accessing the indexer's API and running various kinds of queries.

Try to keep these actions and queries clearly specified in a separate file or whatever, so that the tests are working at a higher level of abstraction, and also so that maybe in the future we might be able to make use of them as part of the UI code or in other scripts.

Use TypeScript and viem.
