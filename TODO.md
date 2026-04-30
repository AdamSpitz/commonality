# To Do

## Main list

- [x] ~~skills: cofounder, noninteractive-assistant: Do a big high-level test of the whole project.~~ — Done 2026-04-29. Findings in `workflow/reviews/before-testnet.md`.

- [x] ~~Make sure the seed content gets into the fake universe simulation.~~ — Done: `./scripts/data.sh --seed=demo` builds `output/seed-universe.json` from formal seed content (excluding proliferation variants) and runs the simulation against it.

- Pre-generate worker outputs (explorer curator, nudgers, implication finder) for local dev seeding, so the Explorer page and nudge surfaces are populated without running live AI workers. See `specs/dev/testing/pregenerated-worker-outputs.md`.

- Implement [beat agents](specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md).

- A thought about a maybe-useful kind of writeup to put in the user-facing docs somewhere, explaining how each individual action helps the wider ecosystem and spins up this compounding benefit. That is, in docs/vision-and-strategy/immediate-value/README.md (part of the founder-level docs, not the user-facing docs, I'm just referencing it to illustrate) we talk about how each action has immediate value, but they also compound: a donor choosing to delegate his funding decisions is convenient for him because it takes work off his plate, but also makes it easier for people to get an assurance contract to succeed because there are more-engaged people and probably fewer people who need to be persuaded. A project creator choosing to enable retroactive funding makes the donors' job of finding a suitable delegate easier because you don't need to find someone you trust to predict success in advance, just someone you trust to notice already-successful stuff. Purchasing a token on the secondary market immediately gives you this badge that will show up on your profile page and will put you on the "who has contributed" leaderboard, but also makes life easier for future projects because they can count on getting funded more quickly by scouts (who can trust that they'll be reimbursed later by altruistic donors like you). Etc. Help people feel good about their individual actions by showing them how it improves the flow of the wider ecosystem.
  - And so the emergent effect of all those little actions is to squeeze a lot of the inefficiency out of the system: the final stories are: "Someone creates a project, gets funded almost immediately by scouts. Scout early-funds a project; has to wait until the project proves itself, but as long as the project is doing good stuff (which is the scout's responsibility to predict) he isn't worried about whether he'll be reimbursed later. Etc."

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

- Using `cofounder` skill: Are we ready to launch?

## Out of scope for the MVP, but worth remembering

- [Bridges](specs/tech/bridges.md) to tradfi.

