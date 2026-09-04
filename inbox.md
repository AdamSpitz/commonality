# Needs attention — Adam's inbox

Note that [TODO.md](/TODO.md) is the project's inbox; use that one for tasks that might be suitable for an LLM to do. This file is Adam's inbox; it's for stuff that needs his attention. AIs can put stuff in here if they want; see [task autonomy tiers](./workflow/task-tiers.md).

When an item from this page is done and no longer needs my attention, don't mark it "done", just delete it. I don't want this file to get cluttered with already-completed items.

Also, don't let any of the items get too long; usually there's a separate .md file somewhere (e.g. in the specs directory) that is a better place to keep the details. This file is meant to be a list of concise to-do items, so that I can look over it and decide what to do next; it's not a long-term home for any of this info.

---

<!-- backlog-reminder -->
> **Standing reminder:** the one-shot backlog lives in [`TODO.md`](/TODO.md).
> When it has accumulated items, consider having an LLM make a processing pass —
> routing each item by its tier (Ask → here; Tell → do it and note it here;
> Trust → just do it). See [`task-tiers.md`](./workflow/task-tiers.md). The
> `meta.backlog-reminder` verifier check guards that this reminder stays present.

## Main list

### Security/recoverability human actions

- Replace/scopedown external account tokens: Cloudflare scoped DNS token instead of global key; Render/Pinata scoped as narrowly as possible; OpenRouter spend limit.

- Before deploying the CauseStarter alignment-trust bootstrap outside local Hardhat, run `node scripts/generate-wallets.mjs`, fund `ALIGNMENT_TRUST_BOOTSTRAP_ADDRESS`, install the worker's generated Render secret block, and add the configured denylist canary to its persistent disk. Never deploy the checked-in local Hardhat key; see the worker README runbook.

- **(Tell)** Personal dashboard spec + first slice: [personal-dashboard.md](specs/product/personal-dashboard.md). CauseStarter home (connected) heroes the fundable-projects union over signed statements. Not an unpublished cause board. Stars/subsets deferred.

### Docs / UI copy

- **(Tell)** Applied [cause-page-not-a-club.md](specs/product/cause-page-not-a-club.md) copy sweep: glossary two-step rename, end-user docs, Aligning/fundable-projects UI strings, CauseStarter high-traffic docs + organizer publish copy. Leftover “cause page” in comments, `/cause/:owner/:slug` and `fundingportal*` identifiers, and incidental “funding portal” docs still lag.

- Decide whether to act on the fresh landing-copy positioning findings. The Civility grievance-first hero was reviewed and is fine; the verifier rubric was corrected so CSM’s recognition-register rule is not imposed on every vertical. Remaining findings are elsewhere: the umbrella Commonality landing still recruits generic end users despite the founder-first strategy, CSM front-loads the mediator toggle and uses “the other side’s bullshit,” Aligning repeats its main tradeoff several times, and Tally’s “Sign once, counted forever” headline presents a future goal as current capability.

### Features that I'm realizing would make a big difference

- Bridge-creator package is done; remaining work (CSM beat-agent stand-up, Civility-agent context source adapter, feeding signing outcomes into anchor reflection, and end-to-end rehearsal) is enumerated in [`bridge-creator-csm-next-steps.md`](workflow/bridge-creator-csm-next-steps.md). Mostly LLM-doable; the rehearsal pass needs your judgment.

- [ ] **(Ask)** Claim links for wallet-less donors: decide hosted vs. self-hosted Linkdrop relay (see [bridges.md](specs/tech/bridges.md#the-one-real-open-decision-hosted-vs-self-hosted-relay) for the full evaluation — Linkdrop SDK V3 is already the settled choice over a custom `TradFiBridgeEscrow`). Needs a small spike to confirm the relay self-hosts cleanly and check the per-claim fee/gas model.

- [ ] **(Adam)** Create the 2-of-3 Safe for the contract-admin role (hardware wallet + phone + offline backup) and record its address in `deployments/operator-addresses.env`. Only remaining human step from the 2026-07-27 governance decision; all the contract/ops work behind it is queued in [security-recoverability.md](workflow/security-recoverability.md#decision-adam-2026-07-27) and blocked on the Safe existing.

### Testing/verification improvements

- **Sponsored gas — human finish:** tank + UI are ready. Sign into [lazygiving.testnet.commonality.works](https://lazygiving.testnet.commonality.works) with Privy email OTP, contribute on enrolled project [`0x0b34E11c5A014C77b3b61E9e8b94609D8598FF93`](https://lazygiving.testnet.commonality.works/#/projects/0x0b34E11c5A014C77b3b61E9e8b94609D8598FF93) (high threshold, ~30-day deadline so it will fail rather than succeed), then refund after that deadline. Capture the UserOp calldata / gas overhead and retune placeholder caps. Steps: [sponsored-gas-live-trace.md](workflow/sponsored-gas-live-trace.md).

- Provision/fund the live-testnet verifier wallet (`COMMONALITY_TESTNET_VERIFIER_PRIVATE_KEY`) and, once it is safe to spend gas nightly, set `COMMONALITY_VERIFIER_NIGHTLY_ALLOW_TESTNET_MUTATION=1` in the deployment shell so `testnet.onchain-to-indexer` joins the retained deep cadence. Until this is done, `testnet.environment` will remain skipped-by-policy/uncertain for release-candidate claims. See `verifier/PLAN.md` P0/P1 item 1.

### The founder-first pivot ("causelets")

- Improve the [pitch for Christians](docs/founder/christian-pitch.md). Come up with other ones along those lines.

### Stuff I want to think through

- What's the difference between seed data and example data for testing? I think I may have been using the seed data mechanism for test data, which is probably not what I want.

- Ultimately we want vertical founders to host their own vertical-specific services like mediators, but can we have a middle ground where we can run it for them on our infrastructure (modulo blocklist concerns) until/unless they decide to host it themselves?

- How to eliminate CauseStarter’s reliance on browser `localStorage` for cause drafts / founder progress (`ui/src/causestarter/lib/causeStore.ts`). Today drafts are origin-scoped (so Vite `:5174` vs Docker `:8090` don’t share them) and vanish across devices/clears. Worth thinking through durable alternatives (on-chain draft, IPFS + pointer, account-linked backend, etc.) without re-centralizing or making launch heavier.

- Now that have (or at least are close to having) a proper testnet setup, can we start creating an ecosystem of simulated fake users of various types? (We can use LLMs to run the ones that need more intelligence, though ideally they'll mostly be made of conventional code, to avoid burning too many LLM tokens.)
  - Cause founder: cares a lot about some cause, comes across CauseStarter, tries actually forking the repo and making a new cause, etc.
  - Donor: cares a lot about various causes, comes across some cause, decides to donate or delegate or whatever
  - Scammer: comes across this site, wants to scam people
  - Delegate
  - etc.

- Have a session on the **financial-screening** side of policy lists, with simplification as the explicit goal — the framing is written up at the end of [financial-screening.md](specs/tech/subsystems/policy-lists/financial-screening.md). It's a deferred, non-normative design candidate; nothing in force depends on it, and v1 guarantees no policy list can affect anyone's money. Short version: the expensive part all descends from money actions needing a **hold** answer, so ask first whether a cruder rule would do.

- How much of a founder's infrastructure should we absorb, if any? Standing up a vertical currently means five plumbing accounts plus a funded wallet, all due *at launch*. **I don't want the easy answer (we just host it)** — it re-centralizes what the founder-first pivot decentralized and makes us the takedown address again; I'd rather reduce the need. A per-item pass suggesting the launch list could shrink toward one GitHub account is in [what-a-founder-needs.md § 3.3](docs/founder/what-a-founder-needs.md#33-open-question-how-much-of-this-should-we-absorb) — progress, not a conclusion. (Caveat: pointers-only made RPC load-bearing for reads, so "no credit card" may not survive.)

- **Storage/chain follow-ons to pointers-only, if and when you want them.** The `ContentResolver` seam means today's calldata recovery can be swapped for a durable store by writing one resolver, so none of this blocks anything. Open threads, all specced: EthStorage as that store ([spikes/ethstorage](spikes/ethstorage/README.md), [the-graph.md § EthStorage](specs/tech/indexer/the-graph.md#candidate-retrieval-layer-ethstorage)); whether Base is still the right chain, since EthStorage isn't on it ([l1-vs-l2.md](specs/tech/l1-vs-l2.md), [cross-chain-notes.md](specs/tech/cross-chain-notes.md), [multi-chain.md](specs/tech/multi-chain.md) — three files that could stand consolidating). Live risk on the current path is **archive availability** (RPC providers retaining old calldata), since pointers-only removed our de-facto Postgres backup.

- How hard would it be to make alternate UIs, or alternate AI services, or whatever? (I don't feel the need for that myself, but Sam wants to try, and in any case I want it to be easy to do.)

- Before adopting CADC as the post-MVP CAD settlement token, do the two remaining Adam-only steps: (1) one real Paytrie→Base→offramp [round trip](spikes/cad-stablecoins/paytrie-round-trip.md) with a small amount, and (2) review/send [spikes/cad-stablecoins/loon-email-draft.md](spikes/cad-stablecoins/loon-email-draft.md) asking Loon about their process for wrongly blacklisted contracts. Everything else in that evaluation is settled — see the [spike README](spikes/cad-stablecoins/README.md).

- Can we think of ways to make the trust-graph thing less onerous, or (probably more importantly) to make it easier for the projects to display their credentials / bona fides in various verifiable ways (so that the system in general is less vulnerable to spam and sabotage)? See [alignment-anti-abuse.md](specs/product/alignment-anti-abuse.md).

- **(Ask) Use cases — one decision left: is A2/A3/A5/A6 one combinator project rather than four features?** The full inventory, with statuses verified against the live UI, is in [use-cases.md](specs/product/use-cases.md); the other three questions from that pass have since resolved themselves. Headline was that the build is further along than the specs suggested. Side note worth acting on: the demo seed is entirely political-content flavoured, so A1/A5/E2 can't be *seen* working even in principle — seeding one local-public-goods cause would make the story demonstrable.

- **Revisit the prospective-round claim/entitlement model — it confused me, which is a bad sign.** Entitlement is the *current* receipt balance while `claimedAmount` is permanent, so an account can have claimed more than it now holds, and burning receipts silently reduces future claims with nothing recording what was given up. The specific questions (snapshot vs. live balance, whether unclaimed capacity survives a burn, per-item vs. per-round claiming) are written up under [materialization.md § Open question](specs/tech/subsystems/content-funding/materialization.md#open-question-is-the-claim-model-too-confusing).

- It's time to switch over to GitHub Issues, now that Sam is creating some.

- **Indexer-side believer-set aggregate — the last unfixed CauseStarter scale ceiling.** A scalability pass over the CauseStarter UI turned up four per-plank query fan-outs; all four are now concurrency-capped, and believer sets are cached across mounts (`ui/src/causestarter/lib/concurrency.ts`, `ui/src/causestarter/lib/believerSetsCache.ts`). What's left can't be fixed in the UI: `getStatementBelieverSets` ships full anonymized-ID *sets* to the browser, so a plank with 100k believers downloads 100k IDs to render one number, and the SDK's `limit: 10000` per-fetch ceiling truncates *silently* into a plausible-looking wrong count. The remedy and its constraints are already worked out in [shaping-your-cause-statements.md § Scale: the fold is fine, the transport isn't](docs/founder/shaping-your-cause-statements.md#scale-the-fold-is-fine-the-transport-isnt) — including why band 1 must stay exact if sketches are ever used. Needs indexer + SDK work, not UI work.

- **`StatementPicker` searches a top-100-by-popularity window.** `ui/src/causestarter/components/StatementPicker.tsx` calls `browseStatements({ limit: 100, orderBy: 'believerCount' })` and ranks locally. As the corpus grows, the right statement to reuse increasingly falls outside that window, so the picker degrades in *suggestion quality* rather than in speed — silently, and in exactly the direction that pushes organizers to write duplicate planks instead of reusing existing ones. Wants server-side relevance ranking.

## Before mainnet

- Decide when to schedule the Hardhat 2→3 migration. It is deferred until after current testnet stabilization, but should be revisited before mainnet and treated as a standalone migration project, not a dependency bump.
