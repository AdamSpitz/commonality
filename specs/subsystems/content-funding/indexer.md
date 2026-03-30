# Content Funding — Data Architecture

## Can we use the same "store events and fold them" architecture?

Yes. Content funding fits naturally into the existing thin event cache + SDK fold architecture. The new contracts (content registry, creator assurance contracts) emit events; those events go into the same `events` table; the SDK gets fold functions for content-funding entities.

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

## The notification service

The one piece that doesn't fit the client-side fold pattern is the **creator notification service**: watching for `ContentItemRegistered` events and proactively reaching out to creators whose content has been registered.

This is a server-side process, not a client-side fold. It needs to:

1. Watch for `ContentItemRegistered` events (from the event cache or directly from the chain).
2. Resolve the canonical ID to a platform URL (the plaintext canonical ID is in the event data).
3. Figure out who the creator is (platform API, scraping, manual lookup).
4. Notify the creator (DM, email, in-app notification if they're already a user).

This is fundamentally different from the other indexer work — it's an *action* (send a notification), not a *query* (what's the current state?). It's more like a bot or a webhook handler than an indexer.

It can be a separate lightweight service. It doesn't need the full event cache infrastructure — it just needs to watch one event type from one contract and do something when it fires. A simple chain-watcher or even an event subscription would suffice.

### Reaching creators who aren't on the platform

The hard part isn't the on-chain mechanics — it's reaching a creator who may have no idea this system exists. 

Options:

- **Twitter/X DM or reply**: If the canonical ID is a tweet, reply to it or DM the author. Requires API access and risks being flagged as spam.
- **Email**: If the creator has a public email (common for Substack authors, YouTubers). Less intrusive.
- **Community-driven**: Surface "unclaimed funded content" in the UI and let the community reach out. The least automated but the most organic.

Start with the community-driven approach (cheapest, no API dependencies) and add automated notifications for specific platforms as needed.

The "unclaimed funded content" page is critical to the adoption funnel. When a community member shares a link with a creator saying "hey, someone wants to fund your work," the landing page needs to:
- Clearly explain what happened ("supporters have pooled $X to fund your content")
- Walk the creator through the system without jargon or crypto-native assumptions
- Show the current claim state: escrowed funds, active pre-claim contracts, and whether a veto window will open after claim
- Make the whole thing feel legitimate and non-seedy — remember, most creators will be encountering anything crypto-related with skepticism
- Provide a simple path to claiming (wallet creation or connection, ENS setup, verification, channel claim, fund withdrawal)
- Sponsor gas and setup costs where possible, because the claim flow is otherwise too easy to abandon halfway through
- Allow the creator to stop and resume later without losing visibility into the funds or claim status
- Show which specific content items are being funded and why (link to the attester explanations)
