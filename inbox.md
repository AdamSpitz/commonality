# Needs attention — Adam's inbox

Note that [TODO.md](/TODO.md) is the project's inbox; use that one for tasks that might be suitable for an LLM to do. This file is Adam's inbox; it's for stuff that needs his attention. AIs can put stuff in here if they want; see [task autonomy tiers](./task-tiers.md).

---

<!-- backlog-reminder -->
> **Standing reminder:** the one-shot backlog lives in [`../TODO.md`](../TODO.md).
> When it has accumulated items, consider having an LLM make a processing pass —
> routing each item by its tier (Ask → here; Tell → do it and note it here;
> Trust → just do it). See [`task-tiers.md`](./task-tiers.md). The
> `meta.backlog-reminder` verifier check guards that this reminder stays present.

---

## Main list

### Features that I'm realizing would make a big difference

- Is the [UX](specs/product/ux.md) for creating a project good enough? Can it have a "known" list, so you can just pick from a list after you've done it once? (Also ENS support.)

- [Bridge-creator](specs/product/bridge-creator.md) package is complete; remaining work is [CSM beat-agent stand-up](workflow/bridge-creator-csm-next-steps.md), Civility-agent context source adapter, feeding signing outcomes into anchor reflection, and end-to-end rehearsal.

- Make the [Fundable Project Explorer](specs/tech/subsystems/conceptspace/explorer.md) curator factor in Tally support numbers. Right now the background LLM builds its map of active funding areas from projects, alignment attestations, and delegatable-notes, but it ignores Tally numbers when deciding where the active areas are. Verified supporter counts (direct + indirect) are a strong demand signal for "there's a lot of people over there, so bringing energy/money here is likely to be fruitful" — they should steer curation/prioritization, not just appear on the cards.

### Testing/verification improvements

- Switch from this TODO.md to GitHub issues? At the very least let's have a process for turning one into the other. Add a "post a GitHub issue" button in the UI.

### Documentation

- I want a [pitch for Christians](docs/founder/christian-pitch.md)

- Go through each of the eight UI domains manually (just go to http://localhost:8088/ and open each in a new tab). Talk with Opus about each of them; make sure each makes sense to me (fix the copy if it doesn't feel right); make sure each has docs specific to it, make sure those make sense too, make sure each has a clear home in this repo's "docs" directory.

- It'd be good to have a better explanation for what *kinds* of public goods I think have been underproduced and that my system would do a better job of producing.

- Can we make a diagram/infographic to explain the content-funding token system?

- In specs/product/ui-domains.md I added a couple of "What I want to convey" sections; can we make sure those get incorporated into the landing pages?

- Should we rename the Content Funding site to Lazy Content Funding (analogous to LazyGiving), or something? That doesn't feel quite right. But Content Funding is too generic.


### Stuff I want to think through

- Is there any easy stuff to be done now, to make it easier in the future to support [user-selectable chains](specs/tech/multi-chain.md)?

- Can we think of ways to make the trust-graph thing less onerous, or (probably more importantly) to make it easier for the projects to display their credentials / bona fides in various verifiable ways (so that the system in general is less vulnerable to spam and sabotage)? See [alignment-anti-abuse.md](specs/product/alignment-anti-abuse.md).

### Deployment

- Verify the Render/Ponder deploy fix over a few normal indexer redeploys: `commonality-indexer` now has a tiny persistent disk so Render should do stop-before-start deploys instead of rolling deploys, avoiding Ponder `DATABASE_SCHEMA` lock conflicts. If lock failures recur, split the indexer into a singleton writer/worker plus a separately deployed read-only web/API service. See [workflow/deployment.md](workflow/deployment.md#known-render-indexer-deployment-trap-ponder-schema-lock).

### Testing

- Do another smart-contract audit pass (with AI assistance, but I do want to look at the stuff myself). Which smart contracts are scary?

- In general, I want to do more testing on the whole ecosystem of attesters and finders and nudgers, to make sure it all seems smooth.
- See the [big test plan](./verifier/testing-plan.md).
  - My instinct is to have the "manual" tests work like this: get an AI up to speed (i.e. read the cofounder-level docs), then tell him to look at one page or use case or aspect or whatever. So make a big list of all those different things, and then the test plan is that list, where each item is to be read as "read all the cofounder-level docs, then look at X".
  - Implement the [automation backlog extracted from the manual plan](./verifier/manual-validation-plan.md#11-automation-backlog-extracted-from-this-manual-plan), so LLM validation time is spent on judgment rather than mechanical checks.
- Make a list of things that we should be watching for as we start up some real AI services (still on testnet, but using real data from X and so on). Is the US Politics beat agent making reasonable evaluations, do its summaries make sense, etc.? Do the bridge-creator's bridges make sense and feel like each side would genuinely be willing to sign their half of it? Etc.
  - I guess making repeatable regression tests would be good. But this is gonna be a lot of stuff, and very dependent on its time, and it kinda just feels like it needs an "intelligent" overseer.

- Are we ready to launch on testnet?

### Marketing

- Keep working on [memes](specs/product/memes.md).
- Work on the [elevator pitch](docs/end-user/common-sense-majority/elevator-pitch.md) for Common Sense Majority.
- Have AI generate some YouTube videos and podcasts and so on. Marketing, social media presence, etc.

## Before testnet

See [testnet-prep.md](./testnet-prep.md).

## After MVP

- Read [mvp.md](specs/product/mvp.md) and do the stuff that comes after.
