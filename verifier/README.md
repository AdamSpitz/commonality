# Commonality verifier workspace

The project-specific workspace for the external `verifier` harness (the `@adamspitz/verifier` npm package, installed as a dev dependency by normal `npm install`). This file is **how to run it**; see [`DESIGN.md`](./DESIGN.md) for *why it's built this way*, [`PLAN.md`](./PLAN.md) for the improvement backlog, and the `*.def.json` files under [`checks/`](./checks/) for authoritative per-check behavior.

See the `using-verifier` AI skill for the underlying harness model.

## The one command you want

```sh
npm run verifier:go
```

`verifier:go` is the single human-readable, idempotent top-level report. It (1) checks currency (free when no commits landed since last time), (2) offers to re-run any checks those commits invalidated (press Enter to skip — the common case), (3) refreshes `root` (cheap — reuses the prior narrative with no model call when child statuses are unchanged), and (4) prints the narrative to your terminal. Run it again a minute later and it costs nothing and asks nothing. It never says "all fine" while a facet is red.

To browse the dashboard interactively: `npm run verifier:tree`. It opens on the workspace's `commands.json` menu (the project's runner scripts — `verifier:go`, the deep cadence, facet refreshes, etc. — each shown with a description); pick `Open check dashboard` (or press `t`) for the tree. In the tree, `j`/`k` move, `r` reruns the selected check, `d` toggles the details pane between a check's report artifact and its findings JSON, `Tab` focuses the details pane so `j`/`k` scroll it, and `c` returns to the commands menu.

## Command cheat-sheet

| I want to… | Command |
|---|---|
| The top-level report, refreshed and printed | `npm run verifier:go` |
| Browse the dashboard interactively | `npm run verifier:tree` |
| Print the last stored dashboard rollup (no new run) | `npm run verifier:report` |
| Classify every check by refresh cost + flag stale results | `npm run verifier:cost` |
| Refresh just the rollup from latest child results | `npm run verifier:root` |
| "Is the report stale given recent commits?" (advisory) | `npm run verifier:currency` |
| Fast change-local loop (lint/build/fast tests/canaries) | `npm run verifier:fast` |
| Nightly/CI deep boot cadence (guarded local E2E/destructive checks) | `npm run verifier:deep-cadence` |
| Full deep cadence including testnet guarded checks | `npm run verifier:deep-cadence:full` |
| Refresh one facet while working in it | `npm run verifier:{functionality,docs,product,security}` |
| Run the due-only scheduler (long-running) | `npm run verifier:run` |
| Force any one check | `verifier-run <checkId>` |
| Run a stack-dependent check, auto-booting the stack if needed | `npm run verifier:run-stack <checkId>` |
| Bring the local stack to a capability level (or `--probe` it) | `npm run verifier:stack:ensure -- <up\|seeded\|pristine>` |
| Hold the stack (block auto-provisioning while debugging) / release | `npm run verifier:stack:hold` / `verifier:stack:unhold` |

### Stack-dependent checks auto-provision (you don't boot the stack by hand)

Checks that need the local Dockerized stack declare it in their `*.def.json` as `requires: { "capability": "localStack:up|seeded|pristine" }`. Run one through `verifier:run-stack` (instead of bare `verifier-run`) and it probes the live stack and, **only if the level isn't already satisfied**, brings it up — non-destructively (`services.sh --start`, then seed a tiny dataset if empty) when it can, falling back to a destructive wipe+reseed only when the stack is inconsistent or `pristine` was required. A healthy running stack is reused untouched, so this is a no-op when you're already booted.

Guarantees for when you're mid-debug: an up-and-healthy stack is never rebuilt; a **destructive** re-seed happens only with an explicit opt-in (`VERIFIER_STACK_ALLOW_DESTRUCTIVE_AUTOPROVISION=1`, or the check's own `COMMONALITY_VERIFIER_ALLOW_DESTRUCTIVE`) and **never** while `verifier/state/stack.held` exists. Run `npm run verifier:stack:hold` before a debugging session and auto-provisioning refuses to touch the stack at all until you `verifier:stack:unhold`. (This is the project-local "Tier A" of the capability-graph design in [`PLAN.md`](./PLAN.md) item 2b; the harness-native "Tier B" that would make *every* entry point — tree `r`, `verifier:go`, the scheduler — stack-aware is not built yet.)

The project `.envrc` sets `VERIFIER_WORKSPACE=verifier`, so no `--workspace` flag is needed from the repo root. From elsewhere, pass `--workspace <path>` or set `VERIFIER_WORKSPACE`.

### Refresh cost (so you don't fire an expensive check by accident)

Expensive (LLM/agent) checks are marked declaratively with `"cost": "llm"` in their `*.def.json`. The harness reads that field so cost awareness is **baked into the tools you actually use**, not a script you have to remember:

- **verifier-tree** shows an amber `$` badge next to LLM checks, and pressing `r` (rerun) on one asks `y/N` before spending.
- **`verifier-run`**, on an interactive terminal, prompts before running an LLM check. Piped/automated runs and the scheduler never prompt (so nothing hangs); pass `--yes` / `VERIFIER_YES=1` to skip it deliberately.

`npm run verifier:cost` is the audit/overview tool. It statically derives each check's true cost from its import graph and:
- classifies all checks into **deterministic** (no model call — tests, rollups, static analysis, canaries; free on tokens but *not* always on time — full suites, `stack.*` Docker boots and live `testnet.*` probes live here and several need a running stack or they just error) vs **llm** (single-shot judgment; currently none) vs **llm-explore** (runs `pi` with read/grep/find/ls tools — open-ended agentic token cost; **every LLM check here is this tier**);
- **audits** that each `def.cost` matches its derived cost, and `--write-defs` stamps them so the badge/prompt never drift.

The cheap, safe-anytime refresh set is the rollups + meta + coverage/static checks (`validation.pr`, `facet.*`, `meta.verifier-health`, `coverage.*`, `staleness.known-gaps`). Note: per-run token spend is still **not recorded** in results — a known gap; until it is, the `cost` field is the guardrail.

When a check fails and you need more project context, start from the top-level [README.md](/README.md); if the info isn't findable from there, ask the user and then add it somewhere you *would* have found it — efficient findability is the point.

## Which pass for which moment

The old confidence-tier supervisors were retired; the tier names now label readiness planning only. Pick the smallest pass that matches the moment and record what was skipped.

- **PR / change-local** (ordinary work): `npm run verifier:fast`. Refresh any extra child checks implied by what you touched (contracts/indexing/routing/seed/domain manifests).
- **Light confidence** (before a notable demo, or when something feels off): the fast loop plus relevant manual/product checks (`verifier-run review.demo-dry-run`, `review.newcomer.touched-surface`, `review.real-ui.touched-domain`), then `npm run verifier:root`.
- **Release-candidate / testnet-ready**: force the guarded prerequisites you intend to claim — `automated.test-full`, `artifact.ipfs-domain-smoke`, `stack.fresh-seeded`, `stack.restart-consistency` (each needs its opt-in env var; see the cheat-sheet in `DESIGN.md` operating model and `coverage/guarded-check-policy.json`) — refresh the relevant manual/LLM reports, then `npm run verifier:root`.
- **Full launch**: refresh release-candidate evidence, configured `testnet.*` smoke, and final QA synthesis, then `npm run verifier:go` for the launch narrative.

To run a manual/LLM validation pass (intelligent judgment when conventional tests pass), follow the runbook in [`DESIGN.md`](./DESIGN.md).

### Running guarded checks (env-var opt-ins)

Guarded checks refuse to run without an explicit opt-in env var. **Each has its own — they are NOT interchangeable.** (`coverage/guarded-check-policy.json` is the authoritative per-check list; this is the operator's how-to.)

- **`stack.fresh-seeded`** — `COMMONALITY_VERIFIER_ALLOW_DESTRUCTIVE=1`. Self-contained: wipes local data, rebuilds Docker images, restarts services, seeds tiny data, then probes rpc / platform-api / ipfs / indexer-graphql / indexer-events. This **is** how you "boot the local stack." ~5–8 min (image build dominates).
- **`stack.restart-consistency`** — `COMMONALITY_VERIFIER_ALLOW_RESTART=1` (**not** the destructive flag). Requires a live seeded stack with an indexed event already visible; its pre-restart probe exits fast if the indexer (port 42069) is down. Run it right after `fresh-seeded` **in the same session** — a stack left down between the two makes it false-fail with `curl` exit 7.
- **`testnet.*`** (live deployed testnet) — needs `COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE=1` **and** `COMMONALITY_TESTNET_RPC_URL`. Write journeys (`testnet.onchain-to-indexer`) additionally need `COMMONALITY_VERIFIER_ENABLE_TESTNET_MUTATION=1`. Don't set these by hand — the `verifier:testnet:run` wrapper (`scripts/verifier-testnet.sh`) supplies them from secrets.

`functionality.deep-stack` rolls up 5 local proofs + `testnet.environment`. Without the testnet secrets the best it can reach locally is `uncertain (6 pass, 1 uncertain)` — all local leaves green, testnet simply unconfirmable.

### Refresh-cost gotchas

- `verifier-run` takes **one** check per invocation; extra positional args are read as a workspace path, not a second check.
- Refresh facets *after* their leaves, and only re-run `root` (an LLM check) when you actually want a fresh narrative.
- The `"cost"` field lives in the sibling [`AdamSpitz/verifier`](https://github.com/AdamSpitz/verifier) repo's `Definition` type, which is npm-linked into the global `verifier-run`/`verifier-tree` binaries. To change harness behavior there, edit `src/`, run `npm run build` — no republish needed.

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

`heartbeat-check.sh` alerts if `verifier/state/heartbeat` is missing or older than `MAX_AGE_SEC` (default 180s); wire its failure path to a real pager/webhook in deployed operation.

### As installed on Adam's machine

The scheduler runs as a **systemd user service**, `commonality-verifier-scheduler.service` (unit at `~/.config/systemd/user/`; user lingering is enabled so it survives logout/reboot). It's `Restart=always`, and its `ExecStart` deliberately runs the `verifier-scheduler` binary **without** the `COMMONALITY_VERIFIER_ALLOW_*` opt-in vars — so the always-on daemon can only touch cheap deterministic checks, never the destructive stack checks. Common operations:

```bash
systemctl --user status  commonality-verifier-scheduler.service   # is it alive / ticking?
systemctl --user restart commonality-verifier-scheduler.service   # after a harness upgrade
journalctl --user -u commonality-verifier-scheduler.service -n 50  # recent scheduler logs
```

The heartbeat watchdog is the `*/5` cron line above (running `verifier-heartbeat` against the `verifier/` workspace), with alerts appended to `verifier/logs/heartbeat.log`. Wiring that log to a real pager is still a TODO — today you have to read the file. If the dashboard has silently gone stale, first check that the service is `active (running)` and that `verifier/state/heartbeat` is fresh (both are what a dead scheduler looks like). By policy the scheduler only auto-runs cheap operational checks (`meta.liveness` every 30 min; `meta.flakiness`, the `coverage.*`/`staleness.*` checks, and `known-bad.*` fixtures every 12 h); slow/destructive/E2E/testnet/manual-LLM checks stay manual-triggered.

For a quick non-destructive preflight of the local Dockerized stack, run `npm run verifier:local-stack-health`. It names which of Hardhat RPC, indexer GraphQL, platform API, or UI shell is missing/unhealthy.

Run the guarded deep checks from a separate nightly/CI job, for example:

```cron
15 2 * * * cd /home/adam/Projects/commonality && npm run verifier:deep-cadence
```

`verifier:deep-cadence` first opts into `stack.fresh-seeded` to rebuild/seed the local stack, then runs the unguarded `operations.local-stack-health` canary plus the remaining local destructive/E2E stack checks (`stack.restart-consistency`, `operations.indexer-lag`, `artifact.ipfs-domain-smoke`, and `stack.user-journeys`) and refreshes `stack.deployment-depth` and `facet.functionality`, so the dashboard has a retained "the stack really booted" proof. Use `npm run verifier:deep-cadence -- --testnet` for read-only deployed testnet smoke, `npm run verifier:deep-cadence -- --testnet --browser-testnet` to include deployed browser journeys, or `npm run verifier:deep-cadence:full` only in an environment with the funded verifier wallet and mutation credentials. The installed nightly wrapper sources `.env`/`.env.secrets`, runs the read-only testnet smoke plus browser journeys, and includes the mutating on-chain journey only when `COMMONALITY_VERIFIER_NIGHTLY_ALLOW_TESTNET_MUTATION=1` and `COMMONALITY_TESTNET_VERIFIER_PRIVATE_KEY` are present.

## Dashboard hierarchy

`root` is the apex ("is this ready to deploy?") **and** the report in one node: it rolls up the four concern facets plus `meta.verifier-health` into one deterministic gating status, and from the findings each facet propagates upward plus the current milestone (`milestone.json`) writes the human-readable "where are we, really?" narrative to a `report.md` artifact. The narrative never affects gating and is memoized (re-asked only when child statuses or the milestone change).

The children under `root`:

- **`facet.functionality`** — does it work? Fast PR loop, full suite, the guarded deep-stack/testnet checks, and operations canaries.
- **`facet.docs`** — do the docs cohere? Coherence judgment plus the deterministic broken-ref scan.
- **`facet.product`** — is it compelling and usable? Messaging, workflow-clarity, and manual attestations.
- **`facet.security`** — is the on-chain surface sound? Hardhat tests, Slither, and contract review.
- **`meta.verifier-health`** — can you trust the green? Liveness, flakiness, coverage maps, and the `known-bad.*` verifier-of-verifier fixtures.
- **`facet.strategy`** *(prototype, advisory)* — does it add up to the goal, and are we building it sanely? The cofounder-altitude question the other facets don't ask. Rolls up the standing exploration-mode judgment leaves `review.viability`, `review.use-case-completeness`, `review.scalability`, and `review.simplicity`. Each leaf is **milestone-aware** — a finding gates only at/below the `milestone.json` rung by which it must be fixed — so a "not viable as an MVP yet" gap stays advisory today and would turn the facet red once the milestone advances to the rung it fails. Currently listed in `root`'s `advisoryCheckIds`, so it **informs the narrative but does not gate deploys**; promote to gating by removing it from that list. These leaves are `manual`/`cost: llm` (exploration-mode; run one with `verifier-run review.viability`), not auto-scheduled.

For the live tree — current children, statuses, and per-leaf detail — open the commands menu (`npm run verifier:tree`) and pick `Open check dashboard` (it's the source of truth; this README deliberately doesn't duplicate it). Drill into red children there; the `report.md` narrative is the executive summary that names the top issue under each red facet. Checks whose definitions set `display.preferredArtifact` (e.g. `"preferredArtifact": "report.md"`) show that artifact by default in the details pane.

Checks live under `checks/` as paired `*.mjs` scripts and `*.def.json` definitions (the authoritative per-check docs). Results, artifacts, and mutable state live under `results/`, `artifacts/`, and `state/`.

## Pointing the harness at this workspace

There's a `.envrc` containing `VERIFIER_WORKSPACE=verifier`, which the verifier respects.
