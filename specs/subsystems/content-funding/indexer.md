# Content Funding — Data Architecture

## Can we use the same "store events and fold them" architecture?

Yes. Content funding fits naturally into the existing thin event cache + SDK fold architecture. Each platform's contracts (content registry, channel registry, creator assurance contracts) emit events; those events go into the same `events` table; the SDK gets fold functions for content-funding entities.

Since contracts are deployed [per-platform](README.md#per-platform-deployment), the event cache needs to watch contract addresses from each platform's deployment. The UI configuration that lists known platform contract sets also tells the indexer which addresses to watch.

### New events to capture

| Contract | Events |
|---|---|
| Content registry | `ContentItemRegistered`, `ContentItemReleased` |
| Channel registry | `ChannelClaimed` |
| Creator assurance contracts | Same events as Pubstarter contracts (`ERC1155Bought`, `ERC1155Sold`, etc.) — they *are* Pubstarter contracts |

Creator assurance contracts are a specialization of `MultiERC1155AssuranceContract`, so they emit the same events. The existing Pubstarter event handlers and fold functions already handle them. The only new event types are from the content registry and channel registry.

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

// Fold channel claims
function foldChannelClaims(events: ChannelClaimedEvent[]): Map<string, address> {
  const channels = new Map<string, address>();
  for (const e of events) {
    channels.set(e.channelId, e.owner);
  }
  return channels;
}
```

### Scale considerations

**Will there be too many content items to fold efficiently?** Probably not at the scale we're looking at. Consider:

- Each content item generates one `ContentItemRegistered` event (and possibly one `ContentItemReleased` if the contract fails).
- The number of content items is bounded by the number of assurance contracts times the average items per contract. Even if there are 1,000 contracts with 10 items each, that's 10,000 registry events — trivially foldable.
- Per-contract events (buys, sells, etc.) are already handled by the existing Pubstarter fold functions, which work at the individual-contract level. No cross-contract folding needed for those.

The one query that could get expensive at scale is "show me all content items by creator X across all their contracts." This requires discovering all contracts for a creator (from factory events) and then folding each contract's events. But this is the same pattern as `getAllAlignedProjectsForCause` — known to be fine at modest scale, with the same optimization options (multicall, batch endpoints, resumable folds) available if it grows.

**Bottom line:** the event-cache-and-fold architecture works here. No need for eager indexing or pre-computed aggregates at the expected scale.

## Reaching creators

Reaching creators whose content has been funded is an *action*, not a *query* — it doesn't fit the client-side fold pattern. See [channel-claiming.md](channel-claiming.md) for the full creator outreach and onboarding strategy (fan-driven outreach, automated notification, claim landing page).
