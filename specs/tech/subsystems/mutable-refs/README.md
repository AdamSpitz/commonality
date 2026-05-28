# Mutable Refs

A utility subsystem that lets each user maintain named, mutable onchain references to IPFS content.

## Motivation

All content in the system is identified by its IPFS CID, which is immutable by nature. But sometimes you need a stable onchain pointer to data that can change over time — i.e., "the current version of X", where X can be updated.

(Concrete use case: [statements lists](../conceptspace/statements-list.md).)

## How It Works

### Smart Contract: `MutableRefUpdater`

A minimal contract that stores `(owner, name) → value` mappings onchain:

```solidity
contract MutableRefUpdater {
    mapping(address => mapping(string => string)) public refsByNameByOwner;

    event RefUpdated(address indexed owner, string name, string currentRefValue);

    function updateRef(string calldata name, string calldata refValue) external;
    function getRef(address owner, string calldata name) external view returns (string memory);
}
```

When a user calls `updateRef("created-statements", "bafyrei...")`, the contract updates the stored value and emits a `RefUpdated` event for the indexer to pick up.

### Indexer

Listens to `RefUpdated` events and maintains two tables:

- **`mutable_refs`** — current state, keyed on `(owner, name)`. Stores `value`, `updatedAt`, `updatedAtBlock`, `transactionHash`. Upserted on every `RefUpdated` event.
- **`ref_updates`** — full history, one row per event, keyed on `${owner}:${name}:${blockNumber}:${logIndex}`. Never overwritten.

Owner addresses are normalized to lowercase.

### SDK

**Queries** (via indexer):
- `getUserRef(machinery, owner, name)` → current `MutableRef` or `null`
- `getUserRefs(machinery, owner)` → all refs for a user
- `getUserRefHistory(machinery, owner, name, limit?)` → historical `RefUpdate[]`, most recent first
- `getRefsByName(machinery, name, limit?)` → all users who have a ref with this name

**Low-level actions** (direct contract calls):
- `updateRef(clients, contract, name, refValue)` → write/update a ref, returns tx hash
- `getRef(clients, contract, owner, name)` → read current value directly from contract (use indexer queries instead when possible)

**High-level list management**:
- `appendToUserList(machinery, clients, contract, listName, itemCid, options?)` — appends an item to an IPFS-backed list ref. Fetches the current list from the indexer, parses it (with format migration), appends the new CID, uploads the updated list to IPFS, and calls `updateRef` with the new CID. Supports `{ deduplicate: true }` (default).

## List Format

When using refs to store lists (e.g., `created-statements`), the ref value is an IPFS CID pointing to a JSON file:

```json
{
  "statements": ["bafyrei...", "bafyrei..."],
  "version": 1
}
```

`appendToUserList` handles backward-compatible migration from older formats:
- **Current format**: `{ statements: [...], version: 1 }` — appended directly
- **Old array format**: `["cid1", "cid2"]` — migrated to current format
- **Oldest format**: the entire ref value is a bare CID string — migrated to a list with one element
- **Parse error**: treat the whole value as a bare CID

## Known Uses

- **`created-statements`**: Tracks statements a user has created (for re-discovery). Written automatically by the statement-creation flow via `addToCreatedStatements()`. Used to populate the "Statements I've Created" section of a user's profile page.

Other ref names are possible (bookmarks, drafts, etc.) — the system is fully generic.

**Considered but rejected: nudger feeds.** We considered having [nudgers](../conceptspace/nudges.md) maintain mutable refs pointing to their current nudge sets, but decided nudges should be fully off-chain (signed messages served via API). Nudges don't affect on-chain state and benefit from *not* having permanent on-chain history — a nudger should be able to retract bad suggestions without a permanent record. See [nudges.md](../conceptspace/nudges.md) for the nudger architecture.

## UI

Not yet implemented.
