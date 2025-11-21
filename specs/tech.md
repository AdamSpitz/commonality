# Tech choices

The point of using decentralized tech like blockchains and IPFS is that we want this system to be trustlessly-verifiable and censorship-resistant.
  - e.g. If we're going to claim that a million people support some statement, we need that claim to be verifiable (so let's implement the "I support this" events as digitally-signed onchain transactions, and let's implement the definition of the statement itself as immutable data whose ID is its IPFS CID).

It's probably fine to have the input data (i.e. all the various events that people can publish) onchain so that it's verifiable, and not worry so much (at least for now) about having the indexer's database being verifiable. (The indexer's DB is all derived data; it can be verified onchain, or blown away and recreated from scratch from the onchain input data if necessary.)

In general an Ethereum L2 (or validium?) is probably the best choice for which chain to use. (Ethereum gives us best-in-class trustlessness/decentralization, but L1 will be too expensive for an app like this that needs to support a high volume of small transactions.) So write the smart contracts in Solidity (using Hardhat). I expect it to be easy to switch L2s later (there are many EVM-compatible ones these days), so for now let's set up our configuration to use Base (and Base Sepolia for testnet) and we can switch later if we want to. (And for now make both options available dynamically in the UI, so we can test.)

Regarding any indexers we need for the blockchain data, let's start with using Ponder, deploy on Railway for now, and we can switch/add to that later if necessary. Questions for the future:
  - Do we need some kind of high-performance graph database for running interesting graph-analysis algorithms on the statement-implication graph? Beats me. (Sam mentioned setting up a knowledge graph database using AWS Neptune with Gremlin query language and Jupyter notebooks. I don't have experience with any of that, but I wanted to record it here.)
  - Hopefully we can choose infrastructure that's scalable up and down - cheap while small, but can scale quickly if this thing takes off.

Use GraphQL (rather than REST) for all communication between the indexers and the UIs.

For UI code, let's use TypeScript, Vite, Material UI, and viem and wagmi and connectkit for blockchain stuff.

For accessing Twitter follower counts... I dunno, I still want to look into the actual cost of that. Sam thinks it's not too expensive?
