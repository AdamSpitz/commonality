# To Do

This is the project's inbox; use this for tasks that might be suitable for an LLM to do.

If you have stuff that needs human attention, you can put it in [Adam's inbox](/inbox.md) instead. See [task autonomy tiers](/workflow/task-tiers.md).

CauseStarter also keeps its own product/architecture backlog in [`causestarter/TODO.md`](./causestarter/TODO.md) (open incompleteness allowed at merge). Prefer filing CauseStarter-specific follow-ups there when they are package-local; use this root list for cross-cutting work or items that should be visible to any LLM picking up the project inbox.

When an item from this page is done and no longer needs an LLM implementor's attention, don't mark it "done", just delete it. I don't want this file to get cluttered with already-completed items.

----

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

- Stop `stack.fresh-seeded` and `stack.restart-consistency` from racing in the deep
  cadence. On 2026-08-19 the nightly run seeded successfully and then destroyed the
  result: `stack.fresh-seeded` started 02:15:12 and was still mid-run when
  `stack.restart-consistency` began at 02:18:31 (see
  `verifier/artifacts/stack.restart-consistency/2026-08-19T06-18-31.768Z-7d0c3d6e/command.log`,
  which ends in `Error response from daemon: No such container: 1ffc7816…`). Its
  `docker compose stop hardhat-node && up -d` replaced the seeded anvil with an empty
  one at 02:19:30; `hardhat-deploy` then redeployed contracts (blocks 1-31) and the
  alignment-trust bootstrap wired trust (blocks 32-41), and nothing else ever landed.
  Adam woke up to a stack with 48 blocks, 119 logs, and zero cause rosters — while the
  cadence summary reported `PASS stack.fresh-seeded`. Both checks are destructive to the
  local stack and must be serialized (or share a lock / be placed in a mutually exclusive
  supervisor group); a green `fresh-seeded` that another check has since wiped is worse
  than a red one. Two sub-issues found alongside it:
  (a) `anvil --state /data/state.json` is not giving restart durability — the restarted
  anvil came up empty rather than reloading the snapshot, which is also why
  `stack.restart-consistency` itself failed. Its comment claims `up -d --no-deps` avoids
  rerunning `hardhat-deploy`, but deploy ran anyway.
  (b) `stack.fresh-seeded` only probes endpoint reachability, so an unseeded-but-healthy
  stack passes it. It should assert the seed's own artifacts exist (e.g. the
  `local-food-systems` / `christianity` roster refs for Hardhat #0 and the
  `bookmarked-causes` refs for #0-#9), not just that the RPC answers.
  Workaround if you hit this again: `./scripts/data.sh --seed=tiny --use-hardhat-accounts
  --allow-seed-on-existing-data` reseeds onto the live stack without a wipe.



- [ ] **(Tell)** Measure whether the proposed planks/views model can fold `DirectSupport` events per plank client-side at approximately 10⁵ signers, or whether it needs a server-side fold. This is currently an unmeasured assertion in [shaping-your-cause-statements.md](docs/founder/shaping-your-cause-statements.md). Report the setup, timings, memory/browser behavior, and conclusion; do not build the server-side path yet.

- Verify the new local public-goods demo-seed storyline against a live stack. `PROJECT_SEED_METADATA[0]` is now "Riverside Community Garden" (aligned to `fundable-projects`/`local-community`/`local-food-systems`), `DETERMINISTIC_SEED_PROJECT_ALIGNMENT_COUNT` is 6 so no existing storyline lost its alignment, and `gen:seed:local` runs 12 users to keep the success-attester pool satisfied. Unit tests pass, but the seed has still never been run end-to-end: `stack.fresh-seeded` now passes (2026-08-03) but it seeds `tiny`, not `demo`. Run `./scripts/data.sh --wipe && ./scripts/data.sh --seed=demo` and confirm in the UI that the garden project shows an alignment vouch, contributions, and a success attestation. Consider also regenerating `data/seed-worker-outputs.json` if the Explorer fixture should mention the new cause.

- Give the demo seed (`./scripts/data.sh --seed=demo`) more **local public-goods** coverage. One storyline now exists (see above), but rows A5 (federated regional) and E2 (nonprofit on the rails) in [use-cases.md](specs/product/use-cases.md) are still not demonstrable — and those are exactly the cases the strategy docs lean on hardest. Note also that the project-creation form ships "Community garden" / "Clean water" / "Learning circle" stock images that nothing in the seed uses. Found 2026-07-25 while verifying use-case statuses against the live UI.
