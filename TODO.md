# What we've been working on lately

## Main thing I want to work on next

  - Content-funding system: core implementation exists, but the MVP is **not** competently done end-to-end yet (see [spec](./specs/subsystems/content-funding/README.md)).
    - Smart contracts (ContentRegistry, ChannelRegistry, ChannelEscrow, CreatorAssuranceContractFactory) — implemented with tests and deployment scripts.
    - Content attester infrastructure (`attester-core/`, `content-attester/`, three noninflammatory docker-compose instances) — implemented.
    - Platform API service — implemented for channel resolution, content resolution, and Twitter claim-proof signing / optional on-chain submission. Supports Twitter + YouTube resolution/content lookup and Substack canonicalization.
    - Indexer / SDK — content-funding events, folds, queries, and actions are implemented and tested.
    - The refactoring of the old `attester/` code onto `attester-core/` is done, and the directory has been renamed to `implication-attester/`.
    - What is still wrong / incomplete:
      - (DONE) Fix the creator claim flow UI. The current `ClaimFlowModal` / `useClaimFlow` integration does not match the platform API response shapes, starts unclaimed channels on the wrong step, and passes a stable ID where the backend expects a Twitter handle.
      - (DONE) Fix verified-creator contract creation. On a merely `verified` channel, the UI currently treats even the real creator as a third party, which incorrectly forces the minimum initial purchase path instead of allowing creator-created contracts.
      - (DONE) Fix create-contract validation. The UI should require successful `/resolve/content` results, verify that each resolved author matches the channel, and check/prevent already-registered content items before submission instead of mostly relying on on-chain reverts.
      - (DONE) Fix content-funding UI polish/accuracy gaps: the Pubstarter integration now shows the correct "Escrowed Balance" value (channel.escrow.balance instead of contract.project.totalReceived).
      - Tighten content-attestation display so the UI can show known attesters coherently instead of only the latest fetched attestation per content item.
      - (DONE) Add focused unit/integration coverage for the content-funding UI; `CreateContractPage` now has focused UI coverage for the verified-creator path, mismatched resolved content rejection, already-registered content rejection, and unclaimed-channel third-party minimum-purchase enforcement.
      - (DONE) Surface already-registered content status immediately after content resolution in the create-contract form, rather than only blocking at submit time.
    - Future non-MVP work:
      - Embedded wallet provisioning for non-crypto creators (referenced in spec, not implemented).
      - Integrated off-ramp for fiat withdrawal (referenced in spec, not implemented).
      - ENS-based verification (infrastructure exists in `sdk/src/utils/twitter.ts`, deferred).
      - Additional platform verifiers beyond Twitter (YouTube video-description, Bluesky DID, Substack email/DNS). Twitter is the only platform with a real verification flow; YouTube and Substack verification are deferred.
      - Run the live content-funding Playwright flow (`cd ui && npx playwright test content-funding-flow`) and then expand it beyond the current tracer-bullet contract-creation/browse check. (NOTE: we've had trouble getting the e2e tests to work; leave this for later.)

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
