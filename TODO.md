# What we've been working on lately

## Main thing I want to work on next

  - [Support multiple currencies](./specs/currency.md). Offchain code has been generalized, smart contracts have been updated... are we at "MVP functionality is ready" status?

  - Try having an AI read *only* the docs and see whether the project makes sense. Prompt: "Read BLINDFOLDED.md and whatever files it tells you to read, nothing else. Then take a look at the UI and see if you can figure out what this app is for. Does it all make sense? Could you help a new user understand what it's for, what he might want to use it for, and how to get started? How could the new-user experience be improved?"
  - The word "attester" appears in the UI. Either eliminate it or put a little info bubble or something next to it. (And other stuff like that. We want as little jargon as possible, and if it does appear we want it to be something the user can easily understand.)

## Other things to do soon

  - See [Multiple UI domains](specs/multiple-ui-domains.md).
    - Let's think through the details of how to create a "noninflammatory content funding" (or maybe just "content funding"?) site. e.g. What does the landing page look like? What else does the site contain? (A way to create a content contract... does it also have a way to view a content contract, or do we just leave that as functionality provided by the more-general pubstarter site, where it checks to see if the contract is a content contract and then displays it accordingly? Etc.) What does it *not* contain?
  
  - Have we implemented some way for content writers, or fans of content writers, to submit their channel (or at least particular posts) to the content finder services?

  - Fix the live Subjectiv Playwright path and rerun it. The old `/status`/indexer-sync blocker appears fixed now; the current failure is earlier in startup, where `ui/e2e/subjectiv-flow.spec.ts` times out waiting for `window._setupTestWallet` because the page never exposes it (blank-page / app-boot or test-wallet-harness issue). If that e2e passes after fixing the harness/startup problem, Subjectiv MVP is probably done.

  - Figure out the [seed content](/specs/subsystems/conceptspace/seed-content.md). (We've started, but then we realized that content-funding and in particular noninflammatory-content funding was a major use case, so we got sidetracked into that. Now that we have the content-funding system MVP built, go back to writing up seed statements.)
  - For the purpose of the fake-data simulations, use an LLM *once* to generate a proliferation of similar statements around the seed statements, as well as to pre-generate evaluations of all the S1 -> S2 implication candidates, then store those statements and those evaluations as another pre-generated data to be used in the fake-data simulations.
  - Switch the fake-data-simulation stuff so that it uses the seed statements and the proliferation of similar stuff, so that even when I'm looking locally at the fake-data-generation simulation, I'm seeing the seed stuff, not those less-sophisticated statements I generated and put into universe.json a long time ago - those can be deleted once we're using the real seed content.

  - Write the AI skills.
  - If the repeated SDK prebuild cost becomes annoying, consider a more monorepo-aware build setup so SDK-dependent workspaces don't redundantly rebuild the SDK.
  - In the UI, put a "post a GitHub issue" button.
  - Does the "finder" have any particular focus, like finding "commonality" statements (along the lines of the "coalition between the moderates on both sides" idea)? Maybe it should. (I'm not sure how necessary it'll be. Maybe a single finder can just keep on top of everything? But I kinda suspect that it might be valuable to have a "focus", like "watch for moderate statements on both sides and try to synthesize bridges between them".)
  - Implement the `foldVersion` idea described in our [indexer spec](specs/indexer/README.md). Then implement client-side storage (in localStorage?) of accumulators; blow away the accumulators when foldVersion changes.
  - How do we keep deployments (of all sorts of things: smart contracts, indexer, UI, various services like the attesters and finders and so on) from becoming unwieldy? It's probably not that big a deal - when deploying, just keep track of the info regarding where the code was deployed to and so on - but there are so many moving parts here that I'm starting to be intimidated.
  - Make sure to include the API docs.
  - Point an AI at the UI and tell it "go use this."
  - Have AI generate some YouTube videos and podcasts and so on. Marketing, social media presence, etc.

  - Do another smart-contract audit pass.
  - (Not a task for AI.) Try out the UI manually?
  - (Not a task for AI.) Do a big code review myself, of the whole thing. I don't trust it.

Founder-level stuff:
  - Think about orthogonal hierarchy dimensions for statements — geographic and topical. See [seed-content.md](./specs/subsystems/conceptspace/seed-content.md) for more detail.

Out of scope for the MVP, but I still want to remember that these are important and not done yet:
  - [Bridges](specs/bridges.md) to tradfi. This is definitely out of scope for the MVP, but it's worth thinking about.
