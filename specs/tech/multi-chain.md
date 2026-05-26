# Multi-chain support (future option)

Status: **not planned for MVP.** This doc captures cheap design choices we should make *now* to keep the option open for letting users select which chain to deploy a given contract on (e.g. a high-stakes assurance contract on Ethereum L1, smaller ones on an L2).

## Why this is worth thinking about

Different contracts have different value-at-stake. A multi-million-dollar assurance contract may want L1's trust guarantees; a $50 one is fine on whatever L2 is cheapest. The contracts themselves are already EVM-portable (see [shared/tech.md](shared/tech.md) — "easy to switch L2s later"). The hard part isn't the contracts; it's the platform around them (indexer, SDK, URLs, registries, aggregation).

The position taken here: **the MVP is single-chain. But several small choices today protect the option of going multi-chain later. Those choices are listed below.**

## Which contracts must co-locate

If we ever support multi-chain, the unit of choice can't be "one contract" — it's "a cluster of contracts that have to talk to each other atomically." Different clusters can in principle live on different chains; contracts within a cluster cannot.

### The purchase cluster (must be one chain)

`DelegatableNotes.purchaseFromPrimaryMarket` / `purchaseFromSecondaryMarket` make **synchronous, atomic calls** into:
- `AssuranceContract(primaryMarket).paymentToken()`
- `ERC1155PrimaryMarket(primaryMarket).buyERC1155(...)` (or the secondary-market equivalent)
- `IERC20(paymentToken).forceApprove(...)` and transfers
- ERC1155 receipt (DelegatableNotes is an `ERC1155Holder`)

All of these must be on the same chain in the same transaction. **Bridging does not fix this.** Bridges (and cross-chain messaging like LayerZero, Hyperlane, CCIP) are asynchronous — they cannot provide the atomic same-transaction call that a purchase requires. Making this multi-chain would require a fundamentally different contract design (e.g. lock-and-mint the note value onto the project's chain first, then purchase there), which is well outside the "cheap design choices" scope of this document.

So in practice: a project is on whatever chain its assurance contract is on, and the notes that are used to buy into it must be on the same chain. The DelegatableNotes contract is therefore effectively *per-chain*; if multi-chain ever happens, there's one DelegatableNotes deployment per chain, and a user's notes on chain A simply cannot be spent on chain B without a separate bridging mechanism.

### Other tight clusters

- **Content funding:** `CreatorAssuranceContract` ↔ `CreatorAssuranceContractFactory` ↔ `ContentRegistry` ↔ `ChannelRegistry` ↔ `ChannelEscrow`. Factory calls registry at creation; channel claim/escrow flows are atomic.
- **Funding portals:** `AlignmentAttestations` stores raw project addresses, which only mean something on the same chain.
- **LazyGiving primary/secondary:** `AssuranceContractFactory` → `AssuranceContract` → `PremintingERC1155` → `ERC1155SecondaryMarket`. Tight atomic ties.

### Looser couplings (could in principle differ)

These contracts reference content by IPFS CID or by hash, not by on-chain address, so they're not tightly coupled to other contracts' chains:
- `Beliefs`, `Implications` (statement-level events — IDs are content hashes)
- `NudgePublications` (just emits events)
- `MutableRefUpdater` (utility, no cross-contract calls)
- `NoteIntent` (just emits attestations)

These *could* live on a different chain from the purchase cluster, though the social-graph reasons not to fragment them are strong (see "Decisions to defer" below).

## What's already chain-agnostic

- Solidity contracts have no chain-specific opcodes; they compile and deploy anywhere EVM-compatible.
- The UI's wagmi/Privy setup (`ui/src/wagmi.ts`, `ui/src/privy/PrivyAppProvider.tsx`) already lists multiple chains as supported.
- Ponder's config schema natively supports multiple chains — `chains` is a map. The current code just collapses it to one via `getActiveChains()`.
- Per-entity queries (one project, one statement, one note) are naturally chain-local.

## Where single-chain assumptions are currently baked in

1. **Events table has no `chainId` column** (`indexer/schemas/events.schema.ts`). Primary key is `txHash + logIndex` — collides across chains.
2. **`INDEXER_CHAIN` is a single env var** in `ponder.config.ts`. Every contract entry hardcodes `chain: INDEXER_CHAIN`.
3. **Deployment env files are flat** (`deployments/<chain>.env`) and exposed to consumers as global env vars like `CONTENT_REGISTRY_ADDRESS`, not keyed by chain.
4. **Content Registry uniqueness** is scoped "within a single platform deployment." Deploying it on two chains gives two disjoint uniqueness namespaces — fine, but should be a documented intentional choice.
5. **Cross-contract references via immutable addresses** (e.g. `CreatorAssuranceContract` holds Channel/Content registry addresses) are inherently within one chain.
6. **Global aggregation queries** (statement browsing, funding portal totals across aligned projects) implicitly assume one event source. See [scalability.md](scalability.md) for the broader treatment of these queries.
7. **Entity IDs in URLs** are bare `0x...` addresses or hashes — no chain prefix. Once URLs are shared/screenshotted/tweeted, they're effectively forever, so retrofitting a prefix later is painful.

## Cheap changes worth making now

These are small, low-risk, and lock in optionality before more data and URLs accumulate. Pre-testnet is the cheapest moment to do them.

### High-leverage (do before testnet)

1. **Add `chainId` to the events table** and to the indexer's `/api/events` response. Make the primary key `(chainId, txHash, logIndex)`. Populate with one chain today. Retrofitting later means a migration over historical events.

2. **Always include `chainId` in SDK event types and on entity references.** Consumers that learn "events don't have a chainId" become annoying to retrofit.

3. **Use chain-namespaced identifiers in URLs and shareable IDs.** [CAIP-10](https://chainagnostic.org/CAIPs/caip-10)-style is the established convention: `eip155:8453:0xabc…` instead of `0xabc…`. UI can default-strip the namespace for display but keep it in the canonical form. URL lock-in is the strongest argument here.

### Opportunistic (do when touching the relevant code)

4. **Namespace deployment-address lookups by chainId.** Either a `getContractAddress(chainId, 'ContentRegistry')` helper or a single `deployments.json` keyed by chainId. Single chain today, multi-chain later, same API.

5. **Restructure `ponder.config.ts`** so `getActiveChains()` returns a map (even of one entry) and each contract entry *can* specify a different chain. Tiny refactor.

6. **Audit the SDK for single-`publicClient` / single-`walletClient` assumptions.** Pass chainId through, or have one place that resolves "for this entity, which client?"

7. **Document Content Registry uniqueness as per-chain by design** in [subsystems/content-funding/content-registry.md](subsystems/content-funding/content-registry.md), so future devs don't try to bridge it.

## Decisions to defer

Don't speculatively build these — design choices, not implementations:

- **Cross-chain aggregation** (multi-chain leaderboards, multi-chain statement browsing). [scalability.md](scalability.md) already flags that statement browsing will eventually need server-side derived state; that work, when it happens, should be multi-chain-aware in its schema.
- **Cross-chain references between contracts.** Avoid entirely. The purchase cluster (notes + assurance + ERC1155 + payment token) genuinely needs atomic same-chain calls; bridging cannot substitute. If ever needed, requires a redesigned lock-and-mint flow or a designated "home chain" for global registries.
- **A UI flow for picking chain per project on creation.** Trivial to bolt on once the underlying plumbing (IDs, addresses, events) is chain-aware.

## Things we are explicitly *not* preserving

- A single global "platform" view across all chains. If multi-chain happens, each chain is its own platform deployment with its own Content Registry, Alignment Attestations, etc. The user-facing illusion of unity would have to be assembled in the UI/SDK layer, not on-chain.
- One canonical assurance-contract address for a given project. A project that exists on two chains is *two projects* as far as the system is concerned.
