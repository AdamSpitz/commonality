# To Do

This is the project's inbox; use this for tasks that might be suitable for an LLM to do.

If you have stuff that needs human attention, you can put it in [Adam's inbox](/inbox.md) instead. See [task autonomy tiers](/workflow/task-tiers.md).

Commonality also keeps its own product/architecture backlog in [`commonality-ui/TODO.md`](./commonality-ui/TODO.md) (open incompleteness allowed at merge). Prefer filing Commonality-specific follow-ups there when they are package-local; use this root list for cross-cutting work or items that should be visible to any LLM picking up the project inbox.

When an item from this page is done and no longer needs an LLM implementor's attention, don't mark it "done", just delete it. I don't want this file to get cluttered with already-completed items.

Fake data / seed content is a **standing plan**, not a pile of one-shots: read [`fake-data-generation/PLAN.md`](fake-data-generation/PLAN.md) and do the next unchecked item there (tiny UI world vs real statements vs stress traffic). Do not invent a parallel seed pipeline.

Getting **testnet to a two-person shared lab** is also a standing plan, not a pile of one-shots: read [`workflow/testnet-working-plan.md`](workflow/testnet-working-plan.md) and do the next unchecked item there. Do not mix that with mass fake activity or mainnet.

----

- **(Tell)** Next fake-data/seed-data step lives in [`fake-data-generation/PLAN.md`](fake-data-generation/PLAN.md). Abortion, immigration, crime, and LGBT-schools triples are accepted; next is the demo-seed live UI pass.

- **(Tell)** Next testnet-lab step lives in [`workflow/testnet-working-plan.md`](workflow/testnet-working-plan.md). Items 1–10 are checked. The nightly wrapper exports the mutation flag itself. The job still exits red until the local deep-stack item below passes. Indexer ingest is in [`inbox.md`](inbox.md) only if GraphQL goes red again. Do not mix with mass fake activity or mainnet.

----

- **(Tell)** Resume the paused v2 step-14 stage-100 remote run (392/1508 mined, 4 submitted hashes; state in `fake-data-generation/output/campaigns/medium-realistic-v2-step14/stage-100/execution/actions.jsonl`). Resume instructions, verify-first gate, and reconcile/report steps are in `continuity/2026-10-02-v2-funding-step14-handoff.md`. Regenerate preflight artifacts (wording fix landed after they were generated) and check off item 14 in `fake-data-generation/TESTNET-SIMULATION-PLAN.md` when done.

- **(Tell)** Send the donor-set waiting-period page. Note and project screens show a pending spend's amount and deadline as money that can still be cancelled. `shouldPageDonor` still only decides once per `(noteId, nonce)`. There is no opt-in store and no email or push sender. Public remarks from people who are not flaggers stay a later UI feature and are not stored on-chain. Rules: [waiting-period.md](specs/tech/subsystems/delegation/waiting-period.md).


- **(Tell)** Nightly `verifier:deep-cadence` still runs the local destructive stack first (`stack.fresh-seeded`, `operations.local-stack-health`, `stack.restart-consistency`, `operations.indexer-lag`, `artifact.ipfs-domain-smoke`, `stack.user-journeys`). A failure there exits the job red even when the testnet mutation canary is fine. Boot that stack and get those checks passing. `verifier/PLAN.md` already says a broken local stack is a bug, not a skip.

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
