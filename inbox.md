# Needs attention — Adam's inbox

Note that [TODO.md](/TODO.md) is the project's inbox; use that one for tasks that might be suitable for an LLM to do. This file is Adam's inbox; it's for stuff that needs his attention. AIs can put stuff in here if they want; see [task autonomy tiers](./workflow/task-tiers.md).

---

<!-- backlog-reminder -->
> **Standing reminder:** the one-shot backlog lives in [`TODO.md`](/TODO.md).
> When it has accumulated items, consider having an LLM make a processing pass —
> routing each item by its tier (Ask → here; Tell → do it and note it here;
> Trust → just do it). See [`task-tiers.md`](./workflow/task-tiers.md). The
> `meta.backlog-reminder` verifier check guards that this reminder stays present.

---

## Main list

### Security/recoverability human actions

- Move `ENS_OWNER_PRIVATE_KEY` to cold storage after the operator/service secret bucket split; confirm the offline backup of all operator secrets is current and restorable. (From `workflow/security-recoverability.md`.)
- Add `CONTRACT_ADMIN_ADDRESS` to `deployments/operator-addresses.env` before the next non-local deploy, then run `hardhat/scripts/accept-admin-ownership.js` after deploy using the admin key/hardware wallet. (Currently present locally, but Adam should confirm the chosen admin key is the intended cold/hardware key.)
- Replace/scopedown external account tokens: Cloudflare scoped DNS token instead of global key; Render/Pinata scoped as narrowly as possible; OpenRouter spend limit.
- Enable branch protection (no force-push, no deletion) on `master` and `dev` at both GitHub and GitLab.

### Fixes

- Make sure connecting a wallet actually works. Or if it just doesn't do it for a local deployment, let's make some way to fake connecting a wallet.

- Wait, what's ui/src/conceptspace/pages/ExplorerPage.tsx? Should it be on some other site?

- On the real website:
  - I think we still have some stuff configured to point to localhost (42069?).
  - Rename to aligning.works
  - Figure out how this translates to mobile; which ones need to be usable from mobile?
    - "Give me a dozen different UI designs"
  - Figure out main UX for each site (not just landing pages)
  - Notifications? ("500 people loved your statement! You get a badge!")
  - Civility score? Give people badges. (NFTs? The )
  - Make sure it'll work at scale; we already have a scalability analysis in theory, but we haven't actually tested it at scale.
  - "Traverse every link, build me a traversal graph for the entire site."? (Sam just did this: https://sitemap.stinger-bot.tech/)
  - Check all the language, make sure it's all the same grade level, consistent, etc.
    - Where is this system more confusing, more broken, etc.


### Features that I'm realizing would make a big difference

- Is the [UX](specs/product/ux.md) for creating a project good enough? Can it have a "known" list, so you can just pick from a list after you've done it once? (Also ENS support.)

- I still wish we had a [fiat bridge](specs/tech/bridges.md).

- Let's add a [successful projects](specs/product/successful-projects.md) page to the Aligning site.

- (Maybe Sam will do this?) For suggesting possible statements you might want to sign: maybe a UI with sliders? Left/right, inflammatory/noninflammatory, etc. So it's not preachy, it just presents the options.

- [Bridge-creator](specs/product/bridge-creator.md) package is complete; remaining work is [CSM beat-agent stand-up](workflow/bridge-creator-csm-next-steps.md), Civility-agent context source adapter, feeding signing outcomes into anchor reflection, and end-to-end rehearsal.

- [ ] **(Ask)** Choose an embedded-wallet provider for walletless contribution UX (Privy/Dynamic/Web3Auth/Coinbase Smart Wallet/etc.) and document the integration plan: email/social login, recovery model, address availability before on-ramp, transaction signing, and constraints for sponsored gas. See [specs/tech/bridges.md](specs/tech/bridges.md).

- [ ] **(Ask)** Choose a plain fiat on-ramp provider for USDC purchases into the contributor's own embedded wallet (not fiat-to-contract execution): compare Stripe crypto onramp, Coinbase Onramp, MoonPay, Transak vanilla, etc. Confirm Base/USDC support, embedded-wallet address support, country coverage, fees, callbacks, and compliance constraints. See [specs/tech/bridges.md](specs/tech/bridges.md).

- [ ] **(Ask)** Evaluate true bridge-operator and claim-link support separately from the default embedded-wallet path: document how charities/fiscal hosts/governments/licensed vendors can call `buyERC1155`, evaluate Linkdrop or similar for ERC-1155 claim links, and only then decide whether a custom `TradFiBridgeEscrow` contract is worth building. See [docs/end-user/commonality/vision-and-strategy/ease-of-adoption/bridges.md](docs/end-user/commonality/vision-and-strategy/ease-of-adoption/bridges.md).

- [ ] **(Ask)** Evaluate one-step fiat-to-contract vendors as a fallback path (Transak One, Wert, Crossmint): compare whitelisting burden, country coverage, UX control, costs, refund model, and how much custom infra they let us skip. See [specs/tech/bridges.md](specs/tech/bridges.md).

- [ ] **(Ask)** Contract-versioning prep, contract changes (do while testnet-only; see [specs/tech/contract-versioning.md](specs/tech/contract-versioning.md)):
  - make `ChannelRegistry.factory` a plural authorized-factory set (currently single-slot; pointing it at a v2 factory breaks `vetoContract` for v1-factory contracts)
  - make `DelegatableNotes` secondary-market factories pluggable like its primary-market factories (currently a single `immutable`, so a MarketplaceFactory v2 forces a DelegatableNotes v2)

- [ ] **(Ask)** Governance/timelock story for the `Ownable` levers on `DelegatableNotes`, `ChannelRegistry`, `ContentRegistry` — they're the trust concentration points; needed before mainnet regardless of versioning.

### Testing/verification improvements

- Build LLM-based per-page verifier checks that loop the derived page inventory, one per analysis kind: "does the copy make sense?", "is the page usable?", "does it look visually appealing?", "does it work well on mobile?", etc. The deterministic `review.page-links` check is the worked template — same `derivePageInventory()` loop (`verifier/checks/lib/page-inventory.mjs`), just swap dead-route resolution for a model judgment per page. Reuse the `checks/lib/llm-judgment.mjs` machinery and the pass/uncertain + severity-derived gating pattern the other `review.*` LLM leaves use. Decide cost guardrails (these spend model time per page across 73 pages × N analyses) — probably manual-triggered and/or sampled, not on every fast loop.

- Switch from this TODO.md to GitHub issues? At the very least let's have a process for turning one into the other. Add a "post a GitHub issue" button in the UI.

### Documentation

- Write up a second draft of a [pitch for Christians](docs/founder/christian-pitch.md). Focus less on the "let's build a coordination mechanism for cross-denominational stuff" and more on making a Christian-branded entry point for Civility and CSM.
  - Go looking for Bible quotes aligned with Civility and bridge-building: blessed are the peacemakers, let there be no divisions among you, etc. Start with a review of the NT teachings on getting along with the people you disagree with, and that kind of stuff.
  - Commonality is "listen and engage", Christianity is "love them" (which does include telling them hard things that they don't want to hear, etc.).
  - I've created a first draft of the second draft, but I don't love it yet.

- (Mostly done, or at least I've made a first pass at them. I still have Commonality and CSM to go through.) Go through each of the eight UI domains manually (just go to http://localhost:8088/ and open each in a new tab). Talk with Opus about each of them; make sure each makes sense to me (fix the copy if it doesn't feel right); make sure each has docs specific to it, make sure those make sense too, make sure each has a clear home in this repo's "docs" directory.

- Take a look at [what-its-better-for.md](docs/end-user/commonality/vision-and-strategy/why-its-better/what-its-better-for.md) and rewrite it a bit - there's something important there but I don't love the writeup.

- Can we make a diagram/infographic to explain the content-funding token system?

- Potential renames:
  - Content Funding -> LazyPatronage?
  - Alignment/Aligning -> LazyCause?

### Stuff I want to think through

- Can we think of ways to make the trust-graph thing less onerous, or (probably more importantly) to make it easier for the projects to display their credentials / bona fides in various verifiable ways (so that the system in general is less vulnerable to spam and sabotage)? See [alignment-anti-abuse.md](specs/product/alignment-anti-abuse.md).

- Here's a potential (really obvious in retrospect) use for Commonality that I think may not be in the Commonality docs yet, or at least not as prominently as it should be: "matching funds" from governments or charities or businesses. ("We can provide $5k funding, can you provide the other $5k?" Could start from either direction: either a crowdfunded project could solicit matching donations from an org, or an org could say "we'll pay for half of this if the crowd will fund the rest.") (e.g. Local businesses sponsoring the little league team. Or an org saying, "You get crowdfunding for the project, we'll pay for the marketing of it." Or the garden club making the downtown beautiful. Or whatever.) And that's not even a new feature - it's already implemented! That's what assurance contracts are - the org can simply put $5k towards a threshold-$10k contract, and their name will even show up on the contributors list and so on. And in contrast to the "credible threat" stuff that we already discuss in the docs, this is "credible benefit" - for an org that's *willing* to participate, this is a low-key, friendly, bridge-building kind of way of shifting the needle over from big-org-funding towards crowdfunding. This kind of matching-donations is already something that the mainstream world is familiar with; Commonality is just good rails for it. (And the money never goes through our pockets.) Maybe we might want a dedicated entry point (top-level UI domain) for this kind of thing?

- Another thing I'm not sure is sufficiently covered in the Commonality (or LazyGiving) docs: a low-key way for projects to provide proof of progress. (This doesn't exactly need to be super-sophisticated or decentralized or trustless or anything like that, in large part because retroactive funding already solves the trust problem: if you aren't willing to trust that the project is progressing, don't donate ahead of time, just promise to fund retroactively. e.g. The project wants $5k but the donor doesn't trust, so he just says, "I promise that once the project is done, *if* I can see that it's genuinely producing value, I'll retroactively pay $6k for it." Or, "If you can provide me with solid evidence of progress by the halfway point, I'll pay $5500 for it." And then some early backer who *does* trust the project-doer can provide the $5k. But still, some informal way of showing the project's ongoing progress, or having discussions and so on, would probably be a good idea.) I'm inclined to simply allow the project creator to provide whatever link he wants as part of the project description, presumably to some sort of dedicated forum or whatever just for that specific project. So it's completely open-ended. But at least we should provide a default, so non-tech-savvy people can just use that. Just a micro-blog per project, with a comments section and maybe a messaging system. Does a system suitable for that already exist?

- PII: what if people put their phone number or overly-personal info into a statement or something? (Hmm, the statements could be deleted, maybe?)

- From the fable-critique:
  - Gotta implement normie features.
  - Look harder for a way to get unique-human-verification to work earlier on, don't just wait for that to eventually become available.
  - I like the idea of my role being "run these two verticals and use them as an example for recruiting founders".
  - Let's have a separate session where we try to figure out how to offer a really smooth path for various kinds of use cases:
    - funding a local community thing
    - some org matching donations
    - credible threat to deter defunding
    - tip-jar migration for creators/OSS
    - "movements" that make use of this infrastructure with a particular focus


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

- Put together a marketing plan, so we're ready to go with it.
- Keep working on [memes](specs/product/memes.md).
- Work on the [elevator pitch](docs/end-user/common-sense-majority/elevator-pitch.md) for Common Sense Majority.
- Have AI generate some YouTube videos and podcasts and so on. Marketing, social media presence, etc.
- Any org that has a big user base of people doing good (Red Cross, etc.) might be a good place to try to get early users.
  - They could do branded variations on the sites, or integrate (e.g. with Facebook).
- What's our alpha testing plan? Who can we get to use this?

## Before testnet

See [testnet-prep.md](./testnet-prep.md).

## After MVP

- Read [mvp.md](specs/product/mvp.md) and do the stuff that comes after.
