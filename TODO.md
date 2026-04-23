# TODO

## Main list

- We've just generated some implications for the proliferation of statements in the fake-data-generation stuff. Now a human should look at all the decisions and verify that they're sensible. Although actually no, there's almost 2000 of them. So instead just spot-check a few. Then set up a regression test so that (a) when we change the prompt, we can quickly check that the new prompt makes the same decisions, and (b) when we change the statements, we can quickly ask the human to verify only the new stuff.
- In general, I want to do more testing on the whole ecosystem of attesters and finders and nudgers, to make sure it all seems smooth.
- Also I'm wondering to what extent I can separate the "physical" services from the "logical" services.

- Move this repo to GitHub. Switch from this TODO.md to GitHub issues. Add a "post a GitHub issue" button in the UI.

- Get DNS names and ENS names.

- Do another smart-contract audit pass.
- (Not a task for AI.) Try out the UI manually.
- (Not a task for AI.) Do a big code review myself. I don't trust it.

- Keep working on [memes](specs/product/memes.md).
- Work on the [elevator pitch](docs/common-sense-majority/vision-and-strategy/elevator-pitch.md) for Common Sense Majority.
- Have AI generate some YouTube videos and podcasts and so on. Marketing, social media presence, etc.

- Try having an AI read *only* the docs and see whether the project makes sense. Prompt: "Read BLINDFOLDED.md and whatever files it tells you to read, nothing else. Then take a look at the UI and see if you can figure out what this app is for. Does it all make sense? Could you help a new user understand what it's for, what he might want to use it for, and how to get started? How could the new-user experience be improved?"
- Point an AI at the UI and tell it "go use this."

- Using `cofounder` skill: Are we ready to launch?

## Out of scope for the MVP, but worth remembering

- [Bridges](specs/tech/bridges.md) to tradfi.

## Suggestions from AI

- Add a lightweight CI/developer smoke check for `render.yaml` plus the indexer’s hosted env shape, so future changes do not silently break the Render blueprint while local Docker still works.
