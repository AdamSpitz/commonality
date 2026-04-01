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

## Reaching creators

The one piece that doesn't fit the client-side fold pattern is **reaching creators whose content has been funded**. This is fundamentally different from the other indexer work — it's an *action* (get a creator's attention), not a *query* (what's the current state?).

### Fan-driven outreach (MVP)

The fan who created the contract is the best person to notify the creator. They already follow the creator, they're motivated, and they won't get spam-flagged. The system's job is to make it trivially easy for them to do the outreach.

When a fan creates a contract for unclaimed content, the UI should:

1. Generate a **shareable claim link** for the creator's channel landing page.
2. Provide a **suggested message** the fan can copy-paste or adapt: *"Hey @creator, I funded your thread on housing policy — supporters have pooled $X for your work. Claim it here: [link]"*
3. Surface the share action prominently in the post-creation flow — this is not a buried "share" button, it's the natural next step after creating a contract.

This approach is the cheapest (no API dependencies), the most organic (comes from someone the creator recognizes), and the most honest (the fan is telling the creator what they did, not the system spamming them).

### Automated notification (future)

A server-side notification service can supplement fan-driven outreach for high-value unclaimed content. It would watch for `ContentItemRegistered` events, resolve the canonical ID to a platform identity, and reach out via available channels (Twitter reply/DM, public email for Substack/YouTube creators, in-app notification if they're already a user).

This is a separate lightweight service — it doesn't need the full event cache infrastructure, just a watcher on one event type. But it should come after the fan-driven approach is proven, because automated outreach from an unknown system risks looking like spam. A message from a fan the creator recognizes is worth ten automated DMs.

### The claim landing page

The claim link points to a per-channel landing page that serves as the guided onboarding funnel. The full onboarding flow is specified in [channel-claiming.md](channel-claiming.md) — here we describe the data requirements.

The landing page needs to present:

- **Above the fold**: "People pooled $X because they liked your work." Nothing else required at first glance — no mention of contracts, tokens, escrow, or blockchain. Just the money and the reason.
- **Progressive disclosure**: Which specific content items were funded, how much each, what the attesters said about why. The creator can drill in if they're curious, but the top-level message stands on its own.
- **Claim action**: A single "claim these funds" button that kicks off identity verification and payout. Wallet creation happens behind the scenes unless the creator opts into self-custody (see custodial bridge in [channel-claiming.md](channel-claiming.md)).

The landing page is fully browsable without connecting a wallet or signing anything. The creator should be able to see everything about their funded content before being asked to take any action.
