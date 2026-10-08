# `/admin/simulations` screen sketch

Visual HTML mockups live in [`admin-simulations.html`](./admin-simulations.html). Screenshots: `01-catalog.png`, `02-create.png`, `03-live.png`, `04-analysis.png`.

**Catalog is implemented** as a read-only CauseStarter page at `/admin/simulations` (same capability key as test-data). It polls `/simulations/heartbeat.json` and does not start or stop runs. Create / live-run controls / analysis remain sketches. Parent plan: [`../continuous-simulation.md`](../continuous-simulation.md).

## Fit with what is already on screen

CauseStarter already has operator pages at:

- `/admin/test-data` — list of encrypted runs (date, network, user/action chips, **Open run**)
- `/admin/test-data/:runId` — impersonate a fake user, counts, users table, activity-by-type, action log, parameters, entities

Chrome is the normal CauseStarter shell (wordmark, Organize/Work/Sign/Donate/Fund/Docs, Connect). Admin is not a separate app. Capability key stays in `?key=`; mainnet is already refused.

Simulations should be a **sibling tab** on that same operator surface, not a new product:

```
Operator
Simulations
[ Test-data runs ]  [ Simulations ]
```

`/admin/test-data` keeps its current list. `/admin/simulations` is create/run/monitor. A live or finished simulation still **writes a test-data run**, so “Open test-data run” and “View as fake user” stay on the existing run page. Do not duplicate impersonation.

`pageWidthForPath` should treat `/admin/*` as `reading` (md, like settings/docs), not workspace `lg`. The sketch uses the wider workspace width only because catalog cards need two columns; we can tighten later.

## Screen 1 — Catalog (`/admin/simulations`)

Purpose: pick a frozen template and see if anything is live.

- Same page header pattern as test-data: overline **Operator**, `h4` title, one-line lede.
- Tab row: Test-data runs | Simulations.
- **Live now** card if a daemon heartbeat is running (status chip, target, due lag, indexer lag, Open).
- Template cards, not a prompt box:
  - `history-30d-100u` (compress, campaign v1)
  - `live-10u-trickle` (realtime, safe overnight)
  - `live-100u-office-hours` (diurnal)
  - `soak-read` (observers, no extra writes)
- Job D / `gen:large` stays CLI until observers exist. Do not put “type a prompt” here.

## Screen 2 — Create (`/admin/simulations/new?template=…`)

Purpose: dry-run a template against a target, then start.

- Back to catalog (same “All runs” text-button pattern as the run page).
- Fields: template, target (Local 31337 / Testnet 84532), clock (compress / realtime), stop condition, daily ETH cap, daily tx cap.
- **Dry-run estimate** card before the primary button: writes/hour, ETH/day, funded wallets, statement IDs that will be touched, preflight (chain, bytecode, indexer lag, capability).
- Testnet: extra confirm control equivalent to `--confirm-remote-mutation`. Local: that control is absent.
- Primary button copy is specific (`Start trickle`, `Mill history`, `Start soak`), not a generic Submit.
- No private keys in the form. The control API runs on a machine that already has operator secrets.

## Screen 3 — Live run (`/admin/simulations/:runId`)

Purpose: operate one daemon: pause / resume / stop, and see health.

- Status chips + Pause / Resume / Stop. Resume disabled while running.
- Metric cards in the same language as the test-data run counts: due lag, chain head, indexed head, mined, failed, ETH used vs cap.
- Indexer-lag sparkline (dashboard red if lag stays high — noisy, not a CI kill).
- **Recent actions** table: Due, Type, Actor, Status, Tx — same columns as “All recorded activity” on the test-data run page.
- **Open the world**: View as fake user (existing in-memory wallet), named board URL from runtime bindings, Open analysis, Open test-data run.

Heartbeat JSON from the daemon is the only live data source (`execution/heartbeat.json` from `--replay realtime` or compress). If the heartbeat is stale, show a warning alert, not a frozen “running” chip.

## Screen 4 — Analysis (`/admin/simulations/:runId/analysis`)

Purpose: after-the-fact (or rolling) observers.

- Reconciled writes, mined-but-unindexed, p95 cause-board fold.
- Action mix table (planned / mined / failed).
- UX sample table (Playwright on named URLs). Warnings stay visible (e.g. starter-network banner vs visible projects).
- Read bench table (p50 / p95 / size) for the paths in `specs/tech/scalability-testing.md`.
- Sketch numbers in the HTML are **illustrative**. The real screen stays empty until observers write artifacts.

## Shared gates (already implemented on test-data)

Reuse these states; do not restyle them:

| State | Copy today | Simulations |
|---|---|---|
| Mainnet | “Test-data administration is disabled on mainnet.” | Same, swap the noun |
| No `?key=` | “Open the bookmarked admin capability URL…” | Same |
| No registry URL | “No test-data registry is configured…” | “No simulation control API / registry…” |
| Load error | error Alert | same |

## What this sketch is not

- Not React routes. Do not add `/admin/simulations` to `manifest.tsx` until phase 4.
- Not a control plane. Buttons in the HTML do not call a daemon.
- Not a replacement for `/admin/test-data`. Impersonation and encrypted run documents stay there.
