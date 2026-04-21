# What we've been working on lately

## AI Services (attesters / finders / nudgers / explorers)

See [AI-SERVICES-REVIEW-PLAN.md](AI-SERVICES-REVIEW-PLAN.md) for the full ecosystem assessment. Specs live in `specs/product/` and `specs/tech/subsystems/`.

### UI — nudge display

1. ~~**UI: nudger metadata discovery** (`.well-known/nudger.json`).~~ **Done.** When adding a nudger in Settings, users can optionally provide the nudger service URL. The UI fetches `/.well-known/nudger.json` from that URL and displays the nudger's name, description, and source type as chips alongside the address.

2. ~~**Nudge UX: staleness decay, per-nudger mute, topic filtering.**~~ **Done.** Topic filtering is implemented — users can mute topics in Settings and nudges about muted topics are filtered out. Staleness decay and per-nudger mute remain as lower-priority follow-ups.

### UI — explorer

3. ~~**UI: explorer pages backed by `curated-collection` publications`.~~ **Done.** Explorer page at `/explore` reads folded `curated-collection` publications from trusted nudgers, groups entries by `topicArea`, and renders cards with sign/navigate/funding-portal actions. Per-user LLM personalization and the background curator service are still needed (backend work).

4. ~~**Explorer nudger strategy (background LLM + per-user LLM).**~~ **Done.** Created `explorer-curator/` package with: (a) background LLM curator that periodically evaluates statements and publishes `curated-collection` snapshots to IPFS/on-chain, only when materially changed; (b) per-user LLM personalization via `POST /suggest` endpoint that returns personalized suggestions based on the user's signed statements. The existing ExplorerPage UI can be wired to the `/suggest` endpoint as a follow-up to add personalization.

### Enhancements and new services

5. ~~**Bridge-creator nudger: implement `findBridgeCandidates`.**~~ **Done.** `findBridgeCandidates` now fetches candidate statements from the chain, uses the LLM to analyze compatibility, and returns pairs where at least one side is compatible. Also checks pre-configured `COMMONALITY_STATEMENTS` against each target. Modified versions and common-ground statements are generated via the existing LLM helpers and published as nudges.

6. **Bridge-priority scoring as a mode of the implication finder.**
    Not a new service — a priority-scoring enhancement to the existing implication finder. Spec: `specs/product/bridge-finder.md`. Not blocking anything.

7. ~~**Implication attester / finder prompt enhancements for intersection patterns.**~~ **Done.** The attester's LLM prompt now includes explicit guidance on geographic × topical intersection patterns (conjunction → parent implications are one-way, geographic hierarchy implications are one-way). The finder now filters candidate pairs to same-domain only (with graceful fallback when domain is unknown), preventing O(N²) explosion. Spec updated: `specs/tech/subsystems/conceptspace/implication-discovery.md`.

8. **Anti-evil-nudger immune system.**
    Low priority — only useful once the nudger ecosystem has real activity. Spec: `specs/product/nudger-immune-system.md`.

## Suggestions from AI

- Stabilize the integration test `Pubstarter Edge Cases → should allow refund after project fails to meet threshold by deadline`. It currently creates a project whose deadline is only ~2 seconds out, which appears too short for this environment; the purchase step can revert with `ConditionHasFailed()` before the test reaches the explicit time advance.

---

## Core platform

- Implement the `foldVersion` idea described in our [indexer spec](specs/tech/indexer/README.md).
  - Done for the resumable pubstarter folds. Extend to other fold types as needed.
  - IndexedDB persistence for the project fold is done. Remaining: wire up specific UI pages (BrowseProjectsPage, ProjectDetailPage etc.) and extend to contributions/secondary market/burns if performance warrants.

- Think about [nudge-ux](/specs/product/nudge-ux.md).

- Think about [new-user-experience](/specs/product/new-user-experience.md).

- Make a better [hints](specs/tech/subsystems/conceptspace/hints.md) UI.

- It'd be neat if there was a slider, to let you turn the noninflammatory filter up or down. The noninflammatory-content attesters are publishing scores between 0 and 1, not just yes or no? So this might be easy. Also interesting: a feed consisting only of stuff that *both* sides' noninflammatory-content attesters have attested to. See [noninflammatory-content spec](specs/tech/subsystems/content-funding/noninflammatory-content/README.md).

- Write some [seed content](/specs/tech/subsystems/conceptspace/seed-content/README.md). (Content-funding MVP is done; time to go back to this.) I think I might want to write it myself.
- For the purpose of the fake-data simulations, use an LLM *once* to generate a proliferation of similar statements around the seed statements, as well as to pre-generate evaluations of all the S1 → S2 implication candidates, then store those as pre-generated data.
- Switch the fake-data-simulation stuff to use the seed statements and the proliferation of similar stuff, so that even locally I'm seeing the seed stuff. Delete the old `universe.json` entries once we're using the real seed content.

- Move this repo to GitHub.
- Switch from using this TODO.md file to using GitHub issues.
- In the UI, put a "post a GitHub issue" button.

- Get DNS names and ENS names.

- How do we keep deployments from becoming unwieldy? The [DEPLOYMENT.md](./DEPLOYMENT.md) file is old and probably out of date. Update it? Can we do some kind of infrastructure-as-code thing?

- Do another smart-contract audit pass.
- (Not a task for AI.) Try out the UI manually?
- (Not a task for AI.) Do a big code review myself, of the whole thing. I don't trust it.

- Keep working on [memes](specs/product/memes.md).
- Have AI generate some YouTube videos and podcasts and so on. Marketing, social media presence, etc.

- Try having an AI read *only* the docs and see whether the project makes sense. Prompt: "Read BLINDFOLDED.md and whatever files it tells you to read, nothing else. Then take a look at the UI and see if you can figure out what this app is for. Does it all make sense? Could you help a new user understand what it's for, what he might want to use it for, and how to get started? How could the new-user experience be improved?"
- Point an AI at the UI and tell it "go use this."

- Using `cofounder` skill: Are we ready to launch?


Out of scope for the MVP, but I still want to remember that these are important and not done yet:
- [Bridges](specs/tech/bridges.md) to tradfi. This is definitely out of scope for the MVP, but it's worth thinking about.


## Notes from chat with Sam

- Work on the [elevator pitch](docs/common-sense-majority/vision-and-strategy/elevator-pitch.md) for Common Sense Majority.

- Breaking down positions into atomized positions; also accreting them into synthesized larger positions.

- Facebook etc have things that are sorta analogous to "nudgers" (in the sense of biasing/shaping/directing the discussion), ask AI about it.

- "how did I get here?" — maybe there's a record of all the stuff you signed before, and then you interacted with this guy.
- In real life arguments with friends or other people you respect, there's this spirit of "I respect you as a person, even when we disagree." Make sure everything we do has that spirit.


https://x.com/mattvanswol/status/2045936225198956559

(Commonality might be useful in solving this problem - can donate more directly rather than through big charity orgs, and also can retroactively fund stuff that's already done good.)


https://x.com/elonmusk/status/2046327719231705207
