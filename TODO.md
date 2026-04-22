# TODO

### Documentation completeness

**Some gaps to address:**

1. **UI README stale "Placeholder pages" entry** — `ui/README.md` still lists `BrowseStatementsPage` and `SettingsPage` as placeholder pages. `SettingsPage` is now 697 lines of real functionality (nudger settings, trust settings, intensity, muted topics, muted nudgers). `BrowseStatementsPage` is 187 lines. This note should be updated.

2. **DEPLOYMENT.md covers only the implication-attester** — The guide mentions "AI Attester Service" as one of the deployable components but lists no deployment instructions for the newer AI services (implication-graph-nudger, bridge-creator, explorer-curator, content-finder, content-attester, platform-api-service). Since the project hasn't deployed yet this isn't urgent, but DEPLOYMENT.md will need significant expansion before launch.

3. **render.yaml is incomplete** — `render.yaml` only defines the `commonality-attester` service. The 6+ newer services (bridge-creator, implication-graph-nudger, explorer-curator, content-finder, platform-api-service, etc.) are not in render.yaml.



---

- [ ] (Future review chunk) Check implication-graph-nudger nudger.ts for test coverage
- [ ] (Future review chunk) Check content-finder main loop for test coverage

- Finish wiring `foldVersion` to UI pages (BrowseProjectsPage, ProjectDetailPage etc.) and extend to contributions/secondary market/burns if performance warrants. See [indexer spec](specs/tech/indexer/README.md).

- Try a noninflammatory-content filter slider. The attesters publish scores 0–1 so tuning the threshold should be easy. Also interesting: a feed showing only statements that *both* sides' noninflammatory attesters have approved. Spec: [noninflammatory-content](specs/tech/subsystems/content-funding/noninflammatory-content/README.md).

- Write some [seed content](specs/tech/subsystems/conceptspace/seed-content/README.md). (I think I want to write it myself.)
- Use an LLM to generate a proliferation of similar statements around the seed content, and pre-generate implication evaluations for all S1→S2 pairs. Switch the fake-data simulations to use this; delete the old `universe.json` entries.

- Move this repo to GitHub. Switch from this TODO.md to GitHub issues. Add a "post a GitHub issue" button in the UI.

- Get DNS names and ENS names.

- How do we keep deployments from becoming unwieldy? [DEPLOYMENT.md](./DEPLOYMENT.md) is probably out of date. Update it; consider infrastructure-as-code.

- Do another smart-contract audit pass.
- (Not a task for AI.) Try out the UI manually.
- (Not a task for AI.) Do a big code review myself. I don't trust it.

- Keep working on [memes](specs/product/memes.md).
- Have AI generate some YouTube videos and podcasts and so on. Marketing, social media presence, etc.

- Try having an AI read *only* the docs and see whether the project makes sense. Prompt: "Read BLINDFOLDED.md and whatever files it tells you to read, nothing else. Then take a look at the UI and see if you can figure out what this app is for. Does it all make sense? Could you help a new user understand what it's for, what he might want to use it for, and how to get started? How could the new-user experience be improved?"
- Point an AI at the UI and tell it "go use this."

- Work on the [elevator pitch](docs/common-sense-majority/vision-and-strategy/elevator-pitch.md) for Common Sense Majority.

- Using `cofounder` skill: Are we ready to launch?


Out of scope for the MVP, but worth remembering:
- [Bridges](specs/tech/bridges.md) to tradfi.


## Tech debt

**Low.** The codebase is in good shape. Main items:

1. **`foldVersion` wiring** (from TODO.md) — `useCachedProject` is wired for projects, but `BrowseProjectsPage` and `ProjectDetailPage` don't use it. The indexer spec says this is fine until fold latency becomes noticeable. Keep deferring.

2. **Twitter API** — `sdk/src/utils/twitter.ts` has a TODO to switch to the real Twitter API. Not urgent.

3. **ENS** — `sdk/src/utils/twitter.ts` has a TODO for ENS verification status. Matches TODO.md item about getting ENS names.

## Notes from chat with Sam

- Breaking down positions into atomized positions; also accreting them into synthesized larger positions.

- Facebook etc have things that are sorta analogous to "nudgers" (in the sense of biasing/shaping/directing the discussion), ask AI about it.

- "how did I get here?" — maybe there's a record of all the stuff you signed before, and then you interacted with this guy.

- In real life arguments with friends or other people you respect, there's this spirit of "I respect you as a person, even when we disagree." Make sure everything we do has that spirit.

