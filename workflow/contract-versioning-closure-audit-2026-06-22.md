# Contract-versioning closure audit — 2026-06-22

Scope: close out the long-running TODO item for pre-mainnet contract-versioning prep around multiple immutable deployments, especially restarted onchain auto-increment IDs.

## Verdict

The auto-increment-ID collision work is effectively complete for the currently wired product surfaces.

Remaining contract-versioning work should no longer be tracked as one giant TODO. The remaining concerns are separate follow-up categories:

1. Class-1 log contract query helpers (`Beliefs`, `Implications`, `AlignmentAttestations`, `TrustRegistry`, `MutableRefUpdater`) still commonly query the current configured contract address. That is not an ID-collision problem, but a future v2 of those opinion/attestation logs should be handled by fetching/merging same-name events across indexed versions, as was done here for DelegatableNotes / NoteIntent / content-funding / LazyGiving factory events.
2. Mainnet governance/timelock decisions for owner levers are still separate product/security work.
3. Operational v2 playbook validation should happen when we actually add a second deployment to the manifest.

## What was checked

Searched SDK/UI/service code for bare auto-increment ID use around:

- `noteId`
- `pledgeId`
- `contentId`
- `saleListingId` / `buyOrderId`
- related route keys, React keys, caches, action paths, scheduler paths, and event fetch helpers

Representative checks:

- `rg "get(SaleListing|BuyOrder|Note|DelegationChain|StandingPledge|ContentItemStatus|ContentItem)\\(|pledgeId\\}|noteId\\}|listingId\\}|orderId\\}|contentId\\}" ui/src sdk/src service-host/src --glob '!**/*.test.*'`
- `rg "const key = .*\\.(noteId|pledgeId|listingId|orderId|contentId)|key=\\{.*\\.(noteId|pledgeId|listingId|orderId|contentId)|\\[.*\\.(noteId|pledgeId|listingId|orderId|contentId)\\]|Map<.*(noteId|pledgeId|listingId|orderId|contentId)|\\.get\\(.*(noteId|pledgeId|listingId|orderId|contentId)" ui/src sdk/src service-host/src --glob '!**/*.test.*'`
- `rg "contractAddress: machinery.contractAddresses!|contractAddress: contracts\\.|contractAddress: machinery.contractAddresses\\?" sdk/src/utils/eventCacheClient.ts sdk/src/subsystems --glob '!**/*.test.*'`

## Closure fixes made in this pass

- SDK event fetch helpers now fetch merged event streams by event name for the version-sensitive Class 2/3 surfaces that already have scoped fold keys:
  - LazyGiving factory creation events are fetched by event name + project topic, not only the current factory address.
  - DelegatableNotes events are fetched by event name across indexed DelegatableNotes versions, not only `contractAddresses.delegatableNotes`.
  - NoteIntent events are fetched by event name/topic across indexed NoteIntent versions.
  - Content-funding events are fetched by event name across indexed ContentRegistry / ChannelRegistry / ChannelEscrow / creator-factory versions.
- `getAllProjectAddresses()` and `getUserTokenBurns()` now discover LazyGiving projects from all indexed factory-version creation events instead of only the current configured factory.

## ID-collision status by subsystem

- Secondary market: done. Fold keys, UI row/input/action state, and fulfillment transactions use `(marketplaceAddress, listing/order id)`.
- Delegatable notes: done. Folds, public records, route links, detail loading, note-intent lookups, My Notes actions, note-funded purchases, and contribution-chain grouping preserve `(noteContract, noteId)`.
- Recurring pledges: done. Folds, public records, UI cancellation, and scheduler fundability/execution preserve `(recurringPledges contract, pledgeId)`.
- ContentRegistry: done. Folds, public records/status, content-funding UI keys, and duplicate active-registration checks preserve `(contentRegistryAddress, contentId)`.
- LazyGiving projects/tokens: no restarted bare-ID collision found in current flow. Project identity is the assurance contract address; token IDs are scoped by the per-project ERC-1155/project address in folds/actions.

## Checks run

- `npm run test --workspace=@commonality/sdk` — 316 passing
- `npm run typecheck --workspace=@commonality/sdk`
- `npm run lint --workspace=@commonality/sdk`
- LSP diagnostics clean for `sdk/src/utils/eventCacheClient.ts`
