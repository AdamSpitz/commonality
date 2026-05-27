# To Do

## Main list

- Improve the two themes (light and dark mode). e.g. Buttons look weird in dark mode.

- Instead of "portal", let's rename that (in the landing pages, specs, and docs) to "cause board", or "board" for short.
- Can we think of ways to make the trust-graph thing less onerous, or (probably more importantly) to make it easier for the projects to display their credentials / bona fides in various verifiable ways (so that the system in general is less vulnerable to spam and sabotage)? See [alignment-anti-abuse.md](specs/product/alignment-anti-abuse.md).

- [unique-human-id.md](specs/tech/shared/unique-human-id.md)?

- Is there any easy stuff to be done now, to make it easier in the future to support [user-selectable chains](specs/tech/multi-chain.md)?

- Go through each of the eight UI domains manually (just go to http://localhost:8088/ and open each in a new tab). Talk with Opus about each of them; make sure each makes sense to me (fix the copy if it doesn't feel right); make sure each has docs specific to it, make sure those make sense too, make sure each has a clear home in this repo's "docs" directory.

- Bridge-creator / CSM mediator: see [specs/product/bridge-creator.md](specs/product/bridge-creator.md) and the focused checklist in [workflow/bridge-creator-csm-next-steps.md](workflow/bridge-creator-csm-next-steps.md). Bridge-creator package is complete; remaining work is CSM beat-agent stand-up, Civility-agent context source adapter, feeding signing outcomes into anchor reflection, and end-to-end rehearsal.
- Add an API to the bridge creator: let anyone propose a bridge. (Like the finder/attester pattern, sort of. Since others have explicitly subscribed to the bridge-creator, make it be a thing where others can propose additions/improvements, and it accepts or rejects then. In fact, yeah, maybe it'd be a good idea to do the finder/attester split here too.)

- Add Admin tabs to the UI. (What goes in it? And how do we get the UI to know that an admin is looking at it?)

- Move this repo to GitHub. Switch from this TODO.md to GitHub issues. Add a "post a GitHub issue" button in the UI.

### Testing

- Do another smart-contract audit pass (with AI assistance, but I do want to look at the stuff myself). Which smart contracts are scary?

- skills: cofounder, noninteractive-assistant: Do a big high-level test of the whole project. (I've just done a fresh local-deployment using `./scripts/data.sh --seed=demo`, so no need to do that again.) Put the notes in `workflow/reviews/before-testnet.md`.
- In general, I want to do more testing on the whole ecosystem of attesters and finders and nudgers, to make sure it all seems smooth.
- See [LLMployees.md](./LLMployees.md).
- Try having an AI read *only* the docs and see whether the project makes sense. Prompt: "Act as an end user, take a look at the UI, and see if you can figure out what this app is for. Does it all make sense? Could you help a new user understand what it's for, what he might want to use it for, and how to get started? How could the new-user experience be improved?"
- Point an AI at the UI and tell it "go use this."
- Similar: "Go try to break the thing. You are a really good tester. Be adversarial."
- We'll need a lot more AI underlings, with good documentation, following all the pathways, trying all the things.
- Make a list of things that we should be watching for as we start up some real AI services (still on testnet, but using real data from X and so on). Is the US Politics beat agent making reasonable evaluations, do its summaries make sense, etc.? Do the bridge-creator's bridges make sense and feel like each side would genuinely be willing to sign their half of it? Etc.
  - I guess making repeatable regression tests would be good. But this is gonna be a lot of stuff, and very dependent on its time, and it kinda just feels like it needs an "intelligent" overseer.

- Using `cofounder` skill: Are we ready to launch?

## Before testnet

See [testnet-prep.md](./testnet-prep.md).

## Marketing

- Keep working on [memes](specs/product/memes.md).
- Work on the [elevator pitch](docs/end-user/csm/vision-and-strategy/elevator-pitch.md) for Common Sense Majority.
- Have AI generate some YouTube videos and podcasts and so on. Marketing, social media presence, etc.

## After MVP

- Read [mvp.md](specs/product/mvp.md) and do the stuff that comes after.
