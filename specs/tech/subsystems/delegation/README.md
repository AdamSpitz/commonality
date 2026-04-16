# Delegation system spec

## Overview

The `DelegatableNotes` contract lets users deposit tokens and delegate spending authority along a chain. For example: Alice deposits ETH → Alice delegates to Bob → Bob delegates to Carol. Carol can now spend the note, and each step in the chain can revoke authority at any time.

See [ui.md](./ui.md) for the UI spec.

---

## The `chainHash` commitment mechanism

### Why not store the owner list on-chain?

The most obvious design would be to store the full `address[]` delegation chain in each note. That would be expensive: writing an array to storage costs gas proportional to its length, and long delegation chains would become unaffordable.

Instead, the contract stores a single `bytes32` hash commitment per note:

```solidity
struct Note {
  bytes32 chainHash;  // Commitment to delegation chain
  uint256 amount;
  address token;
  TokenType tokenType;
  uint256 tokenId;
}
```

### How `chainHash` is computed

The hash is built from root to leaf using recursive keccak256:

```
chainHash(root alone)         = keccak256(rootOwner, bytes32(0))
chainHash(root → alice)       = keccak256(alice,     chainHash(root alone))
chainHash(root → alice → bob) = keccak256(bob,       chainHash(root → alice))
```

Solidity:
```solidity
function _computeChainHash(address owner, bytes32 parentChainHash) private pure returns (bytes32) {
  return keccak256(abi.encodePacked(owner, parentChainHash));
}
```

To verify a full chain, the contract receives an `address[] owners` array (leaf-first, root-last), rebuilds the hash from the root end, and compares to the stored value.

### Who provides the chain at call time?

Every contract function that acts on a note — `delegate()`, `revoke()`, `purchaseFromPrimaryMarket()`, etc. — requires the caller to pass the current `address[] owners` array alongside the note ID. The contract verifies this array produces the correct `chainHash`, then checks that the caller appears in the chain at the required position. The array itself is **not stored anywhere on-chain** between calls; only the hash commitment persists.

---

## How the SDK reconstructs the chain

Because the full chain isn't stored on-chain, callers need to get it from somewhere. This is where the Client-Side Folding pattern (see [specs/indexer/README.md](../../indexer/README.md)) comes in.

### Indexer role

The indexer captures every `DelegatableNotes` event as a raw row in the event cache:

| Event | When emitted |
|---|---|
| `NoteCreated` | New note created (deposit or ERC1155 purchase output) |
| `ChainSplit` | Partial delegation — original note splits into two |
| `NoteDelegated` | A note's chain is extended with a new delegate |
| `NoteRevoked` | A chain member revokes — chain truncated back to revoker |
| `NoteConsumed` | Note amount reduced (or deleted) by a spend |
| `FundsReclaimed` | Root owner withdrew funds |
| `ERC1155Purchased` | Purchase completed; output notes inherit input chains |

No chain reconstruction happens in the indexer. It is a pure event cache.

### SDK fold: `foldDelegationState()`

`sdk/src/subsystems/delegation/folds.ts` exports `foldDelegationState(events)`. It processes all events in block/log-index order and maintains a `Map<noteId, NoteState>` where each `NoteState` has a `chain: DelegationChainLink[]`:

```typescript
interface DelegationChainLink {
  address: string;
  position: number; // 0 = root, higher = closer to leaf
  createdAt: string;
}
```

**Chain update rules:**

- `NoteCreated` → initialize chain `[{ address: owner, position: 0 }]` (root only)
- `ChainSplit` → copy the original note's chain into the new split note
- `NoteDelegated (full)` → push `{ address: delegate, position: chain.length }` onto the same note's chain
- `NoteDelegated (partial)` → push delegate onto the split note's chain (ChainSplit ran first)
- `NoteRevoked` → truncate the chain so the revoker becomes the new leaf (strips all downstream delegates)
- `NoteConsumed` / `FundsReclaimed` → mark note inactive; chain is preserved in the map for ERC1155Purchased reference
- `ERC1155Purchased` → output notes were emitted as `NoteCreated` with a single-link chain; the fold replaces that with the full chain copied from the corresponding input note

### Chain ordering convention

**The SDK and the contract use opposite ordering:**

| Context | Ordering | Example (root=Alice, leaf=Carol) |
|---|---|---|
| SDK `DelegationChainLink[]` | root-first | `[Alice, Bob, Carol]` |
| Contract `address[] owners` | leaf-first | `[Carol, Bob, Alice]` |

When calling any contract function that takes an `owners` parameter, reverse the SDK chain:

```typescript
const chain = await getDelegationChain(machinery, noteId);
const owners = chain.map(l => l.address as Address).reverse(); // leaf-first for contract
await delegateNote(clients, contract, { noteId, owners, delegateTo, amount });
```

---

## SDK API

### Queries

```typescript
// Get the current delegation chain for a note (root-first)
getDelegationChain(machinery, noteId): Promise<DelegationChainLink[]>

// Get a note by ID
getNote(machinery, noteId): Promise<Note | null>

// Get all active notes where address is the current leaf (spending authority)
getNotesByOwner(machinery, ownerAddress): Promise<Note[]>

// Get all notes originally deposited by address (regardless of delegation)
getNotesByRoot(machinery, rootAddress): Promise<Note[]>
```

The `Note` type exposes two convenience fields:
- `owner` — the current leaf (the address with spending authority right now)
- `rootOwner` — the original depositor (position 0 in the chain)

### Actions

All write actions accept the chain in **leaf-first** order (matching the contract ABI directly):

```typescript
// Deposit ETH, get back a noteId
depositETH(clients, contract, { amount })

// Delegate (full or partial); owners is leaf-first
delegateNote(clients, contract, { noteId, owners, delegateTo, amount })

// Revoke (any chain member can call); owners is leaf-first
revokeNote(clients, contract, { noteId, owners })

// Reclaim funds from a root (non-delegated) note
reclaimFunds(clients, contract, noteId)

// Spend notes on a primary-market purchase; chains are leaf-first
purchaseFromPrimaryMarketWithNotes(clients, contract, { noteIds, chains, ... })
```

---

## Example: full delegation chain lifecycle

```
1. Alice deposits 1 ETH           → Note 1, chainHash = hash(Alice, 0)
                                     chain (SDK) = [Alice]

2. Alice delegates to Bob          → Note 1 updated, chainHash = hash(Bob, hash(Alice, 0))
   owners passed: [Alice]           chain (SDK) = [Alice, Bob]

3. Bob delegates half to Carol     → ChainSplit: Note 2 (0.5 ETH), Note 1 remainder (0.5 ETH)
   owners passed: [Bob, Alice]        Note 2 chain (SDK) = [Alice, Bob, Carol]

4. Alice revokes Note 2            → chainHash truncated back to Alice
   owners passed: [Carol, Bob, Alice]  Note 2 chain (SDK) = [Alice]

5. Alice spends Note 2             → reclaimFunds or purchase
```
