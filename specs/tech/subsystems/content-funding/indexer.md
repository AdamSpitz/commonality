# Content Funding — Data Architecture

## Can we use the same "store events and fold them" architecture?

Yes. Content funding fits naturally into the existing thin event cache + SDK fold architecture. Each platform's contracts (content registry, channel registry, creator assurance contracts) emit events; those events go into the same `events` table; the SDK gets fold functions for content-funding entities.

Since contracts are deployed [per-platform](README.md#per-platform-deployment), the event cache needs to watch contract addresses from each platform's deployment. The UI configuration that lists known platform contract sets also tells the indexer which addresses to watch.

### New events to capture

| Contract | Events |
|---|---|
| Creator assurance contract factory | `CreatorAssuranceContractCreated` |
| Content registry | `ContentItemRegistered`, `ContentItemReleased` |
| Channel registry | `ChannelVerified`, `ChannelControlTaken`, `ContractVetoed` |
| Channel escrow | `Deposited`, `Withdrawn` |
| Creator assurance contracts | Same events as LazyGiving contracts (`ERC1155Bought`, `ERC1155Sold`, etc.) — they *are* LazyGiving contracts |

Creator assurance contracts are a specialization of `MultiERC1155AssuranceContract`, so they emit the same events. The existing LazyGiving event handlers and fold functions already handle them. The only new event types are from the factory, content registry, channel registry, and channel escrow.

**Factory events.** The `CreatorAssuranceContractCreated` event is how the indexer discovers new content-funding contracts (analogous to `LazyGivingAssuranceContractCreated`). It should include the channel ID, the created contract address, and whether the contract was created by a third party or the verified creator — the factory knows all of this at creation time.

```solidity
event CreatorAssuranceContractCreated(
    address indexed contractAddress,
    bytes32 indexed channelId,
    address indexed creator,     // whoever called the factory
    bool isThirdParty
);
```

**Channel registry events.** The channel-claiming spec defines three states (Unclaimed → Verified → Creator-controlled) with two one-way transitions. Each transition should emit an event:

```solidity
event ChannelVerified(bytes32 indexed channelId, address indexed owner);
event ChannelControlTaken(bytes32 indexed channelId, address indexed owner);
event ContractVetoed(bytes32 indexed channelId, address indexed contractAddress);
```

`ContractVetoed` fires when a creator-controlled channel vetoes a pre-existing third-party contract. The veto calls `cancel()` on the contract's `CancellableCondition`, which triggers the normal failure/refund flow — but the veto event itself is useful for UI display and notification.

**Channel escrow events.** Already defined in [channel-escrow.md](channel-escrow.md):

```solidity
event Deposited(bytes32 indexed channelId, address indexed from, uint256 amount);
event Withdrawn(bytes32 indexed channelId, address indexed to, uint256 amount);
```

### New SDK fold functions

```typescript
// Fold content registry events to get the current state of content items
function foldContentRegistry(events: ContentRegistryEvent[]): ContentRegistryState {
  const items = new Map<uint256, { contract: address, canonicalId: string, status: 'active' | 'released' }>();
  for (const e of events) {
    if (e.type === 'ContentItemRegistered') {
      items.set(e.contentId, { contract: e.assuranceContract, canonicalId: e.canonicalId, status: 'active' });
    }
    if (e.type === 'ContentItemReleased') {
      items.delete(e.contentId);  // or mark as released
    }
  }
  return { items };
}

// Fold channel state from registry events
function foldChannelState(events: ChannelRegistryEvent[]): Map<string, ChannelState> {
  const channels = new Map<string, ChannelState>();
  for (const e of events) {
    if (e.type === 'ChannelVerified') {
      channels.set(e.channelId, { owner: e.owner, state: 'verified', controlTakenAt: null });
    }
    if (e.type === 'ChannelControlTaken') {
      const existing = channels.get(e.channelId);
      if (existing) {
        existing.state = 'creator-controlled';
        existing.controlTakenAt = e.blockTimestamp;
      }
    }
  }
  return channels;
}

// Fold channel escrow balances
function foldChannelEscrow(events: ChannelEscrowEvent[]): Map<string, { balance: bigint, totalDeposited: bigint, totalWithdrawn: bigint }> {
  const escrows = new Map();
  for (const e of events) {
    const entry = escrows.get(e.channelId) ?? { balance: 0n, totalDeposited: 0n, totalWithdrawn: 0n };
    if (e.type === 'Deposited') {
      entry.balance += e.amount;
      entry.totalDeposited += e.amount;
    }
    if (e.type === 'Withdrawn') {
      entry.balance -= e.amount;
      entry.totalWithdrawn += e.amount;
    }
    escrows.set(e.channelId, entry);
  }
  return escrows;
}

// Discover content-funding contracts from factory events
function foldCreatorContracts(events: CreatorAssuranceContractCreatedEvent[]): Map<address, CreatorContractInfo> {
  const contracts = new Map();
  for (const e of events) {
    contracts.set(e.contractAddress, {
      channelId: e.channelId,
      creator: e.creator,
      isThirdParty: e.isThirdParty,
    });
  }
  return contracts;
}
```

### Per-platform address configuration

The indexer needs to watch contract addresses from every known platform deployment. The same [UI configuration](README.md#ui-configuration) that lists known platform contract sets also tells the indexer which addresses to watch. For each platform deployment, the indexer watches:

- The **factory** address — for `CreatorAssuranceContractCreated` events
- The **content registry** address — for `ContentItemRegistered`, `ContentItemReleased`
- The **channel registry** address — for `ChannelVerified`, `ChannelControlTaken`, `ContractVetoed`
- The **channel escrow** address — for `Deposited`, `Withdrawn`
- Each **creator assurance contract** discovered from factory events — for the standard LazyGiving events

When a new platform deployment is added to the UI configuration (e.g., someone deploys Bluesky contracts), the indexer starts watching the new addresses. When a platform deployment is superseded (`validUntil`), the indexer keeps watching the old addresses (old contracts still operate) but the UI stops creating new contracts through the old factory.

### Cross-cutting SDK queries

These orchestrate across multiple fold results to answer UI-level questions:

- **`getChannelOverview(channelId)`** — combines channel state, escrow balance, all contracts for that channel (from factory events), and content items across those contracts. This is what the creator landing page needs.
- **`getContentItemStatus(contentId)`** — looks up the content registry to find the active contract (if any), then folds that contract's events for funding progress. Used by the "is this content item already funded?" check.
- **`getContractsForChannel(channelId)`** — filters factory events by channel ID, then folds each contract's events. Returns a list of contracts with their status, funding progress, and whether they were third-party-created. Used by both the channel page and the creator management view.
- **`getVetoableContracts(channelId)`** — for a creator-controlled channel, returns third-party contracts still within the veto window. Combines factory events (to find third-party contracts) with channel state (to get `controlTakenAt` and compute the window).

These follow the same pattern as `getAllAlignedProjectsForCause` — cross-entity queries built from multiple fold results, no indexer federation needed.

### Scale considerations

**Will there be too many content items to fold efficiently?** Probably not at the scale we're looking at. Consider:

- Each content item generates one `ContentItemRegistered` event (and possibly one `ContentItemReleased` if the contract fails).
- The number of content items is bounded by the number of assurance contracts times the average items per contract. Even if there are 1,000 contracts with 10 items each, that's 10,000 registry events — trivially foldable.
- Per-contract events (buys, sells, etc.) are already handled by the existing LazyGiving fold functions, which work at the individual-contract level. No cross-contract folding needed for those.

The one query that could get expensive at scale is "show me all content items by creator X across all their contracts." This requires discovering all contracts for a creator (from factory events) and then folding each contract's events. But this is the same pattern as `getAllAlignedProjectsForCause` — known to be fine at modest scale, with the same optimization options (multicall, batch endpoints, resumable folds) available if it grows.

**Bottom line:** the event-cache-and-fold architecture works here. No need for eager indexing or pre-computed aggregates at the expected scale.

## Reaching creators

Reaching creators whose content has been funded is an *action*, not a *query* — it doesn't fit the client-side fold pattern. See [channel-claiming.md](channel-claiming.md) for the full creator outreach and onboarding strategy (fan-driven outreach, automated notification, claim landing page).
