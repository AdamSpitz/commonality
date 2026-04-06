# What we've been working on lately

## Main thing I want to work on next

  - Implement the content-funding system. Smart contracts are implemented and tested (though I wouldn't mind doing another review). Still need to implement the indexer integration and the UI. Note that the ui needs some new components and also some changes to existing components - e.g. when looking at a pubstarter assurance contract, check to see whether it's a content-funding assurance contract and then show it specifically as such.
    - Spec-alignment follow-up from the recent canonicalization changes:
      - Update the on-chain content-funding factory flow so the caller supplies the canonical channel ID plus content-specific suffixes, and the factory constructs the full canonical content IDs on-chain before hashing/registering them. The current implementation still accepts opaque pre-hashed `contentIds`, so it can't enforce the new "content IDs embed channel IDs" rule.
      - Make the registry/factory emit the plaintext canonical content IDs in the event path that off-chain consumers actually watch. Right now the registry only emits `ContentRegistered(contentId, assuranceContract)` and the contract-local `registerContentItem()` event is disconnected from creation.
      - Reject `bytes32(0)` channel IDs and verify that the supplied canonical channel string hashes to the channel ID used with `ChannelRegistry`, so we don't keep the current zero-ID bookkeeping bug while adding canonical strings.
      - Update the Hardhat content-funding tests around contract creation, duplicate detection, and emitted events so they cover the new channel-prefixed content ID construction.
      - Add the shared SDK content-funding canonicalization helpers from the spec: strict Twitter/X, YouTube, and Substack URL parsing that extracts content-specific suffixes and rejects ambiguous inputs.
      - Add the backend author/channel-prefix resolution layer for Twitter and YouTube, with caching of resolved platform API lookups. The spec now assumes the same backend used for channel claiming also resolves and caches the stable channel prefixes needed to build content IDs.
      - Wire the future content-funding UI creation flow to that resolver/cache so it validates "this URL belongs to this channel" before submitting a contract.
      - Implement the indexer/SDK content-funding event handling described in the spec, using the plaintext canonical IDs from events to power channel pages and contract views.
    - Smart contract audit follow-up:
      - Add an on-chain check that every `contentId` in a creator contract actually belongs to the supplied `channelId`. Right now channel authorization is enforced, but the factory never proves that the content being registered belongs to that channel, which means an attacker can lock someone else's content by creating a contract under some other channel.
      - Fix the third-party veto bypass. Right now a third party can choose a threshold equal to their required initial purchase, making the contract succeed inside `createContract()` and become immediately non-vetoable, which defeats the whole "creator can cancel underpriced fan-created contracts during the veto window" design.
      - Reject `bytes32(0)` as a channel ID (or otherwise stop using zero as the sentinel for "unknown contract"). Right now zero-channel contracts can get stored in `channelIdByContract`, but later cleanup/veto logic treats zero as "not created by the factory", which can strand registry entries.

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
  - Do another smart-contract audit pass after fixing the current content-funding findings. Current audit findings:
    - The content-funding factory does not validate that the supplied content items belong to the supplied channel.
    - Third-party contracts can be made to succeed during creation, bypassing the intended creator veto protection.
    - Zero channel IDs collide with the factory's "unknown contract" sentinel value and can break veto/failure cleanup bookkeeping.
  - Do I trust the UI? No.

  - (Not a task for AI.) Can I try out conceptspace manually? e.g. Start up docker-compose locally, maybe do some fake-data generation to populate the system with a bunch of data, and then look at the UI through my web browser?
  - (Not a task for AI.) I need to do a big code review myself, of the whole thing. I don't trust it.

Ideas from the specs/motivation stuff:
  - Bridges to tradfi. This is definitely out of scope for the MVP, but it's worth thinking about.

Ideas from seed-content work:
  - Think about orthogonal hierarchy dimensions — geographic and topical. Statements like "I'm interested in improving Grey County" and "I'm interested in furthering crypto adoption" are independent axes, and their conjunction ("further crypto in Grey County") creates a more specific interest. This matters for funding portal discovery (a project at the intersection should show up in both parent portals) and for delegatable note intents. These are just regular statements in plain English with implication links to both parents. See seed-content.md for more detail.
