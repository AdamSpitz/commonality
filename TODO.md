# To Do

## Main list

- Do another smart-contract audit pass (with AI assistance, but I do want to look at the stuff myself).
  - First: which smart contracts are scary?

- Talk through smart-contract audit finding M-02: DelegatableNotes can consume multiple roots' funds while allocating scarce ERC1155 outputs to only one chain. Decide whether to require single-chain purchases, divisibility, refunds for unallocated spend, or an explicit authorization policy.

- skills: cofounder, noninteractive-assistant: Do a big high-level test of the whole project. Put the notes in `workflow/reviews/before-testnet.md`.

- Implement [beat agents](specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md).

- Add Admin tabs to the UI. (What goes in it? And how do we get the UI to know that an admin is looking at it?)

- In general, I want to do more testing on the whole ecosystem of attesters and finders and nudgers, to make sure it all seems smooth.

- Move this repo to GitHub. Switch from this TODO.md to GitHub issues. Add a "post a GitHub issue" button in the UI.

- Get DNS names and ENS names.

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

## Before testnet

- Cross-domain URLs: decide how testnet/local stable URLs should work for the nine-site IPFS deployment, then configure `VITE_COMMONALITY_URL`, `VITE_PUBSTARTER_URL`, `VITE_ALIGNMENT_URL`, `VITE_DELEGATION_URL`, `VITE_TALLY_URL`, `VITE_CONTENT_FUNDING_URL`, `VITE_NONINFLAMMATORY_URL`, `VITE_CSM_URL`, and `VITE_CONCEPTSPACE_URL` for deployed builds. Local dev can already set these to gateway URLs (see `ui/README.md`), but we need a repeatable stable-name strategy for testnet (DNS/ENS/IPNS or a gateway/reverse-proxy map) so cross-domain links don't degrade to `#` placeholders.
- Explorer/seed AI outputs: Tally `/explore` and Alignment `/explore` need useful curated cause/statement content before testnet. Work out whether to run the Explorer Curator once over the demo seed data and cache/replay the outputs for local/testnet seed deployments, or otherwise publish deterministic fixtures. Include aligned project attestations in the same seed-output bundle so funding portals demonstrate real project lists.
- Seed alignment attestations: add at least a handful of project↔statement alignment attestations to the demo/testnet seed data so statement funding portals do not show “0 projects”.
- Content-funding/create-project currency labels: after the settlement token choice is final for testnet, make contribution/deposit/create forms label the actual token symbol/decimals (not “ETH”) consistently, not just read-only project displays.

## Out of scope for the MVP, but worth remembering

- [Bridges](specs/tech/bridges.md) to tradfi.

