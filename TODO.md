# To Do

## Main list

- [x] ~~skills: cofounder, noninteractive-assistant: Do a big high-level test of the whole project.~~ — Done 2026-04-29. Findings in `workflow/reviews/before-testnet.md`.

- [x] ~~Make sure the seed content gets into the fake universe simulation.~~ — Done: `./scripts/data.sh --seed=demo` builds `output/seed-universe.json` from formal seed content (excluding proliferation variants) and runs the simulation against it.

- Pre-generate worker outputs (explorer curator, nudgers, implication finder) for local dev seeding, so the Explorer page and nudge surfaces are populated without running live AI workers. See `specs/dev/testing/pregenerated-worker-outputs.md`.

- A thought about the noninflammatory-content attesters/finders: context is going to be super-important. Like, it's hard to evaluate a tweet (especially a very short one) without context and determine that it's noninflammatory; it could be sarcastic or making a snarky reference or whatever. So, okay, the attester shouldn't deem something noninflammatory without enough context (that's the solution we went with for the implication attester)... but social-media posts aren't like conceptspace statements, it'd be inappropriate for us to say "please rewrite your tweet". And I don't think it'll work well to say "you have to submit the context along with your post"; too much work for the user but also can be gamed. I think the right solution here is to have the attesters/finders be actively following "the conversation" in the broader sense. Like... just think of the bot as a human who's following this area of the twittersphere, and he just happens to have either (for the attester) an API where you can ask him what he thinks of some particular tweet (which maybe he's read or maybe he hasn't, but at least he's been following the general conversation in that area, so that he can then go read the tweet and any local context that seems relevant, like the tweet being replied to or whatever, and then he can either evaluate it properly or say "sorry, I haven't been following this area enough, so I can't evaluate it properly"). Or for the finder, he's an autonomous agent who's following the conversation and then noticing good posts and calling the attester's API and passing in those ones. The point is that we need much wider context and we should get it by simply following "the conversation" like a human would. Which will probably mean that we need multiple different ones, each for different areas... but that strikes me as "yes, of course, obviously that's the right shape for the solution that we need to this problem."

- A thought about a maybe-useful kind of writeup to put in the user-facing docs somewhere, explaining how each individual action helps the wider ecosystem and spins up this compounding benefit. That is, in docs/vision-and-strategy/immediate-value/README.md (part of the founder-level docs, not the user-facing docs, I'm just referencing it to illustrate) we talk about how each action has immediate value, but they also compound: delegating makes it easier for people to get an assurance contract to succeed because there are more-engaged people and probably fewer people who need to be persuaded. Retroactive funding makes the job of finding a suitable delegate easier because you don't need to find someone you trust to predict success in advance, just someone you trust to notice already-successful stuff. Etc. And so the emergent effect of all those little actions is to squeeze almost all the inefficiency out of the system until it's left with something that fairly-closely resembe

 (i.e. assurance contracts and delegation and retroactive funding all compound on each other).

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

