# To Do

This is the project's inbox; use this for tasks that might be suitable for an LLM to do.

If you have stuff that needs human attention, you can put it in [Adam's inbox](/inbox.md) instead. See [task autonomy tiers](/workflow/task-tiers.md).

CauseStarter also keeps its own product/architecture backlog in [`causestarter/TODO.md`](./causestarter/TODO.md) (open incompleteness allowed at merge). Prefer filing CauseStarter-specific follow-ups there when they are package-local; use this root list for cross-cutting work or items that should be visible to any LLM picking up the project inbox.

When an item from this page is done and no longer needs an LLM implementor's attention, don't mark it "done", just delete it. I don't want this file to get cluttered with already-completed items.

----

- Wire the CauseStarter alignment-trust bootstrap through the complete testnet
  operations path. Local Docker Compose is done (`services.sh --start` builds and
  starts the worker, and CauseStarter receives the local Hardhat #8 root), but
  Base Sepolia/Render is not: add the dedicated wallet role to
  `scripts/generate-wallets.mjs`; add the private key to `.env.secrets.example`
  and `scripts/generate-render-secrets.mjs`; add a persistent-disk Render worker
  to `render.yaml.template` and regenerate `render.yaml`; publish the matching
  `VITE_DEFAULT_ALIGNMENT_TRUST_ROOT` through the Base Sepolia/CauseStarter UI
  configuration; document funding, pause, and denylist-edit procedures; and add
  a testnet check proving the configured root has direct trust for an observed
  alignment attester and excludes a denylisted one. The human wallet creation,
  funding, and secret installation are separately recorded in `inbox.md`.

- Add a fresh-stack integration test for the alignment-trust bootstrap: publish
  an alignment vouch from a previously unknown wallet, observe the service's
  `TrustSet(..., 100)`, confirm a wallet with no personal graph sees that vouch
  through CauseStarter's one-hop fallback, then add the attester to the denylist
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

- Fix the three failing funding-portal integration tests. `automated.test-full-integration` fails (exit 3, 101 passing / 3 failing) because cause-level aggregation reads back `0n` where seeded contributions should appear: "total funding raised across all aligned projects for a cause" expects `800000n` (`integration-tests/src/fundingportal/fundingportal-aggregated-metrics.test.ts:219`), and the leaderboard tests expect `3000000n` and `2000000n` (`fundingportal-leaderboards.test.ts:221` and `:346`). All three get `0n`, so suspect one shared cause: contributions not being attributed to the cause in the aggregation query/indexer rather than three separate bugs. This is the only red under `automated.test-full` — SDK, Hardhat, and UI legs pass.

- Fix the canonical Playwright user journeys (`stack.user-journeys`, exit 1). The content-funding flow reverts in `verifyChannel` with `InvalidVerifierSignature()` (custom error `0x0574e985`) when creating a channel and landing on the creators page, and retries hit the same error. Either the signer/verifier key the E2E harness uses no longer matches the deployed `ChannelRegistry` verifier, or the signed payload's shape/domain changed.



- [ ] **(Tell)** Measure whether the proposed planks/views model can fold `DirectSupport` events per plank client-side at approximately 10⁵ signers, or whether it needs a server-side fold. This is currently an unmeasured assertion in [shaping-your-cause-statements.md](docs/founder/shaping-your-cause-statements.md). Report the setup, timings, memory/browser behavior, and conclusion; do not build the server-side path yet.

- [ ] **(Tell)** Test whether the real implication-attester prompt blesses representative plank→disjunctive-anchor arrows. This is currently a logical argument rather than an observed result in [shaping-your-cause-statements.md](docs/founder/shaping-your-cause-statements.md). Report accepted/rejected cases and reasoning; do not build anchor tooling yet.

- Verify the new local public-goods demo-seed storyline against a live stack. `PROJECT_SEED_METADATA[0]` is now "Riverside Community Garden" (aligned to `fundable-projects`/`local-community`/`local-food-systems`), `DETERMINISTIC_SEED_PROJECT_ALIGNMENT_COUNT` is 6 so no existing storyline lost its alignment, and `gen:seed:local` runs 12 users to keep the success-attester pool satisfied. Unit tests pass, but the seed has still never been run end-to-end: `stack.fresh-seeded` now passes (2026-08-03) but it seeds `tiny`, not `demo`. Run `./scripts/data.sh --wipe && ./scripts/data.sh --seed=demo` and confirm in the UI that the garden project shows an alignment vouch, contributions, and a success attestation. Consider also regenerating `data/seed-worker-outputs.json` if the Explorer fixture should mention the new cause.

- Give the demo seed (`./scripts/data.sh --seed=demo`) more **local public-goods** coverage. One storyline now exists (see above), but rows A5 (federated regional) and E2 (nonprofit on the rails) in [use-cases.md](specs/product/use-cases.md) are still not demonstrable — and those are exactly the cases the strategy docs lean on hardest. Note also that the project-creation form ships "Community garden" / "Clean water" / "Learning circle" stock images that nothing in the seed uses. Found 2026-07-25 while verifying use-case statuses against the live UI.
