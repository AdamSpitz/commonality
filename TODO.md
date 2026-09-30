# To Do

This is the project's inbox; use this for tasks that might be suitable for an LLM to do.

If you have stuff that needs human attention, you can put it in [Adam's inbox](/inbox.md) instead. See [task autonomy tiers](/workflow/task-tiers.md).

Commonality also keeps its own product/architecture backlog in [`commonality-ui/TODO.md`](./commonality-ui/TODO.md) (open incompleteness allowed at merge). Prefer filing Commonality-specific follow-ups there when they are package-local; use this root list for cross-cutting work or items that should be visible to any LLM picking up the project inbox.

When an item from this page is done and no longer needs an LLM implementor's attention, don't mark it "done", just delete it. I don't want this file to get cluttered with already-completed items.

Fake data / seed content is a **standing plan**, not a pile of one-shots: read [`fake-data-generation/PLAN.md`](fake-data-generation/PLAN.md) and do the next unchecked item there (tiny UI world vs real statements vs stress traffic). Do not invent a parallel seed pipeline.

Getting **testnet to a two-person shared lab** is also a standing plan, not a pile of one-shots: read [`workflow/testnet-working-plan.md`](workflow/testnet-working-plan.md) and do the next unchecked item there. Do not mix that with mass fake activity or mainnet.

----

- **(Tell)** Shrink medium-realistic-v1 delegatable-note deposits to a dust ETH amount, then run stage 100. `DelegatableNotes.deposit` locks real `msg.value` when the token is `address(0)`, and the campaign always calls `depositETH`. The planner’s persona integer (`max(100, fundingWeight * 500) * 1..3`) is divided by 100,000 in both `campaignProvisioning.ts` (`noteDepositWei`) and `campaignActionAdapter.ts` (`noteAmount`) and parsed as ETH, so 145 notes quote **1.706790525 ETH**. That divisor is the test scale, not a product minimum; any `msg.value > 0` creates a note. Use one shared dust amount for provision and deposit, keep stages 10 and 25 as already mined, re-quote `stage-100`, and execute only if the deployer can cover it. Reconcile and stop if it does not. Report: [`fake-data-generation/campaigns/medium-realistic-v1-testnet-run.md`](fake-data-generation/campaigns/medium-realistic-v1-testnet-run.md). Plan item 10.

- **(Tell)** Give campaign projects a short title and description. Create-project publishes `planned.title` and `planned.outcome` as the display name and description, and the live project page repeats the full outcome statement in both. The statement page also reports that the noninflammatory meta-statement is not configured, so civility attestations cannot be checked on testnet.

- **(Tell)** Next fake-data/seed-data step lives in [`fake-data-generation/PLAN.md`](fake-data-generation/PLAN.md). Abortion, immigration, crime, and LGBT-schools triples are accepted; next is the demo-seed live UI pass.

- **(Tell)** Next testnet-lab step lives in [`workflow/testnet-working-plan.md`](workflow/testnet-working-plan.md). Shared lab is up through item 8. Next unchecked is item 9 (Ask: nightly mutation flag). Human leftovers: [`inbox.md`](inbox.md) and [`testnet-prep.md`](testnet-prep.md). Do not mix with mass fake activity or mainnet.

----

- **(Tell)** Send the donor-set waiting-period page. Note and project screens show a pending spend's amount and deadline as money that can still be cancelled. `shouldPageDonor` still only decides once per `(noteId, nonce)`. There is no opt-in store and no email or push sender. Public remarks from people who are not flaggers stay a later UI feature and are not stored on-chain. Rules: [waiting-period.md](specs/tech/subsystems/delegation/waiting-period.md).

- One voice for delegation copy. Not started, and not a contract change. Write toward the baseline in [delegation-narrowing.md](specs/product/legal/delegation-narrowing.md): the donor authorizes an address to spend a stated amount on projects in Commonality; the delegate promises nothing; a stated intent is public and does not bind the spend; unspent funds stay revocable by the donor; Commonality does not hold the funds, choose the delegate, or supervise the spending. Do not describe the delegate as a steward. "Scout" stays an early contributor who may be reimbursed at cost, not a manager of other people's money. A public history of what an address already funded can stay. No delegate marketplace, and no Commonality ranking whose job is to send donors to a delegate. Design 2 in [retroactive-funding-redesign.md](specs/product/legal/retroactive-funding-redesign.md) is the old framing to correct (program officer, money under management), not the target. The same voice is still in the rollout tracker, the "delegated budget" reward line in [securities.md](specs/product/legal/securities.md), `docs/end-user/lazyGiving/` (`retroactive-funding.md`, `index.md`, `fund-something.md`, `get-your-project-funded.md`), [become-a-delegate.md](docs/end-user/alignment/become-a-delegate.md), and the Suggested delegates panel in `ui/src/fundingportals/components/SuccessfulProjectsList.tsx`.


- **(Tell)** Testnet Commonality SPA does not hydrate. `https://testnet.commonality.works/` and deep links now return the HTML shell (SPA fallback after public-gateway 429 is deployed), but browser loads fail on chunks such as `/assets/address-TZjglcQ5.js` (HTTP 429, public IPFS sunset body). Dedicated Pinata origin times out; Worker then falls through to `ipfs.io` / `w3s.link`. Reproduce, fix the Worker/gateway path so real assets are served from Pinata (or another working origin) instead of caching/returning 429, redeploy `cloudflare-ui-gateway`, and verify `/`, `/founders`, and a hydrated heading in a real browser. Pinata dashboard Host Origins remains Adam’s step in [`inbox.md`](inbox.md). Continuity: [`continuity/2026-09-15-commonality-live-gateway-followup.md`](continuity/2026-09-15-commonality-live-gateway-followup.md).

- **(Tell)** Rewrite [`specs/product/ui-domains.md`](specs/product/ui-domains.md) so Commonality is the founder-first CauseStarter experience (organize a cause, enroll people, fund the work), not the retired umbrella movement landing that sent newcomers to LazyGiving/Tally. Keep eight sites; siblings stay tools/verticals. Check [`specs/tech/ui-domains.md`](specs/tech/ui-domains.md), glossary, and README for the same stale “movement site / choose a product site next” framing. The old landing and `/participate` are gone.

----

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

- Verify the new local public-goods demo-seed storyline against a live stack. `PROJECT_SEED_METADATA[0]` is now "Riverside Community Garden" (aligned to `fundable-projects`/`local-community`/`local-food-systems`), `DETERMINISTIC_SEED_PROJECT_ALIGNMENT_COUNT` matches `SEED_PROJECT_TEMPLATE_COUNT` so no existing storyline lost its alignment, and `gen:seed:local` runs 12 users to keep the success-attester pool satisfied. Unit tests pass, but the seed has still never been run end-to-end: `stack.fresh-seeded` now passes (2026-08-03) but it seeds `tiny`, not `demo`. Run `./scripts/data.sh --wipe && ./scripts/data.sh --seed=demo` and confirm in the UI that the garden project shows an alignment vouch, contributions, and a success attestation. Consider also regenerating `data/seed-worker-outputs.json` if the Explorer fixture should mention the new cause.

- Give the demo seed (`./scripts/data.sh --seed=demo`) more **local public-goods** coverage. One storyline now exists (see above), but rows A5 (federated regional) and E2 (nonprofit on the rails) in [use-cases.md](specs/product/use-cases.md) are still not demonstrable — and those are exactly the cases the strategy docs lean on hardest. Note also that the project-creation form ships "Community garden" / "Clean water" / "Learning circle" stock images that nothing in the seed uses. Found 2026-07-25 while verifying use-case statuses against the live UI.
