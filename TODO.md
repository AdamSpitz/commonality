# What we've been working on lately

## Main thing I want to work on next

  - Implement the content-funding system. Smart contracts, SDK folds, canonicalization, platform API service, and indexer integration are all implemented and tested. Still need to implement the UI and supporting pieces. Note that the UI needs some new components and also some changes to existing components - e.g. when looking at a pubstarter assurance contract, check to see whether it's a content-funding assurance contract and then show it specifically as such.
    - DONE: Indexer integration for content-funding events (ContentRegistry, ChannelRegistry, ChannelEscrow, CreatorAssuranceContractFactory). SDK now exports fold functions for content items, channel state, channel escrow balances, and creator contracts. Platform API service canonicalization helpers are already in the SDK.
    - DONE: Fix the third-party veto bypass. Third-party contracts on Verified channels now require threshold > initialPurchaseValue, preventing the contract from succeeding inside createContract() and bypassing the creator's veto window. Unclaimed channels don't have this restriction since there's no veto window.
    - DONE: Add the shared SDK content-funding canonicalization helpers from the spec: strict Twitter/X, YouTube, and Substack URL parsing that extracts content-specific suffixes and rejects ambiguous inputs.
    - DONE: Add the backend author/channel-prefix resolution layer for Twitter and YouTube, with caching of resolved platform API lookups. The spec now assumes the same backend used for channel claiming also resolves and caches the stable channel prefixes needed to build content IDs.
    - DONE: Wire the future content-funding UI creation flow to that resolver/cache so it validates "this URL belongs to this channel" before submitting a contract.
    - BUG: ChannelRegistry.sol vetoContract() does not emit the ContractVetoed event. The spec, indexer ABI, SDK event types, and indexer event handler all expect it, but the contract never emits it. The veto works functionally (calls cancel() on CancellableCondition) but produces no indexable event.
    - Minor: CreatorContractCreated event emits `erc1155` (token address) instead of `creator` (who called the factory) as the spec's indexer.md describes. SDK and indexer ABI match the contract, not the spec. The UI can't determine contract creator from events alone without looking at tx sender.
    - DONE: Cross-cutting SDK queries (getChannelOverview, getContentItemStatus, getContractsForChannel, getVetoableContracts) from the indexer spec are now implemented in the SDK as fold-orchestration helpers for the future UI.
    - DONE: Add content-funding contracts to the deployment script (hardhat/scripts/deploy.js) so local/testnet deployments now include `MockChannelVerifier`, `ContentRegistry`, `ChannelRegistry`, `ChannelEscrow`, and `CreatorAssuranceContractFactory`, wire the necessary ownership/factory links, and write the new addresses plus `CONTENT_FUNDING_START_BLOCK` into the shared env flow.
    - DONE: Add content-funding scenarios to the fake data generation pipeline so the UI can be developed against realistic data.
    - DONE: Browse Creators page (`/content/:platform`) — first content-funding UI slice. Includes all necessary SDK plumbing: content-funding ABIs in SDK, event decoders, `fetchAndFoldContentFundingState`, `getAllChannelOverviews`, `buildChannelCanonicalIdMap`, `extractChannelCanonicalIdFromContentCanonicalId`, contract address wiring in useMachinery.
    - DONE: Channel Page (`/content/:platform/:channelId`) — public-facing channel view with hero for unclaimed channels, content items list, contracts list, share/notify section.
    - DONE: Create Contract page (`/content/:platform/:channelId/new`) — form for creating a new funding contract.
    - TODO: Creator Dashboard (`/content/dashboard`) — management page for verified creators.
    - TODO: Integration with Pubstarter project detail page — content items section, channel info, attestations.
    - TODO: Integration with Funding Portal — recognize creator assurance contracts.
    - TODO: Replace the deployment-time `MockChannelVerifier` placeholder with a real on-chain verifier contract once the verification path is implemented end-to-end.

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
  - Do another smart-contract audit pass. Previous finding (third-party veto bypass) is fixed. The ContractVetoed event bug (see content-funding section above) should be fixed first.
  - Do I trust the UI? No.

  - (Not a task for AI.) Can I try out conceptspace manually? e.g. Start up docker-compose locally, maybe do some fake-data generation to populate the system with a bunch of data, and then look at the UI through my web browser?
  - (Not a task for AI.) I need to do a big code review myself, of the whole thing. I don't trust it.

Ideas from the specs/motivation stuff:
  - Bridges to tradfi. This is definitely out of scope for the MVP, but it's worth thinking about.

Ideas from seed-content work:
  - Think about orthogonal hierarchy dimensions — geographic and topical. Statements like "I'm interested in improving Grey County" and "I'm interested in furthering crypto adoption" are independent axes, and their conjunction ("further crypto in Grey County") creates a more specific interest. This matters for funding portal discovery (a project at the intersection should show up in both parent portals) and for delegatable note intents. These are just regular statements in plain English with implication links to both parents. See seed-content.md for more detail.
