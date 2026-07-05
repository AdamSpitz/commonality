# To Do

This is the project's inbox; use this for tasks that might be suitable for an LLM to do.

If you have stuff that needs human attention, you can put it in [Adam's inbox](/inbox.md) instead. See [task autonomy tiers](/workflow/task-tiers.md).

When an item from this page is done and no longer needs an LLM implementor's attention, don't mark it "done", just delete it. I don't want this file to get cluttered with already-completed items.

----

- Keep working on [improving the verifier](verifier/PLAN.md#backlog--improving-the-verifier).

- [ ] **(Tell)** Build the contribution sequencing UI/service for the no-custody on-ramp path: start contribution, create on-ramp session, detect USDC arrival, handle allowance if needed, send `buyERC1155` from the user's wallet, show confirmation/retry/error states, and connect the result to leaderboard/status display. See [specs/tech/bridges.md](specs/tech/bridges.md).

- [ ] **(Tell)** Run the Privy + Pimlico embedded-wallet spike (provider is ratified — Privy, 2026-06-18 — this is feasibility, not a provider re-eval). Confirm the `[confirm in spike]` items in [specs/tech/bridges.md](specs/tech/bridges.md): (1) **load-bearing** — the chosen on-ramp will deliver USDC to a *counterfactual* (undeployed) EIP-4337 account address; if not, fall back to eagerly deploying the account via a tiny sponsored UserOp right after login; (2) Pimlico+Privy follow the `initCode`-on-first-UserOp deploy pattern and the paymaster sponsors that deploy-inclusive first op; (3) Privy key export works against a real account (pre-mainnet gate); (4) login/recovery modal UX holds the walletless framing end-to-end; and sanity-check per-wallet/MAU economics before mainnet. See also [specs/tech/sponsored-gas.md](specs/tech/sponsored-gas.md) §1.

- [ ] **(Tell)** Finish sponsored-gas support. Initial `CreatorGasTank` contract spike is done (per-creator ETH tanks, anyone-can-fund, self-enrollment, configurable per-wallet caps, SimpleAccount-shaped validation, `postOp` debit, unit tests). Remaining: confirm Privy+Pimlico account ABI and finalize decoder; tune production caps from real UserOp overhead; deploy to testnet and add bundler/UI wiring plus behavioral verifier monitoring; implement `GasTankFunder` USDC→ETH swap adapter. See [specs/tech/sponsored-gas.md](specs/tech/sponsored-gas.md).

- [ ] **(Tell)** Finish embedded-wallet failed-project refund support: wire sponsored gas where appropriate, then verify the existing refund UX against a Privy embedded wallet on testnet. The UI already detects refundable positions, calls `refundERC1155`, links the transaction, explains that refunded USDC returns to the user's wallet, and offers next steps (keep USDC, re-contribute, or use a licensed off-ramp/KYC flow). See [specs/tech/bridges.md](specs/tech/bridges.md).

- Remaining recurring-pledges work is operational: deploy the updated contracts to testnet, regenerate `deployments/base-sepolia.env`/`render.yaml`, copy/fund the scheduler key, set `RECURRING_PLEDGE_SCHEDULER_ENABLED=true`, redeploy workers, and verify a due pledge produces a `StandingPledgeExecuted` event through the indexer.

- [ ] **(Tell)** Deploy `AccountAssertions` to testnet (i.e. run the already-wired incremental deployment), regenerate `deployments/base-sepolia.env`/`render.yaml`/`ui/.env`, and verify the tier-1 line appears on a statement after asserting. (`hardhat/scripts/deploy-incremental.js` writes `ACCOUNT_ASSERTIONS_ADDRESS` + `VITE_ACCOUNT_ASSERTIONS_CONTRACT_ADDRESS`; `render.yaml.template` now includes `ACCOUNT_ASSERTIONS_ADDRESS` for the indexer/platform API but will stay `sync: false` until `deployments/base-sepolia.env` has the real deployed address. The `AccountAssertions.sol` contract, indexing, SDK identity subsystem, `SingleAccountAssertionSection` UI, and tiered head-count rendering all landed 2026-06-22.) See [specs/tech/shared/unique-human-id.md](specs/tech/shared/unique-human-id.md).

- [ ] **Make the lockfile / Docker-install setup robust, and align local deploys with testnet (Render).** Right now the `package-lock.json` is fragile in a way that has bitten us twice, and local Docker builds and Render can disagree about whether the same lockfile is valid.

  **What happened (so a fresh LLM has the full story):**
  - The service Dockerfiles (`platform-api-service/`, `sdk` build inside it, `service-host/`, `ui/`, `indexer/`, `hardhat/`) copy only a *subset* of workspace `package.json` files before running `npm ci`. E.g. `platform-api-service/Dockerfile` copies root + `sdk/package.json` + `platform-api-service/package.json`, then `RUN npm ci`. For `npm ci` to resolve against that subset, the lockfile must contain **nested per-workspace** dependency entries (e.g. `node_modules/<ws>/node_modules/viem@2.47.6`, `.../ox@0.14.7`) rather than a fully hoisted tree.
  - Commit `f7e898e0` ("Will this fix Render?") hand/tool-shaped the lockfile to include those nested entries (~20 nested `viem` copies) so the subset `npm ci` resolves. This is load-bearing and non-obvious.
  - On 2026-07-05 a bare `npm install` (commit `3613d8e2`, "Fixed lockfile?") re-hoisted `viem` to `2.54.3` at top level and **deleted** those nested entries. Render then failed all three service builds with `npm error Missing: viem@2.47.6 from lock file`. Reverted in `c7369053` (restores `f7e898e0`'s exact lockfile bytes). **Do not regenerate this lockfile with a bare `npm install` — it silently breaks the Render builds.**
  - Paradox to resolve: the reverted lockfile builds green on Render but the *local* `stack.fresh-seeded` Docker build fails it with `lock file's viem@2.53.1 does not satisfy viem@2.54.3`. Leading hypothesis: all Dockerfiles use the **floating `node:24-alpine`** tag, so local and Render pull **different npm versions** over time (Render built with npm 11.16.0; local host npm is 11.11.0; the local Docker image had a newer npm that emitted an 11.18.0 upgrade notice). Newer npm is stricter about subset-install lockfile validation. So the lockfile isn't "wrong" — the toolchains diverge.

  **Underlying tension:** `package.json` requires multiple incompatible `viem` ranges — root pins `viem` `2.47.6` (exact); `sdk`/`ui`/`hardhat`/`service-host`/`beat-agent` want `^2.53.1`; `platform-api-service`/`indexer`/`fake-data-generation` want `^2.21.3`; `content-attester`/`nudger-core`/`implication-attester` want `^2.21.0`. That multi-version spread is what forces the nested copies in the first place.

  **Goal (from Adam):** make this whole setup nice and simple, and keep the *local* deployment as similar to the *testnet/Render* one as possible — "but no similarer." Investigate and fix. Likely directions (evaluate, don't assume):
    1. **Pin the toolchain** so local == Render: replace floating `node:24-alpine` with a pinned digest (or pin npm via `packageManager`/corepack or an explicit `npm i -g npm@<ver>`) across all Dockerfiles. This alone probably makes the current lockfile stop being flaky locally.
    2. **Reconsider the subset-copy pattern.** Either copy *all* workspace `package.json`s before `npm ci` (simple, robust, slightly worse layer caching), or use `npm ci --workspace=<name> --include-workspace-root` / prune, so the install no longer depends on hand-shaped nested lockfile entries.
    3. **Collapse the `viem` version spread** — align the root pin and workspace ranges to a single `viem` (and `ox`) version so hoisting is unambiguous and a normal `npm install` produces a lockfile that works for both full and subset installs.
    4. Document the chosen invariant in `workflow/deployment.md` so the next person doesn't "fix" the lockfile with `npm install` again.

  Success = a fresh `npm install` produces a lockfile that (a) builds green on Render and (b) builds green under local `stack.fresh-seeded`, with no hand-editing, and the local Docker build matches Render's toolchain. See `platform-api-service/Dockerfile`, `workflow/deployment.md`, and the memory note `project_verifier_guarded_env_vars.md` for how to run the local stack boot.

- [ ] Hardhat 2→3 migration — defer until after current testnet stabilization, but revisit before mainnet. Treat as a standalone migration project, not a dependency bump.

- [ ] Verify the Render/Ponder deploy fix over a few normal indexer redeploys: `commonality-indexer` now has a tiny persistent disk so Render should do stop-before-start deploys instead of rolling deploys, avoiding Ponder `DATABASE_SCHEMA` lock conflicts. If lock failures recur, split the indexer into a singleton writer/worker plus a separately deployed read-only web/API service. See [workflow/deployment.md](workflow/deployment.md#known-render-indexer-deployment-trap-ponder-schema-lock).

- [ ] Investigate the testnet indexer's slow/multi-day historical backfill. On 2026-07-04 the deployed `commonality-indexer` (Base Sepolia) was ~950k blocks behind chain head, with `/ready` reporting "Historical indexing is not complete" — this keeps `testnet.indexer` red. The multi-day catch-up is unexpected. Check whether the Ponder start block is set unnecessarily early (Base Sepolia produces blocks every ~2s, so a low start block means an enormous backfill), and consider pinning the start block to the earliest relevant contract-deployment block. See [workflow/deployment.md](workflow/deployment.md).
