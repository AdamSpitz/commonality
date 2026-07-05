# Needs attention — Adam's inbox

Note that [TODO.md](/TODO.md) is the project's inbox; use that one for tasks that might be suitable for an LLM to do. This file is Adam's inbox; it's for stuff that needs his attention. AIs can put stuff in here if they want; see [task autonomy tiers](./workflow/task-tiers.md).

When an item from this page is done and no longer needs my attention, don't mark it "done", just delete it. I don't want this file to get cluttered with already-completed items.

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

- Add `CONTRACT_ADMIN_ADDRESS` to `deployments/operator-addresses.env` before the next non-local deploy, then run `hardhat/scripts/accept-admin-ownership.js` after deploy using the admin key/hardware wallet. (Currently present locally, but Adam should confirm the chosen admin key is the intended cold/hardware key.)
- Replace/scopedown external account tokens: Cloudflare scoped DNS token instead of global key; Render/Pinata scoped as narrowly as possible; OpenRouter spend limit.
- Enable branch protection (no force-push, no deletion) on `master` and `dev` at both GitHub and GitLab.

### Fixes

- Make sure connecting a wallet actually works. Or if it just doesn't do it for a local deployment, let's make some way to fake connecting a wallet.

- On the real website:
  - Rename to aligning.works
  - Notifications? ("500 people loved your statement! You get a badge!")
  - Civility score? Give people badges. (NFTs? The )
  - Make sure it'll work at scale; we already have a scalability analysis in theory, but we haven't actually tested it at scale.
  - "Traverse every link, build me a traversal graph for the entire site."? (Sam just did this: https://sitemap.stinger-bot.tech/)
  - Check all the language, make sure it's all the same grade level, consistent, etc.
    - Where is this system more confusing, more broken, etc.


### Features that I'm realizing would make a big difference

- (Maybe Sam will do this?) For suggesting possible statements you might want to sign: maybe a UI with sliders? Left/right, inflammatory/noninflammatory, etc. So it's not preachy, it just presents the options.

- Bridge-creator package is done; remaining work (CSM beat-agent stand-up, Civility-agent context source adapter, feeding signing outcomes into anchor reflection, and end-to-end rehearsal) is enumerated in [`bridge-creator-csm-next-steps.md`](workflow/bridge-creator-csm-next-steps.md). Mostly LLM-doable; the rehearsal pass needs your judgment.

- [ ] **(Ask)** Choose a plain fiat on-ramp provider for USDC purchases into the contributor's own embedded wallet (not fiat-to-contract execution): compare Stripe crypto onramp, Coinbase Onramp, MoonPay, Transak vanilla, etc. Confirm Base/USDC support, embedded-wallet address support, country coverage, fees, callbacks, and compliance constraints. **Narrowing analysis is written up in [specs/tech/bridges.md](specs/tech/bridges.md) → "On-ramp provider selection":** recommendation is to spike Coinbase Onramp first (Stripe as US-clean fallback), with the single go/no-go being whether it delivers USDC to a counterfactual Privy 4337 address on Base mainnet. Decision still yours.

- [ ] **(Ask)** Claim links for wallet-less donors: decide hosted vs. self-hosted Linkdrop relay (see [bridges.md](specs/tech/bridges.md#the-one-real-open-decision-hosted-vs-self-hosted-relay) for the full evaluation — Linkdrop SDK V3 is already the settled choice over a custom `TradFiBridgeEscrow`). Needs a small spike to confirm the relay self-hosts cleanly and check the per-claim fee/gas model.

- [ ] **(Ask)** Decide governance for the genuinely-governed `Ownable` levers (factory-authorization set, `setVerifier`/`setTrustedVerifier`) — needed before mainnet. Triage already done, see [security-recoverability.md](workflow/security-recoverability.md#governancetimelock-triage-for-the-human-held-ownable-levers). Decisions still mine: control model (multisig vs. timelock+multisig), delay length, and whether to do M-of-N attesters before mainnet.

### Testing/verification improvements

- Switch from this TODO.md to GitHub issues? At the very least let's have a process for turning one into the other. Add a "post a GitHub issue" button in the UI.

### Documentation

- Improve the second draft of the [pitch for Christians](docs/founder/christian-pitch.md) (I don't love it yet).
  - The idea of the second draft is to focus less on the "let's build a coordination mechanism for cross-denominational stuff" and more on making a Christian-branded entry point for Civility and CSM.
    - Go looking for Bible quotes aligned with Civility and bridge-building: blessed are the peacemakers, let there be no divisions among you, etc. Start with a review of the NT teachings on getting along with the people you disagree with, and that kind of stuff.
    - Commonality is "listen and engage", Christianity is "love them" (which does include telling them hard things that they don't want to hear, etc.).

- (Mostly done, or at least I've made a first pass at them. I still have Commonality and CSM to go through.) Go through each of the eight UI domains manually (just go to http://localhost:8088/ and open each in a new tab). Talk with Opus about each of them; make sure each makes sense to me (fix the copy if it doesn't feel right); make sure each has docs specific to it, make sure those make sense too, make sure each has a clear home in this repo's "docs" directory.

- Take a look at [what-its-better-for.md](docs/end-user/commonality/vision-and-strategy/why-its-better/what-its-better-for.md) and rewrite it a bit - there's something important there but I don't love the writeup.

- Can we make a diagram/infographic to explain the content-funding token system?

- Potential renames:
  - Content Funding -> LazyPatronage?
  - Alignment/Aligning -> LazyCause?

### Stuff I want to think through

- Can we think of ways to make the trust-graph thing less onerous, or (probably more importantly) to make it easier for the projects to display their credentials / bona fides in various verifiable ways (so that the system in general is less vulnerable to spam and sabotage)? See [alignment-anti-abuse.md](specs/product/alignment-anti-abuse.md).

- Let's have a separate session where we try to figure out how to offer a really smooth path for various kinds of use cases:
  - funding a local community thing
  - some org matching donations
  - credible threat to deter defunding
  - tip-jar migration for creators/OSS
  - "movements" that make use of this infrastructure with a particular focus


### Testing

- See [here](./verifier-checks-need-founder-level-understanding.md).

### Marketing

> **Framing (see [standing-up-a-vertical.md](docs/founder/standing-up-a-vertical.md)):**
> My role is platform + run Civility/CSM as reference verticals to recruit founders.
> I'm *not* driving direct end-user adoption of the umbrella. So "marketing" splits
> three ways below. Generic umbrella marketing is explicitly **not my job** — it's
> per-vertical and belongs to whoever runs that vertical.

**A. Founder recruiting (my job — the actual product is the platform).**
- Treat the pitch docs as recruiting material: [Christian pitch](docs/founder/christian-pitch.md), [CSM founder docs](docs/founder/csm/). These are examples of vertical positioning *and* recruiting collateral.
- Build a founder-recruiting funnel: where do prospective vertical founders hear about Commonality, and what do they land on? (The [standing-up-a-vertical](docs/founder/standing-up-a-vertical.md) guide is step one of that funnel.)

**B. Vertical GTM for Civility & CSM (my job — but as founder of those two verticals).**
- Work on the [elevator pitch](docs/end-user/common-sense-majority/elevator-pitch.md) for Common Sense Majority.
- Keep working on [memes](specs/product/memes.md).
- Have AI generate some YouTube videos and podcasts and so on — scoped to Civility/CSM, not the umbrella.
- Any org with a big user base of people doing good (Red Cross, etc.) as early users — but pitch them a *vertical* (or as a prospective founder of their own), not "Commonality."
  - They could do branded variations on the sites, or integrate (e.g. with Facebook). (This is really them founding a vertical — see guide.)
- Alpha testing plan: who can we get to use Civility/CSM specifically?

## Before testnet

See [testnet-prep.md](./testnet-prep.md).

## After MVP

- Read [mvp.md](specs/product/mvp.md) and do the stuff that comes after.
