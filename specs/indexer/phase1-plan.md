# Phase 1: Move fold logic into the SDK — Detailed Plan

## Overview

Add fold functions to the SDK that can reconstruct entity state from raw on-chain events. This is pure addition — the SDK still talks to the current Ponder indexer, but now it *could* work from raw events instead.

## Structure

Each subsystem gets a new `folds.ts` file alongside its existing `types.ts`, `queries.ts`, and `actions.ts`:

```
sdk/src/subsystems/<subsystem>/
  types.ts      (existing entity types — already defined)
  events.ts     (NEW — raw event types)
  folds.ts      (NEW — fold functions: events → entity state)
  folds.test.ts (NEW — unit tests)
  queries.ts    (existing — unchanged)
  actions.ts    (existing — unchanged)
```

## Shared infrastructure

### `sdk/src/subsystems/events-common.ts` (NEW — already created in Chunk 1)

Common base type for all raw events:

```typescript
export interface RawEvent {
  contractAddress: `0x${string}`;  // ADD THIS — needed for Phase 4 (event cache stores contract_address per event)
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
}
```

All subsystem-specific event types extend this.

### Conventions established in Chunk 1

- **Caller filters events before calling a fold.** Fold functions assume they receive only the relevant events (e.g. `foldMutableRef` expects events for a single `(owner, name)` pair). Document this assumption in each fold's JSDoc.
- **`bigint` → `string` for output types.** The existing SDK types use strings for block numbers and timestamps. Fold functions do `.toString()` to match. This is a pre-existing SDK convention, not something to fight during Phase 1.
- **Test helper pattern:** Each `folds.test.ts` defines a `makeEvent()` factory with `Partial<T>` overrides. Keep using this pattern for consistency.

## Chunks (ordered by complexity, simplest first)

---

### Chunk 1: Mutable Refs + Funding Portal (trivial)

**Estimated size:** Small — ~1 session

#### Mutable Refs

One event type, one fold function.

**`events.ts`:**
```typescript
interface RefUpdatedEvent extends RawEvent {
  owner: `0x${string}`;
  name: string;
  currentRefValue: string;
}
```

**`folds.ts`:**
```typescript
// Fold RefUpdated events → current MutableRef state
function foldMutableRef(events: RefUpdatedEvent[]): MutableRef
// Last-write-wins — just return the latest event's value.

// Fold RefUpdated events → full update history
function foldRefHistory(events: RefUpdatedEvent[]): RefUpdate[]
// Direct mapping — each event becomes a RefUpdate record.
```

#### Funding Portal (Alignment Attestations)

One event type, one fold function.

**`events.ts`:**
```typescript
interface AlignmentAttestationEvent extends RawEvent {
  attester: `0x${string}`;
  subjectAddress: `0x${string}`;
  statementId: string;       // CIDv1 (already decoded from bytes32)
  topicStatementId: string;  // CIDv1
}
```

**`folds.ts`:**
```typescript
// Fold AlignmentAttestation events → attestation records
// Re-attestation updates topicStatementId. Key = (attester, subjectAddress, statementId).
function foldAlignmentAttestations(events: AlignmentAttestationEvent[]): AlignmentAttestation[]
```

---

### Chunk 2: Concept Space (simple, but has delta-tracking logic)

**Estimated size:** Small-medium — ~1 session

Two event types, several fold functions.

**`events.ts`:**
```typescript
interface DirectSupportEvent extends RawEvent {
  user: `0x${string}`;
  statementId: string;      // CIDv1 (decoded from bytes32)
  beliefState: number;       // 0=noOpinion, 1=believes, 2=disbelieves
}

interface ImplicationAttestationEvent extends RawEvent {
  attester: `0x${string}`;
  fromStatementCid: string;  // CIDv1
  toStatementCid: string;    // CIDv1
  explanationCid: string;    // CIDv1
}
```

**`folds.ts`:**
```typescript
// Fold DirectSupport events for a single statement → belief state
// Tracks per-user belief, handles state transitions (believe → disbelieve, etc.)
function foldStatementBeliefs(events: DirectSupportEvent[]): {
  believerCount: number;
  disbelieverCount: number;
  beliefs: Map<string, number>;  // user → beliefState
}

// Fold DirectSupport events for a single user → their beliefs across statements
function foldUserBeliefs(events: DirectSupportEvent[]): UserBelief[]

// Fold ImplicationAttestation events → implication records
// Re-attestation updates explanationCid. Key = (attester, from, to).
function foldImplications(events: ImplicationAttestationEvent[]): Implication[]

// Fold all DirectSupport events → all statement records with counts
// (Used for "browse statements sorted by believer count" — the hard case from the spec)
function foldAllStatements(events: DirectSupportEvent[]): Map<string, { believerCount: number; disbelieverCount: number }>
```

---

### Chunk 3: Pubstarter — Primary Market (medium complexity)

**Estimated size:** Medium — ~1 session

**`events.ts`:**
```typescript
interface AssuranceContractCreatedEvent extends RawEvent {
  assuranceContract: `0x${string}`;
  creator: `0x${string}`;
}

interface AssuranceContractInitializedEvent extends RawEvent {
  assuranceContract: `0x${string}`;
  recipient: `0x${string}`;
  condition: `0x${string}`;         // EthThresholdCondition address
  // Note: threshold and deadline come from on-chain reads, not from events.
  // The fold function will need these passed in separately or will omit them
  // (Phase 2 adds direct on-chain reads).
}

interface ContractMetadataUpdatedEvent extends RawEvent {
  assuranceContract: `0x${string}`;
  metadataCid: string;  // bytes32 → CIDv1
}

interface ERC1155OfferedEvent extends RawEvent {
  assuranceContract: `0x${string}`;
  erc1155Addr: `0x${string}`;
  tokenId: bigint;
  price: bigint;
}

interface ERC1155BoughtEvent extends RawEvent {
  assuranceContract: `0x${string}`;
  participant: `0x${string}`;
  erc1155Addr: `0x${string}`;
  totalCost: bigint;
  ids: bigint[];
  counts: bigint[];
}

interface ERC1155SoldEvent extends RawEvent {
  assuranceContract: `0x${string}`;
  participant: `0x${string}`;
  erc1155Addr: `0x${string}`;
  totalRefund: bigint;
  ids: bigint[];
  counts: bigint[];
}

interface AssuranceContractWithdrawalEvent extends RawEvent {
  assuranceContract: `0x${string}`;
  value: bigint;
}
```

**`folds.ts`:**
```typescript
// All pubstarter primary-market events for one project, discriminated union
type ProjectEvent =
  | { type: 'created'; event: AssuranceContractCreatedEvent }
  | { type: 'initialized'; event: AssuranceContractInitializedEvent }
  | { type: 'metadataUpdated'; event: ContractMetadataUpdatedEvent }
  | { type: 'tokenOffered'; event: ERC1155OfferedEvent }
  | { type: 'bought'; event: ERC1155BoughtEvent }
  | { type: 'sold'; event: ERC1155SoldEvent }
  | { type: 'withdrawal'; event: AssuranceContractWithdrawalEvent };

// Fold project events → Project state
// Note: threshold/deadline require on-chain reads (Phase 2); fold produces
// partial state without them. conditionAddress comes from initialized event.
function foldProject(events: ProjectEvent[]): Omit<Project, 'threshold' | 'deadline'>

// Fold bought/sold events → contribution and refund records
function foldContributions(events: (ERC1155BoughtEvent | ERC1155SoldEvent)[]): {
  contributions: Contribution[];
  refunds: Refund[];
}

// Fold ERC1155Offered events → project tokens
function foldProjectTokens(events: ERC1155OfferedEvent[]): ProjectToken[]
```

---

### Chunk 4: Pubstarter — Secondary Market + Burns (medium)

**Estimated size:** Medium — ~1 session

**`events.ts`** (additions):
```typescript
interface SaleListingCreatedEvent extends RawEvent { ... }
interface SaleListingFulfilledEvent extends RawEvent { ... }
interface SaleListingCancelledEvent extends RawEvent { ... }
interface BuyOrderCreatedEvent extends RawEvent { ... }
interface BuyOrderFulfilledEvent extends RawEvent { ... }
interface BuyOrderCancelledEvent extends RawEvent { ... }
interface ERC1155SecondaryMarketCreatedEvent extends RawEvent { ... }
interface TransferSingleEvent extends RawEvent { ... }  // for burns
interface TransferBatchEvent extends RawEvent { ... }   // for burns
```

**`folds.ts`:**
```typescript
// Fold secondary market events → listings, orders, trades
type SecondaryMarketEvent = ...;  // discriminated union

function foldSecondaryMarket(events: SecondaryMarketEvent[]): {
  saleListings: SaleListing[];
  buyOrders: BuyOrder[];
  trades: Trade[];
}

// Fold transfer events → token burns (transfers to address(0))
function foldTokenBurns(events: (TransferSingleEvent | TransferBatchEvent)[]): TokenBurn[]
```

---

### Chunk 5: Delegation (complex — the big one)

**Estimated size:** Large — ~1-2 sessions

This is the hardest fold because of the delegation chain state machine: chain splitting, hash recomputation, and revocation all mutate shared state across multiple events in the same transaction.

**`events.ts`:**
```typescript
interface NoteCreatedEvent extends RawEvent {
  noteId: bigint;
  owner: `0x${string}`;
  amount: bigint;
  token: `0x${string}`;
  tokenType: number;
  tokenId: bigint;
}

interface NoteDelegatedEvent extends RawEvent {
  parentNoteId: bigint;
  childNoteId: bigint;
  delegate: `0x${string}`;
  amount: bigint;
}

interface ChainSplitEvent extends RawEvent {
  originalLeafId: bigint;
  splitLeafId: bigint;
  remainderLeafId: bigint;
  splitAmount: bigint;
}

interface NoteRevokedEvent extends RawEvent {
  noteId: bigint;
  revoker: `0x${string}`;
}

interface FundsReclaimedEvent extends RawEvent {
  noteId: bigint;
  owner: `0x${string}`;
  amount: bigint;
}

interface NoteConsumedEvent extends RawEvent {
  noteId: bigint;
  amountConsumed: bigint;
  remainingAmount: bigint;
  deleted: boolean;
}

interface ERC1155PurchasedEvent extends RawEvent {
  buyer: `0x${string}`;
  erc1155Contract: `0x${string}`;
  tokenIds: bigint[];
  counts: bigint[];
  totalCost: bigint;
  inputNoteIds: bigint[];
  outputNoteIds: bigint[];
}

interface NoteIntentAttestedEvent extends RawEvent {
  attester: `0x${string}`;
  noteContract: `0x${string}`;
  noteId: bigint;
  intendedStatementId: string;  // CIDv1
}
```

**`folds.ts`:**
```typescript
// All delegation events, discriminated union
type DelegationEvent =
  | { type: 'noteCreated'; event: NoteCreatedEvent }
  | { type: 'noteDelegated'; event: NoteDelegatedEvent }
  | { type: 'chainSplit'; event: ChainSplitEvent }
  | { type: 'noteRevoked'; event: NoteRevokedEvent }
  | { type: 'fundsReclaimed'; event: FundsReclaimedEvent }
  | { type: 'noteConsumed'; event: NoteConsumedEvent }
  | { type: 'erc1155Purchased'; event: ERC1155PurchasedEvent };

// Fold all delegation events → complete note state
// This is stateful — must process events in order.
// Internally maintains a Map<noteId, NoteState> and Map<noteId, ChainLink[]>.
function foldDelegationState(events: DelegationEvent[]): {
  notes: Map<string, Note>;
  chains: Map<string, DelegationChainLink[]>;
}

// Fold a single note's events → its current state + chain
// (Convenience wrapper — filters events for one noteId, but also needs
// the ChainSplit/NoteDelegated events that reference it as parent.)
function foldNote(noteId: string, events: DelegationEvent[]): {
  note: Note;
  chain: DelegationChainLink[];
} | null

// Fold NoteIntentAttested events → attestation records
function foldNoteIntentAttestations(events: NoteIntentAttestedEvent[]): NoteIntentAttestation[]
```

**Key complexity:** The delegation fold must:
1. Handle ChainSplit + NoteDelegated arriving as a pair (same tx, specific order)
2. Recompute `chainHash` using keccak256 (import from viem)
3. Handle revocation by truncating the chain and recomputing the hash
4. Track parent-child note relationships across splits
5. Handle NoteConsumed partial/full consumption

The fold function will need an internal mutable state object (like a mini in-memory database) that processes events sequentially.

---

## Testing approach

Each fold function gets unit tests with:
- **Happy path:** Process a sequence of events, assert final state matches expected
- **Idempotency where applicable:** Re-attestation overwrites, not duplicates
- **Edge cases:** Empty event list, single event, state transitions (believe → disbelieve → noOpinion)
- **For delegation:** Multi-event sequences testing splits, delegations, revocations, and consumption

Test data: Manually constructed event arrays with realistic values. No need for actual blockchain interaction — the fold functions are pure (except delegation's keccak256, which is deterministic).

## What this does NOT include

- No changes to how the SDK currently fetches data (still uses GraphQL)
- No event cache service (that's Phase 3)
- No IPFS fetching (that's Phase 2)
- No on-chain reads (that's Phase 2) — so `threshold`/`deadline` on Project are omitted from the fold output

## Suggested order of implementation

1. **Chunk 1** (Mutable Refs + Funding Portal) — warmup, get the pattern established
2. **Chunk 2** (Concept Space) — simple but exercises delta-tracking
3. **Chunk 3** (Pubstarter Primary Market) — medium, establishes the discriminated-union pattern
4. **Chunk 4** (Pubstarter Secondary Market + Burns) — similar to Chunk 3
5. **Chunk 5** (Delegation) — the hardest, do last when the pattern is well-established

Each chunk is independently committable and testable.
