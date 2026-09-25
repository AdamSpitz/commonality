# To Do

This is the project's inbox; use this for tasks that might be suitable for an LLM to do.

If you have stuff that needs human attention, you can put it in [Adam's inbox](/inbox.md) instead. See [task autonomy tiers](/workflow/task-tiers.md).

Commonality also keeps its own product/architecture backlog in [`commonality-ui/TODO.md`](./commonality-ui/TODO.md) (open incompleteness allowed at merge). Prefer filing Commonality-specific follow-ups there when they are package-local; use this root list for cross-cutting work or items that should be visible to any LLM picking up the project inbox.

When an item from this page is done and no longer needs an LLM implementor's attention, don't mark it "done", just delete it. I don't want this file to get cluttered with already-completed items.

Fake data / seed content is a **standing plan**, not a pile of one-shots: read [`fake-data-generation/PLAN.md`](fake-data-generation/PLAN.md) and do the next unchecked item there (tiny UI world vs real statements vs stress traffic). Do not invent a parallel seed pipeline.

Getting **testnet to a two-person shared lab** is also a standing plan, not a pile of one-shots: read [`workflow/testnet-working-plan.md`](workflow/testnet-working-plan.md) and do the next unchecked item there. Do not mix that with mass fake activity or mainnet.

----

- **(Tell)** Next fake-data/seed-data step lives in [`fake-data-generation/PLAN.md`](fake-data-generation/PLAN.md). Abortion, immigration, crime, and LGBT-schools triples are accepted; next is the demo-seed live UI pass.

- **(Tell)** Next testnet-lab step lives in [`workflow/testnet-working-plan.md`](workflow/testnet-working-plan.md). Shared lab is up through item 8. Next unchecked is item 9 (Ask: nightly mutation flag). Human leftovers: [`inbox.md`](inbox.md) and [`testnet-prep.md`](testnet-prep.md). Do not mix with mass fake activity or mainnet.

----

- One hop for delegation inside integrated Commonality. A donor names one delegate who can spend that note on projects. The delegate cannot pass spending authority onward. If Bob wants Carol to direct the funds, the donor approves that hop (or delegates to Carol herself). Approving a replacement delegate is the point; approving every project spend is not. Write the proposal against `specs/tech/subsystems/delegation/` (including recurring pledges, which mint a note already delegated to a cause path) and use-cases D1/D2 before changing contracts. Do not publish notes as a standalone package as part of this.

- Optional donor-set waiting period on delegated spends. When the donor delegates (including a recurring pledge), she can set a delay, including zero. A delegated spend is a scheduled spend on the existing note, not a second escrow: it records the project, the amount, and her stated intent as a public label. She can revoke the unspent funds or tap Approve to release early; if she does neither, the spend completes when the delay ends. The UI states the pending amount and project plainly. Intent is not a condition the contract enforces. Notify her off-app (email or push she opted into) only when someone she already trusts flags the pending spend; other people can leave a public note that does not page her. Default: a trusted flag notifies her and the countdown continues. She can opt into a stricter mode where a trusted flag pauses the clock until she approves or revokes. Do not let a stranger's flag freeze the spend. Write the proposal against `specs/tech/subsystems/delegation/` before changing contracts.

- One voice for delegation copy. The donor is authorizing an address to spend a stated amount on projects in Commonality. The delegate promises nothing. A stated intent is public and does not bind the spend. Unspent funds stay revocable by the donor. Commonality does not hold the funds, choose the delegate, or supervise the spending. Remove the steward voice: entrusting money to a scout, program-officer framing, "money under management," and any Commonality ranking whose job is to send people to a delegate. A public history of what an address already funded can stay. "Scout" as the early contributor who may later be reimbursed at cost can stay; do not let that word mean a manager of other people's money. Start with `specs/product/legal/retroactive-funding-redesign.md` (Design 2) and `docs/end-user/lazyGiving/` (`retroactive-funding.md`, `index.md`, `fund-something.md`, `get-your-project-funded.md`). No delegate marketplace.

- Reliable revocation of delegated authority over returned funds. Revocation covers the unspent balance, pending spends, and outstanding receipt claims, so a later refund cannot revive authority the donor removed. Failed-project refunds stay inside the same authorization ("keep trying until I revoke") and remain subject to its current rules and revocation state. Successful-project reimbursement recycling is still an open choice; do not settle it in this item. Write the proposal against `specs/tech/subsystems/delegation/` and [delegation-narrowing.md](specs/product/legal/delegation-narrowing.md) before changing contracts.

- Beneficiary identity on delegated spends. Show and check the actual payout route (a direct recipient fixed at creation, versus beneficiary escrow), not project metadata or the registry's current wallet, and handle wallet rotation when a spend is scheduled or executes. An optional rule may limit the delegate's independent spends to identities the donor has approved, without requiring every donor to preselect recipients or every beneficiary to claim before funds arrive. Distinguish "destination reserved for this identity" from "controller has verified a payout wallet." Neither is an endorsement of the project. A new domain or wallet is not suspicious, and a delegate proving control of their own domain is not evidence of independence. Use [claimable-beneficiaries.md](specs/tech/subsystems/claimable-beneficiaries.md). Do not add new payout-attestation machinery. Write the proposal against `specs/tech/subsystems/delegation/` before changing contracts.

- Exact-payment donor overrides. For an ordinary pending spend, "Approve now" is enough. If that spend breaks a rule she configured, name the exception (for example, a beneficiary outside her approved list) and bind her approval to that payment only. Changing the standing rule is a separate action. The delegate's restrictions stay enforced by the contract. She should not have to revoke and redeposit to make the exception. Write the proposal against `specs/tech/subsystems/delegation/` and [delegation-narrowing.md](specs/product/legal/delegation-narrowing.md) before changing contracts.

----

- **(Tell)** Testnet Commonality SPA does not hydrate. `https://testnet.commonality.works/` and deep links now return the HTML shell (SPA fallback after public-gateway 429 is deployed), but browser loads fail on chunks such as `/assets/address-TZjglcQ5.js` (HTTP 429, public IPFS sunset body). Dedicated Pinata origin times out; Worker then falls through to `ipfs.io` / `w3s.link`. Reproduce, fix the Worker/gateway path so real assets are served from Pinata (or another working origin) instead of caching/returning 429, redeploy `cloudflare-ui-gateway`, and verify `/`, `/founders`, and a hydrated heading in a real browser. Pinata dashboard Host Origins remains Adam’s step in [`inbox.md`](inbox.md). Continuity: [`continuity/2026-09-15-commonality-live-gateway-followup.md`](continuity/2026-09-15-commonality-live-gateway-followup.md).

- **(Tell)** Rewrite [`specs/product/ui-domains.md`](specs/product/ui-domains.md) so Commonality is the founder-first CauseStarter experience (organize a cause, enroll people, fund the work), not the retired umbrella movement landing that sent newcomers to LazyGiving/Tally. Keep eight sites; siblings stay tools/verticals. Check [`specs/tech/ui-domains.md`](specs/tech/ui-domains.md), glossary, and README for the same stale “movement site / choose a product site next” framing. The old landing and `/participate` are gone.

----

- Align `foldReimbursements` donation rounding with the contract’s per-share
  accumulator (`accumulatedReimbursementPerClaimShare` / `mulDiv`). The fold
  currently splits each donation with per-holder `claim * amount / outstanding`
  integer division, then subtracts the full donation from `outstanding`, so UI
  forgo/withdrawable caps can disagree with on-chain views by leftover wei.
  Mirror the contract (scaled accumulator, or live view reads) and add a
  remainder-aware test with two holders and a donation that does not divide
  evenly. Found in review of `feature/combinator-operand-nonblocking-load`.

- **(Tell)** Refresh `data/seed-implication-evaluations.original-variants.json`
  against the current implication-attester prompt fingerprint. The prompt now
  rejects nested-place geographic rollup (Grey County → Ontario is a worked
  false); the checked-in corpus still has the old fingerprint, so
  `test:seed:implication-regression` will fail until a dedicated pass re-evaluates
  the 1870 original↔variant pairs. Do not restamp fingerprints without live
  decisions, and do not paper over it in seed wording. A v4-flash pass stalled
  on empty LLM completions — use a model that actually returns JSON. Resume
  already skips only pairs with the current fingerprint. Personalized AI ranking
  remains deferred per
  [belief-implication-board-inclusion-and-discovery.md](specs/product/belief-implication-board-inclusion-and-discovery.md).

- Add a fresh-stack integration test for the alignment-trust bootstrap: publish
  an alignment vouch from a previously unknown wallet, observe the service's
  `TrustSet(..., 100)`, confirm a wallet with no personal graph sees that vouch
  through Commonality's one-hop fallback, then add the attester to the denylist
  and confirm `TrustSet(..., 0)` removes it. Also cover that any personal direct
  trust mapping replaces rather than merges with the shipped fallback.

- **(Tell)** Glossary follow-ups. [`specs/glossary.md`](specs/glossary.md) is now the
  ubiquitous-language reference; Adam ruled on support/sign/pledge/contributor 2026-08-14
  and those sweeps are done. Part 2 §6 lists what's left, none of it urgent: **earmark**
  is used ~35 times and defined nowhere (define it or fold it into "contribution to a
  cause"); `Project.marketplaceAddress` may be dead since receipts went non-transferable;
  and the contract directory names (`individual-projects/` = LazyGiving, `statements/` =
  Conceptspace, `alignment-attestations/` = fundingportals) don't match their subsystem
  names, which breaks the four-layer isomorphism. Add new terms to the glossary as they
  appear rather than letting drift re-accumulate.

- [ ] **(Tell)** Measure whether the proposed planks/views model can fold `DirectSupport` events per plank client-side at approximately 10⁵ signers, or whether it needs a server-side fold. This is currently an unmeasured assertion in [shaping-your-cause-statements.md](docs/founder/shaping-your-cause-statements.md). Report the setup, timings, memory/browser behavior, and conclusion; do not build the server-side path yet.

- Verify the new local public-goods demo-seed storyline against a live stack. `PROJECT_SEED_METADATA[0]` is now "Riverside Community Garden" (aligned to `fundable-projects`/`local-community`/`local-food-systems`), `DETERMINISTIC_SEED_PROJECT_ALIGNMENT_COUNT` matches `SEED_PROJECT_TEMPLATE_COUNT` so no existing storyline lost its alignment, and `gen:seed:local` runs 12 users to keep the success-attester pool satisfied. Unit tests pass, but the seed has still never been run end-to-end: `stack.fresh-seeded` now passes (2026-08-03) but it seeds `tiny`, not `demo`. Run `./scripts/data.sh --wipe && ./scripts/data.sh --seed=demo` and confirm in the UI that the garden project shows an alignment vouch, contributions, and a success attestation. Consider also regenerating `data/seed-worker-outputs.json` if the Explorer fixture should mention the new cause.

- Give the demo seed (`./scripts/data.sh --seed=demo`) more **local public-goods** coverage. One storyline now exists (see above), but rows A5 (federated regional) and E2 (nonprofit on the rails) in [use-cases.md](specs/product/use-cases.md) are still not demonstrable — and those are exactly the cases the strategy docs lean on hardest. Note also that the project-creation form ships "Community garden" / "Clean water" / "Learning circle" stock images that nothing in the seed uses. Found 2026-07-25 while verifying use-case statuses against the live UI.
