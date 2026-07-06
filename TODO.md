# To Do

This is the project's inbox; use this for tasks that might be suitable for an LLM to do.

If you have stuff that needs human attention, you can put it in [Adam's inbox](/inbox.md) instead. See [task autonomy tiers](/workflow/task-tiers.md).

When an item from this page is done and no longer needs an LLM implementor's attention, don't mark it "done", just delete it. I don't want this file to get cluttered with already-completed items.

----

- [ ] **(Tell)** Build the contribution sequencing UI/service for the no-custody on-ramp path: start contribution, create on-ramp session, detect USDC arrival, handle allowance if needed, send `buyERC1155` from the user's wallet, show confirmation/retry/error states, and connect the result to leaderboard/status display. See [specs/tech/bridges.md](specs/tech/bridges.md).

- [ ] **(Tell)** Run the Privy + Pimlico embedded-wallet spike (provider is ratified — Privy, 2026-06-18 — this is feasibility, not a provider re-eval). Confirm the `[confirm in spike]` items in [specs/tech/bridges.md](specs/tech/bridges.md): (1) **load-bearing** — the chosen on-ramp will deliver USDC to a *counterfactual* (undeployed) EIP-4337 account address; if not, fall back to eagerly deploying the account via a tiny sponsored UserOp right after login; (2) Pimlico+Privy follow the `initCode`-on-first-UserOp deploy pattern and the paymaster sponsors that deploy-inclusive first op; (3) Privy key export works against a real account (pre-mainnet gate); (4) login/recovery modal UX holds the walletless framing end-to-end; and sanity-check per-wallet/MAU economics before mainnet. See also [specs/tech/sponsored-gas.md](specs/tech/sponsored-gas.md) §1.

- [ ] **(Tell)** Finish sponsored-gas support. Initial `CreatorGasTank` contract spike is done (per-creator ETH tanks, anyone-can-fund, self-enrollment, configurable per-wallet caps, SimpleAccount-shaped validation, `postOp` debit, unit tests). Remaining: confirm Privy+Pimlico account ABI and finalize decoder; tune production caps from real UserOp overhead; deploy to testnet and add bundler/UI wiring plus behavioral verifier monitoring; implement `GasTankFunder` USDC→ETH swap adapter. See [specs/tech/sponsored-gas.md](specs/tech/sponsored-gas.md).

- [ ] **(Tell)** Finish embedded-wallet failed-project refund support: wire sponsored gas where appropriate, then verify the existing refund UX against a Privy embedded wallet on testnet. The UI already detects refundable positions, calls `refundERC1155`, links the transaction, explains that refunded USDC returns to the user's wallet, and offers next steps (keep USDC, re-contribute, or use a licensed off-ramp/KYC flow). See [specs/tech/bridges.md](specs/tech/bridges.md).

- Remaining recurring-pledges work is operational: deploy the updated contracts to testnet, regenerate `deployments/base-sepolia.env`/`render.yaml`, copy/fund the scheduler key, set `RECURRING_PLEDGE_SCHEDULER_ENABLED=true`, redeploy workers, and verify a due pledge produces a `StandingPledgeExecuted` event through the indexer.

- [ ] **(Tell)** Deploy `AccountAssertions` to testnet (i.e. run the already-wired incremental deployment), regenerate `deployments/base-sepolia.env`/`render.yaml`/`ui/.env`, and verify the tier-1 line appears on a statement after asserting. (`hardhat/scripts/deploy-incremental.js` writes `ACCOUNT_ASSERTIONS_ADDRESS` + `VITE_ACCOUNT_ASSERTIONS_CONTRACT_ADDRESS`; `render.yaml.template` now includes `ACCOUNT_ASSERTIONS_ADDRESS` for the indexer/platform API but will stay `sync: false` until `deployments/base-sepolia.env` has the real deployed address. The `AccountAssertions.sol` contract, indexing, SDK identity subsystem, `SingleAccountAssertionSection` UI, and tiered head-count rendering all landed 2026-06-22.) See [specs/tech/shared/unique-human-id.md](specs/tech/shared/unique-human-id.md).

- [ ] Hardhat 2→3 migration — defer until after current testnet stabilization, but revisit before mainnet. Treat as a standalone migration project, not a dependency bump.

- [ ] Verify the Render/Ponder deploy fix over a few normal indexer redeploys: `commonality-indexer` now has a tiny persistent disk so Render should do stop-before-start deploys instead of rolling deploys, avoiding Ponder `DATABASE_SCHEMA` lock conflicts. If lock failures recur, split the indexer into a singleton writer/worker plus a separately deployed read-only web/API service. See [workflow/deployment.md](workflow/deployment.md#known-render-indexer-deployment-trap-ponder-schema-lock).

----

## From verifier LLM-review run (2026-07-06)

Items below came out of running the explore-mode review checks. **Fail**-level items first.

- [ ] **(Tell)** [`review.page-copy-sense` fail] Clean up leaked/drafty copy: (1) `LandingPage.tsx` renders an authoring note as visible copy — the `(link to a page that points to Aligning, Civility, CSM, etc., …)` parenthetical, plus lowercase draft descriptions (`"Governments and big charity orgs both suck"`, `"it's easy to build a vertical on this substrate…"`, `"What is this all about?"`) — replace with real first-visitor sentences; (2) fix the mojibake em-dash in `MyNotesPage.tsx` (`' â hand off your donation decisions…'` → ` — `); (3) define or drop unexplained jargon (`substrate`, `vertical`) on the landing page.

- [ ] **(Tell)** [`review.workflow-clarity.content-funding` fail] Fix content-funding dead-ends for new channels: (1) when a parsed creator/channel URL has no indexed overview, `ChannelPage.tsx`/`CreateContractPage.tsx` render only a bare "Channel not found" warning — give a recoverable empty state with a "Start first contract for this channel" CTA (or route `/content/new` into a creation form that can initialize the channel); (2) `CreatorDashboardPage.tsx` empty-state button says "Verify or claim a channel" but links to `/content/new` (contract creation) — reconcile the label with a real verify/claim path.

Lower-confidence items from `uncertain` reviews:

- [ ] **(Tell)** [`review.page-usability` uncertain] Harden Create Project against irreversible mistakes: after success the submit button stays clickable with the same inputs (duplicate on-chain creation possible) — navigate away / disable / reset on success; and add a confirmation step before firing the irreversible on-chain + IPFS creation transaction.

- [ ] **(Tell)** [`review.page-mobile-usability` uncertain] Fix phone layout on `BrowseProjectsPage`: the sort and status `ToggleButtonGroup` rows (4 buttons each) don't wrap and overflow ~360px screens — add `flexWrap`/vertical stack or collapse to a `Select` on `xs`. Audit pervasive `size="small"` buttons/chips/icon-buttons (~30–32px) against the ~44px touch-target minimum.

- [ ] **(Tell)** [`review.workflow-clarity.lazy-giving` uncertain] Improve wallet-gating UX: show a read-only pledge panel (giving options, prices, contribution/refund mechanics) to disconnected users on `ProjectDetailPage` instead of only a connect prompt; put an inline `WalletButton` on `CreateProjectPage` and keep the user on `/projects/new` after connecting.

- [ ] **(Tell)** [`review.workflow-clarity.common-sense-majority.{understand,act}` uncertain] Make CSM paths concrete: replace the "Popular Statements" placeholder with links to real seeded CSM Tally statements (or relabel as starter prompts), change the primary CSM landing CTA from "Enable mediator suggestions in Tally" (falls back to `/settings`) to a concrete "Sign a common-ground statement" action, and add explicit CSM↔Civility cross-links on both landing pages (Civility is the content engine for CSM).

- Verifier deterministic-lint work (from `meta.llm-to-automated-candidates`), partially landed 2026-07-06:
  - **Done:** `review.copy-encoding` (mojibake/encoding lint) and `review.ui-banned-terms` (crypto-jargon blocklist with allow-list, defaults to `uncertain`) now offload the mechanical scan from the LLM copy/`not-crypto-scary` reviews; both wired into `product.messaging`, encoding also gates `validation.pr`. Page-review sampling now rotates daily (`checks/lib/sample.mjs`). verifier-tree now shows a cyan `⟳` stale marker when a check's inputs are newer than its last run.
  - [ ] Seed `review.ui-banned-terms`' allow-list (currently 113 hits, mostly legitimate wallet-connect/error copy — triage: fix scary copy vs. allow deliberate uses), then flip `failOnHit: true` so regressions page.
  - [ ] Add a **nav-target reachability** deterministic check: collect declared route paths, scan component sources for static internal link/CTA targets (`to=`, `href="/…"`, `navigate("/…")`), flag any that match no declared route (this catches the `CreatorDashboardPage` "Verify or claim" → `/content/new` mismatch class).
  - [ ] Have the rotating page reviews record which routes/offset they sampled (findings/report), so `meta.coverage.*` can verify the inventory is actually covered over time.
  - See [verifier/PLAN.md backlog](verifier/PLAN.md#backlog--improving-the-verifier).

