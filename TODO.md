# TODO

## Findings from a recent test run we did

### Findings — Commonality

- **Browse Statements** (`/statements`): Minor cosmetic note: the "NEWEST" sort button has a settings/gear icon — probably should be a clock or similar.

### Findings — Content Funding

#### Seeded data verification / code-level findings (2026-04-28)

**SERIOUS: Content-funding contract summaries still cannot resolve their backing project state.**
After the indexer fix, an SDK smoke script using `fetchAndFoldContentFundingState()`, `getAllChannelOverviews()`, and `getProjectsFiltered()` returned 3 channels and 4 creator contracts, but every content-funding contract had `project: null`, `totalReceived: null`, and `status: "unknown"`. Root cause appears to be that `getProjectsFiltered()` / `getAllProjectAddresses()` only discover projects from the core `AssuranceContractFactory:PubstarterAssuranceContractCreated` event. Content-funding creator contracts are created by `CreatorAssuranceContractFactory:CreatorContractCreated`, so they are not included in the core Pubstarter project list even though their contracts emit the same assurance-contract lifecycle events. This is likely to make Content Funding browse/channel pages look underfunded or partially blank despite seed purchases. Repro: start stack, run `./scripts/data.sh --seed=tiny`, then compare `/api/events?eventName=ERC1155Bought` (8 events) with SDK channel summaries (`project: null`, `status: unknown`).

**SERIOUS: Creator-controlled Substack channel overview loses its canonical channel ID.**
The same SDK smoke check returned three channels: YouTube with `canonicalChannelId: "youtube:channel:UCaaaaaaaaaaaaaaaaaaaaaaaa"`, Twitter with `canonicalChannelId: "twitter:uid:111111111"`, and one creator-controlled channel with `canonicalChannelId: null`. From the seed logs this null channel should be `substack:smartwriter`. The likely cause is that a `ChannelControlTaken` event has only the hashed `bytes32 channelId`, while the canonical-ID map is built from content-item canonical IDs and/or verification events; when folding control-taken state under the hashed key, the overview cannot recover the human-readable ID. This will make creator-controlled channel pages/routes hard to present correctly. Repro: `./scripts/data.sh --seed=tiny`, then inspect `getAllChannelOverviews(fetchAndFoldContentFundingState(...).state, ...)`.

### Findings — Cross-cutting

#### Code-level analysis findings (2026-04-28)

**ARCHITECTURE NOTE: Statement discovery is event-driven via DirectSupport only.**
There is no `StatementCreated` event. Statements live on IPFS; the SDK discovers them by querying `DirectSupport` events from the Beliefs contract and extracting the statement CID from `topic2`. `browseStatements()` and `getAllStatements()` both do this. This means: (a) a statement only appears in the UI after at least one user believes/disbelieves it, (b) the seed data's 374 DirectSupport events *should* be enough to populate the Browse Statements page with seeded statements, (c) a fresh chain with no beliefs will show empty states even if statements exist on IPFS. This is by-design but worth confirming it feels right for the product.

**ISSUE: `ERC1155Sold` event registered in indexer but never emitted.**
`indexer/src/events-cache/index.ts` registers `AssuranceContract:ERC1155Sold`, but the seed data produced zero of these. The simulation does `purchaseFromPrimaryMarket` (which emits `ERC1155Bought`, 1 instance) but never triggers a secondary market sale that would emit `ERC1155Sold`. Either this event should be removed from the indexer config (if it's dead code) or the seed simulation should be updated to exercise it. (I think the simulation has some randomness, so it's possible that it just never exercised it.)

**PERFORMANCE: `browseStatements` fetches ALL DirectSupport events (limit 10,000).**
`browseStatementsByMostSupporters` and `browseStatementsByNewest` both fetch up to 10,000 DirectSupport events and fold them in memory. This works for local dev and early testnet, but will degrade as the chain grows. The indexer's events-cache API doesn't support aggregation queries, so this is a fundamental limitation of the current architecture. Worth a TODO for eventual optimization.

**PERFORMANCE: `getIndirectSupporters` has N+1 pattern.**
For each implication pointing to a statement, it fetches DirectSupport events for the source statement separately. With many implications this becomes expensive. Not blocking for testnet but worth noting.


## Main list

- Can we move some tests from higher levels to lower levels, to speed the overall suite?

- Make sure the seed content gets into the fake universe simulation.

- Add Admin tabs to the UI. (What goes in it? And how do we get the UI to know that an admin is looking at it?)

- In general, I want to do more testing on the whole ecosystem of attesters and finders and nudgers, to make sure it all seems smooth.

- Move this repo to GitHub. Switch from this TODO.md to GitHub issues. Add a "post a GitHub issue" button in the UI.

- Get DNS names and ENS names.

- Do another smart-contract audit pass.
  - First: which smart contracts are scary? IIRC the main one that was complicated was DelegatableNotes. Is that still true? Maybe not quite, see below.

- (Not a task for AI.) Try out the UI manually.
- (Not a task for AI.) Do a big code review myself. I don't trust it.

- Keep working on [memes](specs/product/memes.md).
- Work on the [elevator pitch](docs/common-sense-majority/vision-and-strategy/elevator-pitch.md) for Common Sense Majority.
- Have AI generate some YouTube videos and podcasts and so on. Marketing, social media presence, etc.

- Try having an AI read *only* the docs and see whether the project makes sense. Prompt: "Read workflow/BLINDFOLDED.md and whatever files it tells you to read, nothing else. Then take a look at the UI and see if you can figure out what this app is for. Does it all make sense? Could you help a new user understand what it's for, what he might want to use it for, and how to get started? How could the new-user experience be improved?"
- Point an AI at the UI and tell it "go use this."
- Similar: "Go try to break the thing. You are a really good tester. Be adversarial."
- We'll need a lot more AI underlings, with good documentation, following all the pathways, trying all the things.

- Continue the [big test run before we deploy to testnet](./workflow/reviews/before-testnet.md). Steps 0–1 done; Step 2 structural review done (3 bugs fixed). Next: re-seed data and do a seeded-data pass of Commonality, then proceed to Steps 3–7.

- Using `cofounder` skill: Are we ready to launch?

## Out of scope for the MVP, but worth remembering

- [Bridges](specs/tech/bridges.md) to tradfi.

