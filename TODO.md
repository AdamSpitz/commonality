# To Do

This is the project's inbox; use this for tasks that might be suitable for an LLM to do.

If you have stuff that needs human attention, you can put it in [Adam's inbox](/inbox.md) instead. See [task autonomy tiers](/workflow/task-tiers.md).

CauseStarter also keeps its own product/architecture backlog in [`causestarter/TODO.md`](./causestarter/TODO.md) (open incompleteness allowed at merge). Prefer filing CauseStarter-specific follow-ups there when they are package-local; use this root list for cross-cutting work or items that should be visible to any LLM picking up the project inbox.

When an item from this page is done and no longer needs an LLM implementor's attention, don't mark it "done", just delete it. I don't want this file to get cluttered with already-completed items.

----

- [ ] **(Tell)** Finish the accepted causes-as-publications rollout. The retrieval-first
  CauseStarter authoring flow, deterministic approval, versioned publications/draft
  compatibility, cause-first page, derived views, aligned-project union, recurring-pledge
  signal, statement-scoped one-time/monthly delegation entry points, and organizer
  create/publish/revise/share browser journey are implemented. Remaining: settle and add
  the public delegate-offering picker semantics; add the visitor end-to-end journey; run
  published-cause/local-draft regression coverage; and
  validate the complete journey with non-expert users. Work through the open
  items in [the implementation plan](specs/product/causes-as-publications-implementation-plan.md);
  product semantics are in [the living spec](specs/product/causes-as-publications.md), with
  frozen rationale in [ADR 0009](specs/decisions/0009-causes-are-publications-over-statements.md).

- Fix the three failing funding-portal integration tests. `automated.test-full-integration` fails (exit 3, 101 passing / 3 failing) because cause-level aggregation reads back `0n` where seeded contributions should appear: "total funding raised across all aligned projects for a cause" expects `800000n` (`integration-tests/src/fundingportal/fundingportal-aggregated-metrics.test.ts:219`), and the leaderboard tests expect `3000000n` and `2000000n` (`fundingportal-leaderboards.test.ts:221` and `:346`). All three get `0n`, so suspect one shared cause: contributions not being attributed to the cause in the aggregation query/indexer rather than three separate bugs. This is the only red under `automated.test-full` — SDK, Hardhat, and UI legs pass.

- Fix the canonical Playwright user journeys (`stack.user-journeys`, exit 1). The content-funding flow reverts in `verifyChannel` with `InvalidVerifierSignature()` (custom error `0x0574e985`) when creating a channel and landing on the creators page, and retries hit the same error. Either the signer/verifier key the E2E harness uses no longer matches the deployed `ChannelRegistry` verifier, or the signed payload's shape/domain changed.

- [ ] **(Tell)** Finish sponsored-gas rollout. The UI/SDK transaction wiring now submits first-time `approve + buyERC1155` and `setApprovalForAll + refundERC1155` as atomic Kernel-compatible EIP-5792 batches (`cef4af18`), with tests covering both paths. Remaining: merge/deploy that UI wiring and the batch-capable platform API endpoint, then enroll and fund a Base Sepolia creator tank. The deployed paymaster deliberately rejects standalone approval UserOps. The final human Privy OTP trace and production cap tuning are in [inbox.md](inbox.md); implementation details are in [sponsored-gas.md](specs/tech/sponsored-gas.md).

- Remaining recurring-pledges work is operational: deploy the updated contracts to testnet, regenerate `deployments/base-sepolia.env`/`render.yaml`, copy/fund the scheduler key, set `RECURRING_PLEDGE_SCHEDULER_ENABLED=true`, redeploy workers, and verify a due pledge produces a `StandingPledgeExecuted` event through the indexer.

- [ ] **(Tell)** Deliver the policy-list **starter-profile vertical slice** as generic shared infrastructure proven by a complete **Civility reference integration**: a Civility-style cause vertical can adopt one operator-selected, content-hash-pinned HTTPS blocklist maintained by someone else, plus an optional pinned local exception list, without designing or maintaining its own moderation dataset. The schemas, canonical identities, evaluator, bundles, bounded HTTPS resolver, example profile, operator workflow, client integration, opt-in policy-enforced content gateway, Civility gateway routing, client/server digest guard, public-surface/no-bypass matrix, and source/deployed verifier guards now exist. Remaining: publish/configure the resolved bundle, redeploy the gateway/UI, then run `testnet.policy-enforcement` to prove active-digest agreement and live blocked-fixture refusal. As of the 2026-08-02 refresh that check still fails with the deployed configuration incomplete on every count: Civility's config has no `VITE_POLICY_BUNDLE_URL`, the configured artifact is not a v1 resolved bundle and has no canonical digest, the blocked fixture CID is not asserted by the resolved bundle, the gateway returns no status where a 451 is expected, and it reports `unreported` instead of `current` — so the source-side work landed but nothing is configured on the deployed testnet yet. Do not add Civility-specific policy semantics; use Civility to prove and harden the generic path. CSM and other vertical integrations follow later and do not block this stopping point. Defer automatic following of mutable unpinned lists, diff holds/review, richer alerting, registry publication, admission, and money screening. Details and the explicit stopping gate are in [the implementation plan](specs/tech/subsystems/policy-lists/implementation-plan.md); semantics remain in [the normative spec](specs/tech/subsystems/policy-lists/README.md).


- [ ] **(Tell)** Measure whether the proposed planks/views model can fold `DirectSupport` events per plank client-side at approximately 10⁵ signers, or whether it needs a server-side fold. This is currently an unmeasured assertion in [shaping-your-cause-statements.md](docs/founder/shaping-your-cause-statements.md). Report the setup, timings, memory/browser behavior, and conclusion; do not build the server-side path yet.

- [ ] **(Tell)** Test whether the real implication-attester prompt blesses representative plank→disjunctive-anchor arrows. This is currently a logical argument rather than an observed result in [shaping-your-cause-statements.md](docs/founder/shaping-your-cause-statements.md). Report accepted/rejected cases and reasoning; do not build anchor tooling yet.

- Verify the new local public-goods demo-seed storyline against a live stack. `PROJECT_SEED_METADATA[0]` is now "Riverside Community Garden" (aligned to `fundable-projects`/`local-community`/`local-food-systems`), `DETERMINISTIC_SEED_PROJECT_ALIGNMENT_COUNT` is 6 so no existing storyline lost its alignment, and `gen:seed:local` runs 12 users to keep the success-attester pool satisfied. Unit tests pass, but the seed has still never been run end-to-end: `stack.fresh-seeded` now passes (2026-08-03) but it seeds `tiny`, not `demo`. Run `./scripts/data.sh --wipe && ./scripts/data.sh --seed=demo` and confirm in the UI that the garden project shows an alignment vouch, contributions, and a success attestation. Consider also regenerating `data/seed-worker-outputs.json` if the Explorer fixture should mention the new cause.

- Give the demo seed (`./scripts/data.sh --seed=demo`) more **local public-goods** coverage. One storyline now exists (see above), but rows A5 (federated regional) and E2 (nonprofit on the rails) in [use-cases.md](specs/product/use-cases.md) are still not demonstrable — and those are exactly the cases the strategy docs lean on hardest. Note also that the project-creation form ships "Community garden" / "Clean water" / "Learning circle" stock images that nothing in the seed uses. Found 2026-07-25 while verifying use-case statuses against the live UI.
