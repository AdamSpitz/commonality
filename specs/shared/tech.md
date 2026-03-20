# Tech choices

The point of using decentralized tech like blockchains and IPFS is that we want this system to be trustlessly-verifiable and censorship-resistant.
  - e.g. If we're going to claim that a million people support some statement, we need that claim to be verifiable (so let's implement the "I support this" events as digitally-signed onchain transactions, and let's implement the definition of the statement itself as immutable data whose ID is its IPFS CID).

It's probably fine to have the input data (i.e. all the various events that people can publish) onchain so that it's verifiable, and not worry so much (at least for now) about having the indexer's database being verifiable. (The indexer's DB is all derived data; it can be verified onchain, or blown away and recreated from scratch from the onchain input data if necessary.)

In general an Ethereum L2 (or validium?) is probably the best choice for which chain to use. (Ethereum gives us best-in-class trustlessness/decentralization, but L1 will be too expensive for an app like this that needs to support a high volume of small transactions.) So write the smart contracts in Solidity (using Hardhat). I expect it to be easy to switch L2s later (there are many EVM-compatible ones these days), so for now let's set up our configuration to use Base (and Base Sepolia for testnet) and we can switch later if we want to. (And for now make both options available dynamically in the UI, so we can test.)

For IPFS, do we use something like Pinata, or set up our own IPFS node?

The indexer is a thin event cache built on Ponder — it stores raw on-chain events in a single `events` table and serves them via a REST API (`GET /api/events`). All business logic (state reconstruction, aggregation) lives in the SDK's fold functions, not in the indexer. See [../indexer/redesign.md](../indexer/redesign.md) for the full rationale.

For UI code, let's use TypeScript, Vite, Material UI, and viem and wagmi and connectkit for blockchain stuff.

For accessing Twitter follower counts... I dunno, I still want to look into the actual cost of that. Sam thinks it's not too expensive?
