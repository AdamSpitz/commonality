# For crypto-native users

This page covers the technical architecture for users who want to understand or interact with the system at a lower level.

## Chain

Commonality runs on **Base** (and Base Sepolia for testnet) — an Ethereum L2. Base is EVM-compatible, so the contracts are standard Solidity. The L2 choice gives Ethereum-level trustlessness at costs that make the high volume of small transactions this system needs practical.

The chain can be changed; EVM compatibility means the contracts port easily. The UI exposes both Base and Base Sepolia dynamically.

## Smart contract architecture

The system is built from several independent contracts rather than one monolithic one:

- **Beliefs** — Records signed statements. Statement content is stored on IPFS; only the CID is stored on-chain. Emits events when users sign or unsign.
- **Implications** — Records implication relationships between statement CIDs. Used by the client-side implication graph.
- **AlignmentAttestations** — Records attestations that a project aligns with a cause (referenced by statement CID). Respects the trust graph from TrustRegistry.
- **TrustRegistry** (subjectiv) — Maps addresses to trust relationships. Used by the UI to determine which attesters a user considers authoritative.
- **LazyGiving** / **AssuranceContracts** — Project assurance contracts. Funds are held in escrow; released when threshold is met, refunded if not. Projects use **ERC1155PrimaryMarket** for tokenized ownership (used for retroactive funding mechanics).
- **DelegatableNotes** / **NoteIntent** — The delegation layer. Notes represent earmarked funds with a designated delegate; NoteIntent records where a delegate has directed a note's funds.
- **ContentRegistry** / **ChannelRegistry** / **ChannelEscrow** / **CreatorAssuranceContract** — The content-funding layer. Channels are registered by platform (YouTube, Twitter/X, Substack); channel claiming is verified via ChannelVerifier. Content assurance contracts handle per-piece funding.
- **ERC1155SecondaryMarket** — Secondary market for project tokens, enabling retroactive funding flows.
- **MutableRefUpdater** — General-purpose on-chain mutable references (used for things like pointing to current IPFS content for a project).

## IPFS

Statement content, project descriptions, and other immutable content live on IPFS. The content's IPFS CID is its identity — changing the content changes the CID, so all references remain to exactly the content that was originally published.

The system currently uses Pinata for pinning. You can read content from any IPFS gateway; the UI fetches directly from a configured gateway.

## Indexer and client-side folding architecture

The indexer is intentionally thin: it's a **Ponder**-based event cache that stores raw on-chain events in a single `events` table, served via a REST API. No business logic lives in the indexer.

All state reconstruction happens **client-side** in the SDK, via fold functions: the SDK fetches raw events, folds them into entity state, and reads current on-chain state via view functions. This keeps the indexer simple and verifiable — if you distrust the indexer's output, you can reconstruct the same state from the chain directly.

The SDK also fetches IPFS content directly from a gateway, so statement content is not routed through the indexer at all.

## Generated API documentation

The SDK and smart contract documentation is auto-generated:

- **SDK API docs** (`sdk/docs/api/` in the repository) — TypeScript SDK reference, auto-generated via typedoc from the SDK source.
- **Contract docs** (`hardhat/docs/` in the repository) — Solidity contract reference, auto-generated via solc doc.

Run `npm run build:docs` to regenerate these.

## Interacting directly with the contracts

The contracts are standard Solidity/EVM. You can interact with them directly via any tool that speaks JSON-RPC: `cast` (Foundry), `ethers.js`, `viem`, etc. Contract addresses for deployed instances are available in the app's settings page.

ABI files are available in the `hardhat/artifacts/contracts/` directory of the open-source repository.

## Running your own attester or finder

Attesters are services that evaluate content or projects against a standard and issue on-chain attestations. Anyone can run one. The trust graph determines whose attestations a given user sees — so a new attester only has reach over users who have explicitly trusted it (or trusted someone who trusts it).

The existing attester implementations are in the open-source repository and can be forked and modified. An attester is typically an AI service with a specific evaluation prompt; the prompt defines the standard it enforces.

## Deploying your own platform

The contracts are permissionlessly deployable. You can deploy your own instance of the full contract set, run your own indexer pointing at it, and serve your own UI — all without involving the core team. The system is designed to be forkable.
