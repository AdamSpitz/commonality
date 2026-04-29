# To Do

## Main list

- (task kind: big-picture-thinking; skills: cofounder, interactive-assistant): Do a big high-level test of the whole project. (See big-test.md.)

- Make sure the seed content gets into the fake universe simulation.

- Improve creator/channel display names in the content-funding UI. Current browse/detail pages derive primary labels from canonical stable IDs, so Twitter can show `@111111111` / `twitter:uid:111111111` and YouTube can show a raw `UC...` channel ID. Use resolver/API metadata when available (or add it to the fake-data/API path) so real handles/channel names are shown, with canonical IDs only as secondary technical details.

- Confirm and/or change the funding portal cause leaderboard semantics. It currently appears to show delegated-note contributions only, so a statement portal can say "No contributions yet" even when aligned projects have direct purchases/funding. Decide whether this is intended; if not, include direct project funding in the leaderboard or label the section clearly as delegated contributions only.

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

