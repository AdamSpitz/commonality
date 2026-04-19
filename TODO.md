# What we've been working on lately

## Main thing I want to work on next

  - ?

## Other things to do soon

  - Fix the e2e tests.
    - DONE 2026-04-19: stale Playwright assumptions in the remaining failing flows were repaired.
    - Delegation flow now follows the current `More` menu/navigation copy and waits for specific delegation/spend tx hashes to reach the indexer before asserting note detail state.
    - Subjectiv flow now follows the current `More` menu/navigation copy and scopes trust-form interactions to the `Your Trust Network` section.

  - Implement the `foldVersion` idea described in our [indexer spec](specs/tech/indexer/README.md).
    - Done for the resumable pubstarter folds. If fold logic changes later in a way that invalidates saved accumulators, bump the relevant foldVersion constant.
  - Implement client-side storage of fold accumulators.
    - DONE for project fold (2026-04-17): IndexedDB persistence layer, cache key with eventCacheUrl/contract address/project address/foldType, foldVersion validation, bigint serialization, blockNumber tracking, incremental fetching via blockNumber_gte option, getProject integration, useCachedProject hook, 3 passing tests.
    - Remaining: extend to contributions/secondary market/burns if performance warrants, wire up specific UI pages.

  - Is there any way to speed up the tests? (Might mean: speed up the docker-compose stuff.) If there's no low-hanging fruit, don't worry about it, but it's annoying that they take so long.
    - 2026-04-19 note: the repaired delegation e2e flow is now green, but it still logs long waits while the indexer catches up to the delegation transaction. Investigate test-stack startup/indexer-sync performance separately.

  - See [intersections.md](specs/tech/subsystems/conceptspace/content-patterns/intersections.md) and do some enhancements to the implication attester and finder prompts (make the patterns clear), and maybe even put some "write a new statement" capabilities into the finder (or make a separate service, but probably just using the finder is fine).
  
  - Think about the [bridge-finder](specs/product/bridge-finder.md) idea. Either modify the implication-finder to be that, or make it as a separate finder service.
  - Or even [bridge-creator](specs/product/bridge-creator.md). Yeah, let's make the general [nudger](specs/tech/subsystems/nudger/README.md) service (general, can plug in whatever AI heuristics/prompts you want) and then a specific one that is trying to be a bridge-creator.
  - How do we deal with evil nudgers? Can we make an anti-evil-nudger immune system?
    - First, minor fix to the underlying system: have the nudgers put the CIDs onchain after all, so their decisions are nonrepudiable (but maybe revocable - let them explicitly change their minds, I think that's probably important, but the point is that it's public).
    - And then maybe the general idea with *all* of these attesters (implication attesters and noninflammatory-content attesters) and nudgers, all the things that you can configure your UI to trust, is that you can also subscribe to an immune system that will publish "hey, we think this nudger is a bad one; it's up to you to decide, but here's some stuff it just did that we think is bad; here's the receipts. And maybe here's a suggestion for an alternative one to use instead." That might be the best we can do, right? This is all subjective, so there's no objective correct answer. But we can publish the bad stuff they do and then let the individuals decide.
  - One idea that might be worth incorporating into any of the subjective AI-based services: either have the AI give its reasoning as well as the final judgment, or (if it's *really* necessary to make sure the system represents both sides) structure the service as "three AIs, pro argues with con, then judge decides", record all of that transparently. (I wonder whether there could be an "appeals" process that escalates. It's probably expensive enough to do the full adversarial thing that we wouldn't want to do it for every one.)
  - In a sense this is X Community Notes to the next level. The idea is to publish/highlight the stuff where both sides agree.
    - It'd be really interesting to have a noninflammatory-content feed that consists only of stuff that *both* sides' noninflammatory-content attesters have attested to.
    - It'd be neat if there was a slider, to let you turn the noninflammatory filter up or down. The noninflammatory-content attesters are publishing scores between 0 and 1, right, not just yes or no? So this might be easy.


  - Have we implemented some way for content writers, or fans of content writers, to submit their channel (or at least particular posts) to the content finder services?
    - No, not yet implemented. The content finder reads submissions from a JSON file (`SUBMISSIONS_FILE_PATH`), but there's no user-facing way to submit content. Current state:
      - **Content finder** (`content-finder/`) polls a JSON file for submissions
      - The submission file is manually maintained/edited
      - No UI/API for users to submit their channels or posts
    - The README mentions "future extensions" for channel-watch adapters, paid APIs, and ranking/filtering stages, but none of those have been built yet.

  - Make a better [hints](specs/tech/subsystems/conceptspace/hints.md) UI.

  - Try having an AI read *only* the docs and see whether the project makes sense. Prompt: "Read BLINDFOLDED.md and whatever files it tells you to read, nothing else. Then take a look at the UI and see if you can figure out what this app is for. Does it all make sense? Could you help a new user understand what it's for, what he might want to use it for, and how to get started? How could the new-user experience be improved?"
  - Point an AI at the UI and tell it "go use this."

  - Write some [seed content](/specs/tech/subsystems/conceptspace/seed-content/README.md). (We've started, but then we realized that content-funding and in particular noninflammatory-content funding was a major use case, so we got sidetracked into that. Now that we have the content-funding system MVP built, go back to writing up seed statements.) I think I might want to write it myself.
  - For the purpose of the fake-data simulations, use an LLM *once* to generate a proliferation of similar statements around the seed statements, as well as to pre-generate evaluations of all the S1 -> S2 implication candidates, then store those statements and those evaluations as another pre-generated data to be used in the fake-data simulations.
  - Switch the fake-data-simulation stuff so that it uses the seed statements and the proliferation of similar stuff, so that even when I'm looking locally at the fake-data-generation simulation, I'm seeing the seed stuff, not those less-sophisticated statements I generated and put into universe.json a long time ago - those can be deleted once we're using the real seed content.

  - Remind me, what was the "explorer" idea? What's the new-user experience, in terms of feeling like the system is populated with content and they can just find the areas that interest them?

  - Write the AI skills.

  - If the repeated SDK prebuild cost becomes annoying, consider a more monorepo-aware build setup so SDK-dependent workspaces don't redundantly rebuild the SDK.

  - Move this repo to GitHub.
  - In the UI, put a "post a GitHub issue" button.

  - Get DNS names and ENS names.

  - How do we keep deployments (of all sorts of things: smart contracts, indexer, UI, various services like the attesters and finders and so on) from becoming unwieldy? It's probably not that big a deal - when deploying, just keep track of the info regarding where the code was deployed to and so on - but there are so many moving parts here that I'm starting to be intimidated.
    - The [DEPLOYMENT.md](./DEPLOYMENT.md) file is old and probably out of date. Update it?
    - Can we do some kind of infrastructure-as-code thing so that I don't need to do it manually?

  - Do another smart-contract audit pass.
  - (Not a task for AI.) Try out the UI manually?
  - (Not a task for AI.) Do a big code review myself, of the whole thing. I don't trust it.
  
  - Keep working on [memes](specs/product/memes.md).
  - Have AI generate some YouTube videos and podcasts and so on. Marketing, social media presence, etc.

  - (This is a big job, so feel free to break it up into chunks if necessary.) Take a look at the "docs" and "specs" directories and the general structure of the code base, and then make a plan for doing a full review of everything. I want to know whether we're close to being ready to deploy.


Out of scope for the MVP, but I still want to remember that these are important and not done yet:
  - [Bridges](specs/tech/bridges.md) to tradfi. This is definitely out of scope for the MVP, but it's worth thinking about.



## Notes from chat with Sam

  - Work on the [elevator pitch](docs/common-sense-majority/vision-and-strategy/elevator-pitch.md) for Common Sense Majority.


  - breaking down positions into atomized positions; also accreting them into synthesized larger positions


  - facebook etc have things that are sorta analogous to "nudgers" (in the sense of biasing/shaping/directing the discussion), ask AI about it

  - "how did I get here?" maybe there's a record of all the stuff you signed before, and then you interacted with this guy 
  - In real life arguments with friends or other people you respect, there's this spirit of "I respect you as a person, even when we disagree." Make sure everything we do has that spirit.
