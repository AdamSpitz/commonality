# TODO

## Main list

- Use an LLM to generate a proliferation of similar statements around the [seed content](specs/tech/subsystems/conceptspace/seed-content/README.md); store this, too, in that same "seed content format". The idea is to use this to test the implication-attester and implication-finder systems: many of these statements will be similar enough to the real seed content that it'll be reasonable to have implication arrows between them.
  - Then pre-generate implication evaluations for all S1→S2 pairs.
  - And write a test that uses the real implication attester and makes sure that it comes up with the same implication attestations that we pre-generated. (Don't make this test part of the standard test suite, though, since it requires LLM credits to run.)

- Move this repo to GitHub. Switch from this TODO.md to GitHub issues. Add a "post a GitHub issue" button in the UI.

- Get DNS names and ENS names.

- The indexer (Ponder) genuinely is not prod-ready — ponder.config.ts only declares the hardhat chain, the Dockerfile runs ponder dev, and there's no Postgres.
- Make the indexer deployable to Render. See the "indexer gap" section in [DEPLOYMENT.md](./DEPLOYMENT.md) for the four concrete code changes needed (sepolia/mainnet chains in `ponder.config.ts`, switch to `ponder start` in prod, clean up `start.sh`, add Postgres add-on + blueprint entry). Until this is done, testnet/mainnet deployments have no event cache.

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
