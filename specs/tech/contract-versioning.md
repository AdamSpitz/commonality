# Contract versioning and migration

How we handle wanting a v2 (v3, …) of any smart contract. We deliberately do **not**
use upgradeable/proxy contracts: immutability is the trustless guarantee we offer.
So "upgrading" always means deploying a new contract alongside the old one. This doc
classifies every contract by how painful that is, lists the couplings that constrain
it, and defines the playbook.

Analysis date: 2026-06-12 (pre-mainnet, first testnet deployment live).

## The core stance

- **The trustless promise is that v1 keeps working forever.** Exit paths (refund,
  reclaim, withdraw) are immutable and stay open indefinitely.
- **Deprecation is a UX policy, not a contract feature.** The UI/services stop
  *offering* v1 for new writes; the indexer keeps *reading* v1 forever. No
  owner-controlled "pause" switches — that's upgrade-lite and erodes the trustless story.
- **Version discovery is offchain-with-an-onchain-pointer, not an onchain registry.**
  An onchain "official versions" registry has an owner, which is a trust root — it
  relocates trust rather than removing it. Publish a deployment-manifest
  (per-chain list of `{logicalName, address, startBlock, abiVersion}`) and point to it
  via MutableRefUpdater or an ENS text record. Clients that don't trust the pointer
  can hardcode addresses. The only legitimate *onchain* version knowledge is where
  contracts must authorize other contracts, and that already exists as owner-gated
  allowlists (see couplings below).

## Taxonomy: three classes

### Class 1 — Append-only opinion/attestation logs: trivially versionable

`Beliefs`, `Implications`, `TrustRegistry`, `AlignmentAttestations`, `NoteIntent`,
`NudgePublications`, `MutableRefUpdater`.

- No funds; nothing onchain reads their state in practice. Consumers are the indexer,
  SDK folds, and offchain services.
- A v2 is a completely separate deployment. No migration: index v1 and v2 side by
  side; folds merge with latest-write-wins ordered by block. Old attestations stay
  valid forever.
- No onchain registry needed.

### Class 2 — Factory + finite-lifetime children: versionable by parallel generations

`ProjectFactory` + sub-factories (`PremintingERC1155Factory`, `MarketplaceFactory`,
`AssuranceContractFactory`, `ValueThresholdConditionFactory`),
`CreatorAssuranceContractFactory`, and all children (assurance contracts, secondary
markets, PremintingERC1155s, conditions).

- Children carry their own funds and reach a terminal state (success→withdraw,
  failure→refund). They never migrate; v1 projects run to completion on v1 code.
- Deploy a v2 factory; new projects come from it; old ones drain naturally.
- Indexer cost: one more `factory()` address source in Ponder.

The constraints are the **cross-contract couplings**, not the factories themselves:

| Coupling | Mutability | v2-readiness |
|---|---|---|
| `DelegatableNotes` → primary market factories | mutable **list** (`setPrimaryMarketFactoryAuthorization`) | ✅ already designed for versions |
| `DelegatableNotes` → secondary market factories | mutable **list** (`setSecondaryMarketFactoryAuthorization`) | ✅ v2 marketplace factories can be authorized alongside v1 |
| `ChannelRegistry` → creator assurance contract factories | mutable **set** (`setFactoryAuthorization`) | ✅ `vetoContract` resolves the factory that created the target contract, so generations can coexist |
| `ContentRegistry.isRegistrar` | mutable **set** | ✅ authorize the v2 factory alongside v1 |
| `CancellableCondition.successGate` → ChannelRegistry | immutable per-condition | OK (conditions die with their project), but it pins ChannelRegistry while any third-party veto window is live |

### Class 3 — Long-lived value-holding singletons: the genuinely hard ones

- **`DelegatableNotes`** — holds all pooled funds plus the note ledger and
  delegation-chain commitments. A migration cannot be done by root owners alone:
  roots can only `reclaimFunds` on root notes, so delegated notes must be revoked up
  the chain first, destroying delegation structure *other people* built. Treat like a
  token contract: audit heavily, version as rarely as possible, design everything
  else to plug into it (primary/secondary factory allowlists) rather than the reverse.
  Its `Ownable` levers (factory authorization, `recurringPledgeRegistry`) are the
  system's main trust concentration point; needs a governance/timelock story before
  mainnet independent of versioning.
- **`ChannelEscrow`** — holds funds keyed by `channelId` for channels whose owners
  haven't shown up yet, so at migration time nobody is authorized to move most of its
  balance. A v2 implies v1 stays live and indexed indefinitely. `paymentToken` is
  immutable (see payment-token axis below).
- **`ChannelRegistry`** — verification/control state is re-creatable (creators
  re-verify on v2 with a fresh signature) but it's an "everyone re-onboards" event,
  and live veto windows pin it.
- **`ContentRegistry`** — contentId→contract claims are re-registerable, but the
  one-contract-per-content-item uniqueness (anti-squatting) only holds within one
  registry. Version in lockstep with `CreatorAssuranceContractFactory`.
- **`RecurringPledges`** — no funds, but standing intents + users' ERC20 approvals
  point at DelegatableNotes (immutable reference). A DelegatableNotes v2 cascades
  here: new deployment, pledges re-created, approvals re-granted.

Not yet wired (decide their class before they ship): `ProspectiveContentTokens` /
`MaterializedContentTokens` (in repo, not deployed/indexed). Deployed but not
Ponder-indexed: `TrustRegistry`, `ChannelVerifier` (the latter is stateless — nonces
live in ChannelRegistry — and replaceable via `setVerifier`, so it's effectively
Class 1).

## Cross-cutting version axes

- **Events are the real ABI.** The indexer is a thin event cache; SDK folds, UI, and
  attester services consume events. A v2 that keeps event signatures identical costs
  ~10 lines of indexer config; one that changes them costs parallel handlers and
  merge logic. Rules: prefer adding new events over changing existing ones; on a
  breaking change, *rename* the event (`NoteCreatedV2`) so both can coexist; treat
  event shapes as a versioned public API in review.
- **Onchain auto-increment IDs collide across versions.** `noteId`, `pledgeId`,
  `saleListingId` etc. restart at 1 in a v2. Anything keyed by a bare onchain id —
  SDK fold outputs, UI URLs, caches — must key by `(contractAddress, id)` *before*
  any v2 exists. (The indexer's raw-events table is keyed by block/log-index and is
  fine; the folds and UI are where collisions bite.)
- **The payment token is a hidden version axis.** `paymentToken` is immutable in the
  escrow, the creator factory, every market, and every assurance contract. Switching
  testnet USDZZZ → real USDC at mainnet, or a future USDC migration, triggers the
  same cascade as a contract v2. Token migration and contract v2 are the same
  playbook.

## Playbook for shipping a v2

1. Deploy v2; leave v1 untouched.
2. Add v2 to the deployment manifest with its own start block; indexer picks it up as
   an additional address (Ponder supports address lists / multiple sources per
   logical contract).
3. Wire authorizations: add v2 to the relevant allowlists (DelegatableNotes primary/
   secondary factories, ContentRegistry registrars, ChannelRegistry factories).
4. Folds/UI merge v1+v2 (latest-write-wins by block for Class 1; address-namespaced
   ids for Class 2/3).
5. UI stops offering v1 for new writes; exit paths and indexing for v1 stay on
   forever (or, for Class 2 children, until all children reach terminal state).
6. Update the onchain pointer (MutableRefUpdater / ENS) to the new manifest.

## Prep work (cheapest now, expensive later)

1. **Indexer/SDK, no redeploys:** namespace fold/UI keys by contract address; move
   indexer config from one-env-var-per-contract to a per-chain manifest with address
   lists and per-address start blocks (`deployments/*.env` is halfway there).
2. **Contract changes while still testnet-only:** ✅ `ChannelRegistry` now uses a
   plural authorized factory set; ✅ `DelegatableNotes` secondary-market factories
   are pluggable like primary ones. Still decide the governance story for the
   `Ownable` levers on DelegatableNotes / ChannelRegistry / ContentRegistry.
3. **Process:** check new/changed contracts against this doc in review, especially
   event-shape stability.
