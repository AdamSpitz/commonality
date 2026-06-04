# Continuity notes for ephemeral AI instances

Append new entries to the end of the file.


## 2026-05-30 — Automation backlog: IPFS/indexer degradation canaries

- Continued TODO automation-backlog work from workflow/testing/manual-tests §11, focusing on operations/degradation canaries and LazyGiving metadata fallback behavior.
- LazyGiving browse/detail pages now treat unavailable IPFS project/token metadata as degraded metadata, not a page-level failure: they show warning alerts and keep on-chain project data plus funding actions visible.
- Added UI Vitest coverage for unavailable project metadata, partial browse-page metadata failures, and token-metadata failure while keeping Buy Tokens available.
- Hardened SDK event-cache fetching so malformed indexer responses (`{ data: [] }` or non-JSON HTML) throw clear errors instead of silently becoming empty event lists.
- Updated the manual automation backlog notes to record this partial IPFS/indexer conventional coverage while leaving full end-to-end dependency-failure canaries pending.
- Checks passed: `npm run test:vitest --workspace=ui -- --run src/lazyGiving/pages/ProjectDetailPage.test.tsx src/lazyGiving/pages/BrowseProjectsPage.test.tsx`; `npm test --workspace=@commonality/sdk -- eventCacheClient.test.ts` (Mocha pattern warning; full SDK suite ran and passed); `npm run typecheck --workspace=ui`; `npm run typecheck --workspace=@commonality/sdk`; `npm run lint --workspace=ui`; `npm run lint --workspace=@commonality/sdk`; `npm run build --workspace=@commonality/sdk`; `npm run build --workspace=ui` (existing third-party Rollup PURE/chunk warnings); `git diff --check`.
- LSP diagnostics are clean on touched files; workspace diagnostics still show pre-existing `useCachedProjects.test.ts` ProjectWithMetrics/address errors even though `npm run typecheck --workspace=ui` passes.

## 2026-05-31 — Cloudflare service gateway plan implemented

- Switched deployment config/docs from per-service Render custom domains to the long-term model: Cloudflare as public edge, Render as compute.
- Added `cloudflare-service-gateway/` Worker with path routing from `services.testnet.commonality.works/{indexer,platform-api,attesters,workers}` to Render service origins, plus Wrangler configs for testnet/mainnet and a Node unit test.
- Updated `deployments/base-sepolia.env`, `render.yaml.template`, regenerated `render.yaml`, and deployment docs/scripts to use gateway URLs.
- Checks passed: `npm run cloudflare-gateway:test`, `npm run smoke-check`, `npm run check:docs-inventory`, `npm run check:docs-links`; LSP workspace diagnostics clean.

## 2026-05-31 — Temporary direct Render URL fallback enabled

- Switched current testnet env/config from the future Cloudflare gateway URL to direct Render `*.onrender.com` service URLs until the Cloudflare route is ready.
- Updated `deployments/base-sepolia.env`, `render.yaml.template`, regenerated `render.yaml`, and adjusted setup/deployment docs/scripts examples.
- The Cloudflare Worker gateway remains in the repo as the intended long-term edge; switch back to `services.testnet.commonality.works/*` after deploying it.
- Checks passed: `npm run smoke-check`, `npm run check:docs-links`, `npm run cloudflare-gateway:test`; LSP workspace diagnostics clean.

## 2026-06-01 — Render testnet deployment debugging: service hosts fixed, indexer still needs Ponder DB cleanup

- User created a local `.env.render` containing a Render API key so agents can inspect Render via API. `.env.render` is gitignored/local-excluded now. **Rotate this Render API key after debugging**; it was used by local scripts and briefly appeared in terminal output.
- Render services are connected to GitHub `AdamSpitz/commonality`, branch `master`, autoDeploy enabled. `dev` and `master` were fast-forwarded/pushed together during this session.
- Initial Render failures:
  - `commonality-service-host-attesters` and `commonality-service-host-workers` built but crashed with `Cannot find module '/app/service-host/dist/cli.js'`.
  - Fix committed/pushed as `6b640be Fix service-host Docker entrypoint`: `service-host/Dockerfile` now runs `node service-host/dist/src/cli.js`; `service-host/package.json` main points to `dist/src/cli.js`; `.env.render` added to `.gitignore`.
  - Verified after deploy: `https://commonality-service-host-attesters.onrender.com/health` and `https://commonality-service-host-workers.onrender.com/health` return OK; platform API health is OK.
- Temporary eth.limo-only naming config had already been pushed before this debugging session: current Render/UI public URLs should prefer `*.testnet.commonality.eth.limo`, while service URLs remain direct `*.onrender.com` until Cloudflare is ready.
- Indexer debugging:
  - `commonality-indexer` deploy initially failed because Ponder rejected the existing `public` DB schema: `MigrationError: Schema "public" was previously used by a different Ponder app`.
  - Commit `d5252f5 Use fresh Render indexer database schema` changed `DATABASE_SCHEMA` in `render.yaml.template`/`render.yaml` to `commonality_base_sepolia` and documented the workaround.
  - That schema was created by the failed attempt, so subsequent deploys now fail with the same Ponder error for `commonality_base_sepolia`.
  - Commit `c644bc1 Start testnet indexer at deployment block` changed `START_BLOCK`/`CONTENT_FUNDING_START_BLOCK` in `deployments/base-sepolia.env` from `1` to `42250200` and regenerated `render.yaml`; block `42250200` is just before the Base Sepolia contract deployment around 2026-05-31T23:08Z. This avoids backfilling from genesis.
  - Latest status at handoff: `commonality-indexer` still has live deploy `d5252f5` and the latest deploy `c644bc1` failed with `MigrationError: Schema "commonality_base_sepolia" was previously used by a different Ponder app`. Its GraphQL `_meta` still reports block 1 from the older live schema, so the `START_BLOCK` fix is not live yet.
- Important Ponder clue: this is not a normal code/build failure. Ponder stores app metadata in the schema and rejects redeploying a different build id into a non-dev schema. Relevant code is in `node_modules/ponder/src/database/index.ts`; it rejects when `previousApp.build_id !== buildId` unless `PONDER_EXPERIMENTAL_DB=platform` is set, or the schema is dropped/unused.
- Suggested next steps for fresh LLM:
  1. Decide the correct Ponder production DB strategy. Options to investigate: drop stale schemas in Render Postgres, use a brand-new schema name once after deciding config, or set `PONDER_EXPERIMENTAL_DB=platform` if that is the intended Ponder mode for stable redeploys.
  2. If using a fresh schema workaround, choose a new never-used schema name (for example `commonality_base_sepolia_v2`), update `render.yaml.template`, regenerate `render.yaml`, push, and verify `START_BLOCK=42250200` is live.
  3. If dropping schemas, use Render Postgres credentials/dashboard carefully; local Render API can inspect services/logs but does not obviously provide a simple SQL shell.
  4. After fixing the indexer, verify:
     - `curl https://commonality-indexer.onrender.com/graphql -H 'content-type: application/json' --data '{"query":"{ _meta { status } }"}'` reports a block near/after 42250200, not 1.
     - `curl https://commonality-indexer.onrender.com/api/events?limit=1` responds.
     - all four Render services are live in `tmp/render-inspect.mjs` or equivalent.
- Useful temp scripts created during debugging (gitignored under `tmp/`): `tmp/render-inspect.mjs`, `tmp/render-print-logs.mjs`, `tmp/render-logs.mjs`, `tmp/render-indexer-current-logs.mjs`, `tmp/find-base-sepolia-block.mjs`. They are disposable but can help the next agent continue.
- Checks run during this debugging:
  - `npm run build --workspace=@commonality/service-host`
  - `npm test --workspace=@commonality/service-host`
  - full pre-commit/Vitest suites ran via git hooks during commits and passed
  - `node scripts/smoke-check-render.mjs` passed after render.yaml changes
  - LSP diagnostics were clean before the last commit.

## 2026-06-01 — Render services live; indexer schema/backfill adjusted

- Continued Render testnet service debugging. Committed and pushed three deployment fixes through `dev` and `master`:
  - `45ad332` / `Fix Render indexer Ponder schema reuse`: moved Render indexer to fresh `DATABASE_SCHEMA=commonality_base_sepolia_v2` and set `PONDER_EXPERIMENTAL_DB=platform` so future Ponder redeploys can reuse a production schema instead of failing on build-id mismatch.
  - `7cd50fd` / `Respect Base Sepolia RPC log range limit`: added `PONDER_ETH_GET_LOGS_BLOCK_RANGE` plumbing in `indexer/ponder.config.ts` and set it to `10`, because the current Alchemy free-tier Base Sepolia RPC rejects wider `eth_getLogs` ranges.
  - `760214a` / `Start Render indexer from current testnet head`: moved the active Render indexer to fresh `DATABASE_SCHEMA=commonality_base_sepolia_v3` and bumped `START_BLOCK` / `CONTENT_FUNDING_START_BLOCK` to `42283090` to avoid free-tier historical-backfill rate limits. This intentionally abandons earlier Base Sepolia history for the first Render rehearsal; if old events matter later, lower the start block only after upgrading RPC capacity and use/drop to a fresh Ponder schema.
- Verified all four Render services are live on commit `760214a`:
  - `https://commonality-indexer.onrender.com/graphql` returns `_meta` around block `42283216`, tracking current Base Sepolia head.
  - `https://commonality-indexer.onrender.com/api/events?limit=1` returns `200` with an empty items array.
  - platform API `/health`, attesters `/health`, and workers `/health` all return OK.
- Render shows one duplicate/failed indexer deploy for the same commit because both auto-deploy and a manual API deploy were triggered close together; the other indexer deploy for `760214a` is live and healthy.
- Checks run locally: `npm run smoke-check`, `npm run typecheck --workspace=commonality-indexer`, `lsp_diagnostics indexer/ponder.config.ts` clean. `git diff --check` failed because of a pre-existing unrelated uncommitted change in `ui/src/domains/commonality/LandingPage.tsx` with trailing whitespace/TODO; I did not touch or commit that file.
- Security note: the Render API key and the Alchemy RPC URL/key were used during debugging and appeared in local terminal/tool output. Rotate the Render API key (as already noted) and consider rotating the Alchemy key too.

## 2026-06-01 — Render indexer manual redeploy lock failure explained/fixed

- User manually redeployed the indexer after the service was healthy, but the deploy failed. Logs showed the cause: `MigrationError: Failed to acquire lock on schema "commonality_base_sepolia_v3". A different Ponder app is actively using this schema.` Render's web-service rolling deploy starts the new container before stopping the old healthy one; Ponder `start` needs an exclusive schema lock, so the new container cannot become healthy while the old one is still live.
- Immediate dashboard-green workaround: moved Render rehearsal indexer to fresh `DATABASE_SCHEMA=commonality_base_sepolia_v4` and bumped `START_BLOCK` / `CONTENT_FUNDING_START_BLOCK` to `42284625`, committed as `ff14ab3 Move Render indexer past locked schema`, pushed to `dev` and `master`.
- Verified all four Render services are now live on commit `ff14ab3`; indexer `_meta` returns block `42284726`, `/api/events?limit=1` returns `200`, and platform/attesters/workers health endpoints return OK.
- Follow-up architectural fix: do not rely on fresh schemas for routine deploys. Configure the indexer deploy path to stop the old Ponder process before starting the new one (disable zero-downtime/rolling deploys if Render supports it), or split indexing and serving so the indexing process can be deployed like a singleton worker while a web service serves API traffic.

## 2026-06-01 — Uber UI naming for commonality.eth

- Added root uber-UI naming support alongside the existing per-app testnet IPNS inventory: `deployments/testnet-names.json` now defines `IPNS_PRIVATE_KEY_TESTNET_UBER_UI`, `setup-testnet-naming.sh` creates/reuses it, and `deployments/testnet-ipns.env` records `IPNS_NAME_TESTNET_UBER_UI`.
- Published the current uber root CID `Qmc6tsVfgPYfkZinJssPB7cBXtyEfauBbKpqXzwra1G93d` to uber IPNS name `k51qzi5uqu5djtu1xnconfimf64eymci4o4wfqu9n0sm64cu51qrjt7usrhatw`; `deployments/testnet-ui-uber-release.json` records that name.
- Submitted ENS transactions for `commonality.eth`: first to the new IPNS name, then switched to the direct root CID after public gateways/eth.limo returned 500 / could not resolve the w3name-backed IPNS record. Current on-chain contenthash is direct `ipfs://Qmc6tsVfgPYfkZinJssPB7cBXtyEfauBbKpqXzwra1G93d`.
- `scripts/deploy-testnet-uber-ui.sh` now auto-publishes the root CID to the uber IPNS key when present and prints both the IPNS setup path and a direct-CID ENS fallback.
- Checks run: `bash -n` on touched shell scripts, `node --check` on touched JS/MJS scripts, LSP diagnostics clean for touched JS and workspace. Pinata gateway for the root CID returned 200; `commonality.eth.limo` still returned 500 immediately after the ENS update, likely gateway/cache/eth.limo behavior to recheck later.
- Note: `ui/src/domains/commonality/LandingPage.tsx` had pre-existing uncommitted changes and was not touched. The Alchemy mainnet RPC URL was printed by `update-ens.sh` during ENS transactions; consider rotating that key if logs are shared beyond trusted local context.

## 2026-06-02 — test:fast local deployment env isolation

- Fixed `npm run test:fast` failures caused by `ui/.env` deployment values leaking into Vitest expectations (default trusted attesters/nudgers and cross-domain public URLs).
- `ui/src/test/setup.ts` now clears deployment-only env vars at setup time and before each test, so tests remain independent of the local generated testnet `.env` while individual tests can still stub env values explicitly.
- Checks passed: `npm run test:fast`; LSP diagnostics clean for `ui/src/test/setup.ts`.

## 2026-06-02 — Verifier workspace phase 3 PR validation supervisor

- Implemented verifier plan phase 3: added `validation.pr` as a PR/change-local supervisor over required `automated.lint`, `automated.build`, and `automated.test-fast` results, with optional fresh `automated.seed-implication-regression` included when available.
- Wired `validation.pr` into the verifier `root` dashboard and updated `verifier/README.md` / `verifier/PLAN.md`.
- Checks run: `verifier-run validation.pr` (expected `fail` because latest `automated.test-fast` result is a real project failure from phase 2), `verifier-run meta.liveness` (pass), `verifier-run root` (expected `fail` because it rolls up `validation.pr`).

## 2026-06-02 — Verifier workspace phase 4 testing-plan coverage mapping

- Implemented verifier plan phase 4: added `verifier/coverage/testing-plan-items.json` mapping the major `workflow/testing/README.md` sections to automated checks, intentional manual coverage, or known gaps with owners/status.
- Added `coverage.testing-plan` to validate required mappings, referenced verifier check ids, and known-gap/manual status notes; wired it into `root` and updated verifier docs/plan.
- Checks run: `node --check verifier/checks/coverage/testing-plan.mjs`; `verifier-run coverage.testing-plan` (pass); negative validation via temporary `tmp/verify-coverage-negative.mjs` confirmed missing required mappings and nonexistent check IDs fail; `verifier-run meta.liveness` (pass); `verifier-run root` (expected fail because `validation.pr` still rolls up the existing `automated.test-fast` failure).

## 2026-06-02 — Verifier workspace phase 5 manual report attestations

- Implemented verifier plan phase 5: added reusable `verifier/checks/review/report-attestation.mjs` plus report-attestation defs for newcomer touched-surface, real-UI touched-domain, security contracts, demo dry-run, release-candidate QA synthesis, and full-launch QA synthesis.
- Added `workflow/reviews/manual-validation/README.md` documenting the report location, required template, and recommended filenames. Missing/stale/incomplete reports route to `uncertain`; reports naming blocker/high-confidence severe findings route to `fail`.
- Updated `verifier/coverage/testing-plan-items.json` so manual/LLM roster and cross-cutting risks are represented by report-attestation checks, not just intentionally manual placeholders.
- Checks run: `node --check verifier/checks/review/report-attestation.mjs`; temporary fixture validation confirmed complete reports pass, missing sections are detected, and stale reports are detected; all six review attestation checks ran and currently return `uncertain` because no matching reports exist; `verifier-run coverage.testing-plan` (pass); `verifier-run meta.liveness` (pass); `verifier-run root` (expected fail because `validation.pr` still rolls up the existing `automated.test-fast` failure).

## 2026-06-02 — Verifier known-bad fixture checks

- Implemented verifier PLAN item 7: added `known-bad.testing-plan`, `known-bad.staleness-known-gaps`, and `known-bad.report-attestation` checks.
- Added reusable `verifier/checks/known-bad/expect-bad-result.mjs`, plus synthetic bad fixtures under `verifier/fixtures/known-bad/`.
- Wired the known-bad checks into `meta.verifier-health` as core verifier-of-verifier inputs and updated `verifier/README.md` / `verifier/PLAN.md`.
- Checks passed: `verifier-run known-bad.testing-plan`; `verifier-run known-bad.staleness-known-gaps`; `verifier-run known-bad.report-attestation`; `verifier-run meta.liveness`; `verifier-run meta.verifier-health`; LSP workspace diagnostics clean.

## 2026-06-02 — Verifier dashboard classification

- Implemented verifier PLAN item 9: generic `checks/supervisor.mjs` now classifies non-green child results into `systemFailures`, `blindSpots`, `missingAttestations`, `skippedByPolicy`, and `otherUncertain`.
- Supervisor one-line summaries now include classification counts, making release/light/full dashboards distinguish real product/test failures from missing manual reports and explicitly guarded checks.
- Updated `verifier/README.md` and marked dashboard classification done in `verifier/PLAN.md`; freshness policy work remains pending.
- Checks run: `node --check verifier/checks/supervisor.mjs`; `verifier-run --workspace verifier validation.light-confidence` (expected fail, now classified as system failure + missing/stale attestations); `verifier-run --workspace verifier validation.release-candidate` (expected fail, now classified as system failure + missing/stale attestation + skipped-by-policy); `verifier-run --workspace verifier validation.full-launch` (expected fail, classified); `verifier-run --workspace verifier root` (expected fail); `git diff --check`; LSP workspace diagnostics clean.

## 2026-06-02 — Verifier workspace env var via direnv

- Added `.envrc` at project root: loads `.env` and sets `VERIFIER_WORKSPACE=verifier` so the `--workspace verifier` flag is no longer needed when running from the repo root.
- Updated `verifier/README.md`, `package.json` npm scripts, `workflow/testing/README.md`, `workflow/roles/developer.md`, `workflow/deployment.md`, `verifier/checks/meta/liveness.mjs`, and `CONTINUITY.md` (historical entries) to drop `--workspace verifier`.
- Added `.envrc` to `.gitignore`.
- Verification: `verifier-run meta.verifier-health` runs successfully without the flag.

## 2026-06-02 — Verifier supervisor freshness policies

- Implemented verifier PLAN item 10: generic `verifier/checks/supervisor.mjs` now accepts `freshness` params (`requiredMaxAgeMinutes`/`maxAgeMinutes`, plus optional per-id/per-role overrides). Stale non-failing child results make supervisors `uncertain` and are classified under `staleResults`; concrete `fail`/`error` children remain failures/blind spots instead of being hidden as mere staleness.
- Added freshness policy to `validation.release-candidate` (7 days) and `validation.full-launch` (24 hours), and updated `verifier/README.md` / `verifier/PLAN.md`.
- Checks run: `node --check verifier/checks/supervisor.mjs`; temporary synthetic supervisor freshness test proving a six-month-old passing `automated.test-full` does not satisfy release-candidate; JSON parse check for edited def files; `verifier-run --workspace verifier validation.release-candidate` and `verifier-run --workspace verifier validation.full-launch` (both expected `fail` due existing failing/full-suite or guarded/missing-attestation child results, with freshness policy visible); `git diff --check`; LSP diagnostics clean for `verifier/checks/supervisor.mjs`.

## 2026-06-03 — Verifier LLM JSON parsing hardened

- Completed the verifier PLAN item for LLM JSON parse robustness: `parseJsonObject` now extracts balanced JSON objects from prose/fenced output and retries after escaping raw control characters inside JSON strings, covering the docs-coherence raw-newline failure mode.
- Added `verifier/checks/lib/llm-judgment.test.mjs` node:test coverage for strict JSON, fenced output, raw newline/tab string contents, and braces inside strings.
- Removed the completed parsing item from `verifier/PLAN.md`.
- Checks run: `node --test verifier/checks/lib/llm-judgment.test.mjs`; LSP diagnostics clean for `verifier/checks/lib/llm-judgment.mjs` and its new test.

## 2026-06-03 — Verifier report-attestation known-bad coverage broadened

- Improved `known-bad.report-attestation` so the reusable known-bad harness can run multiple target cases in one check.
- Added synthetic stale and blocker-naming report fixtures alongside the existing incomplete report fixture; the check now proves report-attestation rejects incomplete, stale, and blocker reports.
- Updated verifier docs/PLAN to record this deterministic report-attestation coverage and leave future `meta.llm-to-automated-candidates` mining as the remaining work.
- Checks run: `verifier-run known-bad.report-attestation` (pass); `verifier-run meta.verifier-health` (pass); LSP diagnostics clean for `verifier/checks/known-bad/expect-bad-result.mjs`.

## 2026-06-03 — Verifier performance acceptability gap tracked

- Addressed the verifier PLAN item for performance/readiness coverage by adding an explicit `performance-acceptability` known-gap record to `verifier/coverage/testing-plan-items.json` instead of pretending existing functional/degradation canaries prove acceptable latency/throughput.
- `coverage.testing-plan` now treats that release-confidence dimension as required, and `coverage.readiness` includes it as a release-candidate blocker until a deterministic `operations.performance-canary` or equivalent benchmark exists.
- Updated `verifier/README.md` and pruned the completed PLAN backlog item while leaving the concrete follow-up in the known-gap record.
- Checks passed: `verifier-run coverage.testing-plan`; `verifier-run staleness.known-gaps`; `verifier-run coverage.readiness`; `verifier-run known-bad.testing-plan`; LSP diagnostics clean for `verifier/checks/coverage/testing-plan.mjs`.

## 2026-06-03 — Verifier meta LLM checks promoted to gating health inputs

- Completed the verifier PLAN gating decision for `meta.llm-check-review` and `meta.llm-to-automated-candidates`: both now feed `meta.verifier-health` as core inputs instead of advisory children.
- Added significance thresholds so meta LLM output can block an all-green dashboard for substantial verifier-improvement work without turning low-severity/nice-to-have ideas into churn: high/medium verifier-review recommendations and `significant` automation candidates are gating; explicit low/nice-to-have items are recorded only. Missing severity/priority defaults to gating for safety.
- Removed the liveness never-run exemption for `meta.llm-check-review`, since manual verifier-review leaves must have been run at least once before the dashboard can be fully green.
- Updated verifier README/PLAN to document the new policy and leave future work focused on tuning the noise threshold.
- Checks run: fixture-injected direct runs for low-only/nice-to-have meta outputs; `node verifier/checks/lib/llm-judgment.test.mjs`; `verifier-run meta.liveness`; `verifier-run meta.verifier-health` (expected uncertain from existing significant meta findings); LSP workspace diagnostics clean.

## 2026-06-03 — Verifier UI test-plan drift check

- Completed the verifier PLAN item to reduce `ui/test-plan.md` drift by adding `coverage.ui-test-plan`, a cheap deterministic check that reads `ui/test-plan.md`, verifies referenced Vitest/Playwright test files exist under `ui/src` or `ui/e2e`, checks route-mapping row shape, and requires the main inventory sections to remain present.
- Added `known-bad.ui-test-plan` plus a synthetic stale-reference fixture proving the new check rejects missing UI test references.
- Wired both checks into `meta.verifier-health` and updated `verifier/README.md` / `verifier/PLAN.md`.
- Checks run: `verifier-run coverage.ui-test-plan` (pass); `verifier-run known-bad.ui-test-plan` (pass); `node --check verifier/checks/coverage/ui-test-plan.mjs`; LSP diagnostics clean for the new check. `verifier-run meta.verifier-health` still fails because pre-existing `meta.liveness` reports never-run workflow-clarity checks; the new UI test-plan checks are green. `npm run verifier:summarize` failed because `verifier-summarize` is not on PATH in this shell.

## 2026-06-03 — Verifier testnet-smoke known-bad canary

- Added `known-bad.env-testnet-smoke`, a verifier-of-verifier check proving the guarded `env.testnet-smoke` rejects unreachable configured RPC, GraphQL, and app endpoints when explicitly enabled.
- Hardened `verifier/checks/env/testnet-smoke.mjs` so endpoint request errors are captured as failed probes (`fail`) instead of escaping as check `error`; the smoke check now distinguishes a broken configured testnet from an inability to run the check.
- Wired the new known-bad check into `meta.verifier-health` and updated `verifier/README.md` / `verifier/PLAN.md`.
- Checks run: `node --check verifier/checks/env/testnet-smoke.mjs`; `node --check verifier/checks/known-bad/expect-bad-result.mjs`; `verifier-run known-bad.env-testnet-smoke`; `verifier-run meta.verifier-health` (expected fail from pre-existing `meta.liveness` fail plus existing meta LLM uncertain recommendations; new known-bad check passed); `git diff --check`; LSP diagnostics clean.

## 2026-06-03 — Verifier stack guarded-command structured evidence canary

- Completed `known-bad.stack-guarded-command`: stack guarded commands now pass a `COMMONALITY_VERIFIER_HEALTH_EVIDENCE_FILE` path to wrapped scripts and, when `requireHealthEvidence` is true, reject exit-0 runs with missing/malformed/unhealthy structured evidence.
- `stack.fresh-seeded` and `stack.restart-consistency` now require structured health evidence and write pass evidence for their core endpoint/indexed-data probes after the shell checks succeed.
- Added a synthetic exit-0 unhealthy-evidence fixture and wired `known-bad.stack-guarded-command` into `meta.verifier-health`; updated `verifier/README.md` and marked the PLAN item complete.
- Checks run: `verifier-run known-bad.stack-guarded-command` (pass); `verifier-run stack.fresh-seeded || true` (expected guarded opt-in error); `verifier-run meta.verifier-health || true` (expected fail from pre-existing liveness/meta LLM non-green inputs, with new known-bad check pass); `node --check verifier/checks/stack/guarded-command-check.mjs`; `node --check verifier/checks/known-bad/stack-guarded-command-fixture.mjs`; LSP diagnostics clean for `guarded-command-check.mjs`.

## 2026-06-03 — Verifier automation-candidate check tightened

- Improved `meta.llm-to-automated-candidates` so its subjective-check inventory is stricter: it now scans LLM-judgment/report-attestation checks without sweeping in deterministic `review.*` checks such as `review.docs-broken-refs`.
- Added strict schema validation for automation candidates (`priority`, `promotability`, `effort`, evidence, etc.) so malformed LLM output becomes a check `error` instead of being silently interpreted as significant/non-significant.
- Extended `known-bad.meta-verifier-health-significance` with a malformed-candidate fixture and leaf-status assertions.
- Updated `verifier/PLAN.md` to answer the inline question: `meta.llm-to-automated-candidates` is the standing check that mines LLM/manual tasks for conventional-test opportunities.
- Checks passed: `verifier-run known-bad.meta-verifier-health-significance`; LSP diagnostics clean for touched verifier scripts.

## 2026-06-03 — Verifier LLM judgment gating canary

- Added `known-bad.llm-judgment-gating`, a verifier-of-verifier check that runs the real `review.docs-coherence` LLM-judgment path with fixture responses. It proves high-severity structured findings gate red, medium findings gate yellow, finding-free model uncertainty does not create a warning, and malformed `findings` shapes become check errors.
- Wired the new known-bad check into `meta.verifier-health` and documented it in `verifier/README.md` / `verifier/PLAN.md` as another promoted deterministic backstop for LLM judgment checks.
- Checks run: `verifier-run known-bad.llm-judgment-gating`; `node --check verifier/checks/known-bad/llm-judgment-gating.mjs`; JSON parse check for the new def and edited `meta.verifier-health.def.json`; LSP diagnostics clean for `verifier/checks/known-bad/llm-judgment-gating.mjs`; `verifier-run meta.verifier-health || true` (expected fail from pre-existing liveness/meta LLM non-green inputs, with new known-bad check pass).

## 2026-06-03 — Verifier liveness known-bad check

- Added `known-bad.liveness`, a synthetic-fixture check that proves `meta.liveness` fails when a check has never recorded state and when a check is overdue.
- Wired it into `meta.verifier-health` and documented it in `verifier/README.md` / `verifier/PLAN.md`.
- Checks run: `node --check verifier/checks/known-bad/liveness.mjs`; `verifier-run known-bad.liveness` (pass); `verifier-run meta.verifier-health` (expected fail from existing `meta.liveness` silent workflow-clarity leaves, stale meta LLM recommendations, and missing state-of-project checks; new `known-bad.liveness` passed). LSP diagnostics clean for `verifier/checks/known-bad/liveness.mjs`.

## 2026-06-04 — Recurring pledges implementation pass

- Implemented recurring/standing pledges end-to-end enough for a first pass:
  - Specs updated: first pledge executes immediately; contract helper is ERC-20-general while MVP UI uses configured settlement token.
  - Contracts: added `RecurringPledges.sol`; added registry-gated `DelegatableNotes.createDelegatedNoteFor(...)` plus registry setter/event. `createStandingPledge` records intent and immediately creates/delegates first ERC-20 note; `executeDue` is permissionless; `cancelStandingPledge`, `isDue`, `isFundable` added.
  - Deployment: deploys `RecurringPledges`, wires it into `DelegatableNotes`, exports env vars including `RECURRING_PLEDGES_*` and `VITE_RECURRING_PLEDGES_CONTRACT_ADDRESS`.
  - Indexer: added RecurringPledges ABI/config/event registrations for `StandingPledgeCreated/Executed/Cancelled`.
  - SDK: added RecurringPledges ABI export, contract address field, event decoders, standing pledge fold/query/action helpers, and tests.
  - Service host: added `recurring-pledge-scheduler` service kind; scheduler polls due/fundable pledges from SDK and calls `executeDue`. JSON config works; env config has `RECURRING_PLEDGE_SCHEDULER_*` support and defaults disabled.
  - UI: `DepositPage` now has a “monthly recurring pledge” checkbox. When checked, it requires delegate + cause, approves the configured settlement token to `DelegatableNotes` for 12 periods, and creates the standing pledge; one-shot deposit path unchanged.
- Checks run and passing:
  - `npm run hardhat:compile`
  - `cd hardhat && npx hardhat test test/RecurringPledges.test.js`
  - `npm run --workspace=sdk build` and `npm run --workspace=sdk typecheck`
  - `npm run --workspace=sdk test -- recurring-pledges.test.ts` (Mocha warned pattern not found but full SDK suite ran: 302 passing)
  - `npm run indexer:typecheck`
  - `npm run --workspace=service-host typecheck`
  - `npm run --workspace=ui typecheck`
  - `npm run --workspace=ui test:vitest -- DepositPage.test.tsx`
- Known caveats/follow-ups:
  - UI approval amount is currently 12 periods, not infinite; product may want a more explicit allowance UX.
  - UI does not yet show per-cause recurring totals or user active pledge management/cancel button. SDK fold/query support exists.
  - LSP workspace diagnostics incorrectly/stale-reported missing recurring event decoder exports in `sdk/src/subsystems/delegation/recurring-pledges.ts`, but `tsc --noEmit` for SDK passes cleanly.


## 2026-06-04 — Recurring pledges UI management follow-up

- Continued recurring pledges after the first implementation pass.
- Added recurring pledge contract address plumbing to UI runtime config and `useMachinery`, so SDK recurring pledge queries can find `VITE_RECURRING_PLEDGES_CONTRACT_ADDRESS` in generated/runtime UI config.
- `MyNotesPage` now loads the connected user's active standing pledges when the recurring contract is configured, shows an Active Monthly Pledges summary card and Monthly Pledges section, formats settlement-token monthly amounts, and lets the user cancel a monthly pledge via `cancelStandingPledge`.
- Added `MyNotesPage` Vitest coverage for loading/skipping recurring pledges and successful/failed cancellation.
- Checks passed: `npm run --workspace=ui test:vitest -- MyNotesPage.test.tsx`; `npm run --workspace=ui typecheck`; LSP diagnostics for `MyNotesPage.tsx` only show pre-existing wagmi `useAccount` deprecation hints.
- `git diff --check` over touched UI files is clean; repo-wide `git diff --check` still reports the pre-existing unrelated trailing whitespace in `docs/founder/christian-pitch.md`.
- Remaining recurring pledge follow-ups: per-cause ongoing totals are still not surfaced in cause/portal UI; allowance UX is still the simple 12-period approval from the previous pass.

## 2026-06-04 — Recurring pledges portal totals follow-up

- Continued recurring pledge UI follow-ups by surfacing per-cause active standing pledge totals on `StatementFundingPortalPage`.
- The funding portal now loads `getMonthlyPledgedByCause` when `VITE_RECURRING_PLEDGES_CONTRACT_ADDRESS` is configured, displays “Ongoing Monthly Pledges” in the per-cause summary, and skips the query safely when the recurring contract is absent.
- Added `StatementFundingPortalPage` Vitest coverage for displaying the cause monthly total and skipping recurring loading when unconfigured.
- Checks passed: `npm run --workspace=ui test:vitest -- StatementFundingPortalPage.test.tsx`; `npm run --workspace=ui typecheck`; `npm run --workspace=ui lint` (passes with existing `NetworkSwitchPrompt.tsx` fast-refresh warning). An attempted targeted lint command failed because the package lint script already runs `eslint .` and treated the extra filename as a missing pattern.
- Remaining recurring pledge follow-ups: allowance UX is still the simple 12-period approval; leaderboard/broader cause surfaces could also mention monthly recurring totals if desired.

## 2026-06-04 — Recurring pledges allowance UX follow-up

- Continued recurring pledge polish after portal totals.
- Deposit recurring setup now asks how many monthly payments to authorize instead of silently approving a hard-coded 12 periods; default remains 12, validation requires a positive integer, and helper text explains cancel/revoke behavior. Approval amount is computed from the selected period count.
- Updated `DepositPage` Vitest coverage for the configurable allowance and invalid period count.
- Updated recurring pledge product/tech docs to reflect that the MVP is now implemented rather than still “not yet implemented.”
- Checks passed: `npm run --workspace=ui test:vitest -- DepositPage.test.tsx`; `npm run --workspace=ui typecheck`; `npm run --workspace=ui lint` (passes with existing `NetworkSwitchPrompt.tsx` fast-refresh warning); `git diff --check` for touched files. LSP diagnostics clean for `DepositPage.tsx`; test file only has pre-existing wagmi `useAccount` deprecation hints.
- Remaining recurring pledge follow-ups: broader/leaderboard cause surfaces could mention monthly recurring totals if desired; deployment/runtime verification of the scheduler on the actual service-host environment remains to be done. The core MVP path is close/done at code level.

## 2026-06-04 — Recurring pledges final UI/deployment wiring

- Finished the remaining recurring pledge polish requested after allowance UX.
- Surfaced active monthly standing pledge totals on broader cause surfaces: `FundingPortalSummary` and `CauseLeaderboardPage` now show “Ongoing Monthly Pledges”, skip SDK recurring queries safely when the recurring contract is not configured, and keep recurring commitments separate from direct-purchase rankings.
- Wired Render/service-host readiness for the scheduler: `render.yaml.template`/generated `render.yaml` now declare `RECURRING_PLEDGES_ADDRESS` for the indexer, worker contract env vars needed by the scheduler, and disabled-by-default scheduler env vars. `service-host` now has an env-config test proving the scheduler can be enabled without an HTTP route. `scripts/generate-wallets.mjs` now generates `RECURRING_PLEDGE_SCHEDULER_PRIVATE_KEY` / `RECURRING_PLEDGE_SCHEDULER_ADDRESS`; deployment docs and `workflow/testnet-render-env.md` document funding/enabling/runtime verification.
- Updated recurring pledge product/tech docs to say the MVP is implemented and that remaining runtime activation depends on redeploying contracts so `RECURRING_PLEDGES_ADDRESS` exists, then funding/enabling the Render scheduler key.
- Checks passed: `npm run --workspace=ui test:vitest -- CauseLeaderboardPage.test.tsx FundingPortalSummary.test.tsx`; `npm run --workspace=ui typecheck`; `npm run --workspace=ui lint` (existing `NetworkSwitchPrompt.tsx` fast-refresh warning only); `npm test --workspace=@commonality/service-host`; `npm run --workspace=service-host typecheck`; `npm run --workspace=service-host lint`; `npm run smoke-check`; `node --check scripts/generate-wallets.mjs`; `git diff --check`. LSP workspace diagnostics have only existing wagmi `useAccount` deprecation hints.
- Remaining recurring-pledge work is no longer code polish: deploy the updated contracts to testnet, regenerate `deployments/base-sepolia.env`/`render.yaml`, copy/fund the scheduler key, set `RECURRING_PLEDGE_SCHEDULER_ENABLED=true`, redeploy workers, and verify a due pledge produces a `StandingPledgeExecuted` event through the indexer.

## 2026-06-04 — Supporting-statement attestations implementation pass (in progress)

- Task from `inbox.md`: implement `specs/tech/subsystems/content-funding/noninflammatory-content/supporting-statement-attestations.md` (two decoupled claims: content is noninflammatory, content supports statement S). Work is not committed yet.
- Content attester changes:
  - `content-attester/src/evaluator.ts` now accepts optional `statement`, injects `{statement}`, normalizes `supports_statement` to `supportsStatement`, and keeps civility `decision` independent.
  - `content-attester/src/content.ts` can resolve statement text from IPFS and now handles displayable docs whose `content` is a string.
  - `content-attester/src/app.ts` makes `statementCid` optional, resolves target statement text when present, and publishes up to two attestations: `alignment(C, noninflammatory-meta)` when civility passes, and `alignment(C, S)` when support passes. It returns `supportDecision` and `transactionHashes`; `transactionHash` is kept as last tx for compatibility.
  - Prompts in `content-attester/prompts/*.md` now include optional target statement instructions and a `supports_statement` JSON field.
- SDK/UI changes:
  - `sdk/src/subsystems/content-funding/queries.ts` now preserves `topicStatementCid`, dedupes by attester/statement/topic (not just attester), and adds `getStatementSupportingContent()` which queries `topic3 = statementCid`, filters/join with noninflammatory attestations, and returns registered content items that have both claims.
  - New `ui/src/conceptspace/components/StatementSupportingContent.tsx`; `StatementPage.tsx` renders “Noninflammatory writeups supporting this statement”.
  - `ContentAttestationSummary.tsx` now resolves statement CID previews in content-attester tooltips.
  - Added runtime/env plumbing for `VITE_NONINFLAMMATORY_TOPIC_CID` in `ui/src/shared/runtimeConfig.ts`, `ui/vite.config.ts`, `.env.example`, `ui/.env.example`, and `scripts/setup-env.sh` (falls back to `ALIGNMENT_TOPIC_STATEMENT_CID` when generating `ui/.env`).
- Docs updated: `content-attester/README.md`, `specs/tech/subsystems/content-funding/content-attesters.md`, `specs/tech/subsystems/content-funding/noninflammatory-content/README.md`, `attester-prompts.md`, and `docs/end-user/civility/evaluator-prompts.md`.
- Checks passed after current edits:
  - `npm run build --workspace=sdk`
  - `npm test --workspace=sdk` (302 passing)
  - `npm run build --workspace=content-attester`
  - `npm test --workspace=content-attester` (10 passing)
  - `npm run typecheck --workspace=ui`
- LSP workspace diagnostics still show one pre-existing-looking `sdk/src/subsystems/content-funding/queries.test.ts` Project/fundingCurrency error even though `npm run build --workspace=sdk` passes, plus existing `useAccount` deprecation hints in `StatementPage.tsx`.
- Important next steps for fresh LLM:
  1. Review semantics carefully: current support attestation is `statementId=S`, `topicStatementId=noninflammatory-meta`; `getStatementSupportingContent()` queries `topic3=cidToBytes32(S)`. This matches the existing event’s indexed `statementId` position, despite the option name `topic3`.
  2. Add/adjust tests for `getStatementSupportingContent()` if practical; current SDK tests cover modified dedupe behavior only. UI has only typecheck so far.
  3. Consider whether `statementCid` should truly be optional in public `/evaluate-content`; spec says “Given C with no S” yes, but existing clients may always send it.
  4. Review UI behavior when `VITE_NONINFLAMMATORY_TOPIC_CID` is unset: query still shows content with support attestations and any matching noninflammatory attestations, but cannot verify the exact meta-statement unless configured. Decide whether to hide/show warning instead.
  5. Run broader checks (`npm run lint`, maybe `npm run test:fast`) before committing.

## 2026-06-04 — Supporting-statement attestations: finishing pass

- Continued and finished the previous in-progress pass on `supporting-statement-attestations.md`. Addressed the five handoff next-steps:
  1. **Semantics reviewed and confirmed correct.** `content-attester/src/app.ts` publishes the noninflammatory attestation as `publishAttestation(C, alignmentTopic, alignmentTopic)` (statementId=topic, topicStatementId=topic) and the support attestation as `publishAttestation(C, S, alignmentTopic)` (statementId=S, topicStatementId=topic). `getStatementSupportingContent()` queries `topic3 = cidToBytes32(S)` (statementId is indexed in topic3 per the ABI: attester=topic1, subjectId=topic2, statementId=topic3), filters support events by `topicStatementId === noninflammatoryTopicCid`, then re-queries each subject's `topic2` for the standalone noninflammatory attestation (`statementId === topicStatementId === noninflammatoryTopicCid`). Conjunction is enforced via `.filter(r => r.noninflammatoryAttestations.length > 0)`.
  2. **Added SDK tests** for `getStatementSupportingContent()` in `sdk/src/subsystems/content-funding/queries.test.ts`: a new `describe` block mocks `globalThis.fetch` (encoding real `ContentItemRegistered` + `AlignmentAttestation` raw events with viem) and covers (a) only content with both claims is returned, (b) untrusted-attester support is dropped, (c) empty when `alignmentAttestations` unconfigured. SDK suite now 305 passing.
  3. **`statementCid` stays optional** on `/evaluate-content` — matches the spec's "Given C with no S" path; no change.
  4. **Fixed a real UI correctness gap for unset `VITE_NONINFLAMMATORY_TOPIC_CID`.** When the topic is unset the SDK's noninflammatory join is unfiltered, so a support attestation would be miscounted as a civility attestation and the UI would render an unverified "Noninflammatory" claim (also double-listing the same attestation). `StatementSupportingContent.tsx` now skips the query and shows an info Alert ("noninflammatory meta-statement is not configured…") instead of making the unverified claim. Added `ui/src/conceptspace/components/StatementSupportingContent.test.tsx` covering the both-claims render, empty state, and the unconfigured-topic warning.
  5. **Broader checks run** (see below).
- Checks passed: `npm test --workspace=@commonality/sdk` (305 passing); `npm run typecheck --workspace=@commonality/sdk`; `npm run lint --workspace=@commonality/sdk`; `npm run typecheck --workspace=ui`; `npm run lint --workspace=ui` (only the pre-existing `NetworkSwitchPrompt.tsx` fast-refresh warning); `npm test --workspace=content-attester` (10 passing); `npm run typecheck/lint --workspace=content-attester`; `npm run test:fast` (1620 UI tests passing). The new UI component test was run on its own as well.
- The pre-existing LSP-only `queries.test.ts` Project/`fundingCurrency` diagnostic persists (tsc/build pass); not introduced here.
