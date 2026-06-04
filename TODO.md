# To Do

## Main list

### Features that I'm realizing would make a big difference

- Is the [UX](specs/product/ux.md) for creating a project good enough? Can it have a "known" list, so you can just pick from a list after you've done it once? (Also ENS support.)

- Implement [recurring pledges](specs/product/recurring-pledges.md)? Kinda important even for the MVP.

- Feature that I think we need to have (and IIUC we currently don't have) for the CSM / Civility system: let's have a way for the noninflammatory-content attester (AI) to attest that "this particular piece of noninflammatory content C is a good writeup supporting statement S." This should be shown in the Tally UI when viewing statement S (or when viewing a nudge toward statement S), and also shown in the Content Funding UI when viewing content item C.

- Add an API to the bridge creator: let anyone propose a bridge. (Like the finder/attester pattern, sort of. Since others have explicitly subscribed to the bridge-creator, make it be a thing where others can propose additions/improvements, and it accepts or rejects then. In fact, yeah, maybe it'd be a good idea to do the finder/attester split here too.)

- [Bridge-creator](specs/product/bridge-creator.md) package is complete; remaining work is [CSM beat-agent stand-up](workflow/bridge-creator-csm-next-steps.md), Civility-agent context source adapter, feeding signing outcomes into anchor reflection, and end-to-end rehearsal.

- Make the [Fundable Project Explorer](specs/tech/subsystems/conceptspace/explorer.md) curator factor in Tally support numbers. Right now the background LLM builds its map of active funding areas from projects, alignment attestations, and delegatable-notes, but it ignores Tally numbers when deciding where the active areas are. Verified supporter counts (direct + indirect) are a strong demand signal for "there's a lot of people over there, so bringing energy/money here is likely to be fruitful" — they should steer curation/prioritization, not just appear on the cards.

### Testing/verification improvements

- Make sure we have something in the manual tests that checks to make sure (a) UX is good in general, and (b) UX isn't too crypto-y.

- Now that we have the verifier system, let's restructure our TODO.md system:
  - We need a file that's specifically "here's stuff that needs to be raised to the human's attention".
  - But also I should be taking a bunch of those items and saying "incorporate this into the verifier checks."
    - I don't trust the LLMployees yet, so I'll want a lot of things to be raised to my attention. Later on I'll want to be able to say "I mostly-trust the LLM system to make those kinds of decisions, so don't bother blocking on me before doing it, but do put it into a place where I'll see it so I can review it if I want." And then even later I'll want a way to say "I trust it, don't even bother putting it into the place where I'll see it."

- Switch from this TODO.md to GitHub issues? At the very least let's have a process for turning one into the other. Add a "post a GitHub issue" button in the UI.

### Documentation

- I want a [pitch for Christians](docs/founder/christian-pitch.md)

- Instead of "portal", let's rename that (in the landing pages, specs, and docs) to "cause board", or "board" for short.

- Go through each of the eight UI domains manually (just go to http://localhost:8088/ and open each in a new tab). Talk with Opus about each of them; make sure each makes sense to me (fix the copy if it doesn't feel right); make sure each has docs specific to it, make sure those make sense too, make sure each has a clear home in this repo's "docs" directory.

- It'd be good to have a better explanation for what *kinds* of public goods I think have been underproduced and that my system would do a better job of producing.

### Stuff I want to think through

- Is there any easy stuff to be done now, to make it easier in the future to support [user-selectable chains](specs/tech/multi-chain.md)?

- See [composability](specs/product/composability.md), I feel like there's something important there.

- Can we think of ways to make the trust-graph thing less onerous, or (probably more importantly) to make it easier for the projects to display their credentials / bona fides in various verifiable ways (so that the system in general is less vulnerable to spam and sabotage)? See [alignment-anti-abuse.md](specs/product/alignment-anti-abuse.md).

- [unique-human-id.md](specs/tech/shared/unique-human-id.md)?

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
