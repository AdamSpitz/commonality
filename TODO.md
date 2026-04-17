# What we've been working on lately

## Main thing I want to work on next

  - ?

## Other things to do soon

  - Is there any way to speed up the tests? (Might mean: speed up the docker-compose stuff.) If there's no low-hanging fruit, don't worry about it, but it's annoying that they take so long.

  - Keep working on [memes](specs/product/memes.md).

  - Make a better [hints](specs/tech/subsystems/conceptspace/hints.md) UI.

  - Try having an AI read *only* the docs and see whether the project makes sense. Prompt: "Read BLINDFOLDED.md and whatever files it tells you to read, nothing else. Then take a look at the UI and see if you can figure out what this app is for. Does it all make sense? Could you help a new user understand what it's for, what he might want to use it for, and how to get started? How could the new-user experience be improved?"
  - Point an AI at the UI and tell it "go use this."

  - Have we implemented some way for content writers, or fans of content writers, to submit their channel (or at least particular posts) to the content finder services?
    - No, not yet implemented. The content finder reads submissions from a JSON file (`SUBMISSIONS_FILE_PATH`), but there's no user-facing way to submit content. Current state:
      - **Content finder** (`content-finder/`) polls a JSON file for submissions
      - The submission file is manually maintained/edited
      - No UI/API for users to submit their channels or posts
    - The README mentions "future extensions" for channel-watch adapters, paid APIs, and ranking/filtering stages, but none of those have been built yet.

  - Fix the live Subjectiv Playwright path and rerun it. The old `/status`/indexer-sync blocker appears fixed now; the current failure is earlier in startup, where `ui/e2e/subjectiv-flow.spec.ts` times out waiting for `window._setupTestWallet` because the page never exposes it (blank-page / app-boot or test-wallet-harness issue). If that e2e passes after fixing the harness/startup problem, Subjectiv MVP is probably done.

  - Write some [seed content](/specs/tech/subsystems/conceptspace/seed-content/README.md). (We've started, but then we realized that content-funding and in particular noninflammatory-content funding was a major use case, so we got sidetracked into that. Now that we have the content-funding system MVP built, go back to writing up seed statements.) I think I might want to write it myself.
  - For the purpose of the fake-data simulations, use an LLM *once* to generate a proliferation of similar statements around the seed statements, as well as to pre-generate evaluations of all the S1 -> S2 implication candidates, then store those statements and those evaluations as another pre-generated data to be used in the fake-data simulations.
  - Switch the fake-data-simulation stuff so that it uses the seed statements and the proliferation of similar stuff, so that even when I'm looking locally at the fake-data-generation simulation, I'm seeing the seed stuff, not those less-sophisticated statements I generated and put into universe.json a long time ago - those can be deleted once we're using the real seed content.

  - Write the AI skills.

  - If the repeated SDK prebuild cost becomes annoying, consider a more monorepo-aware build setup so SDK-dependent workspaces don't redundantly rebuild the SDK.

  - Move this repo to GitHub.
  - In the UI, put a "post a GitHub issue" button.

  - Think about the [bridge-finder](specs/product/bridge-finder.md) idea.

  - Implement the `foldVersion` idea described in our [indexer spec](specs/tech/indexer/README.md).
    - Done for the resumable pubstarter folds. If fold logic changes later in a way that invalidates saved accumulators, bump the relevant foldVersion constant.
  - Implement client-side storage of fold accumulators.
    - Prefer IndexedDB over localStorage; follow the pattern used by the cached Subjectiv trust network in the UI.
    - Keep the persistence layer in the UI/browser side rather than the SDK, since the SDK is used in non-browser contexts too.
    - Store, per cache entry: accumulator, foldVersion, and the block number the fold is current through.
    - Include enough in the cache key to avoid cross-contamination: eventCacheUrl, relevant contract addresses, fold type, and entity id.
    - On load: if the cache is missing, corrupt, or foldVersion mismatches, discard it and re-fold from scratch.
    - Add incremental fetching support so queries can fetch only events after the stored block number; without this, persisted accumulators don't buy much.
    - Do the first vertical slice on one query path (`getProject` is the obvious starting point), then extend the pattern to contributions / secondary market / burns if it seems worthwhile.
    - Make sure bigint-containing accumulators serialize/deserialize cleanly.
    - Add tests for cache hits, cache misses, stale foldVersion invalidation, and incremental resume producing the same result as a full refold.

  - How do we keep deployments (of all sorts of things: smart contracts, indexer, UI, various services like the attesters and finders and so on) from becoming unwieldy? It's probably not that big a deal - when deploying, just keep track of the info regarding where the code was deployed to and so on - but there are so many moving parts here that I'm starting to be intimidated.

  - Do another smart-contract audit pass.
  - (Not a task for AI.) Try out the UI manually?
  - (Not a task for AI.) Do a big code review myself, of the whole thing. I don't trust it.
  
  - Have AI generate some YouTube videos and podcasts and so on. Marketing, social media presence, etc.

  - (This is a big job, so feel free to break it up into chunks if necessary.) Take a look at the "docs" and "specs" directories and the general structure of the code base, and then make a plan for doing a full review of everything. I want to know whether we're close to being ready to deploy.

Founder-level stuff:
  - Think about orthogonal hierarchy dimensions for statements — geographic and topical. See [intersections.md](specs/tech/subsystems/conceptspace/content-patterns/intersections.md) for more detail.

Out of scope for the MVP, but I still want to remember that these are important and not done yet:
  - [Bridges](specs/tech/bridges.md) to tradfi. This is definitely out of scope for the MVP, but it's worth thinking about.
