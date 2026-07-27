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

- Decide whether to prioritize a product/demo polish pass on the Commonality front door. Verifier product checks currently say the Commonality landing page has placeholder/leaked authoring-note copy and does not clearly state what the product is. **(Looks stale as of 2026-07-25 — a live walk found the Commonality landing page opens with "It's time for Internet-age public-goods funding" plus a clear one-line description, no placeholder copy. The placeholder copy that does exist is on Civility: `/popular-statements` says "These are placeholder statement prompts" and `/filters` says "still evolving". Consider re-pointing this item at Civility, and re-running the product check to see whether it's reporting on a stale artifact.)**

- Decide whether to prioritize a LazyGiving donor-page de-crypto pass. Verifier product checks currently say the donation page reads too crypto-heavy for ordinary donors (secondary market, buy/sell, burn tokens, raw addresses, IPFS/on-chain language, wallet-gated give CTA).

- Bridge-creator package is done; remaining work (CSM beat-agent stand-up, Civility-agent context source adapter, feeding signing outcomes into anchor reflection, and end-to-end rehearsal) is enumerated in [`bridge-creator-csm-next-steps.md`](workflow/bridge-creator-csm-next-steps.md). Mostly LLM-doable; the rehearsal pass needs your judgment.

- [ ] **(Ask)** Claim links for wallet-less donors: decide hosted vs. self-hosted Linkdrop relay (see [bridges.md](specs/tech/bridges.md#the-one-real-open-decision-hosted-vs-self-hosted-relay) for the full evaluation — Linkdrop SDK V3 is already the settled choice over a custom `TradFiBridgeEscrow`). Needs a small spike to confirm the relay self-hosts cleanly and check the per-claim fee/gas model.

- [ ] **(Adam)** Create the 2-of-3 Safe for the contract-admin role (hardware wallet + phone + offline backup) and record its address in `deployments/operator-addresses.env`. This is the only remaining human step from the 2026-07-27 governance decision (timelock + multisig, 48h delay — recorded in [security-recoverability.md](workflow/security-recoverability.md#decision-adam-2026-07-27)); the contract and ops work behind it is queued in that doc's to-do list and blocked on the Safe existing. Note the decision implies a contract change: a 48h delay on `setTrustedVerifier` would mean 48h of exposure if the hot signer key leaks, so an immediate revoke path has to land alongside it.

### Testing/verification improvements

- **Tell report (2026-07-27):** Fixed the CSM Playwright journey's relative Tally opt-in URL handling so the test can reach Tally trust settings instead of throwing `TypeError: Invalid URL`. Git history shows the href was already relative when the test was introduced, so this hop had never been covered successfully.

- Provision/fund the live-testnet verifier wallet (`COMMONALITY_TESTNET_VERIFIER_PRIVATE_KEY`) and, once it is safe to spend gas nightly, set `COMMONALITY_VERIFIER_NIGHTLY_ALLOW_TESTNET_MUTATION=1` in the deployment shell so `testnet.onchain-to-indexer` joins the retained deep cadence. Until this is done, `testnet.environment` will remain skipped-by-policy/uncertain for release-candidate claims. See `verifier/PLAN.md` P0/P1 item 1.

- Switch from this TODO.md to GitHub issues? At the very least let's have a process for turning one into the other. Add a "post a GitHub issue" button in the UI.

### Documentation

- Improve the [pitch for Christians](docs/founder/christian-pitch.md).

- (Mostly done, or at least I've made a first pass at them. I still have Commonality and CSM to go through.) Go through each of the eight UI domains manually (just go to http://localhost:8088/ and open each in a new tab). Talk with Opus about each of them; make sure each makes sense to me (fix the copy if it doesn't feel right); make sure each has docs specific to it, make sure those make sense too, make sure each has a clear home in this repo's "docs" directory.

- Take a look at [what-its-better-for.md](docs/end-user/commonality/vision-and-strategy/why-its-better/what-its-better-for.md) and rewrite it a bit - there's something important there but I don't love the writeup.

- Can we make a diagram/infographic to explain the content-funding token system?

- Potential renames:
  - Content Funding -> LazyPatronage?
  - Alignment/Aligning -> LazyCause? CauseStarter?

### Stuff I want to think through

- Before adopting CADC as the post-MVP CAD settlement token, do the two remaining Adam-only steps: (1) one real Paytrie→Base→offramp [round trip](spikes/cad-stablecoins/paytrie-round-trip.md) with a small amount, and (2) review/send [spikes/cad-stablecoins/loon-email-draft.md](spikes/cad-stablecoins/loon-email-draft.md) asking Loon about their process for wrongly blacklisted contracts. (Done 2026-07-14 by LLM: CADC's Base address confirmed from loon.finance itself; real depth quotes via `quote-swaps.mjs` show even C$10k swaps at <0.5% impact — see the spike README's updated "Still open" section. CADD's issuer publishes no addresses; only matters if CADD is ever adopted.)

- Can we think of ways to make the trust-graph thing less onerous, or (probably more importantly) to make it easier for the projects to display their credentials / bona fides in various verifiable ways (so that the system in general is less vulnerable to spam and sabotage)? See [alignment-anti-abuse.md](specs/product/alignment-anti-abuse.md).

- Let's have a separate session where we try to figure out how to offer a really smooth path for various kinds of use cases. The full inventory is in [use-cases.md](specs/product/use-cases.md), with statuses **verified against the live UI on 2026-07-25** (seeded local stack, real browser, logged-out and wallet-connected). The five you originally listed map to rows A1 (local community thing), A3 (org matching donations), A2 (credible threat to deter defunding), B1 (tip-jar migration), E1 (movements on the infrastructure).
  - Headline from verification: **the build is further along than the specs suggest, and the gaps aren't where we thought.** A4, B3 and F1 turned out to be fully shipped; C4 is half-shipped. But C1 got downgraded, B2 got worse, and E2 turned out to be entirely Missing.
  - Four things were worth deciding in that session; **three have since been resolved, leaving one.** (1) ~~C1 is the widest gap~~ — **not a gap at all**; the "0 indirect supporters" reading was a local-env bug in `ui/e2e/global-setup.ts`, not a missing feature (see the C1 row and `docs/dev/chain-scoped-trust-config.md`). (2) ~~D1/D2/D3 are one missing feature~~ — **mostly closed** by the shared `AddressPicker` (PR #57): delegate and vouch fields take ENS names and remember saved contacts. What's left is delegate *discovery*, which is deliberately post-MVP. (3) ~~E2 has no surface at all~~ — **door built 2026-07-27**: `/participate` now splits individual vs. organization, and `/for-organizations` adapts the `for-established-orgs.md` argument into a concrete first session. Still narrative rather than tooling; see the E2 row for what remains. (4) **A2/A3/A5/A6 remain one combinator project rather than four features** — this is the one still worth your judgment.
  - Also: the demo seed is entirely political-content flavoured, so A1/A5/E2 can't be *seen* working even in principle. Might be worth seeding one local-public-goods cause just so the story is demonstrable.
  - Note there is no verifier coverage of the A- or E-column; `review.workflow-clarity` is parameterized, so each row can become a check with no new code once the path exists. Point any such check at the Vite dev server, not `:8088` — see TODO.md.

## Before mainnet

- Decide when to schedule the Hardhat 2→3 migration. It is deferred until after current testnet stabilization, but should be revisited before mainnet and treated as a standalone migration project, not a dependency bump.

- **Tell report (2026-07-27):** Re-synced the indexer ABIs, removed and gitignored accidental `.js`/`.d.ts` ABI build outputs, and wired an exact ABI drift check into the indexer typecheck.
