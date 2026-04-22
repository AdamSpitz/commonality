# TODO

## Main list

- Store the [seed content](specs/tech/subsystems/conceptspace/seed-content/README.md) in a more-formal JSON file (or collection of JSON files - it's fine with me if we have one for each purpose or whatever). (Let's call that "seed content format"?) This won't be the exact [statement format](specs/tech/subsystems/conceptspace/statements.md), because I want it to contain some extra notes (for our own purposes - the kinds of comments we have in specs/tech/subsystems/conceptspace/seed-content/fundable-projects.md, to explain what categories of seed statements we have and why). But I want to have have one script to convert the seed-content JSON into the `universe.json` format expected by the fake-data simulations, and another script that we can use to convert the seed statements to the "real" statement format and (using the sdk code or whatever) upload them to IPFS.
- Use an LLM to generate a proliferation of similar statements around the [seed content](specs/tech/subsystems/conceptspace/seed-content/README.md); store this, too, in that same "seed content format". The idea is to use this to test the implication-attester and implication-finder systems: many of these statements will be similar enough to the real seed content that it'll be reasonable to have implication arrows between them.
  - Then pre-generate implication evaluations for all S1→S2 pairs.
  - And write a test that uses the real implication attester and makes sure that it comes up with the same implication attestations that we pre-generated. (Don't make this test part of the standard test suite, though, since it requires LLM credits to run.)

- Move this repo to GitHub. Switch from this TODO.md to GitHub issues. Add a "post a GitHub issue" button in the UI.

- Get DNS names and ENS names.

- How do we keep deployments from becoming unwieldy? [DEPLOYMENT.md](./DEPLOYMENT.md) is probably out of date. Update it; consider infrastructure-as-code.

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
