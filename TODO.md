# What we've been working on lately

## Main thing I want to work on next

  - Get the local dockerized deployment stuff to work properly on MacOS, not just Linux.
  - Remove GraphQL? I don't think we're using it, but there's someplace where we keep seeing a GraphQL URL (in the UI?).
  - [User docs](specs/docs/user-docs.md):
    - Generate them, then throw away the user-docs.md file.
    - Try having an AI read *only* the docs and see whether the project makes sense.
      - Prompt: "Do NOT read anything else in this repo. Start up a local deploy using services.sh, then take a look at the SPA (via the dockerized IPFS node) and see if you can figure out what this app is for. Does it all make sense? Could you help a new user understand what it's for, what he might want to use it for, and how to get started?"
    - Go through the docs/vision-and-strategy stuff and see if there's anything in there that I'd like to make sure gets into the user-facing docs: not directly (docs/vision-and-strategy is written basically just for myself as founder, it's not written for users as an audience, and we don't want to assume that they care about what I care about or think in the terms that I think in), but just stuff like "maybe we might want to mention/emphasize this point in the user-facing docs, in a way that would make sense to them".

  - Do a more thorough scalability analysis and fix any potential problems. (See [here](specs/scalability.md).)
    - Make sure that all the various services are dockerized in such a way that we can easily deploy them on an elastic cloud service.
    - Deal with the nonscalable queries: basically funding portals.
  - [Support multiple currencies](./specs/currency.md). Offchain code has been generalized, smart contracts haven't yet.

## Other things to do soon

  - [Multiple UI domains](specs/multiple-ui-domains.md)?
  - Have we implemented some way for content writers, or fans of content writers, to submit their channel (or at least particular posts) to the content finder services?
  - Fix the live Subjectiv Playwright path and rerun it. The old `/status`/indexer-sync blocker appears fixed now; the current failure is earlier in startup, where `ui/e2e/subjectiv-flow.spec.ts` times out waiting for `window._setupTestWallet` because the page never exposes it (blank-page / app-boot or test-wallet-harness issue). If that e2e passes after fixing the harness/startup problem, Subjectiv MVP is probably done.
  - Figure out the seed statements. (We've started, but then we realized that content-funding and in particular noninflammatory-content funding was a major use case, so we got sidetracked into that. Now that we have the content-funding system MVP built, go back to writing up seed statements.)
  - For the purpose of the fake-data simulations, use an LLM *once* to generate a proliferation of similar statements around the seed statements, as well as to pre-generate evaluations of all the S1 -> S2 implication candidates, then store those statements and those evaluations as another pre-generated data to be used in the fake-data simulations.
  - Switch the fake-data-simulation stuff so that it uses the seed statements and the proliferation of similar stuff, so that even when I'm looking locally at the fake-data-generation simulation, I'm seeing the seed stuff, not those less-sophisticated statements I generated and put into universe.json a long time ago - those can be deleted once we're using the real seed content.
  - Make sure the attester and finder seem viable. (Get them into the docker-compose setup? Make sure they're using the pre-generated stuff, not spending LLM credits every time I run the tests.)
  - The word "attester" appears in the UI. Put a little info bubble or something next to it. (And other stuff like that.)
  - Write the documentation and AI skills.
  - If the repeated SDK prebuild cost becomes annoying, consider a more monorepo-aware build setup so SDK-dependent workspaces don't redundantly rebuild the SDK.
  - Do another smart-contract audit pass.
  - Do I trust the UI? No.
  - In the UI, put a "post a GitHub issue" button.
  - Does the "finder" have any particular focus, like finding "commonality" statements (along the lines of the "coalition between the moderates on both sides" idea)? Maybe it should. (I'm not sure how necessary it'll be. Maybe a single finder can just keep on top of everything? But I kinda suspect that it might be valuable to have a "focus", like "watch for moderate statements on both sides and try to synthesize bridges between them".)
  - Implement the `foldVersion` idea described in our [indexer spec](specs/indexer/README.md). Then implement client-side storage (in localStorage?) of accumulators; blow away the accumulators when foldVersion changes.
  - How do we keep deployments (of all sorts of things: smart contracts, indexer, UI, various services like the attesters and finders and so on) from becoming unwieldy? It's probably not that big a deal - when deploying, just keep track of the info regarding where the code was deployed to and so on - but there are so many moving parts here that I'm starting to be intimidated.
  - Have AI generate some YouTube videos and podcasts and so on. Marketing, social media presence, etc.
  - Make sure that the UI contains the user docs, including API docs and so on.
  - Point an AI at the UI and tell it "go use this."
  

  - (Not a task for AI.) Can I try out conceptspace manually? e.g. Start up docker-compose locally, maybe do some fake-data generation to populate the system with a bunch of data, and then look at the UI through my web browser?
  - (Not a task for AI.) I need to do a big code review myself, of the whole thing. I don't trust it.

Founder-level stuff:
  - Think about orthogonal hierarchy dimensions for statements — geographic and topical. See [seed-content.md](./specs/subsystems/conceptspace/seed-content.md) for more detail.

Out of scope for the MVP, but I still want to remember that these are important and not done yet:
  - [Bridges](specs/bridges.md) to tradfi. This is definitely out of scope for the MVP, but it's worth thinking about.
