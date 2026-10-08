# Continuous / 24-7 simulations — recommendations

Status: recommendations only. Not implemented. Do not treat this as the current focus unless Adam says so; the gated 10-user testnet campaign in [`TESTNET-SIMULATION-PLAN.md`](./TESTNET-SIMULATION-PLAN.md) is still the unfinished campaign work.

This file is the durable answer to the prompt below. Keep [`PLAN.md`](./PLAN.md)'s four data jobs separate. This is a **fifth operational mode**: a living world with a clock, not another seed flag.

## Originating prompt (2026-09-15)

> Take a look at all the fake data generation stuff in the repo and consider how we can use it to create scaled simulations of realtime user interactions that run 24/7 for both scalability testing of the system and to generate lots of realistic and temporally spaced data and interactions to stress test our interfaces and user experiences. We would like an online interface to create and run these simulations against both local and online deployments and have easy ways to monitor and analyze their behavior. Generate recommendations and save them in the repo along with this prompt.

## What we actually want

Three products that look similar from the UI but fail if mixed:

| Product | Question it answers | Time model | Success looks like |
|---|---|---|---|
| **A. History factory** | Can we mint a *credible past* (days/weeks of activity) so boards, leaderboards, and trust graphs look lived-in? | Simulated time, compressible (30 days → 1 hour) | Dense, uneven, dated history; UI is intelligible |
| **B. Live world** | Does the running stack stay healthy while people-like activity trickles in forever? | Wall-clock 24/7 | Indexer lag bounded, pages stay usable, no silent omission |
| **C. Load / soak** | Where does the system fall over under write bursts or read storms? | Burst or high-rate clock | Measured p95s, lag, fold times, memory; no capacity *claims* beyond the run |

A and B should share personas, statements, and the executor. C should reuse the same observers with a different rate and acceptance budget. Do not use Job D (`gen:large` random users) as the narrative for A/B.

## What already exists (reuse this; do not rebuild)

Keep these as they are. The living-world work should *call* them.

**Seeds (PLAN jobs A–C).** Tiny/demo worlds and curated `seed-content/` statements. Real statements stay Job C. Fake users stay disposable and labelled synthetic.

**Burst stress (PLAN job D).** `runSimulation.ts` + `gen:small|medium|large`. Sequential rounds, Hardhat-oriented, records `output/actions.json` and `output/metrics.json`. Good for “did random writes land,” weak for realism, concurrency, time, indexer lag, and UI.

**Medium realistic campaign.** The important reuse target.

- Manifest + personas + accepted-statement catalog: [`campaignSchema.ts`](./campaignSchema.ts), [`campaigns/medium-realistic-v1.json`](./campaigns/medium-realistic-v1.json)
- Deterministic plan (no keys, no chain): [`campaignPlanner.ts`](./campaignPlanner.ts)
- Local vs remote policy: [`campaignEnvironment.ts`](./campaignEnvironment.ts)
- Resumable executor with pacing, budgets, stop/resume: [`campaignExecutor.ts`](./campaignExecutor.ts)
- SDK writes + indexer/SDK reconcile: [`campaignActionAdapter.ts`](./campaignActionAdapter.ts), [`campaignReconciler.ts`](./campaignReconciler.ts)
- Local 100-user run already mined 1932 actions in ~196s at concurrency 4, pacing 0, and fully reconciled. See [`campaigns/medium-realistic-v1-local-run.md`](./campaigns/medium-realistic-v1-local-run.md).
- Remote 10-user canary is planned and preflighted; mutating testnet execute is still waiting on Adam.

**Inspectable batches (PLAN job E).** Encrypted run registry + CauseStarter `/admin/test-data` (capability URL, impersonate a fake user, mainnet hard-disabled). [`generate-testnet-data.sh`](../scripts/generate-testnet-data.sh) is a *five-user* Base Sepolia batch, not a campaign and not 24/7.

**Scalability testing notes.** [`specs/tech/scalability-testing.md`](../specs/tech/scalability-testing.md) already says: reuse fake-data-generation for writes, then add separate read/indexer benches. The proposed `scripts/scalability-*.mjs` files are **not built**. Highest-risk paths named there (indexer catch-up, large-entity folds, browse/rank, IPFS, platform-api cache) are still the right first observers.

**Personas.** `generateUsers.ts` already has lurker/casual/active/power-user and a wealth power law. The campaign planner is stricter and cause-aware. Prefer campaign personas for A/B; keep random users for C.

## Gaps versus the prompt

| Need | Today | Gap |
|---|---|---|
| Temporally spaced activity | Campaign executes the whole graph as fast as RPC allows (`pacingMs` is a throttle, not a calendar). `runSimulation` “rounds” are loops, not days. | Actions need `dueAt` (sim-time and/or wall-clock). History factory compresses; live world honors the clock. |
| 24/7 process | One-shot CLI (`gen:campaign:execute`, `data.sh --seed`). | A supervised daemon with heartbeat, pause/resume, daily budget, and crash-resume from execution state (the executor already persists that file). |
| Create/run from a website | `/admin/test-data` is **inspect-after**. Creation is CLI. | Operator UI to pick a template, target (local / testnet), budgets, and start/stop. Same capability-key gate. Mainnet stays disabled. |
| Dual target | Campaign environment split is real. Test-data admin already knows `local \| testnet`. | Wire the daemon to that split. Never point `gen:large` at Sepolia. |
| Scalability testing | Metrics are gas + action counts. Reconciler can measure indexer lag *after* a batch. | Continuous lag, RPC errors, fold latency, page weight, and sampled browser timings while the world is live. |
| UX stress | Manual notes from one 100-user local run (slug titles, empty trust-root banner, no directory). | Scripted journeys on the *live* boards: list density, empty vs crowded states, trust-filter copy, fold time as support counts grow. |
| Analysis | JSON artifacts in gitignored `output/`. | A run dashboard: planned vs due vs mined vs indexed, lag sparkline, cost, hot pages, failure taxonomy. |

The 196-second 100-user local run proves the *write path* can populate a world. It does **not** prove 24/7 health, temporal realism, or that CauseStarter stays pleasant as boards grow over days.

## Recommended architecture

Do not add a sixth generator. Add a **clock** and a **control plane** on top of the campaign stack.

```
  operator UI  (/admin/simulations, capability-gated)
        |
        v
  control API (local process or operator-only service; not a public product)
        |
        +-- world templates (campaign manifests + clock profile)
        |
        v
  clocked executor  (campaignExecutor + dueAt + heartbeat)
        |
        +-- campaignActionAdapter (SDK writes; same local/remote policy)
        |
        v
  target chain + indexer + UIs
        ^
        |
  observers (reconcile loop, read benches, sampled Playwright)
        |
        v
  run artifacts + dashboard (extend test-data registry)
```

### 1. Clocked plans (the missing schema field)

Extend the planned action graph with:

- `dueAtSim` — offset from world t0 (seconds of simulated history)
- `dueAtWall` — optional ISO time when running in live mode
- `phase` — bootstrap / daily / evening-burst / lapse, for analysis
- existing `dependsOn` stays: a due action still waits for prerequisites

Two playback modes, same plan:

- **`replay=compress`** (history factory): advance simulated time as fast as the chain/indexer can absorb, but *emit* timestamps/dates that look like a past. Use this to mint a lived-in board before a demo. Do not pretend this is 24/7.
- **`replay=realtime`**: sleep until `dueAtWall`. This is the 24/7 process. Rate comes from the plan (lurkers almost never act; power users act several times a day), not from `concurrency=4, pacing=0`.

A 100-user realistic day is on the order of tens to a few hundred writes, not 1932. The 1932-action campaign is a *compressed history*, not a day of life. Split templates accordingly:

- `history-30d-100u` — mill the campaign graph with sim-time stamps
- `live-10u-trickle` — tiny living world, ~1–5 writes/hour, safe to leave on
- `live-100u-office-hours` — diurnal curve, pause overnight if we want
- `soak-read` — no extra writes; hammer folds/browse against an existing world
- `burst-write` — Job D / high concurrency; labelled as load test, not narrative

### 2. Daemon

A long-lived Node (or Compose) worker that:

- loads a frozen plan + execution state (already atomic)
- submits only actions whose `dueAt` is due and whose deps are mined
- heartbeats `{planId, mode, dueLag, chainHead, indexerHead, mined, failed, budgetRemaining}` every N seconds
- honors cooperative stop (executor already has `shouldStop`)
- enforces **daily** native-token and tx caps in addition to the campaign lifetime budget
- never starts on mainnet; remote still needs `--confirm-remote-mutation` or an equivalent UI confirm that is stored on the run, not in `config.json`

Local: a Compose service `simulation-runner` gated off by default, started from the operator UI or `npm run gen:campaign:live`. Testnet: the same binary against Base Sepolia, with faucet/Alchemy quotas in the template.

Resume after reboot is already designed: execution state + receipt lookup. Do not invent a second state file.

### 3. Operator UI (online interface)

Extend CauseStarter `/admin/test-data`, do not invent a second admin site. That route already has:

- capability-key access
- local + testnet, mainnet refuse
- run list + impersonate disposable user
- encrypted registry so published artifacts are not world-readable

Add a sibling `/admin/simulations` (same key) with four screens. Sketch (HTML + screenshots, not implemented): [`sketches/admin-simulations-screens.md`](./sketches/admin-simulations-screens.md).

1. **Catalog** — templates (history / live / soak / burst), last run, target.
2. **Create** — pick template, target (`local` 31337 vs `testnet` 84532), clock mode, duration or “until stopped”, budgets. Dry-run shows estimated writes/day, ETH, token, and which statement CIDs will be touched. No free-form “type a prompt and hallucinate users.”
3. **Live run** — start/pause/resume/stop; due-lag vs chain-head vs indexer-head; recent actions; fail-closed reasons (budget, RPC, lag). Link into existing run detail + “view as user.”
4. **Analysis** — per-run and across-run: action mix over time, board density, p95 fold/browse, sampled screenshots, reconciliation mismatches.

The UI must not hold hot keys in the browser except the existing in-memory impersonation path. Start/stop talks to the local/operator control API. Testnet starts from a machine that already has operator secrets, not from a random laptop session.

### 4. Observers (monitor + analyze)

Attach these to every live/history run. They are the scalability-testing plan, made continuous.

| Observer | What | Cadence |
|---|---|---|
| **Reconcile tick** | Reuse `campaignReconciler` on the suffix of new hashes | every 1–5 min live; end of compress |
| **Indexer** | chain head − indexed head, catch-up time, query p95, row counts | 15–30 s while running |
| **Read bench** | largest project fold, most-supported statement, newest browse, cause leaderboard, IPFS hot/cold | every N minutes, and on demand |
| **UX sample** | Playwright against a *named* board URL from runtime bindings: landing, cause, project, sign, organize-after-connect | hourly live; once after history mill |
| **Host** | runner RSS, Ponder size, RPC errors, 429s | with heartbeat |

Budgets start empirical (see scalability-testing.md) and fail **noisy** on live runs (dashboard red) rather than killing CI. A live world that silently omits events is a failed run even if the UI still looks busy.

UX sample should assert more than HTTP 200:

- board is labelled synthetic
- project list is non-empty *or* the empty state is the intended copy (not the contradictory “starter network unavailable” + visible projects we already saw locally)
- fold/render time under a budget that tightens as we learn
- list length and document size stay in a human range (a 400-project board that paints is still a UX bug)

### 5. Safety and identity

Unchanged rules, applied to a longer-lived process:

- Synthetic label on every campaign board (already in the v1 manifest).
- Job C statements only for A/B narrative; no mass-generated political triples; no stuffing `universe.json` into tiny.
- Mainnet hard-disabled (test-data routes already refuse).
- Remote mutation is opt-in per run, with a hard ETH/tx ceiling and an auto-stop.
- Wallet secrets stay under `output/campaigns/secrets/` (gitignored). Capability keys stay local; never in `config.json`.
- Volume stays SDK writes. A small Playwright sample verifies the product; 100 headed browsers is a different test and a worse debugger.
- Do not use living traffic to paper over a broken shared lab. If preflight/verifier leaves are red, the UI should refuse to start a testnet run.

## Phased delivery

Small enough to review independently. Each phase should leave a CLI that works without the UI.

1. **Clock the campaign plan.** Add `dueAtSim` to planned actions; compress-replay the existing 100-user graph so CauseStarter shows a *dated* history rather than “everything happened in three minutes.” No daemon yet.
2. **Realtime trickle locally.** `live-10u-trickle` template + daemon + heartbeat file. Leave it running overnight against the local stack. Prove resume after `docker compose restart`.
3. **Observers.** Indexer lag + one read bench + one Playwright board journey, written into the run artifact. This is also the first real implementation of `specs/tech/scalability-testing.md` instead of a parallel harness.
4. **Operator UI (local).** Catalog / create / live / analysis on `/admin/simulations`, talking to the local daemon. Reuse the test-data capability key.
5. **Testnet trickle.** Only after campaign plan item 9 (10-user canary) has actually run. Same UI, remote environment policy, tiny daily budget.
6. **Scale profiles.** 100u office-hours, then 1000u only as a labelled burst/soak. 1000+ users is still “not built” in PLAN job D; do not sneak it in as a live template.

Do not start at step 4. A pretty admin page that shells out to `gen:large` would mix jobs and skip the clock.

## Explicit non-goals

- Replacing tiny/demo seeds. Developers still wipe and `--seed` for a story-sized world.
- Using 24/7 traffic as a testnet recovery mechanism.
- Claiming mainnet capacity from any of these runs.
- LLM-authored users/statements at runtime. Templates are code + accepted seed content.
- Browser-bot majority of writes.
- A public “simulation product.” This is an operator surface.

## Relationship to other plans

- [`PLAN.md`](./PLAN.md) — four seed/stress jobs plus inspectable batches. This file is the living-world add-on.
- [`TESTNET-SIMULATION-PLAN.md`](./TESTNET-SIMULATION-PLAN.md) — finish the 10/25/100 *batch* campaign on testnet before a 24/7 testnet trickle. The campaign planner/executor is the substrate for the clock.
- [`specs/tech/scalability-testing.md`](../specs/tech/scalability-testing.md) — observers and budgets; implement them as the daemon’s sidecar, not as disconnected `tmp/scalability-runs` scripts that never land.
- CauseStarter `/admin/test-data` — inspect and impersonate; simulations admin is the create/run/monitor sibling.

## Suggested first implementation slice (when this becomes the focus)

**Done 2026-09-17.** Planned actions now include `dueAtSim` (30-day simulated horizon). `npm run gen:campaign:execute -- --replay compress|realtime` (default compress). Realtime sleeps until `startedAt + dueAtSim`, persists `startedAt` on the execution state, and writes `execution/heartbeat.json` plus `output/campaigns/heartbeat.json`. CauseStarter `/admin/simulations` is a read-only catalog that tails that file (same capability key as test-data). Start/stop and analysis screens are still later. Do not add create/run buttons until a local overnight trickle has survived a restart.
