# TODO

## Findings from a recent test run we did

### Findings — Cross-cutting

#### Code-level analysis findings (2026-04-28)

**ARCHITECTURE NOTE: Statement discovery is event-driven via DirectSupport only.**
There is no `StatementCreated` event. Statements live on IPFS; the SDK discovers them by querying `DirectSupport` events from the Beliefs contract and extracting the statement CID from `topic2`. `browseStatements()` and `getAllStatements()` both do this. This means: (a) a statement only appears in the UI after at least one user believes/disbelieves it, (b) the seed data's 374 DirectSupport events *should* be enough to populate the Browse Statements page with seeded statements, (c) a fresh chain with no beliefs will show empty states even if statements exist on IPFS. This is by-design but worth confirming it feels right for the product.

**PERFORMANCE: `browseStatements` fetches ALL DirectSupport events (limit 10,000).**
`browseStatementsByMostSupporters` and `browseStatementsByNewest` both fetch up to 10,000 DirectSupport events and fold them in memory. This works for local dev and early testnet, but will degrade as the chain grows. The indexer's events-cache API doesn't support aggregation queries, so this is a fundamental limitation of the current architecture. Worth a TODO for eventual optimization.

**FIXED 2026-04-28: `getIndirectSupporters` N+1 fetches.**
`getIndirectSupporters` now fetches each unique source statement's DirectSupport events once, reuses those folded events across implications, and fetches target-statement direct beliefs once instead of per indirect supporter.


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

