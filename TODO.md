# To Do

## Main list

- [x] ~~skills: cofounder, noninteractive-assistant: Do a big high-level test of the whole project.~~ — Done 2026-04-29. Findings in `workflow/reviews/before-testnet.md`.

- [x] ~~Make sure the seed content gets into the fake universe simulation.~~ — Done: `./scripts/data.sh --seed=demo` builds `output/seed-universe.json` from formal seed content (excluding proliferation variants) and runs the simulation against it.

- [x] ~~Pre-generate worker outputs (explorer curator, nudgers, implication finder) for local dev seeding, so the Explorer page and nudge surfaces are populated without running live AI workers.~~ — Done: checked-in `fake-data-generation/data/seed-worker-outputs.json` is replayed by `./scripts/data.sh --seed=demo`.

- Implement [beat agents](specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md).

- Add Admin tabs to the UI. (What goes in it? And how do we get the UI to know that an admin is looking at it?)

- In general, I want to do more testing on the whole ecosystem of attesters and finders and nudgers, to make sure it all seems smooth.

- Move this repo to GitHub. Switch from this TODO.md to GitHub issues. Add a "post a GitHub issue" button in the UI.

- Get DNS names and ENS names.

- Do another smart-contract audit pass (with AI assistance, but I do want to look at the stuff myself).
  - First: which smart contracts are scary? IIRC the main one that was complicated was DelegatableNotes. Is that still true? Maybe not quite.

- (Not a task for AI.) Try out the UI manually.
- (Not a task for AI.) Do a big code review myself. I don't trust it.

- Keep working on [memes](specs/product/memes.md).
- Work on the [elevator pitch](docs/common-sense-majority/vision-and-strategy/elevator-pitch.md) for Common Sense Majority.
- Have AI generate some YouTube videos and podcasts and so on. Marketing, social media presence, etc.

- Try having an AI read *only* the docs and see whether the project makes sense. Prompt: "Read workflow/BLINDFOLDED.md and whatever files it tells you to read, nothing else. Then take a look at the UI and see if you can figure out what this app is for. Does it all make sense? Could you help a new user understand what it's for, what he might want to use it for, and how to get started? How could the new-user experience be improved?"
- Point an AI at the UI and tell it "go use this."
- Similar: "Go try to break the thing. You are a really good tester. Be adversarial."
- We'll need a lot more AI underlings, with good documentation, following all the pathways, trying all the things.

- Using `cofounder` skill: Are we ready to launch?

## Out of scope for the MVP, but worth remembering

- [Bridges](specs/tech/bridges.md) to tradfi.

