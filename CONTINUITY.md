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
