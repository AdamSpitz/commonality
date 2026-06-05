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

- An idea that I want to get into the docs, maybe for the Content Funding site:
  - Social-media and regular media have traditionally used ads because that's basically the only way we have of getting users to "pay" for watching. (Micropayments don't work - nobody wants to have to decide whether or not to pay a tenth of a cent to view a tweet.) The problem is that ads have problems: they reward clickbait and outrage, plus users find them annoying. But if we *don't* use ads, then content becomes what economists call "non-excludable" - we don't have any other way to make the users pay for what they use. Which means we would have to fall back on our *other* mechanisms for funding stuff that doesn't pay for itself: basically either government or private charity. Neither of those is a great choice for funding social-media content: too capturable, too coarse-grained, etc. So... well, what if we had a really good way of crowdfunding public goods? Especially ones like social media content that are potentially-controversial and also very fine-grained?
  - This is a great use case for LazyGiving. Crowdfunding (like Patreon): you contribute to content you want to, others contribute to content they want to; they can't stop you and you can't stop them. And neutral infrastructure (blockchains and also potentially-self-hosted AI), so there are no worries about it being corrupted. And unlike Patreon, LazyGiving has assurance contracts and delegation support and retroactive funding (see the LazyGiving docs for details; my point here is just that we need a system that's better than government and big charity orgs but also better than Patreon). And unlike government or big charity orgs, this is all computerized so it can be extremely fine-grained: contribute retroactively to particular content items you like, or make an aligned pledge that you'll contribute to particular *kinds* of content you want to see more of. I know this is rambling, I'm just saying that LazyGiving is a better public-goods funding system than either government or big charity orgs *or* Patreon, and in particular it's a great fit for the use case of funding social-media content. Some of these ideas are old, some (like retroactive funding) are relatively new, but notice that this particular combination of ideas is important because it lets us create a better model for funding social-media content in particular, which is a really important kind of thing to be able to fund more effectively (by "effectively" I don't mean *more* funding, I kinda mean more *targeted* funding); *everyone* has complaints about how awful social media is (outrage, clickbait, ads, addiction), and it's obviously a *huge* influence on every aspect of our society, so it might be a *really* good thing if we could cut out one of the major reasons why it's so awful (ads, which reward clickbait and outrage - they're not the *only* reason we have clickbait and outrage but they're one force pushing strongly in that direction) and instead provide a way to just fund the kind of content we *actually* want.
  - Of course creating this content-funding system doesn't mean ads will go away. My hope for that is something along the lines of "maybe we can switch to some kind of alternative network or even just an alternative UI that doesn't show ads" (which approximately everyone would prefer - nobody *likes* ads, it's just that they're there by default and it's currently not easy to block them). The point is that having this kind of content-funding system already in place would mean that shutting off the ads doesn't that good social-media content doesn't get made.

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
