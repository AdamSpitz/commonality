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

- **Policy lists Tell report (2026-07-31):** phases A–B of the approved content-only implementation are in `@commonality/sdk/policy-lists` (schemas, hashing, pure evaluation, local-file resolver/CLI). **No product enforcement is activated yet.** Remaining work — per-layer fallback/status, operator inspection, subscriptions, surface integrations — is in [policy-lists/README.md](specs/tech/subsystems/policy-lists/README.md).

### Security/recoverability human actions

- Replace/scopedown external account tokens: Cloudflare scoped DNS token instead of global key; Render/Pinata scoped as narrowly as possible; OpenRouter spend limit.

### Features that I'm realizing would make a big difference

- Decide whether to prioritize a LazyGiving donor-page de-crypto pass. The check has now been recalibrated to allow accurate crypto terminology in optional technical details and inherently crypto-specific operations rather than treating words as a blacklist. Its fresh 2026-08-01 review still finds three primary-path blockers: the Give flow foregrounds wallet/USDC/on-chain/gas mechanics, the refund flow foregrounds receipt-token approvals/gas tanks/ETH/off-ramp language, and project pages use raw `0x` addresses as ordinary contributor/recipient identities. Suggested boundary: keep precise settlement records behind “technical details,” while the default donor path speaks in dollars, accounts, people, giving, and refunds.

- Decide whether to act on the fresh landing-copy positioning findings. The Civility grievance-first hero was reviewed and is fine; the verifier rubric was corrected so CSM’s recognition-register rule is not imposed on every vertical. Remaining findings are elsewhere: the umbrella Commonality landing still recruits generic end users despite the founder-first strategy, CSM front-loads the mediator toggle and uses “the other side’s bullshit,” Aligning repeats its main tradeoff several times, and Tally’s “Sign once, counted forever” headline presents a future goal as current capability.

- Bridge-creator package is done; remaining work (CSM beat-agent stand-up, Civility-agent context source adapter, feeding signing outcomes into anchor reflection, and end-to-end rehearsal) is enumerated in [`bridge-creator-csm-next-steps.md`](workflow/bridge-creator-csm-next-steps.md). Mostly LLM-doable; the rehearsal pass needs your judgment.

- [ ] **(Ask)** Claim links for wallet-less donors: decide hosted vs. self-hosted Linkdrop relay (see [bridges.md](specs/tech/bridges.md#the-one-real-open-decision-hosted-vs-self-hosted-relay) for the full evaluation — Linkdrop SDK V3 is already the settled choice over a custom `TradFiBridgeEscrow`). Needs a small spike to confirm the relay self-hosts cleanly and check the per-claim fee/gas model.

- [ ] **(Adam)** Create the 2-of-3 Safe for the contract-admin role (hardware wallet + phone + offline backup) and record its address in `deployments/operator-addresses.env`. Only remaining human step from the 2026-07-27 governance decision; all the contract/ops work behind it is queued in [security-recoverability.md](workflow/security-recoverability.md#decision-adam-2026-07-27) and blocked on the Safe existing.

### Testing/verification improvements

- **Sponsored gas — human finish:** once the UI transaction wiring in TODO is deployed and a creator tank is funded, sign into the Base Sepolia UI with Privy email OTP and run a first-time contribution and a failed-project refund, so the placeholder production gas caps can be tuned. Needs you because Privy requires an email login. Steps: [sponsored-gas-live-trace.md](workflow/sponsored-gas-live-trace.md).

- Provision/fund the live-testnet verifier wallet (`COMMONALITY_TESTNET_VERIFIER_PRIVATE_KEY`) and, once it is safe to spend gas nightly, set `COMMONALITY_VERIFIER_NIGHTLY_ALLOW_TESTNET_MUTATION=1` in the deployment shell so `testnet.onchain-to-indexer` joins the retained deep cadence. Until this is done, `testnet.environment` will remain skipped-by-policy/uncertain for release-candidate claims. See `verifier/PLAN.md` P0/P1 item 1.

### The founder-first pivot ("causelets")

The strategy itself is now written down: [ADR 0005](specs/decisions/0005-founder-first-verticals.md)
freezes the decision and its revisit triggers, and [specs/product/founder-first.md](specs/product/founder-first.md)
is the living spec with the full backlog. What's left here is only the part that needs *your* judgment.

- New site, or potential rename of Commonality: "CauseStarter"? (The ADR deliberately
  froze the strategy and not the brand, so this is still fully open.)

- Improve the [pitch for Christians](docs/founder/christian-pitch.md). Come up with other ones along those lines.

- Better yet (or in addition to that), have an AI generate a bunch of imaginary founders and causes and so on.

### Stuff I want to think through

- Hold on, does the content-funding token system still make sense after the redesign of retroactive funding (to cap the reimbursement at the amount they put in)? Maybe it's fine? Early backers can't make a profit, but that's okay; they still get social recognition for having done it, and the retroactive-funders still get social recognition for having donated. But we should at least make sure that the documentation and the UI accurately convey that. (Maybe it already does? I know we updated the docs and UI for the LazyGiving system in general; I don't remember whether we did that for the content-funding system in particular.)

- Now that have (or at least are close to having) a proper testnet setup, can we start creating an ecosystem of simulated fake users of various types? (We can use LLMs to run the ones that need more intelligence, though ideally they'll mostly be made of conventional code, to avoid burning too many LLM tokens.)
  - Cause founder: cares a lot about some cause, comes across CauseStarter, tries actually forking the repo and making a new cause, etc.
  - Donor: cares a lot about various causes, comes across some cause, decides to donate or delegate or whatever
  - Scammer: comes across this site, wants to scam people
  - Delegate
  - etc.

- Have a session on the **financial-screening** side of policy lists, with simplification as the explicit goal — the framing is written up at the end of [financial-screening.md](specs/tech/subsystems/policy-lists/financial-screening.md). It's a deferred, non-normative design candidate; nothing in force depends on it, and v1 guarantees no policy list can affect anyone's money. Short version: the expensive part all descends from money actions needing a **hold** answer, so ask first whether a cruder rule would do.

- How much of a founder's infrastructure should we absorb, if any? Standing up a vertical currently means five plumbing accounts plus a funded wallet, all due *at launch*. **I don't want the easy answer (we just host it)** — it re-centralizes what the founder-first pivot decentralized and makes us the takedown address again; I'd rather reduce the need. A per-item pass suggesting the launch list could shrink toward one GitHub account is in [what-a-founder-needs.md § 3.3](docs/founder/what-a-founder-needs.md#33-open-question-how-much-of-this-should-we-absorb) — progress, not a conclusion. (Caveat: pointers-only made RPC load-bearing for reads, so "no credit card" may not survive.)

- **(Ask) The Graph — one decision left: do we port the read layer to a subgraph?** Full write-up, including the legal analysis and why the old blocking objection was wrong: [the-graph.md](specs/tech/indexer/the-graph.md). Everything that made this hard has been cleared — the pointers-only indexer shipped 2026-08-01, so the precondition is no longer something the port has to buy, and migration is cheap because Client-Side Folding leaves no business logic to port. **Judge it purely on the founder story: does it save a founder from running an indexer?** [multiple-providers.md](specs/product/legal/multiple-providers.md) ranks the indexer #4 and calls this "operator-posture credibility, not risk reduction", so the legal case isn't the reason. Spike 2 (`graph-node` in the local dev loop) only matters if you say yes.

- **Storage/chain follow-ons to pointers-only, if and when you want them.** The `ContentResolver` seam means today's calldata recovery can be swapped for a durable store by writing one resolver, so none of this blocks anything. Open threads, all specced: EthStorage as that store ([spikes/ethstorage](spikes/ethstorage/README.md), [the-graph.md § EthStorage](specs/tech/indexer/the-graph.md#candidate-retrieval-layer-ethstorage)); whether Base is still the right chain, since EthStorage isn't on it ([l1-vs-l2.md](specs/tech/l1-vs-l2.md), [cross-chain-notes.md](specs/tech/cross-chain-notes.md), [multi-chain.md](specs/tech/multi-chain.md) — three files that could stand consolidating). Live risk on the current path is **archive availability** (RPC providers retaining old calldata), since pointers-only removed our de-facto Postgres backup.

- How hard would it be to make alternate UIs, or alternate AI services, or whatever? (I don't feel the need for that myself, but Sam wants to try, and in any case I want it to be easy to do.)

- Before adopting CADC as the post-MVP CAD settlement token, do the two remaining Adam-only steps: (1) one real Paytrie→Base→offramp [round trip](spikes/cad-stablecoins/paytrie-round-trip.md) with a small amount, and (2) review/send [spikes/cad-stablecoins/loon-email-draft.md](spikes/cad-stablecoins/loon-email-draft.md) asking Loon about their process for wrongly blacklisted contracts. Everything else in that evaluation is settled — see the [spike README](spikes/cad-stablecoins/README.md).

- Can we think of ways to make the trust-graph thing less onerous, or (probably more importantly) to make it easier for the projects to display their credentials / bona fides in various verifiable ways (so that the system in general is less vulnerable to spam and sabotage)? See [alignment-anti-abuse.md](specs/product/alignment-anti-abuse.md).

- **(Ask) Use cases — one decision left: is A2/A3/A5/A6 one combinator project rather than four features?** The full inventory, with statuses verified against the live UI, is in [use-cases.md](specs/product/use-cases.md); the other three questions from that pass have since resolved themselves. Headline was that the build is further along than the specs suggested. Side note worth acting on: the demo seed is entirely political-content flavoured, so A1/A5/E2 can't be *seen* working even in principle — seeding one local-public-goods cause would make the story demonstrable.

## Before mainnet

- Decide when to schedule the Hardhat 2→3 migration. It is deferred until after current testnet stabilization, but should be revisited before mainnet and treated as a standalone migration project, not a dependency bump.
