# Medium-scale realistic testnet simulation — working plan

**Current campaign: medium-realistic-v2.** The completed execution measurements below describe historical v1 runs and should not be read as v2 results. V1 remains available for reproducibility; default campaign commands and new planning output use v2. V2 includes campaign-local hobby causes, projects, and interested users; it has been planned, not executed on a chain.

Tell a fresh LLM: **read this file, then do the next unchecked item under [Next](#next).** Keep [`PLAN.md`](./PLAN.md)'s four data jobs separate: this work combines curated Job C statements with disposable Job D actors, but does not turn fake activity into seed content. Deployment and shared-lab recovery still belong to [`../workflow/testnet-working-plan.md`](../workflow/testnet-working-plan.md).

## Goal

Build a reproducible, observable campaign that makes a testnet deployment look and behave like a small but real Commonality community:

- about **100 synthetic users** with persistent, disposable wallets;
- **14 coherent causes** built from accepted seed statements plus explicitly synthetic campaign-only hobby statements;
- **58 statements**, **29 projects**, and roughly **1,000–3,000 successful actions**;
- uneven participation, overlapping memberships, different roles and engagement levels, and a small controlled amount of disagreement and inactivity;
- a report that reconciles intended actions, mined transactions, indexed events, derived state, and representative UI pages.

This is a **product-realism and operational-confidence test**, not a maximum-throughput benchmark. Success means the populated system is credible and inspectable, not merely that 100 wallets can submit transactions.

## Why this is worth doing

Tiny and demo seeds show that individual stories can work. A medium-sized world can reveal a different class of failures before real people encounter them:

- cause boards, discovery, rankings, and trust-filtered views that become confusing at non-toy density;
- indexing omissions, duplicates, lag, replay problems, and client-fold performance;
- incoherent simulation behavior that makes apparently healthy product surfaces meaningless;
- operational limits around wallet provisioning, gas, payment tokens, RPC quotas, IPFS publication, resumability, and diagnosis;
- whether a founder can look at a populated vertical and see something compelling enough to demonstrate.

## Boundaries

### Real content, synthetic activity

- Seed statements must come from accepted files under [`seed-content/`](./seed-content/) or pass the existing [`statement-generation.md`](./statement-generation.md) acceptance process first.
- Prefer useful public-goods planks and a small number of already-accepted bridge clusters. Do not mass-generate political triples for this campaign.
- Synthetic users, projects, transactions, and relationships must be identifiable as test data. They are not examples to present as genuine adoption.
- Do not put campaign-only statements into `universe.json`, tiny seed, or accepted seed content merely to make the workload convenient.

### Not a browser-bot campaign

Most volume should use contract/SDK calls. A smaller browser sample verifies that the resulting state is visible and understandable through the actual product. One hundred browser sessions would test a different thing and make failures harder to localize.

### Not a testnet recovery mechanism

The shared two-person lab must be healthy before it receives the campaign. Do not use fake activity to cover empty official graphs, broken services, or incomplete first-user journeys. If the readiness gate below fails, continue locally.

### Not yet a scalability claim

The campaign may expose scale problems, but 100 users and a few thousand actions cannot justify claims about production capacity or millions of users. A later load-test design can reuse the harness with a different workload and acceptance criteria.

## Target world

The campaign manifest should specify the world independently of execution mechanics. A good first distribution is:

| Element | Target | Shape |
|---|---:|---|
| Users | 100 | Stable generated identities; clearly labelled campaign wallets |
| Causes | 8–12 | 2–3 large, 3–4 medium, several small or nearly inactive |
| Statements | 30–50 | Accepted planks plus a limited number of meaningful close/medium variants and bridge statements |
| Membership | 1–3 causes/user | Correlated with persona; overlapping rather than partitioned camps |
| Projects | 15–30 | Plausible projects aligned to actual planks; mix of active, weak, successful, and unfunded |
| Activity | 1,000–3,000 successful writes | Spread across phases/time; not one RPC burst |
| Roles | several of each | Cause founders, project founders, supporters, delegates, attesters/mediators, lurkers, power users |

Use deliberately uneven participation. Uniformly assigning the same number of users and actions to every cause produces clean-looking but uninformative data.

The first corpus should lean toward ordinary public goods—open-source maintenance, local food, accessibility, science/open data, literacy, and civic infrastructure—plus a small sample of the accepted abortion, immigration, crime, and LGBT-schools bridge clusters. Political content should not dominate the apparent product.

## Campaign artifacts

Each campaign needs a stable ID and an artifact directory that contains no committed secrets:

- input manifest version and deterministic random seed;
- selected statement IDs/CIDs and their accepted-source fingerprints;
- persona and cause-membership assignments;
- generated wallet addresses, with private keys stored separately and gitignored;
- planned action graph, including prerequisites between actions;
- submitted transaction hashes and receipts;
- per-action status: planned, submitted, mined, indexed, verified, skipped, or failed;
- gas/payment-token funding ledger and actual consumption;
- indexer reconciliation results and lag measurements;
- representative cause/user/project URLs and browser observations;
- final summary with failure categories and enough detail to reproduce the run.

The manifest must make reruns deterministic without requiring private keys to be checked into Git.

## Execution design

### Separate planning from execution

Generate a complete campaign plan before sending transactions. Validate references, prerequisites, balances, estimated gas, expected write count, and contract addresses in a dry run. Execution should consume that plan rather than making consequential random choices while running.

### Explicit environments

Do not point the current `gen:large` command at Base Sepolia. Add an explicit remote campaign mode with:

- verified chain ID and deployed address manifest;
- no deployment, Hardhat keys, free minting, or localhost assumptions;
- bounded concurrency, rate limiting, retries with backoff, and configurable pacing;
- idempotency/resume behavior based on recorded transaction and indexed state;
- a global transaction and native-token budget that aborts closed when exceeded;
- an unmistakable confirmation/opt-in flag for mutating a remote chain.

Keep the fast local simulator useful. Extract or share behavior/model code where practical instead of turning every local seed path into remote-aware code.

### Persona-driven behavior

Actions should follow declared roles and cause membership:

- users believe or disbelieve statements that make sense for their persona;
- projects align to statements that describe their actual outcome;
- supporters fund projects in their causes with a non-uniform distribution;
- delegation follows a generated trust graph and has valid predecessor notes;
- implication attestations use accepted/evaluated relationships, never a random truth value;
- some users lapse, change a belief, revoke a delegation, or remain mostly inactive;
- a few deliberately invalid actions may test rejection paths, but they are a separate labelled workload and do not pollute success metrics.

### Provisioning

Before execution, calculate rather than guess:

- native gas required per wallet and for central publishing/provisioning accounts;
- payment-token needs by persona and action plan;
- whether sponsored gas is intentionally part of this test;
- faucet/RPC/provider limits and total expected wall-clock time.

Fund wallets minimally and in phases. Never reuse the local Hardhat default keys on testnet. If a freely mintable test payment token is used, verify the deployed token's permissions instead of relying on a failed transfer followed by a blind `mintTo` fallback.

## Verification and success criteria

### Reconciliation

For every action type used in the campaign, compare:

1. the action the manifest intended;
2. transaction submission and receipt status;
3. the corresponding raw indexed event/entity;
4. SDK-derived state or aggregate;
5. UI visibility where the action is user-facing.

The report must distinguish transaction failures, expected contract reverts, RPC/provider failures, indexer lag, permanent indexing omissions, fold errors, and UI presentation defects.

### Required metrics

- planned/submitted/mined/indexed/verified counts by action type;
- failure and retry counts by classified cause;
- gas used and native/payment-token cost by action type and campaign phase;
- receipt latency and transaction throughput;
- time-to-index distribution and chain-head lag during/after each phase;
- cause size, statement support, project funding, delegation, and trust-graph distributions;
- duplicate/missing entities and mismatched derived totals;
- sampled browser journey results and links to inspected pages.

### Completion gate

This focus is complete when:

- a clean local campaign with the target world is deterministic and passes reconciliation;
- a 10-user remote canary can be safely resumed and fully reconciles;
- staged 25-user and 100-user testnet runs complete within explicit budgets;
- no unexplained mined-but-unindexed actions remain after the agreed settling window;
- representative UI inspection finds the world intelligible, not merely populated;
- the final report identifies bottlenecks and product findings without claiming production-scale capacity;
- rerun, cleanup/retention, and synthetic-data identification procedures are documented.

## Testnet readiness gate

Decided 2026-09-28, while walking through the old four "needs-adam" checks: those checks are how the run behaves, not a permission conversation. Play-money spend does not need a separate yes. The September "~0.97 ETH" figure was the preflight **transfer** into disposable wallets, almost all of it a 0.05 ETH cushion per wallet. The cushion is now a 0.0001 ETH floor plus 25% of estimated gas for each active wallet (`campaignProvisioning.ts`); idle wallets receive no ETH. The 2026-09-29 read-only preflight quoted 6,000,000 wei/gas and estimated 0.00660745 ETH for the 10-user slice (about 19 wallets, 85 planned actions). Re-quote before execution. On 2026-09-29 the operator deployer `0xFC0054CAA8417b946666a0093521B57efC5e5E4a` held **0.1158 ETH** on Base Sepolia (public RPC `sepolia.base.org`); check its current balance before spending.

Before a mutating remote phase:

- Run the read-only verifier as the first step. Stop if DNS, the indexer, or the contracts are broken. An idle official implication attester (zero `ImplicationAttestation`s from `0x021b3C…`) is not a reason to stop and ask.
- The runner still verifies chain ID, contract bytecode/addresses, indexer endpoint, and the native-token budget, and refuses to start if the funder cannot cover the transfer. Wallet secrets stay gitignored under `output/campaigns/secrets/`.
- Remote execute still requires `--confirm-remote-mutation`. That flag is the opt-in, not a fresh budget approval.
- Adding one or two implications signed by the official attester (`0x021b3C…`), from already-accepted pairs, retires the empty-graph question. Done 2026-09-30: two abortion modified→commonality pairs, block 47506047. It was a follow-up, not a blocker for the 10-user run.

After each stage (10, then 25, then 100), stop and reconcile. Do not start the next stage if the current one does not reconcile. A failed stage goes back to local diagnosis.

## Next

Do these in order unless Adam names a different item. Keep each item small enough to review independently.

1. **[x] Freeze the v1 campaign schema and world.** [`campaignSchema.ts`](./campaignSchema.ts) defines and validates the versioned contract; [`campaigns/medium-realistic-v1.json`](./campaigns/medium-realistic-v1.json) selects 10 causes and 46 accepted statements and fixes the 100-user persona mix, uneven activity, action prerequisites/targets, artifact layout, synthetic-data label, and deterministic PRNG seed. Tests resolve every statement reference against accepted seed content and enforce the target shape. This remains planning-only and contains no wallets or transactions.
2. **[x] Build a deterministic local campaign planner.** [`campaignPlanner.ts`](./campaignPlanner.ts) expands the manifest into stable statement fingerprints, 100 persona/cause assignments, unprovisioned wallet slots, projects, and a prerequisite-linked action graph before any chain connection. `npm run gen:campaign:plan` writes the planning artifacts plus per-action write/gas and payment-token estimates. Tests cover deterministic replay, distribution bounds, accepted bridge-role implications, and impossible dependencies; validation also rejects missing/excluded statements and out-of-range action counts.
3. **[x] Split local assumptions from reusable execution.** [`campaignEnvironment.ts`](./campaignEnvironment.ts) defines explicit local/remote chain configuration plus deployment, provisioning, wallet, and read-only chain adapters. Local mode is pinned to chain 31337 and retains legacy conveniences; remote mode requires an existing deployment manifest, generated non-Hardhat wallets, transfer-only token provisioning, an explicit mutation-confirmation field, the expected non-local chain ID, and bytecode at every required contract. Adapter and preflight tests cover wrong chains, absent code, implicit deploy/mint policies, key/address mismatches, and Hardhat-key rejection. Existing tiny/demo/local commands remain unchanged and local-only.
4. **[x] Add resumable, budgeted execution.** [`campaignExecutor.ts`](./campaignExecutor.ts) atomically persists planned/submitted/mined/failed action state and transaction hashes behind a chain-adapter boundary. It resumes submitted transactions through receipt lookup, schedules only dependency-ready actions, serializes budget reservation while allowing bounded receipt concurrency, and adds pacing, classified retries/backoff, cooperative stop/resume, transaction caps, and fail-closed native-token budgets. Fake-chain tests prove interruption/resume without duplicate submission, retry behavior, immutable-plan matching, and budget refusal; a later campaign action adapter will bind this reusable layer to contracts.
5. **[x] Make simulated behavior persona- and cause-aware.** The deterministic planner now emits concrete belief values and linked belief changes, readable projects derived from their accepted outcome statements, outcome-backed alignments, cause-member funding with persona-sized amounts and deliberately skewed project popularity (including unfunded projects), and note delegations restricted to trusted-role users who share a cause with the donor. Implication actions remain limited to accepted bridge-role evidence. Planner validation and tests enforce the behavioral payloads, relationships, and histories before execution.
6. **[x] Bind execution to contracts and deep reconciliation.** [`campaignActionAdapter.ts`](./campaignActionAdapter.ts) turns planned actions into contract writes, records mined hashes, and updates the public runtime-binding artifact. `npm run gen:campaign:execute` is local-first, refuses remote mutation without `--confirm-remote-mutation`, and keeps wallet secrets outside the campaign directory. Reconciliation already maps those hashes to Ponder events and SDK folds. Local execution now funds generated wallets (ETH plus payment tokens, with mint fallback) and writes `execution/funding-ledger.json` before submitting writes.
7. **[x] Run and inspect the full 100-user campaign locally.** Local execute mined all 1932 actions in ~196s (concurrency 4); after harness fixes, reconciliation is 1932/1932 with lag 0. Commonality on Vite `:5174` (chain 31337, indexer via `/api` → `:42069`) shows campaign boards, statements, and funded projects. See [`campaigns/medium-realistic-v1-local-run.md`](./campaigns/medium-realistic-v1-local-run.md). A Vite process started against a previous testnet env will keep hitting Base Sepolia until it is restarted.
8. **[x] Prepare the remote canary.** [`campaignCanary.ts`](./campaignCanary.ts) slices the frozen plan to 10 users plus dependency actors, estimates native/token funding and paced duration, and writes a read-only proposal (`reports/remote-canary-preflight.{json,md}`). `npm run gen:campaign:canary-preflight` checks remote chain ID/bytecode and indexer lag, refuses `--confirm-remote-mutation`, and documents secrets layout/retention and the synthetic label. It does not send transactions. The 2026-09-11 note that four gates were `needs-adam` is superseded by the readiness section above.
9. **[x] Run 10 users on testnet and reconcile.** Safe resume preserved the mined publishes and projects. All 85 actions reconciled at zero indexer lag. A local Commonality UI pointed at this deployment showed a funded project and its statement board; the broken project-vouch link found in that journey was fixed on this branch.

   **Status (2026-09-29):** The indexer recovered without an env change and caught up past the project blocks. Funding needed ordinary ERC20 approval on the public RPC, with an allowance large enough for repeated purchases and three approval confirmations. See `stage-10/reports/summary.md` under gitignored campaign output. Official-attester implications were published later (2026-09-30, block 47506047).
10. **[x] Run staged 25-user then 100-user campaigns.** The 25-user stage mined and reconciled 154/154 actions at zero lag on 2026-09-29. The same day's 100-user quote was **1.706790525 ETH** because each delegatable note locked the planner's persona integer divided by 100,000, parsed as ETH. Provision and `depositETH` now share `CAMPAIGN_NOTE_WEI` (1 wei). Stages 10 and 25 were left as mined. The re-quote was **0.010790525 ETH** at 6,000,000 wei/gas; the deployer held **0.051338 ETH**, so stage 100 ran. It mined 1932/1932 on the first attempt and reconciled 1932/1932. Measurements: [`campaigns/medium-realistic-v1-testnet-run.md`](./campaigns/medium-realistic-v1-testnet-run.md).
11. **[x] Publish the campaign report for the stages that ran.** [`campaigns/medium-realistic-v1-testnet-run.md`](./campaigns/medium-realistic-v1-testnet-run.md) records deduplicated gas, indexer lag, funding balances, the unrecorded ERC20 approval path, provider limits, and product findings, including stage 100. Official-attester implications were published on 2026-09-30. Short project titles landed in the planner after this report; projects already mined still show the old metadata.
12. **[x] Plan and validate the v2 campaign.** [`campaigns/medium-realistic-v2.json`](./campaigns/medium-realistic-v2.json) selects 14 causes (including four campaign-local hobby causes from `medium-realistic-v2-statements.json`), 58 statements, 29 curated projects from [`campaignProjectStories.ts`](./campaignProjectStories.ts), and 16 interest-matched user profiles. `npm run gen:campaign:plan --workspace=fake-data-generation` generated 1,502 planned writes under `output/campaigns/medium-realistic-v2/`. Reviewed the assignments: the four hobby boards use their matching organizer profiles (users 055–058), all nine hobby projects use matching builder profiles (users 069–072), and each hobby cause has funding from an interested profile without founder self-funding. Planner tests enforce those assignments. V2 has **not been executed on any chain**.
13. **[x] Execute v2 locally and reconcile.** The clean local run mined and reconciled all 1,502 actions at zero indexer lag. Browser inspection visited all 30 cause boards and nine hobby projects; the refreshed `TestDataRunPage` lists all 29 projects. Founder bios and interests are in the hobby project metadata, and a project page displayed its founder bio. See [`campaigns/medium-realistic-v2-local-run.md`](./campaigns/medium-realistic-v2-local-run.md) for measurements, fixes, and reproduction steps.
14. **[x] Move v2 funding beyond the fixed purchase unit.** V2's `fund-project` actions still use a fixed on-chain purchase unit; they do not yet demonstrate cross-camp contributions (backers from both common-ground camps funding the same bridge project) or retroactive reimbursement. Redesign the funding action generation so the campaign exercises those mechanisms, then re-run local and testnet stages.

   **Status (2026-10-02):** V2 funding now buys varied ERC1155 receipt quantities at real prices, exercises cross-camp contributions (20 prerequisite purchases totaling the 2 USDZZZ threshold across two left/right backers), and donates 1 USDZZZ into the reimbursement waterfall. Local run: 1508/1508 mined and reconciled at zero lag. Remote stages 10 (95/95), 25 (167/167), and 100 (1508/1508) all mined and reconciled with zero discrepancies; the SDK-derived reimbursement check matched the expected 1 USDZZZ total. See [`campaigns/medium-realistic-v2-step14-run.md`](./campaigns/medium-realistic-v2-step14-run.md).

## Relationship to existing tools

- [`runSimulation.ts`](./runSimulation.ts) remains the starting implementation reference, not a safe testnet command.
- [`PLAN.md`](./PLAN.md) remains the source of truth for the four fake/seed-data jobs and statement-volume sequencing.
- [`statement-generation.md`](./statement-generation.md) remains the only acceptance pipeline for new real statements.
- [`../workflow/testnet-working-plan.md`](../workflow/testnet-working-plan.md) owns shared-lab health and deployment operations.
- The verifier should gain campaign-specific checks only when their desired inputs, cadence, and autonomy tier are understood; the first implementation can produce standalone reconciliation artifacts.
