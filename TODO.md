# What we've been working on lately

---

Main thing I want to work on next:
  - Implement the content-funding system. Smart contracts and tests done; reviewed; issues listed below. Still need to fix those issues, and also implement whatever needs to be done in the indexer, and write the ui. Note that the ui needs some new components and also some changes to existing components - e.g. when looking at a pubstarter assurance contract, check to see whether it's a content-funding assurance contract and then show it specifically as such.

### Content-funding smart contract issues (from review)

**Critical: No access control (3 contracts)**

- `ContentRegistry.registerContent` and `releaseContent` are callable by anyone. An attacker can squat content IDs or release content from legitimate contracts. Needs Ownable or similar.
- `ChannelRegistry.setVerifier` and `setFactory` are callable by anyone. An attacker can replace the verifier with one that always returns true, then verify any channel to themselves. Needs Ownable or similar.
- `CreatorAssuranceContractFactory.setThirdPartyMinPurchase` is callable by anyone. Needs Ownable or similar.

**Bug: Escrow recipient path is dead code (CreatorAssuranceContractFactory.sol:122-123)**

`isVerified` (from ChannelRegistry) returns true for both Verified and CreatorControlled states. The earlier check on line 106 already reverts if the channel is Unclaimed. So by line 122, `isVerified` is always true — the `recipient = address(channelEscrow)` branch never executes. Funds always go directly to the channel owner. This contradicts the spec's intent that fans can fund unverified creators via escrow through the factory. Fix the condition or rethink the flow.

**Bug: Dead code in `takeChannelControl` (ChannelRegistry.sol:145-147)**

The check `_channelStates[channelId] == CreatorControlled` is unreachable because the prior check `!= Verified` already catches CreatorControlled and reverts with `ChannelNotVerified`. The `ChannelAlreadyCreatorControlled` error is never emitted. Remove the dead branch or restructure the checks.

**Bug: Wrong error in `setFactory` (ChannelRegistry.sol:106)**

Reverts with `InvalidVerifierAddress()` instead of a factory-specific error.

**Design: `canCreateContract` is inverted and unused**

Returns true for Unclaimed channels and false for CreatorControlled. The factory doesn't call it. Either fix the logic and use it, or remove it.

**Test gaps**

- `vetoContract` is untested (the "veto flow" integration test never actually calls it)
- `releaseContentOnFailure` is untested
- Nonce reuse prevention is untested
- No access control tests (because there's no access control to test — add tests after fixing)
- The escrow deposit test is noisy (includes unrelated failed verifyChannel calls)

Other big things to do soon:
  - Do we have the "subjectiv" thing specced out enough for you to be ready to implement it? If so, take a crack at it; if not, let's talk about what remains to be figured out. (See specs/subsystems/subjectiv/README.md.) Then implement it.
  - Figure out the seed statements.
  - Figure out the seed statements. (We've started, but then we realized that content-funding and in particular noninflammatory-content funding was a major use case, so we got sidetracked into that. Once we have the content-funding system MVP built, go back to writing up seed statements.)
  - Generate a proliferation of similar statements around the seed statements. Use an LLM *once* to pre-generate evaluations of all the S1 -> S2 implication candidates, then store those statements and those evaluations as another pre-generated data to be used in the fake-data simulations.
  - Switch the fake-data-simulation stuff so that it uses the seed statements and the proliferation of similar stuff, so that even when I'm looking locally at the fake-data-generation simulation, I'm seeing the seed stuff, not those less-sophisticated statements I generated and put into universe.json a long time ago - those can be deleted once we're using the real seed content.
  - Make sure the attester and finder seem viable. (Get them into the docker-compose setup? Make sure they're using the pre-generated stuff, not spending LLM credits every time I run the tests.)
  - Merge specs/motivation with the wider specs directory? (Sort-of a prerequisite for writing the documentation; I want to get all the ideas clear first.)
  - Write the documentation and AI skills.
  - Audit the smart contracts using a more-competent AI. (Still doesn't replace a real auditing by competent humans, but it's better than nothing and much easier. Also, I suspect that most of these contracts are simple enough that I can probably get them right without too much trouble.)
  - Do I trust the UI? No.

  - The issues in the different workspaces' TODO.md files (see below).
  - Fix the problem where I start up the simulation but then I don't actually see the IPFS content in the web browser. (Is the IPFS content not making it into the dockerized IPFS node? Or is it not being fetched properly by the UI? Or what?)
  - (Not a task for AI.) Can I try out conceptspace manually? e.g. Start up docker-compose locally, maybe do some fake-data generation to populate the system with a bunch of data, and then look at the UI through my web browser?
  - (Not a task for AI.) I need to do a big code review myself, of the whole thing. I don't trust it.

Ideas from the specs/motivation stuff:
  - Bridges to tradfi. This is definitely out of scope for the MVP, but it's worth thinking about.

Ideas from seed-content work:
  - Think about orthogonal hierarchy dimensions — geographic and topical. Statements like "I'm interested in improving Grey County" and "I'm interested in furthering crypto adoption" are independent axes, and their conjunction ("further crypto in Grey County") creates a more specific interest. This matters for funding portal discovery (a project at the intersection should show up in both parent portals) and for delegatable note intents. These are just regular statements in plain English with implication links to both parents. See seed-content.md for more detail.

---

## Miscellaneous TODO.md files

- [ui/TODO.md](ui/TODO.md)
