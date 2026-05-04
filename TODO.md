# To Do

## Main list

- ~~We're doing the [UI domains reshuffling](./ui-domains-reshuffling.md).~~ Done.

- Fix per-site docs gaps (do these one at a time, each in a fresh LLM):
  1. **Tally: add onboarding docs.** Tally has no "what is this" content. Add a `/docs` or `/about` route (reuse the existing `DocsPage` component or write a simpler static page) that explains statements, the implication graph, and why Tally exists. Wire it into Tally's nav.
  2. **Commonality docs: reframe for the movement + funding site.** `docs/index.md` was written when Commonality was the "foundation" site hosting everything. Rewrite it so it's scoped to the Commonality movement + public-goods funding tools, with cross-links to Tally, Content Funding, and Conceptspace where appropriate.
  3. **Conceptspace: add developer docs route.** The spec says API docs and developer reference live on Conceptspace, but the site has no `/docs` route. Add one (reuse `DocsPage` or a new thin page) pointing at whatever technical reference exists; wire it into Conceptspace's nav.

- skills: cofounder, noninteractive-assistant: Do a big high-level test of the whole project. Put the notes in `workflow/reviews/before-testnet.md`.

- Implement [beat agents](specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md).

- Add Admin tabs to the UI. (What goes in it? And how do we get the UI to know that an admin is looking at it?)

- In general, I want to do more testing on the whole ecosystem of attesters and finders and nudgers, to make sure it all seems smooth.

- Move this repo to GitHub. Switch from this TODO.md to GitHub issues. Add a "post a GitHub issue" button in the UI.

- Get DNS names and ENS names.

- Do another smart-contract audit pass (with AI assistance, but I do want to look at the stuff myself).
  - First: which smart contracts are scary?

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

