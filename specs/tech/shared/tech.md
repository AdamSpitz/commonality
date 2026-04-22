# Tech choices

  - Blockchain (some Ethereum L2) and IPFS for trustless verification and censorship resistance
  - Statements are immutable IPFS content (identified by CID)
  - Various events are emitted by onchain transactions
  - Smart contracts in Solidity
  - Indexer is a thin event cache (Ponder storing raw events in a single `events` table, served via REST API). No business logic in the indexer — all state reconstruction happens client-side via SDK fold functions.
  - SDK fetches raw events from the event cache, folds them into entity state, reads current on-chain state via view functions, and fetches IPFS content directly from a gateway. No GraphQL.
  - UI stack: TypeScript, Vite, Material UI, viem/wagmi/connectkit for blockchain interaction.

## Rationale

The point of using decentralized tech like blockchains and IPFS is that we want this system to be trustlessly-verifiable and censorship-resistant.
  - e.g. If we're going to claim that a million people support some statement, we need that claim to be verifiable (so let's implement the "I support this" events as digitally-signed onchain transactions, and let's implement the definition of the statement itself as immutable data whose ID is its IPFS CID).

It's probably fine to have the input data (i.e. all the various events that people can publish) onchain so that it's verifiable, and not worry so much (at least for now) about having the indexer's database being verifiable. (The indexer's DB is all derived data; it can be verified onchain, or blown away and recreated from scratch from the onchain input data if necessary.)

In general an Ethereum L2 (or validium?) is probably the best choice for which chain to use. (Ethereum gives us best-in-class trustlessness/decentralization, but L1 will be too expensive for an app like this that needs to support a high volume of small transactions.) So write the smart contracts in Solidity (using Hardhat). I expect it to be easy to switch L2s later (there are many EVM-compatible ones these days), so for now let's set up our configuration to use Base (and Base Sepolia for testnet) and we can switch later if we want to. (And for now make both options available dynamically in the UI, so we can test.)

For IPFS, do we use something like Pinata, or set up our own IPFS node? Probably Pinata; we'll want something scalable, and a CDN of some kind.

The indexer is a thin event cache built on Ponder — it stores raw on-chain events in a single `events` table and serves them via a REST API (`GET /api/events`). All business logic (state reconstruction, aggregation) lives in the SDK's fold functions, not in the indexer. See [../indexer/redesign.md](../indexer/redesign.md) for the full rationale.

For UI code, let's use TypeScript, Vite, Material UI, and viem and wagmi and connectkit for blockchain stuff.

For accessing Twitter follower counts, we can use the X API - it's not that expensive anymore.

## Ethereum account onboarding

Currently the app uses ConnectKit, which assumes users arrive with an existing Ethereum wallet (MetaMask, WalletConnect, Coinbase Wallet, etc.). ConnectKit has a built-in "Get a wallet" pointer for users who don't have one, but that sends them away to set one up and come back.

For a more mainstream audience, **embedded wallets** are the alternative: the user signs in with email, Google, Apple ID, or a passkey, and an Ethereum account is created for them behind the scenes without them ever thinking about wallets.

The leading option is **Privy** (privy.io). Key facts:
- Has a React SDK and a wagmi adapter, so it can slot into our existing wagmi-based setup without a full rewrite
- Integration is real work but not large — probably a day or two
- Uses MPC (multi-party computation): the private key is split between the user's device and Privy's servers; neither side alone can sign. We are not custodians — we never touch keys
- Privy is a third-party SaaS; they run the database, not us
- Free up to some number of monthly active wallets, then per-wallet pricing

The decision to add this is a product/audience call: if the target users are crypto-native, ConnectKit's existing "get a wallet" flow is probably sufficient. If we want truly mainstream users who've never touched crypto, embedded wallets remove the biggest onboarding barrier.

(NOTE: of course we want users who already have an Ethereum account to easily be able to just use that; they shouldn't be required to use a Privy wallet.)