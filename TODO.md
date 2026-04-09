# What we've been working on lately

## Main thing I want to work on next

## Other big things to do soon

  - Fix the live Subjectiv Playwright path and rerun it. The old `/status`/indexer-sync blocker appears fixed now; the current failure is earlier in startup, where `ui/e2e/subjectiv-flow.spec.ts` times out waiting for `window._setupTestWallet` because the page never exposes it (blank-page / app-boot or test-wallet-harness issue). If that e2e passes after fixing the harness/startup problem, Subjectiv MVP is probably done.
  - Figure out the seed statements. (We've started, but then we realized that content-funding and in particular noninflammatory-content funding was a major use case, so we got sidetracked into that. Now that we have the content-funding system MVP built, go back to writing up seed statements.)
  - Generate a proliferation of similar statements around the seed statements. Use an LLM *once* to pre-generate evaluations of all the S1 -> S2 implication candidates, then store those statements and those evaluations as another pre-generated data to be used in the fake-data simulations.
  - Switch the fake-data-simulation stuff so that it uses the seed statements and the proliferation of similar stuff, so that even when I'm looking locally at the fake-data-generation simulation, I'm seeing the seed stuff, not those less-sophisticated statements I generated and put into universe.json a long time ago - those can be deleted once we're using the real seed content.
  - Make sure the attester and finder seem viable. (Get them into the docker-compose setup? Make sure they're using the pre-generated stuff, not spending LLM credits every time I run the tests.)
  - Clarify/organize the documentation for different audiences. See DOCS.md.
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
