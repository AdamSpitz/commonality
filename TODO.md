# To Do

This is the project's inbox; use this for tasks that might be suitable for an LLM to do.

If you have stuff that needs human attention, you can put it in [Adam's inbox](/inbox.md) instead. See [task autonomy tiers](/workflow/task-tiers.md).

CauseStarter also keeps its own product/architecture backlog in [`causestarter/TODO.md`](./causestarter/TODO.md) (open incompleteness allowed at merge). Prefer filing CauseStarter-specific follow-ups there when they are package-local; use this root list for cross-cutting work or items that should be visible to any LLM picking up the project inbox.

When an item from this page is done and no longer needs an LLM implementor's attention, don't mark it "done", just delete it. I don't want this file to get cluttered with already-completed items.

----

- [ ] **(Tell)** Stand up **cause-assist on testnet** (it is local-only today: Docker Compose / `:3002`, no Render service, not in `render.yaml` or the Cloudflare service gateway). Needed for CauseStarter LLM helpers (`/check-coherence`, atomize, etc.). Operator coherence **badges** should follow the worker design in the item below (do not plan testnet around a public SPA-callable `/attest-coherence` long-term). Ship a deployed service for the LLM HTTP API, wire env: `XAI_API_KEY` (or OpenRouter), model overrides as needed; expose a stable public or gateway URL; point testnet CauseStarter’s `/api/cause-assist` (or `VITE_CAUSE_ASSIST_URL`) at it; confirm `/health`. Badge minting needs the operator key on the **worker** (or an internal-only path), not a browser-reachable hot wallet. Until assist + worker exist on testnet, roster publish soft-fails coherence (preview may also fail if the SPA has no assist backend).

- [ ] **(Tell)** Move operator coherence badges off the public HTTP path: **worker watches `RefUpdated`, not the SPA.** Today after `publishRoster` the CauseStarter browser calls cause-assist `POST /attest-coherence`, which can spend `CAUSE_ASSIST_COHERENCE_ATTESTER_PRIVATE_KEY` behind only a rate limit. Goal: only a trusted process that observed a real on-chain tip update may mint badges.

  ### Why this shape
  - Product rule: founder never self-attests; operator key is `msg.sender` on `AlignmentAttestations`.
  - `publishRoster` already emits a clear chain signal — no custom “roster published” contract needed.
  - Prefer this over shared secrets in the SPA, mTLS, or founder-signed challenges (see prior discussion). Binding + LLM rules already live in cause-assist; reuse them.

  ### Current code (start here)
  - Publish path: `causestarter/src/lib/causeRoster.ts` → `publishRoster` — `PublishedData.publishData` then `MutableRefUpdater.updateRef(slug, rosterCid)` (EIP-5792 batch when possible).
  - SPA post-publish attest (remove or soft-fail only until worker exists): `causestarter/src/pages/CauseDetailPage.tsx` calls `requestCoherenceAttestation` in `causestarter/src/lib/causeAssistClient.ts`.
  - Bind + judge + write: `cause-assist/src/bindRosterPayload.ts`, `attestCoherence.ts`, `coherenceCheck.ts`, `blockchain.ts`, `rosterDocument.ts` (`kind: causestarter.roster`, schema version 1). Attest already requires CID recompute from `title/summary/plankCids/mediatorBlurb` and loads plank **texts by CID**; only `verdict.source === 'llm'` may mint (`judgment_unavailable` for heuristic).
  - HTTP surface today: `cause-assist/src/app.ts` `POST /attest-coherence` (public + rate limit). Keep `POST /check-coherence` as the **preview-only** public route (no chain write).
  - Mirror pattern to copy: `published-data-ipfs-mirror/` (poll logs, cursor/state file, permissionless, Compose service). Contract: `hardhat/contracts/utils/MutableRefUpdater.sol` event `RefUpdated(address indexed owner, string name, string currentRefValue)`. Indexer already registers `MutableRefUpdater:RefUpdated` (`indexer/src/events-cache/index.ts`). Reserved ref names that are **not** cause slugs: `RESERVED_REF_NAMES` in `causestarter/src/lib/causeRoster.ts` (`created-statements`, `favorites`, `bookmarks`, `draft-post`).
  - Badge display already reloads from chain: `loadRosterCoherenceBadge` + operator address from `/health` — SPA only needs to stop *requesting* the mint.

  ### Target design
  1. **Worker** (new package or Compose service; closest sibling is `published-data-ipfs-mirror`):
     - Poll (or subscribe) for `MutableRefUpdater.RefUpdated` via RPC logs and/or event-cache, with a durable cursor (block number + log index) in a state file under the data dir.
     - For each event:
       - Skip empty `currentRefValue`.
       - Skip `name` in `RESERVED_REF_NAMES` (and any future reserved list shared with CauseStarter).
       - Load document at `currentRefValue` (PublishedData / IPFS / same resolvers as `createDefaultDocumentStore`). Require `extras.kind === 'causestarter.roster'` and valid schema version; otherwise ignore (not every ref is a cause).
       - Treat `currentRefValue` as `rosterCid`. Build attest input from **loaded** roster fields (`title`, `summary`, `plankCids`, `mediatorBlurb`) — do not trust browser-supplied free-form plank strings.
       - Run the same path as `attestCoherenceIfJudged` (bind plank texts by CID → LLM only → `publishCoherenceAttestation`). Silence on mismatch, unloadable content, heuristic-only, not coherent, or attester not configured. Never write a negative on-chain judgment.
       - Idempotent: existing `hasCoherenceAttestation` / `already_attested` handles re-processing and tip rewrites to the same CID.
     - Retry briefly when content is not yet available (indexer/mirror lag after the same tx); then log and continue (do not crash the loop).
  2. **Hot wallet placement** (pick one; document the choice in the worker README):
     - **Preferred:** worker imports pure helpers from cause-assist/sdk and holds `CAUSE_ASSIST_COHERENCE_ATTESTER_PRIVATE_KEY` itself; **or**
     - Worker calls an **internal-only** attest entrypoint (loopback / docker network, not published on nginx `/api/cause-assist/`, not on host `0.0.0.0`).
  3. **Remove public chain-write surface:**
     - Stop CauseStarter from calling `POST /attest-coherence` after publish (soft-fail path goes away for badges; UI only polls/loads `loadRosterCoherenceBadge`).
     - Delete or disable public `POST /attest-coherence` (or guard so it cannot run without internal auth that the SPA never has). Preview stays on `POST /check-coherence`.
  4. **Compose / ops:** service in `docker-compose.yml`, start with local stack (`scripts/services.sh` / `deploy-causestarter.sh` as appropriate), env: RPC, chain id, MutableRefUpdater + AlignmentAttestations + PublishedData addresses, operator private key, XAI/OpenRouter for LLM, IPFS gateway / event-cache as needed for document load. Mirror `published-data-ipfs-mirror` restart/health patterns.
  5. **Tests:** unit tests for filter (reserved name, non-roster doc, empty value), bind+attest reuse, idempotency; if feasible a small integration test with a synthetic `RefUpdated` + fake content resolver (see SDK test fakes).

  ### Acceptance
  - Publishing a roster (founder wallet) eventually yields an operator coherence badge **without** the browser calling a chain-write API, when LLM judges coherent and operator key is configured.
  - No public unauthenticated route can spend the operator key.
  - Non-roster `RefUpdated` events never mint badges.
  - Re-processing the same tip is a no-op (`already_attested`).
  - Local docs: `cause-assist/README.md` and/or new worker README describe the watch signal, filters, and env; `causestarter/TODO.md` note if useful.

  ### Out of scope for this task
  - Merit judgment, negative on-chain attestations, discovery ranking.
  - Changing roster document schema.
  - Full testnet deploy (separate TODO item above) — but do not re-introduce a public attest HTTP API as the testnet design.

- Fix the three failing funding-portal integration tests. `automated.test-full-integration` fails (exit 3, 101 passing / 3 failing) because cause-level aggregation reads back `0n` where seeded contributions should appear: "total funding raised across all aligned projects for a cause" expects `800000n` (`integration-tests/src/fundingportal/fundingportal-aggregated-metrics.test.ts:219`), and the leaderboard tests expect `3000000n` and `2000000n` (`fundingportal-leaderboards.test.ts:221` and `:346`). All three get `0n`, so suspect one shared cause: contributions not being attributed to the cause in the aggregation query/indexer rather than three separate bugs. This is the only red under `automated.test-full` — SDK, Hardhat, and UI legs pass.

- Fix the canonical Playwright user journeys (`stack.user-journeys`, exit 1). The content-funding flow reverts in `verifyChannel` with `InvalidVerifierSignature()` (custom error `0x0574e985`) when creating a channel and landing on the creators page, and retries hit the same error. Either the signer/verifier key the E2E harness uses no longer matches the deployed `ChannelRegistry` verifier, or the signed payload's shape/domain changed.

- [ ] **(Tell)** Finish sponsored-gas rollout. The UI/SDK transaction wiring now submits first-time `approve + buyERC1155` and `setApprovalForAll + refundERC1155` as atomic Kernel-compatible EIP-5792 batches (`cef4af18`), with tests covering both paths. Remaining: merge/deploy that UI wiring and the batch-capable platform API endpoint, then enroll and fund a Base Sepolia creator tank. The deployed paymaster deliberately rejects standalone approval UserOps. The final human Privy OTP trace and production cap tuning are in [inbox.md](inbox.md); implementation details are in [sponsored-gas.md](specs/tech/sponsored-gas.md).

- Remaining recurring-pledges work is operational: deploy the updated contracts to testnet, regenerate `deployments/base-sepolia.env`/`render.yaml`, copy/fund the scheduler key, set `RECURRING_PLEDGE_SCHEDULER_ENABLED=true`, redeploy workers, and verify a due pledge produces a `StandingPledgeExecuted` event through the indexer.

- [ ] **(Tell)** Deliver the policy-list **starter-profile vertical slice** as generic shared infrastructure proven by a complete **Civility reference integration**: a Civility-style cause vertical can adopt one operator-selected, content-hash-pinned HTTPS blocklist maintained by someone else, plus an optional pinned local exception list, without designing or maintaining its own moderation dataset. The schemas, canonical identities, evaluator, bundles, bounded HTTPS resolver, example profile, operator workflow, client integration, opt-in policy-enforced content gateway, Civility gateway routing, client/server digest guard, public-surface/no-bypass matrix, and source/deployed verifier guards now exist. Remaining: publish/configure the resolved bundle, redeploy the gateway/UI, then run `testnet.policy-enforcement` to prove active-digest agreement and live blocked-fixture refusal. As of the 2026-08-02 refresh that check still fails with the deployed configuration incomplete on every count: Civility's config has no `VITE_POLICY_BUNDLE_URL`, the configured artifact is not a v1 resolved bundle and has no canonical digest, the blocked fixture CID is not asserted by the resolved bundle, the gateway returns no status where a 451 is expected, and it reports `unreported` instead of `current` — so the source-side work landed but nothing is configured on the deployed testnet yet. Do not add Civility-specific policy semantics; use Civility to prove and harden the generic path. CSM and other vertical integrations follow later and do not block this stopping point. Defer automatic following of mutable unpinned lists, diff holds/review, richer alerting, registry publication, admission, and money screening. Details and the explicit stopping gate are in [the implementation plan](specs/tech/subsystems/policy-lists/implementation-plan.md); semantics remain in [the normative spec](specs/tech/subsystems/policy-lists/README.md).


- [ ] **(Tell)** Measure whether the proposed planks/views model can fold `DirectSupport` events per plank client-side at approximately 10⁵ signers, or whether it needs a server-side fold. This is currently an unmeasured assertion in [shaping-your-cause-statements.md](docs/founder/shaping-your-cause-statements.md). Report the setup, timings, memory/browser behavior, and conclusion; do not build the server-side path yet.

- [ ] **(Tell)** Test whether the real implication-attester prompt blesses representative plank→disjunctive-anchor arrows. This is currently a logical argument rather than an observed result in [shaping-your-cause-statements.md](docs/founder/shaping-your-cause-statements.md). Report accepted/rejected cases and reasoning; do not build anchor tooling yet.

- Verify the new local public-goods demo-seed storyline against a live stack. `PROJECT_SEED_METADATA[0]` is now "Riverside Community Garden" (aligned to `fundable-projects`/`local-community`/`local-food-systems`), `DETERMINISTIC_SEED_PROJECT_ALIGNMENT_COUNT` is 6 so no existing storyline lost its alignment, and `gen:seed:local` runs 12 users to keep the success-attester pool satisfied. Unit tests pass, but the seed has still never been run end-to-end: `stack.fresh-seeded` now passes (2026-08-03) but it seeds `tiny`, not `demo`. Run `./scripts/data.sh --wipe && ./scripts/data.sh --seed=demo` and confirm in the UI that the garden project shows an alignment vouch, contributions, and a success attestation. Consider also regenerating `data/seed-worker-outputs.json` if the Explorer fixture should mention the new cause.

- Give the demo seed (`./scripts/data.sh --seed=demo`) more **local public-goods** coverage. One storyline now exists (see above), but rows A5 (federated regional) and E2 (nonprofit on the rails) in [use-cases.md](specs/product/use-cases.md) are still not demonstrable — and those are exactly the cases the strategy docs lean on hardest. Note also that the project-creation form ships "Community garden" / "Clean water" / "Learning circle" stock images that nothing in the seed uses. Found 2026-07-25 while verifying use-case statuses against the live UI.
