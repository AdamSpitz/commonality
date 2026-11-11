# To Do

This is the project's inbox; use this for tasks that might be suitable for an LLM to do.

If you have stuff that needs human attention, you can put it in [Adam's inbox](/inbox.md) instead.

Commonality also keeps its own product/architecture backlog in [`commonality-ui/TODO.md`](./commonality-ui/TODO.md) (open incompleteness allowed at merge). Prefer filing Commonality-specific follow-ups there when they are package-local; use this root list for cross-cutting work or items that should be visible to any LLM picking up the project inbox.

Civility still has a product gap between the copy and the screens. The details are in [`civility/TODO.md`](./civility/TODO.md). Content-funding follow-ups that are not Civility-specific are in [`content-funding/TODO.md`](./content-funding/TODO.md).

When an item from this page is done and no longer needs an LLM implementor's attention, don't mark it "done", just delete it. I don't want this file to get cluttered with already-completed items.

Fake data / seed content is a **standing plan**, not a pile of one-shots: read [`fake-data-generation/PLAN.md`](fake-data-generation/PLAN.md) and do the next unchecked item there (tiny UI world vs real statements vs stress traffic). Do not invent a parallel seed pipeline.

Getting **testnet to a two-person shared lab** is also a standing plan, not a pile of one-shots: read [`workflow/testnet-working-plan.md`](workflow/testnet-working-plan.md) and do the next unchecked item there. Do not mix that with mass fake activity or mainnet.

----

- Replace the temporary vendored verifier package with a published release containing `b362aceba788bdfde3014f6667fe34a86c9335f1` (skipped results, expense metadata, tree views). Update `package.json` and the lockfile, then remove `vendor/adamspitz-verifier-b362ace.tgz` and its provenance note. The currently published `0.1.2` lacks these features.

- Decide what to do about the Civility and Common Sense Majority testnet subdomains. `civility.testnet.commonality.works` and `common-sense-majority.testnet.commonality.works` CNAME to `cloudflare-ipfs.com`, which no longer resolves, so they are down. Adam may drop those domains altogether. Once he decides (ask via [inbox](/inbox.md) if unclear), either repoint them or remove them from DNS and from `verifier/environments/testnet.json`, so `testnet.dns`, `testnet.http`, `testnet.app-shell`, `testnet.app-config`, and `testnet.policy-enforcement` stop failing on them.

- Rebuild the local stack on a schedule instead of deciding when it is stale. Adam's preference: a nightly job (around 2am) that runs `stack.fresh-seeded` (wipe + rebuild + seed) followed by the deep local checks (`stack.restart-consistency`, `stack.user-journeys`, `artifact.ipfs-domain-smoke`, `operations.indexer-lag`, `operations.seeded-stack-latency`). Local data is always disposable. Keep it simple: a cron trigger on the verifier defs or a user crontab/systemd timer, not a stack-fingerprint system. Daytime test runs should reuse whatever stack exists. Make sure a failed nightly rebuild is visible in `npm run verifier:brief`.

- Investigate the failing **local** verifier checks (not testnet; that is separate). As of 2026-11-11 these fail or error. Start with `npm run verifier:brief` for the current flat picture, then `npm run verifier:tree` (Leaf checks tab, "Why skipped"/"Error details" panes):
  - Deep stack: `stack.fresh-seeded` (really ran 2026-11-11 and failed with exit code 1; the stored output is truncated before the cause), `stack.restart-consistency` (exit 3), `stack.user-journeys` (exit code null, probably a timeout), `operations.indexer-lag`, `operations.seeded-stack-latency`. Likely suspect: the Ponder → raw-log indexer rewrite (PRs #242–#244). Your shell profile sets the local opt-ins, so these really wipe/restart the local stack; that is fine, local data is disposable.
  - Cheap drift checks (~1s each): `automated.seed-implication-regression`, `coverage.ui-test-plan`, `coverage.guarded-check-policy` (`testnet.alignment-trust` def doesn't mention its opt-in env vars), `functionality.civility-policy-surfaces`, `staleness.known-gaps`, `operations.performance-source-canary`, `quality.structure-metrics` (errors).
  - Security/deps: `automated.dependency-audit` (15 high/critical), `security.package-lock-dependencies` (47 new packages since baseline review). Probably needs Adam's judgment on allowlisting; file in [inbox](/inbox.md) if so.
  - Also: if `stack.fresh-seeded` output keeps getting truncated before the actual error, fix the check to keep the tail of the log (or an artifact), not the head.

- Decide implication hints: where they are stored, who may send them, and how to stop a hint from becoming a cheap way to make the attester do a lot of work. The idea is in [statement proliferation](specs/product/statement-proliferation.md) §7. A hint only points at a pair; it is not a claim, and a declined hint changes nothing.

- Generalize content funding into extensible structured work types: domain-defined canonical work-item IDs, explicit links to funding requests with duplicate-claim rules, structured creation forms, and item/sequence alignment attestations feeding fundable-projects boards. Capture and refine the design before implementation; see [Structured fundable work](specs/product/structured-fundable-work.md).

- Manually confirm enrolled statement support is sponsored on a Base Account against the HTTPS paymaster after the statement tank is redeployed. Disbelief, mixed batches, and unenrolled statements must stay on the user's own gas.


- Harden sponsored-gas accounting before production: `CreatorGasTank` checks balances/caps during validation but debits only in `postOp`, so multiple operations validated in a bundle can oversubscribe one creator's balance and spend other creators' shared EntryPoint funds. Its debit also excludes post-operation gas and the EntryPoint unused-gas penalty. `StatementGasTank` prevents this by charging the full maximum cost in validation; refunds remain stranded as unallocated EntryPoint surplus. Design accurate reconciliation without cross-sponsor subsidy and test against a real EntryPoint bundle.

- Resolve gas-tank enrollment squatting and account trust before production: permissionless first enrollment permanently binds a statement/project to the first caller, who can leave its tank empty. Decide how sponsors can recover or independently sponsor an already-enrolled statement. Both paymasters also interpret account calldata without authenticating the account implementation; a malicious account can expose the expected selector without performing the promised action. Repeat support calls and new-wallet Sybils can consume a statement tank even with per-wallet caps; define the intended abuse budget.

- Statement-set reader follow-ups from PR #235: add HTTP-level follower-route tests (including changed `blockNumber_lte`, missing chain, and scope/checkpoint rejection), and fault-injection/concurrent-read tests for per-statement persistence. The current multi-key `Promise.all(store.put(...))` is not a transactional snapshot despite the plan's “atomic family persist” wording. Also make the exactness boundary explicit for source-document retraction: document reads use current publication state, not the frozen finalized block, and unavailable documents currently remain eligible as sources.

- Fold-archive follow-ups from the cold-start work: segment manifests rebuild every window on each request; the gateway cache key is the URL while the body depends on `Accept-Encoding`; the implications fold key is the beliefs address, so an implications-contract change does not invalidate that accumulator.

- Redeploy testnet `NoteIntent` after the cold-start narrowing lands. `NoteIntentAttested` indexes `intendedStatementId` instead of `noteContract`. Update the deployment address and start block. Local wipe does not update Base Sepolia. Do not touch mainnet.

- Give the bridge creator a short-distance policy: sometimes publish statements that stay very close to positions people have actually expressed, including a mode that writes those positions up with no real attempt to bridge. Longer-distance policies (bigger concessions) stay available as other varieties. A faithful write-up is the near end of that range, not a separate product. See [bridge creator](specs/product/bridge-creator.md) and [public statement mapping](specs/product/public-statement-mapping/README.md).

- Make beat-memory pay attention to influence. Today it counts distinct source authors and can upweight or downweight a source for coverage quality. It never reads audience size or otherwise prefers more-influential channels when it ingests, extracts, or retrieves. Weight or prioritize influential channels so the context handed to the bridge creator reflects what prominent voices are saying, without turning that weight into a public support count. See [beat agents](specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md). Do this in a way that still satisfies the X-rules item below: influence may decide what to read, and must not become a stored political profile of a user.

- Fix beat-memory so following an X beat does not break [X's restricted-use rules](https://docs.x.com/developer-terms/restricted-use-cases). Aggregate discourse memory is allowed. A durable identifiable record of a user's politics is not. Today every observation stores `sourceAuthors`, the extractor is told to use account reputation and known positions, and source management writes a lasting `BeatSourceAssessment` per author. Keep what the job needs: recent posts long enough to interpret a thread or a callback, then drop the user id, username, and other linkable identifiers. Discourse memory (phrase meanings, live arguments, factional shorthand) must not name a user. Do not keep a standing note that this account holds this position, belongs to this faction, or has this reputation. These limits apply to X API content; organization sites, vote records, and Commonality's own indexer are outside them. See [beat agents](specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md).

- We should have a UI for making it easy for a user to follow projects aligned with *similar* statements to the ones he prefers, and then if he wants to he can do the alignment-attestations to make those projects also show up on his own preferred cause board.

- Complete work-request UI revisions and withdrawals, version/history inspection for offers and responses, and a browser-tested playground demonstration. SDK versioned publication actions exist; the current UI primarily creates records.

- Redeploy testnet `ContentRegistry`, `ProjectFactory`, and `CreatorAssuranceContractFactory` so structured work-item registration is live, including `setWorkRegistrar` for the project factory. Update deployment addresses and start blocks. Local wipe does not update Base Sepolia. Do not touch mainnet. Format: [work items](specs/tech/subsystems/work-items.md).

- Show a work item's funding history in the UI from `WorkItemRegistered` and `WorkItemReleased`, including failed attempts and the successful request. The project page currently lists the current description or the generated `project:` id only.

- Browser-check structured work on a live local stack: create a project with no work ids, create one with an explicit id, show the active-reservation conflict, and confirm a work-item attestation on a fundable-projects board names that item rather than the whole bundle.

- Next fake-data/seed-data step lives in [`fake-data-generation/PLAN.md`](fake-data-generation/PLAN.md). Abortion, immigration, crime, and LGBT-schools triples are accepted; next is the demo-seed live UI pass.

- Next testnet-lab step lives in [`workflow/testnet-working-plan.md`](workflow/testnet-working-plan.md). Items 1–10 are checked. The nightly wrapper exports the mutation flag itself. The job still exits red until the local deep-stack item below passes. Indexer ingest is in [`inbox.md`](inbox.md) only if GraphQL goes red again. Do not mix with mass fake activity or mainnet.

----

- Resume the paused v2 step-14 stage-100 remote run (392/1508 mined, 4 submitted hashes; state in `fake-data-generation/output/campaigns/medium-realistic-v2-step14/stage-100/execution/actions.jsonl`). Resume instructions, verify-first gate, and reconcile/report steps are in `continuity/2026-10-02-v2-funding-step14-handoff.md`. Regenerate preflight artifacts (wording fix landed after they were generated) and check off item 14 in `fake-data-generation/TESTNET-SIMULATION-PLAN.md` when done.

- Send the donor-set waiting-period page. Note and project screens show a pending spend's amount and deadline as money that can still be cancelled. `shouldPageDonor` still only decides once per `(noteId, nonce)`. There is no opt-in store and no email or push sender. Public remarks from people who are not flaggers stay a later UI feature and are not stored on-chain. Rules: [waiting-period.md](specs/tech/subsystems/delegation/waiting-period.md).

- Nightly `verifier:deep-cadence` still runs the local destructive stack first (`stack.fresh-seeded`, `operations.local-stack-health`, `stack.restart-consistency`, `operations.indexer-lag`, `artifact.ipfs-domain-smoke`, `stack.user-journeys`). A failure there exits the job red even when the testnet mutation canary is fine. Boot that stack and get those checks passing. `verifier/PLAN.md` already says a broken local stack is a bug, not a skip.

- Rewrite [`specs/product/ui-domains.md`](specs/product/ui-domains.md) so Commonality is the founder-first CauseStarter experience (organize a cause, enroll people, fund the work), not the retired umbrella movement landing that sent newcomers to LazyGiving/Tally. Keep eight sites; siblings stay tools/verticals. Check [`specs/tech/ui-domains.md`](specs/tech/ui-domains.md), glossary, and README for the same stale “movement site / choose a product site next” framing. The old landing and `/participate` are gone.

----

- Refresh `data/seed-implication-evaluations.original-variants.json`
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
