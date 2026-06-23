# Commonality verifier workspace

The project-specific workspace for the external `verifier` harness (the `@adamspitz/verifier` npm package, installed as a dev dependency by normal `npm install`). This file is **how to run it**; see [`DESIGN.md`](./DESIGN.md) for *why it's built this way*, [`PLAN.md`](./PLAN.md) for the improvement backlog, and the `*.def.json` files under [`checks/`](./checks/) for authoritative per-check behavior.

See the `using-verifier` AI skill for the underlying harness model.

## The one command you want

```sh
npm run verifier:go
```

`verifier:go` is the single human-readable, idempotent top-level report. It (1) checks currency (free when no commits landed since last time), (2) offers to re-run any checks those commits invalidated (press Enter to skip — the common case), (3) refreshes `root` (cheap — reuses the prior narrative with no model call when child statuses are unchanged), and (4) prints the narrative to your terminal. Run it again a minute later and it costs nothing and asks nothing. It never says "all fine" while a facet is red.

To browse the dashboard interactively: `npm run verifier:tree` (press `o` on `root` to open its `report.md` narrative).

## Command cheat-sheet

| I want to… | Command |
|---|---|
| The top-level report, refreshed and printed | `npm run verifier:go` |
| Browse the dashboard interactively | `npm run verifier:tree` |
| Print the last stored dashboard rollup (no new run) | `npm run verifier:report` |
| Refresh just the rollup from latest child results | `npm run verifier:root` |
| "Is the report stale given recent commits?" (advisory) | `npm run verifier:currency` |
| Fast change-local loop (lint/build/fast tests/canaries) | `npm run verifier:fast` |
| Nightly/CI deep boot cadence (guarded local E2E/destructive checks) | `npm run verifier:deep-cadence` |
| Full deep cadence including testnet guarded checks | `npm run verifier:deep-cadence:full` |
| Refresh one facet while working in it | `npm run verifier:{functionality,docs,product,security}` |
| Run the due-only scheduler (long-running) | `npm run verifier:run` |
| Force any one check | `verifier-run <checkId>` |

The project `.envrc` sets `VERIFIER_WORKSPACE=verifier`, so no `--workspace` flag is needed from the repo root. From elsewhere, pass `--workspace <path>` or set `VERIFIER_WORKSPACE`.

When a check fails and you need more project context, start from the top-level [README.md](/README.md); if the info isn't findable from there, ask the user and then add it somewhere you *would* have found it — efficient findability is the point.

## Which pass for which moment

The old confidence-tier supervisors were retired; the tier names now label readiness planning only. Pick the smallest pass that matches the moment and record what was skipped.

- **PR / change-local** (ordinary work): `npm run verifier:fast`. Refresh any extra child checks implied by what you touched (contracts/indexing/routing/seed/domain manifests).
- **Light confidence** (before a notable demo, or when something feels off): the fast loop plus relevant manual/product checks (`verifier-run review.demo-dry-run`, `review.newcomer.touched-surface`, `review.real-ui.touched-domain`), then `npm run verifier:root`.
- **Release-candidate / testnet-ready**: force the guarded prerequisites you intend to claim — `automated.test-full`, `artifact.ipfs-domain-smoke`, `stack.fresh-seeded`, `stack.restart-consistency` (each needs its opt-in env var; see the cheat-sheet in `DESIGN.md` operating model and `coverage/guarded-check-policy.json`) — refresh the relevant manual/LLM reports, then `npm run verifier:root`.
- **Full launch**: refresh release-candidate evidence, configured `testnet.*` smoke, and final QA synthesis, then `npm run verifier:go` for the launch narrative.

To run a manual/LLM validation pass (intelligent judgment when conventional tests pass), follow the runbook in [`DESIGN.md`](./DESIGN.md).

## Harness setup

The `verifier:*` npm scripts call CLI binaries from the harness (`verifier-run`, `verifier-scheduler`, `verifier-heartbeat`, `verifier-summarize`, `verifier-tree`) via `node_modules/.bin`, so no global install or sibling checkout is needed. From a fresh checkout:

```bash
npm install
npm run verifier:report   # quickest smoke test that the harness is available
```

To operate continuously, run the scheduler under a real process supervisor (`npm run verifier:run`) and add an external heartbeat cron so scheduler death is visible:

```cron
*/5 * * * * cd /home/adam/Projects/commonality && npm run verifier:heartbeat
```

`heartbeat-check.sh` alerts if `verifier/state/heartbeat` is missing or older than `MAX_AGE_SEC` (default 180s); wire its failure path to a real pager/webhook in deployed operation. By policy the scheduler only auto-runs cheap operational checks (`meta.liveness` every 30 min; `meta.flakiness`, the `coverage.*`/`staleness.*` checks, and `known-bad.*` fixtures every 12 h); slow/destructive/E2E/testnet/manual-LLM checks stay manual-triggered.

Run the guarded deep checks from a separate nightly/CI job, for example:

```cron
15 2 * * * cd /home/adam/Projects/commonality && npm run verifier:deep-cadence
```

`verifier:deep-cadence` opts into the local destructive/E2E stack checks (`stack.fresh-seeded`, `stack.restart-consistency`, `artifact.ipfs-domain-smoke`, `stack.user-journeys`, and `operations.indexer-lag`) and then refreshes `stack.deployment-depth` and `facet.functionality`, so the dashboard has a retained "the stack really booted" proof. Use `npm run verifier:deep-cadence -- --testnet` for read-only deployed testnet smoke, or `npm run verifier:deep-cadence:full` only in an environment with the funded verifier wallet and mutation/browser-journey credentials.

## Dashboard hierarchy

`root` is the apex ("is this ready to deploy?") **and** the report in one node: it rolls up the four concern facets plus `meta.verifier-health` into one deterministic gating status, and from the findings each facet propagates upward plus the current milestone (`milestone.json`) writes the human-readable "where are we, really?" narrative to a `report.md` artifact. The narrative never affects gating and is memoized (re-asked only when child statuses or the milestone change).

The five children under `root`:

- **`facet.functionality`** — does it work? Fast PR loop, full suite, the guarded deep-stack/testnet checks, and operations canaries.
- **`facet.docs`** — do the docs cohere? Coherence judgment plus the deterministic broken-ref scan.
- **`facet.product`** — is it compelling and usable? Messaging, workflow-clarity, and manual attestations.
- **`facet.security`** — is the on-chain surface sound? Hardhat tests, Slither, and contract review.
- **`meta.verifier-health`** — can you trust the green? Liveness, flakiness, coverage maps, and the `known-bad.*` verifier-of-verifier fixtures.

For the live tree — current children, statuses, and per-leaf detail — run `npm run verifier:tree` (it's the source of truth; this README deliberately doesn't duplicate it). Drill into red children there; the `report.md` narrative is the executive summary that names the top issue under each red facet.

Checks live under `checks/` as paired `*.mjs` scripts and `*.def.json` definitions (the authoritative per-check docs). Results, artifacts, and mutable state live under `results/`, `artifacts/`, and `state/`.

## Pointing the harness at this workspace

There's a `.envrc` containing `VERIFIER_WORKSPACE=verifier`, which the verifier respects.
