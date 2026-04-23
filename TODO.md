# TODO

## Main list

- Use generateProliferation.ts to generate a proliferation of similar statements around the [seed content](specs/tech/subsystems/conceptspace/seed-content/README.md); store this, too, in that same "seed content JSON format". The idea is to use this to test the implication-attester and implication-finder systems: many of these statements will be similar enough to the real seed content that it'll be reasonable to have implication arrows between them, and many will be not-quite similar enough.
  - Then use the implication-attester prompt to pre-generate implication evaluations for all S1→S2 pairs. Save the resulting decisions as JSON somewhere, so that we can use them as part of fake-data generation without needing to use LLM credits every time. (And a human should look at all the decisions and verify that they're sensible.) Set up a regression test so that (a) when we change the prompt, we can quickly check that the new prompt makes the same decisions, and (b) when we change the statements, we can quickly ask the human to verify only the new stuff.

- Move this repo to GitHub. Switch from this TODO.md to GitHub issues. Add a "post a GitHub issue" button in the UI.

- Get DNS names and ENS names.

- Do another smart-contract audit pass.
- (Not a task for AI.) Try out the UI manually.
- (Not a task for AI.) Do a big code review myself. I don't trust it.

- Keep working on [memes](specs/product/memes.md).
- Have AI generate some YouTube videos and podcasts and so on. Marketing, social media presence, etc.
- Work on the [elevator pitch](docs/common-sense-majority/vision-and-strategy/elevator-pitch.md) for Common Sense Majority.

- Try having an AI read *only* the docs and see whether the project makes sense. Prompt: "Read BLINDFOLDED.md and whatever files it tells you to read, nothing else. Then take a look at the UI and see if you can figure out what this app is for. Does it all make sense? Could you help a new user understand what it's for, what he might want to use it for, and how to get started? How could the new-user experience be improved?"
- Point an AI at the UI and tell it "go use this."

- Using `cofounder` skill: Are we ready to launch?

## Out of scope for the MVP, but worth remembering

- [Bridges](specs/tech/bridges.md) to tradfi.

## Suggestions from AI

- Add a lightweight CI/developer smoke check for `render.yaml` plus the indexer’s hosted env shape, so future changes do not silently break the Render blueprint while local Docker still works.
