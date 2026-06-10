# Content-funding notification indexer

This note names the off-chain indexer responsibilities that support the content-funding channel-claiming flow.

## Responsibilities

- Watch content-registry, channel-registry, channel-escrow, and creator-factory events.
- Maintain queryable channel state: unclaimed, verified, or creator-controlled.
- Expose pending funds and claimable escrow balances by canonical channel ID.
- Surface newly funded content so creators can be notified that money is waiting for them.

## Current implementation direction

The general Commonality event cache/indexer is the intended substrate. This is not a separate blockchain protocol; it is the content-funding projection that the platform API and UI read when showing claim prompts, creator dashboards, and notification opportunities.

## Out of scope

The indexer does not decide ownership. Channel verification remains on-chain via the verifier-signed proof flow described in [`channel-claiming.md`](./channel-claiming.md).
