# What we've been working on lately

## Main thing I want to work on next

  - Implement the content-funding system. Architecture is complete (contracts, SDK, UI, platform API service, integrations all exist). Remaining work is bugs and functional gaps.
    - DONE: Smart contracts (ContentRegistry, ChannelRegistry, ChannelEscrow, CreatorAssuranceContract, CreatorAssuranceContractFactory).
    - DONE: SDK: events, folds, queries (getChannelOverview, getContentItemStatus, getContractsForChannel, getVetoableContracts, getAllChannelOverviews), actions, canonicalization (Twitter/X, YouTube, Substack).
    - DONE: Indexer integration, event decoders, deployment script, fake data generation.
    - DONE: All 4 UI pages: Browse Creators, Channel Page, Create Contract, Creator Dashboard.
    - DONE: Pubstarter project detail page integration (ContentFundingProjectSection).
    - DONE: Funding Portal integration (AlignedProjectCard recognizes content-funding contracts).
    - DONE: Fix third-party veto bypass, add ContractVetoed event, change CreatorContractCreated to emit `creator` instead of `erc1155`.
    - DONE: `ChannelRegistryAbi` (sdk/abis/ChannelRegistryAbi.ts) is missing the `vetoContract` function definition. The veto action from the Creator Dashboard will fail at runtime because the function isn't in the ABI.
    - DONE: SDK `vetoContract` action (sdk/src/subsystems/content-funding/actions.ts:253) passes `[channelId, contractAddress]` but the contract's `vetoContract(address)` takes only one argument. The channelId arg needs to be removed.
    - DONE: Creator Dashboard (ui/src/content-funding/pages/CreatorDashboardPage.tsx:276) shows ALL verified channels in the system, not just the connected wallet's. The `ch.channel.state === 'verified'` filter should also require `ch.channel.owner?.toLowerCase() === address.toLowerCase()`.
    - DONE: ContentFundingProjectSection (ui/src/content-funding/components/ContentFundingProjectSection.tsx:151) hardcodes `/content/twitter/` in the channel page URL instead of extracting the platform from the canonical channel ID.
    - DONE: `actions.ts` `parseContentUrl` duplicates the canonicalization logic already in `canonicalization.ts`. Should reuse `parseContentFundingUrl` instead.
    - DONE: Platform API Service (platform-api-service/). Express backend with `/resolve/channel`, `/resolve/content`, `/verify/challenge`, `/verify/confirm`. Twitter and YouTube clients, in-memory caching, rate limiting, verification proof signing, optional on-chain tx submission. See platform-api-service/README.md.
    - DONE: Implement the Claim Flow UI (spec: specs/subsystems/content-funding/ui.md#claim-flow). Added verification modal with tweet-based verification flow, connected to Platform API Service. The "Claim these funds" button is now enabled for unclaimed channels. Still missing: embedded wallet provisioning for non-crypto-native creators, and integrated off-ramp for fiat withdrawal.
    - DONE: Wire the UI's Create Contract page to use the Platform API Service's `/resolve/content` endpoint for author validation, instead of client-side-only URL parsing.
    - DONE: Replaced `MockChannelVerifier` with real `ChannelVerifier` contract using OpenZeppelin ECDSA + MessageHashUtils. Verifies EIP-191 signed proofs from the Platform API Service's trusted verifier EOA. Deploy script now deploys the real verifier (deployer = trustedVerifier), fake-data generation signs real proofs, and `VERIFIER_PRIVATE_KEY` is written to .env for local dev.
    - DONE: BUG: SDK `actions.ts:111-124` — `createContentFundingContract` casts event args as `{ contractAddress, erc1155, isThirdParty }` but the event was changed to emit `creator` instead of `erc1155`. Result: `erc1155Address` is undefined, `channelId`/`creator` not extracted. Fix: update the cast to match the actual event fields.
    - DONE: BUG: SDK `actions.ts:63-72` — initial purchase value calculation is broken. Tries to match `initialPurchaseTokenIds` (content ID hashes, huge numbers) against content suffixes (tweet IDs, video IDs) via string comparison. They will never match, so `actualInitialPurchaseValue` is always 0, causing `InitialPurchaseValueMismatch` revert on any third-party contract creation. Fix: match by index position (the token IDs correspond 1:1 to content items) or compute the value from prices and counts directly.
    - DONE: BUG: `ClaimFlowModal` / `useClaimFlow` — `getChallenge('twitter')` only sends `{ platform }` to the `/verify/challenge` endpoint, but the Platform API Service requires `platform`, `handle`, and `claimantAddress`. Will fail with 400. Fix: pass the channel's Twitter handle and the connected wallet address through to the API call.
    - DONE: BUG: `fetchAndFoldContentFundingState` (queries.ts) doesn't decode `ContractVetoed` events — the switch statement has no case for it. Result: vetoed contracts show as "active" instead of "vetoed" in all UI views. Fix: add a `ContractVetoed` case, collect those events, and pass them through to the query layer as `vetoedEvents`.
    - DONE: BUG: Creator Dashboard withdraw button only appears for creator-controlled channels (CreatorDashboardPage.tsx:154). Spec says verified creators (State 2) can also withdraw from escrow. Fix: show withdraw button when `channel.state === 'verified' || channel.state === 'creator-controlled'`.
    - Minor: `useClaimFlow` sends requests to `/api/platform-api/...` (assuming a dev proxy), while `usePlatformApi` hits `VITE_PLATFORM_API_URL` directly. Should be consistent.
    - Gap: Claim flow modal doesn't include inline withdraw or take-control steps (spec Steps 3-4). Currently just says "go to dashboard." Not blocking but doesn't match spec's intended flow.
    - Gap: No content attestation badges shown in Channel Page or Pubstarter integration (spec calls for attester pass/fail badges per content item). Depends on content attester infrastructure existing.
    - Gap: No platform embed previews (embedded tweets, YouTube thumbnails) — just text links. Spec wants inline previews on Channel Page and Create Contract Page.
    - Gap: Create Contract success state doesn't show shareable claim link or suggested creator notification message (spec says this is the primary creator acquisition flow).
    - Future: Embedded wallet provisioning for non-crypto creators (referenced in spec, not implemented).
    - Future: Integrated off-ramp for fiat withdrawal (referenced in spec, not implemented).
    - Future: ENS-based verification (infrastructure exists in sdk/src/utils/twitter.ts, deferred).
    - Future: Additional platform verifiers beyond Twitter (YouTube video-description, Bluesky DID).

## Other big things to do soon

  - Subjectiv MVP is now implemented: `TrustRegistry` exists, the SDK can compute a transitive trusted set, the funding portal uses that trusted set for alignment filtering, Settings now has a direct-trust UI, and the UI now rehydrates cached trusted sets from IndexedDB on startup. What's left to do:
    - Make a true browser-level Subjectiv e2e test later. Higher-level UI integration coverage now exists for the direct-trust settings flow plus funding-portal and leaderboard trust-network filtering.
      - Current status: a Playwright Subjectiv e2e spec now exists in `ui/e2e/subjectiv-flow.spec.ts`, and the local Playwright/browser install plus e2e Docker harness were partially repaired, but the run is still blocked because the freshly started Ponder indexer reports healthy while `waitForIndexerToSyncToTxHash()` never advances past block 0 in this startup path.
  - Figure out the seed statements. (We've started, but then we realized that content-funding and in particular noninflammatory-content funding was a major use case, so we got sidetracked into that. Once we have the content-funding system MVP built, go back to writing up seed statements.)
  - Generate a proliferation of similar statements around the seed statements. Use an LLM *once* to pre-generate evaluations of all the S1 -> S2 implication candidates, then store those statements and those evaluations as another pre-generated data to be used in the fake-data simulations.
  - Switch the fake-data-simulation stuff so that it uses the seed statements and the proliferation of similar stuff, so that even when I'm looking locally at the fake-data-generation simulation, I'm seeing the seed stuff, not those less-sophisticated statements I generated and put into universe.json a long time ago - those can be deleted once we're using the real seed content.
  - Make sure the attester and finder seem viable. (Get them into the docker-compose setup? Make sure they're using the pre-generated stuff, not spending LLM credits every time I run the tests.)
  - Merge specs/motivation with the wider specs directory? (Sort-of a prerequisite for writing the documentation; I want to get all the ideas clear first.)
  - Write the documentation and AI skills.
  - If the repeated SDK prebuild cost becomes annoying, consider a more monorepo-aware build setup so SDK-dependent workspaces don't redundantly rebuild the SDK.
  - Do another smart-contract audit pass. Previous findings (third-party veto bypass, ContractVetoed event) are fixed.
  - Do I trust the UI? No.

  - (Not a task for AI.) Can I try out conceptspace manually? e.g. Start up docker-compose locally, maybe do some fake-data generation to populate the system with a bunch of data, and then look at the UI through my web browser?
  - (Not a task for AI.) I need to do a big code review myself, of the whole thing. I don't trust it.

Ideas from the specs/motivation stuff:
  - Bridges to tradfi. This is definitely out of scope for the MVP, but it's worth thinking about.

Ideas from seed-content work:
  - Think about orthogonal hierarchy dimensions — geographic and topical. Statements like "I'm interested in improving Grey County" and "I'm interested in furthering crypto adoption" are independent axes, and their conjunction ("further crypto in Grey County") creates a more specific interest. This matters for funding portal discovery (a project at the intersection should show up in both parent portals) and for delegatable note intents. These are just regular statements in plain English with implication links to both parents. See seed-content.md for more detail.
