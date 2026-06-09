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

### Fixes

- Make sure connecting a wallet actually works. Or if it just doesn't do it for a local deployment, let's make some way to fake connecting a wallet.

- On the real website:
  - I think we still have some stuff configured to point to localhost (42069?).
  - Coverage testing: see if it generates any errors. Basically I need to enhance the verifier checks to be able to point at testnet.commonality.works instead of localhost.
  - Rename to aligning.works
  - Figure out how this translates to mobile; which ones need to be usable from mobile?
    - "Give me a dozen different UI designs"
  - Figure out main UX for each site (not just landing pages)
  - Notifications? ("500 people loved your statement! You get a badge!")
  - Civility score? Give people badges. (NFTs? The )
  - Make sure it'll work at scale
  - What's our alpha testing plan? Who can we get to use this?
  - Put together a marketing plan, so we're ready to go with it
  - "Traverse every link, build me a traversal graph for the entire site."?
  - Check all the language, make sure it's all the same grade level, consistent, etc.
    - Where is this system more confusing, more broken, etc.


### Features that I'm realizing would make a big difference

- Is the [UX](specs/product/ux.md) for creating a project good enough? Can it have a "known" list, so you can just pick from a list after you've done it once? (Also ENS support.)

- I still wish we had a bridge so we could support fiat payments.

- (Maybe Sam will do this?) For suggesting possible statements you might want to sign: maybe a UI with sliders? Left/right, inflammatory/noninflammatory, etc. So it's not preachy, it just presents the options.

- [Bridge-creator](specs/product/bridge-creator.md) package is complete; remaining work is [CSM beat-agent stand-up](workflow/bridge-creator-csm-next-steps.md), Civility-agent context source adapter, feeding signing outcomes into anchor reflection, and end-to-end rehearsal.

### Testing/verification improvements

- Switch from this TODO.md to GitHub issues? At the very least let's have a process for turning one into the other. Add a "post a GitHub issue" button in the UI.

### Documentation

- I want a [pitch for Christians](docs/founder/christian-pitch.md)

- (Mostly done, or at least I've made a first pass at them. I still have Commonality and CSM to go through.) Go through each of the eight UI domains manually (just go to http://localhost:8088/ and open each in a new tab). Talk with Opus about each of them; make sure each makes sense to me (fix the copy if it doesn't feel right); make sure each has docs specific to it, make sure those make sense too, make sure each has a clear home in this repo's "docs" directory.

- Take a look at [what-its-better-for.md](docs/end-user/commonality/vision-and-strategy/why-its-better/what-its-better-for.md) and rewrite it a bit - there's something important there but I don't love the writeup.

- Can we make a diagram/infographic to explain the content-funding token system?

- Should we rename the Content Funding site to Lazy Content Funding (analogous to LazyGiving), or something? That doesn't feel quite right. But Content Funding is too generic.

### Stuff I want to think through

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
