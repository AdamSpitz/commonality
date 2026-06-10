# Aligning — Data Architecture

## Subsystems Covered

This document covers the data architecture for LazyGiving, Delegation, and Aligning subsystems.

## How It Works

All subsystems share a single thin event cache (one `events` table). The SDK fetches raw events and folds them client-side.

### LazyGiving

- **Project discovery:** Projects discovered from `LazyGivingAssuranceContractCreated` factory events.
- **Project state:** `foldProject()` processes `ERC1155Bought`, `ERC1155Sold`, `ContractMetadataUpdated` events per project contract. On-chain view functions provide current balance, threshold, deadline.
- **Contributions/refunds:** `foldContributions()` and `foldRefunds()` reconstruct per-participant contribution history from events.
- **Secondary market:** `foldSecondaryMarket()` processes listing, order, trade, and cancellation events.
- **Token burns:** Discovered from `TransferSingle`/`TransferBatch` events where the recipient is the zero address.

### Delegation

- **Notes and chains:** `foldDelegationState()` processes `NoteCreated`, `NoteDelegated`, `ChainSplit`, `NoteRevoked`, `FundsReclaimed`, `NoteConsumed`, `ERC1155Purchased`, `RefundedIntoNote` events to reconstruct note ownership, delegation chains, and lifecycle state.
- **Note intent attestations:** `foldNoteIntentAttestations()` processes `NoteIntentAttested` events.

### Aligning

- **Alignment attestations:** `foldAlignmentAttestations()` processes `AlignmentAttestation` events to track which projects align with which statements.
- **Cross-subsystem aggregation:** SDK functions (`getAllAlignedProjectsForCause`, `getTopContributorsForCause`, `getTotalFundingForCause`) orchestrate calls across Concept Space, LazyGiving, and Delegation SDK queries — no indexer federation needed.

## Key Design Decisions

- No per-subsystem indexers or federation — all subsystems read from the same event cache.
- Cross-cutting aggregations happen client-side in the SDK. See [../../indexer/redesign.md](../../indexer/redesign.md) for performance analysis and future optimization options.
- IPFS content (project metadata) fetched directly from IPFS gateway on demand.
