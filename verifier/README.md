# Commonality verifier workspace

The project-specific workspace for the external `verifier` harness (the `@adamspitz/verifier` npm package, installed as a dev dependency by normal `npm install`). This file is **how to run it**; see [`DESIGN.md`](./DESIGN.md) for *why it's built this way*, [`PLAN.md`](./PLAN.md) for the improvement backlog, and the `*.def.json` files under [`checks/`](./checks/) for authoritative per-check behavior.

See the `using-verifier` AI skill for the underlying harness model.

## The three actions you want

```sh
npm run verifier:work
npm run verifier:stand
npm run verifier:prepare -- testnet-simulation
```

`verifier:work` maps committed and uncommitted changes to affected evidence,
previews the total runtime/tokens/prerequisites/effects, and runs only checks
marked short, deterministic, and side-effect-free. `--dry-run` only explains;
`--all` explicitly includes the deferred expensive checks.

`verifier:stand` is a strictly read-only answer from stored evidence. It defaults
to the current-focus view, runs no checks, and calls no model. Add `-- --all` for
all top-level concerns or `-- --problems` to hide passing rows.
`verifier:prepare` previews a named evidence campaign;
add `--run` only after reviewing its costs and effects. The current campaign is
`testnet-simulation`; `release-candidate` and `full-launch` are also defined.

The policy, human labels, costs, path ownership, and milestone campaigns live in
[`operator-policy.json`](./operator-policy.json). See
[`OPERATOR-OVERHAUL.md`](./OPERATOR-OVERHAUL.md) for the design and rollout.

To browse the dashboard interactively: `npm run verifier:tree`. It opens on four
task-oriented tabs: **Current work**, **Where we stand**, **Milestone**, and the
advanced **All checks** DAG. Press `1`–`4` or Left/Right to switch views. Each
ordinary view contains only the checks relevant to its question; `a` runs that
view's contextual action when it has one. `j`/`k` move, `r` reruns the selected
check, `d` toggles the details pane between a check's report artifact and its
findings JSON, and `Tab` focuses the details pane so `j`/`k` scroll it. Press `c`
for the legacy commands/debug menu.

Tree rows distinguish verdict from freshness: bright green `✓` is a current
pass, amber `✓` is a stale pass, bright red `✗` is a current failure, and orange
`✗` is a stale failure. Cyan `?` is uncertain, magenta `!` is a check error, and
grey `·` means never run. `⟳` marks stale evidence; the details pane says whether
it aged past the seven-day default, relevant code changed, or supporting
evidence is newer. Runtime and `LLM high` badges describe rerun cost separately.

The raw tree is an evidence-flow view, not a folder hierarchy. Each parent uses
the latest results of the children shown beneath it, so read a branch as
**conclusion → supporting evidence**. A check can support multiple conclusions;
the underlying structure is therefore a DAG, and that check can appear in more
than one expanded branch.

The top of the tree groups evidence by question. `facet.functionality` means **does it
work?** (tests, builds, live-stack and testnet behavior). `facet.product` means
**does it make sense to people and feel worth using?** (messaging, workflows,
usability, and human/LLM judgment). `facet.docs` asks whether the documentation
coheres, `facet.security` covers contracts and trust boundaries, and
`meta.verifier-health` asks whether the evidence system itself is trustworthy.
These names are maintainer vocabulary; ordinary use should start with the three
actions above, not by running individual facets.

## Command cheat-sheet

| I want to… | Command |
|---|---|
| Check evidence affected by my changes | `npm run verifier:work` |
| Read where we stand without running anything | `npm run verifier:stand` |
| Preview a milestone campaign | `npm run verifier:prepare -- testnet-simulation` |
| Browse the dashboard interactively | `npm run verifier:tree` |

Those are the commands an ordinary operator should need. Verifier maintainers
can still use `verifier-run <checkId>`, `npm run verifier:cost`, the guarded
cadence scripts, and `npm run verifier:currency:heuristic` from the Advanced
tree/debugging path.

The project `.envrc` sets `VERIFIER_WORKSPACE=verifier`, so no `--workspace` flag is needed from the repo root. From elsewhere, pass `--workspace <path>` or set `VERIFIER_WORKSPACE`.

## Run an LLM-judgment check from this chat

If Adam says “run `review.landing-compelling`” (or any other `cost: "llm"` check) **in a coding chat**, he means **you** do the review in this session and **record it as a real verifier Result**. Do **not** `verifier-run` the check in a way that spawns `pi` (that used to go through OpenRouter and bill per token). Do **not** wait for the scheduler; these leaves are `trigger: manual`.

Procedure:

1. `npm run verifier:llm -- --list` if you need the check id.
2. `npm run verifier:llm -- <checkId> --dump-prompt` — writes `prompt.md` (and any snapshots). The stored check Result is an **error**, not a verdict. The helper itself exits 0 when that dump path ran as intended.
3. Read the dumped prompt. Follow it: brief yourself from the repo README as instructed, inspect the scoped surface, write the JSON envelope the prompt specifies (`status`, `summary`, `reportMarkdown`, `findings`, `filesRead`, …).
4. Save that JSON to a file and record it:
   `npm run verifier:llm -- <checkId> --response-file /tmp/verdict.json`
5. That run is a real stored Result: supervisors, `verifier-tree`, and `verifier:stand` treat it the same as a `pi` run. Status is still derived from finding severities; you cannot talk a high finding into a pass.

Only use `verifier-run <checkId>` / `COMMONALITY_VERIFIER_ALLOW_LLM=1` when Adam explicitly wants a **separate** `pi` process (subscription `xai` / `opencode-go` only — see `llm-routing.json`). Prefer the chat-session path above.

### Refresh cost (so you don't fire an expensive check by accident)

Expensive (LLM/agent) checks are marked declaratively with `"cost": "llm"` in their `*.def.json`. Count them with `npm run verifier:llm -- --list`: standing `review.*` “acts like a human tester” leaves (including `review.testnet-two-person-lab`), two meta reviewers, `meta.report-currency`, the `root` narrative, and the `known-bad.report` fixture (that last one never calls a live model). **They do not auto-run.** Review/meta leaves are `trigger: manual`. `meta.report-currency` is an explicit legacy heuristic (`npm run verifier:currency:heuristic`) and is no longer a root input. `root` may still fold on input change, but its **narrative model call is opt-in** (`COMMONALITY_VERIFIER_ALLOW_LLM=1`, set by `verifier:root`). The scheduler therefore cannot burn tokens on human-tester leaves.

They spend against Adam's **subscription** providers only (`xai/grok-4.6` by default, or `opencode-go/…` via `COMMONALITY_VERIFIER_LLM_PROVIDER=opencode-go`). `verifier/llm-routing.json` is the pin; OpenRouter and other pay-per-token gateways are rewritten away before `pi` is spawned.

To have the LLM you are already chatting with do the review (and have it count as a real stored Result): dump the prompt, write the JSON envelope the prompt asks for, then record it — no second `pi` process, no OpenRouter:

```sh
npm run verifier:llm -- --list
npm run verifier:llm -- review.landing-compelling --dump-prompt
# write the JSON envelope to /tmp/verdict.json, then:
npm run verifier:llm -- review.landing-compelling --response-file /tmp/verdict.json
```

`COMMONALITY_VERIFIER_LLM_RESPONSE` / `_FILE` is the same mechanism if you skip the helper. The check still runs its deterministic setup (copy snapshots, etc.) and still maps findings to status; only the model spawn is replaced.

The harness reads the `cost` field so cost awareness is **baked into the tools you actually use**, not a script you have to remember:

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
- **Full launch**: preview `npm run verifier:prepare -- full-launch`; add `--run` only after reviewing its testnet-writing and gas-spending effects, then explicitly run `npm run verifier:root` if a fresh launch narrative is wanted.

To run a manual/LLM validation pass (intelligent judgment when conventional tests pass), follow the runbook in [`DESIGN.md`](./DESIGN.md).

### Running guarded checks (env-var opt-ins)

Guarded checks refuse to run without an explicit opt-in env var. **Each has its own — they are NOT interchangeable.** (`coverage/guarded-check-policy.json` is the authoritative per-check list; this is the operator's how-to.)

- **`stack.fresh-seeded`** — `COMMONALITY_VERIFIER_ALLOW_DESTRUCTIVE=1`. Self-contained: wipes local data, rebuilds Docker images, restarts services, seeds tiny data, then probes rpc / platform-api / ipfs / indexer-graphql / indexer-events and asserts the tiny seed's Commonality refs (`local-food-systems` / `christianity` for Hardhat #0, `bookmarked-causes` for #0–#9). This **is** how you "boot the local stack." ~5–8 min (image build dominates).
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

Periodic verification is intentionally **disabled on Adam's workstation**. The
systemd scheduler service is installed but disabled, and the old heartbeat and
nightly deep-cadence crontab entries were removed during the operator overhaul.
Use `verifier:work` for change-driven evidence and `verifier:prepare` for an
explicit milestone campaign. If continuous operation is deliberately restored,
run the scheduler under a real process supervisor (`npm run verifier:run`) and
add an external heartbeat cron so scheduler death is visible:

```cron
*/5 * * * * cd /home/adam/Projects/commonality && npm run verifier:heartbeat
```

`heartbeat-check.sh` alerts if `verifier/state/heartbeat` is missing or older than `MAX_AGE_SEC` (default 180s); wire its failure path to a real pager/webhook in deployed operation. By policy the scheduler only auto-runs cheap operational checks (`meta.liveness` every 30 min; `meta.flakiness`, the `coverage.*`/`staleness.*` checks, and `known-bad.*` fixtures every 12 h); slow/destructive/E2E/testnet/manual-LLM checks stay manual-triggered.

For a quick non-destructive preflight of the local Dockerized stack, run `npm run verifier:local-stack-health`. It names which of Hardhat RPC, indexer GraphQL, platform API, or UI shell is missing/unhealthy.

Run the guarded deep checks from a separate nightly/CI job, for example:

```cron
15 2 * * * cd /home/adam/Projects/commonality && npm run verifier:deep-cadence
```

`verifier:deep-cadence` first opts into `stack.fresh-seeded` to rebuild/seed the local stack, then runs the unguarded `operations.local-stack-health` canary plus the remaining local destructive/E2E stack checks (`stack.restart-consistency`, `operations.indexer-lag`, `artifact.ipfs-domain-smoke`, and `stack.user-journeys`) and refreshes `stack.deployment-depth` and `facet.functionality`, so the dashboard has a retained "the stack really booted" proof. Those local-stack checks are exclusive: they share a `flock`, cadence runs them one at a time, and a failure skips the rest of the local-stack set so `restart-consistency` cannot wipe a seed that is still being written. Use `npm run verifier:deep-cadence -- --testnet` for read-only deployed testnet smoke, `npm run verifier:deep-cadence -- --testnet --browser-testnet` to include deployed browser journeys, or `npm run verifier:deep-cadence:full` only in an environment with the funded verifier wallet and mutation credentials. The installed nightly wrapper sources `.env`/`.env.secrets`, runs the read-only testnet smoke plus browser journeys, and includes the mutating on-chain journey only when `COMMONALITY_VERIFIER_NIGHTLY_ALLOW_TESTNET_MUTATION=1` and `COMMONALITY_TESTNET_VERIFIER_PRIVATE_KEY` are present.

## Dashboard hierarchy

`root` is the apex ("is this ready to deploy?") **and** the report in one node: it rolls up the four concern facets plus `meta.verifier-health` into one deterministic gating status, and from the findings each facet propagates upward plus the current milestone (`milestone.json`) writes the human-readable "where are we, really?" narrative to a `report.md` artifact. The narrative never affects gating and is memoized (re-asked only when child statuses or the milestone change).

The five children under `root`:

- **`facet.functionality`** — does it work? Fast PR loop, full suite, the guarded deep-stack/testnet checks, and operations canaries.
- **`facet.docs`** — do the docs cohere? Coherence judgment plus the deterministic broken-ref scan.
- **`facet.product`** — is it compelling and usable? Messaging, workflow-clarity, and manual attestations.
- **`facet.security`** — is the on-chain surface sound? Hardhat tests, Slither, and contract review.
- **`meta.verifier-health`** — can you trust the green? Liveness, flakiness, coverage maps, and the `known-bad.*` verifier-of-verifier fixtures.

UI-domain gating is **Commonality, Civility, and Common Sense Majority only**. `coverage/domains.json` is the in-scope roster. Other Vite domains (LazyGiving, Aligning, Tally, Content Funding, Commonality, Conceptspace) may still exist and even have leftover checks, but they must not turn coverage, page-link, landing, workflow, or testnet UI probes red.

For the live tree — current children, statuses, and per-leaf detail — open the commands menu (`npm run verifier:tree`) and pick `Open check dashboard` (it's the source of truth; this README deliberately doesn't duplicate it). Drill into red children there; the `report.md` narrative is the executive summary that names the top issue under each red facet. Checks whose definitions set `display.preferredArtifact` (e.g. `"preferredArtifact": "report.md"`) show that artifact by default in the details pane.

Checks live under `checks/` as paired `*.mjs` scripts and `*.def.json` definitions (the authoritative per-check docs). Results, artifacts, and mutable state live under `results/`, `artifacts/`, and `state/`.

## Pointing the harness at this workspace

There's a `.envrc` containing `VERIFIER_WORKSPACE=verifier`, which the verifier respects.
