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

## Main list

### Security/recoverability human actions

- Replace/scopedown external account tokens: Cloudflare scoped DNS token instead of global key; Render/Pinata scoped as narrowly as possible; OpenRouter spend limit.

### Features that I'm realizing would make a big difference

- Decide whether to prioritize a LazyGiving donor-page de-crypto pass. Verifier product checks currently say the donation page reads too crypto-heavy for ordinary donors (secondary market, buy/sell, burn tokens, raw addresses, IPFS/on-chain language, wallet-gated give CTA).

- Bridge-creator package is done; remaining work (CSM beat-agent stand-up, Civility-agent context source adapter, feeding signing outcomes into anchor reflection, and end-to-end rehearsal) is enumerated in [`bridge-creator-csm-next-steps.md`](workflow/bridge-creator-csm-next-steps.md). Mostly LLM-doable; the rehearsal pass needs your judgment.

- [ ] **(Ask)** Claim links for wallet-less donors: decide hosted vs. self-hosted Linkdrop relay (see [bridges.md](specs/tech/bridges.md#the-one-real-open-decision-hosted-vs-self-hosted-relay) for the full evaluation — Linkdrop SDK V3 is already the settled choice over a custom `TradFiBridgeEscrow`). Needs a small spike to confirm the relay self-hosts cleanly and check the per-claim fee/gas model.

- [ ] **(Adam)** Create the 2-of-3 Safe for the contract-admin role (hardware wallet + phone + offline backup) and record its address in `deployments/operator-addresses.env`. This is the only remaining human step from the 2026-07-27 governance decision (timelock + multisig, 48h delay — recorded in [security-recoverability.md](workflow/security-recoverability.md#decision-adam-2026-07-27)); the contract and ops work behind it is queued in that doc's to-do list and blocked on the Safe existing. Note the decision implies a contract change: a 48h delay on `setTrustedVerifier` would mean 48h of exposure if the hot signer key leaks, so an immediate revoke path has to land alongside it.

### Testing/verification improvements

- **Sponsored gas — human finish:** after the atomic approval+contribution/refund wiring in TODO is deployed and a creator tank is enrolled/funded, sign into the Base Sepolia UI with Privy email OTP and complete (1) a first-time contribution and (2) a failed-project refund. Save the Pimlico/on-chain UserOp trace and full gas overhead so the placeholder production caps can be tuned. This cannot be completed noninteractively because Privy requires the email login. See [sponsored-gas-live-trace.md](workflow/sponsored-gas-live-trace.md). **Tell report (2026-07-31):** the API source now validates Kernel atomic batches and rejects doomed approval-only/mixed-project requests; the long TODO was reduced to the actual UI transaction-wiring/deploy step.

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

- How hard would it be to make alternate UIs, or alternate AI services, or whatever? (I don't feel the need for that myself, but Sam wants to try, and in any case I want it to be easy to do.)

- Before adopting CADC as the post-MVP CAD settlement token, do the two remaining Adam-only steps: (1) one real Paytrie→Base→offramp [round trip](spikes/cad-stablecoins/paytrie-round-trip.md) with a small amount, and (2) review/send [spikes/cad-stablecoins/loon-email-draft.md](spikes/cad-stablecoins/loon-email-draft.md) asking Loon about their process for wrongly blacklisted contracts. (Done 2026-07-14 by LLM: CADC's Base address confirmed from loon.finance itself; real depth quotes via `quote-swaps.mjs` show even C$10k swaps at <0.5% impact — see the spike README's updated "Still open" section. CADD's issuer publishes no addresses; only matters if CADD is ever adopted.)

- Can we think of ways to make the trust-graph thing less onerous, or (probably more importantly) to make it easier for the projects to display their credentials / bona fides in various verifiable ways (so that the system in general is less vulnerable to spam and sabotage)? See [alignment-anti-abuse.md](specs/product/alignment-anti-abuse.md).

- Let's have a separate session where we try to figure out how to offer a really smooth path for various kinds of use cases. The full inventory is in [use-cases.md](specs/product/use-cases.md), with statuses **verified against the live UI on 2026-07-25** (seeded local stack, real browser, logged-out and wallet-connected). The five you originally listed map to rows A1 (local community thing), A3 (org matching donations), A2 (credible threat to deter defunding), B1 (tip-jar migration), E1 (movements on the infrastructure).
  - Headline from verification: **the build is further along than the specs suggest, and the gaps aren't where we thought.** A4, B3 and F1 turned out to be fully shipped; C4 is half-shipped. But C1 got downgraded, B2 got worse, and E2 turned out to be entirely Missing.
  - Four things were worth deciding in that session; **three have since been resolved, leaving one.** (1) ~~C1 is the widest gap~~ — **not a gap at all**; the "0 indirect supporters" reading was a local-env bug in `ui/e2e/global-setup.ts`, not a missing feature (see the C1 row and `docs/dev/chain-scoped-trust-config.md`). (2) ~~D1/D2/D3 are one missing feature~~ — **mostly closed** by the shared `AddressPicker` (PR #57): delegate and vouch fields take ENS names and remember saved contacts. What's left is delegate *discovery*, which is deliberately post-MVP. (3) ~~E2 has no surface at all~~ — **door built 2026-07-27**: `/participate` now splits individual vs. organization, and `/for-organizations` adapts the `for-established-orgs.md` argument into a concrete first session. Still narrative rather than tooling; see the E2 row for what remains. (4) **A2/A3/A5/A6 remain one combinator project rather than four features** — this is the one still worth your judgment.
  - Also: the demo seed is entirely political-content flavoured, so A1/A5/E2 can't be *seen* working even in principle. Might be worth seeding one local-public-goods cause just so the story is demonstrable.
  - Note there is no verifier coverage of the A- or E-column; `review.workflow-clarity` is parameterized, so each row can become a check with no new code once the path exists. Point any such check at the Vite dev server, not `:8088` — see TODO.md.

## Before mainnet

- Decide when to schedule the Hardhat 2→3 migration. It is deferred until after current testnet stabilization, but should be revisited before mainnet and treated as a standalone migration project, not a dependency bump.
