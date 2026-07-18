# Report B — Technical Architecture & Scale / Mainnet Readiness

**Baseline:** `c6faa0a6` · Paths relative to `commonality/`  
**Companion:** `artifacts/control-surface-inventory.md`, Report D  

**Scope note:** Decision-package depth on P0 systems; not a line-by-line external audit.

---

## 1. Component map

| Package | Path | Responsibility |
|---------|------|----------------|
| Contracts | `hardhat/` | Solidity 0.8.33 subsystems |
| SDK | `sdk/` | Folds, queries, ABIs, GraphQL schema |
| Indexer | `indexer/` | Ponder thin event cache |
| UI | `ui/` | 8 domain builds, Vitest + Playwright |
| Integration tests | `integration-tests/` | Cross-stack scenarios |
| Attester core / services | `attester-core`, `implication-attester`, `content-attester` | On-chain judgment publications |
| Finder services | `finder-core`, `implication-finder`, `content-finder` | Candidate discovery |
| Nudgers | `nudger-core`, `implication-graph-nudger`, `bridge-creator`, `explorer-curator` | User guidance / synthesis |
| Beat agents | `beat-agent`, `beat-memory` | Discourse slice ingestion + multi-role |
| Service host | `service-host/` | Supervised multi-service Node process |
| Platform API | `platform-api-service/` | Channels, submissions, resolve |
| Gateways | `cloudflare-service-gateway/`, `cloudflare-ui-gateway/` | Edge routing |
| Fake data | `fake-data-generation/` | Simulation / seed |
| Verifier | `verifier/` | Operational health facets |
| Deploy | `deployments/`, `scripts/`, `render.yaml` | Testnet/mainnet env manifests |

Workspaces listed in root `package.json` (Node `>=24 <25`, npm 11, turbo).

---

## 2. Smart contract subsystem review

### 2.1 Inventory (`hardhat/contracts/`)

| Folder | Purpose | Funds? | Admin? |
|--------|---------|--------|--------|
| `statements/` | Beliefs, Implications | No | No deployer admin observed |
| `individual-projects/` | Assurance contracts, primary market, factory, conditions | **Yes** | Per-project creator |
| `marketplace/` | ERC-1155 secondary orderbook | **Yes** (escrow listings/bids) | **None** (immutable params) |
| `delegation/` | DelegatableNotes, NoteIntent, RecurringPledges | **Yes** | Owner factory authorizations |
| `alignment-attestations/` | Project/content alignment events | No | Permissionless |
| `content-funding/` | Channels, escrow, creator factories, content registry | **Yes** | Verifier/factory owners |
| `subjectiv/` | TrustRegistry, AccountAssertions | No | User-driven |
| `nudger/` | Nudge publications | No | Publish path |
| `sponsored-gas/` | CreatorGasTank, GasTankFunder | Gas subsidy | Parameter owners |
| `utils/` | ERC1155/20 helpers, MutableRefUpdater, metadata | Varies | Some Ownable (e.g. mint) |

### 2.2 P0: Secondary market

**File:** `hardhat/contracts/marketplace/ERC1155SecondaryMarket.sol`

- Orderbook: sale listings + buy orders; partial fill; single payment ERC-20; one ERC-1155 collection per market instance  
- **No price ceiling** — only `PriceMustBeGreaterThanZero`  
- ReentrancyGuard + SafeERC20; trusts ERC1155 and payment token at deploy  
- **Legal/tech coupling:** implements full scout-profit mechanism; no reimbursement cap  

**SDK:** `sdk/src/subsystems/lazy-giving/folds.ts` exports `foldSecondaryMarket` among project folds.

### 2.3 P0: Assurance / LazyGiving

**Files:** `individual-projects/AssuranceContract.sol`, `AssuranceContracts.sol`, `ProjectFactory.sol`, `ERC1155PrimaryMarket.sol`, conditions  

- Classic assurance-contract pattern with ERC-1155 receipts  
- Withdraw pays designated recipient (recoverability audit: no operator drain)  
- Token-generalized; UI/ops constrain to USDC for MVP (`specs/product/currency.md`, `hardhat/README.md`)

### 2.4 P0: Content funding + channel trust

| Contract | Role | Finding |
|----------|------|---------|
| `ChannelVerifier.sol` | EIP-712 claim proofs from `trustedVerifier` | `setTrustedVerifier` `onlyOwner` — **single trust root** |
| `ChannelEscrow.sol` | Balances by `channelId`; withdraw only verified owner | Funds for **unclaimed** channels accumulate by ID |
| `CreatorAssuranceContractFactory.sol` | Creator vs third-party create | `thirdPartyMinPurchase` default `1` (placeholder — `hardhat/README.md` warns set before production); `thirdPartyMaxDuration` default 7 days; veto window coupling |

**Indirect drain path (confirmed in `workflow/security-recoverability.md`):** owner changes trusted verifier → forge ownership → withdraw others’ escrow.

### 2.5 P1: Delegation

`DelegatableNotes.sol` — composable notes; owner authorizes which primary/secondary market factories notes may interact with. This is operational control over **where delegated capital can flow**.

### 2.6 Security posture (contracts)

| Control | Status |
|---------|--------|
| Hardhat test suites | Present for major subsystems (`hardhat/README.md` inventory) |
| Slither | `hardhat/slither.config.json`; verifier facet `review.security.slither` |
| Upgradeability | Not used as primary pattern for core funds (good) |
| External audit | **Not evidenced** |
| USDC-only assumption | Documented; multi-token needs re-audit |

---

## 3. Indexer + SDK fold model

### 3.1 Indexer

- Ponder stores raw events; app path `GET /api/events` (`specs/tech/indexer/README.md`)  
- **No business logic** — correct for trust minimization  
- **Scale implication:** indexer defines *which contracts exist* via config — operator-shaped universe  

### 3.2 Folds (actual code)

Examples under `sdk/src/`:

- `subsystems/lazy-giving/folds.ts` — `foldProject`, `foldSecondaryMarket`, `foldContributions*`, `foldTokenBurns`  
- `subsystems/content-funding/folds.ts` — registry, channel, escrow, creator contracts  
- `subsystems/delegation/folds.ts` — notes, intents  
- `subsystems/conceptspace/folds.ts` — beliefs, implications  
- `subsystems/subjectiv/folds.ts` — trust mapping  
- `subsystems/fundingportals/queries.ts` — `getTopContributorsForCause` (cross-entity)

**Accumulator gap:** folds accept optional initial accumulators but **query layer still folds from scratch** (`specs/tech/indexer/README.md` §Fold Versioning). Fine for small entities; fails at tens of thousands of events per entity without wiring storage.

### 3.3 Non-scalable queries (confirmed as known debt)

From `specs/tech/scalability.md` + code:

- Aligning leaderboards / rank queries that effectively need all contributors  
- Statement browsing “most supporters / newest”  
- Cause-board aggregates spanning many projects  

**Launch risk:** viral CSM/Aligning traffic hits these first.

---

## 4. AI service ecosystem

| Role | Packages | Scale notes |
|------|----------|-------------|
| Attest | implication-attester, content-attester (+ attester-core) | Stateless-ish; elastic OK; cost = OpenRouter |
| Find | implication-finder, content-finder | Queue/state; shard by topic |
| Nudge | implication-graph-nudger, bridge-creator, explorer-curator | Editorial; bridge-creator synthesizes political common ground |
| Beat | beat-agent, beat-memory | Stateful ingestion; US politics policy in testnet env |
| Host | service-host | Multi-service supervisor |

**Trust model risk:** defaults bake operator attester/nudger addresses into UI env (`deployments/*.env` pattern). Independent providers are architectural affordances, not facts (`specs/product/legal/multiple-providers.md`).

**Testnet evidence of political AI:** `deployments/base-sepolia.env` includes `BEAT_AGENT_*` / `BEAT_MEMORY_*` US politics rehearsal policy comments.

---

## 5. Multi-domain UI & edge

- Domain manifests: `ui/src/domains/*/manifest.tsx`  
- Selection: `VITE_DOMAIN` in `ui/src/domains/index.ts`  
- Edge: Cloudflare workers proxy to Render + IPFS/IPNS UI (`docs/dev/architecture.md`, `workflow/deployment.md`)  
- **Scale:** static SPA scales; API/AI/RPC do not automatically  

Deferred mainstream path: Privy embedded wallet scaffolding exists; full on-ramp + sponsored-gas sequencing not validated (`mvp.md`).

---

## 6. Security findings (severity-ranked)

### Critical

| ID | Finding | Evidence |
|----|---------|----------|
| B-C1 | ChannelVerifier owner → escrow drain | `ChannelVerifier.sol` `setTrustedVerifier`; `security-recoverability.md` |
| B-C2 | Secrets exposure model for LLM-operated project | `.env.secrets` threat model in `security-recoverability.md` |

### High

| ID | Finding | Evidence |
|----|---------|----------|
| B-H1 | No external audit gate before mainnet | Process gap |
| B-H2 | Factory thirdPartyMinPurchase placeholder defaults | `CreatorAssuranceContractFactory.sol`; `hardhat/README.md` |
| B-H3 | Uncapped secondary market + live profit product narrative | Market.sol + end-user docs (legal in Report C) |
| B-H4 | Trust-root env mutation is quiet integrity risk | `security-recoverability.md` §Quiet integrity |

### Medium

| ID | Finding | Evidence |
|----|---------|----------|
| B-M1 | Fold-from-scratch latency cliff | indexer README |
| B-M2 | IPFS cold start without CDN | scalability.md |
| B-M3 | Subjectiv empty-graph shows all attestations | what-we-host-and-control.md |
| B-M4 | Platform API rate limits / third-party API quotas | scalability.md |
| B-M5 | Sponsored-gas parameter surface = subsidy politics | `sponsored-gas/` + political-funding.md |

### Informational

| ID | Finding |
|----|---------|
| B-I1 | Strong internal testing culture (Hardhat/integration/UI/verifier) |
| B-I2 | Client-side fold is a deliberate trust feature |
| B-I3 | USDC-only reduces token integration surface |

---

## 7. Performance / scalability backlog (launch-ordered)

| Priority | Item | Why |
|----------|------|-----|
| P0 | Cause-board / leaderboard strategy (projection or hard limits) | Core viral surface |
| P0 | Production third-party factory parameters | Economic spam / abuse |
| P0 | Verifier key governance (multisig + monitoring) | Fund safety |
| P1 | CDN for IPFS | Mainstream UX |
| P1 | Wire fold accumulators for hot entities | Latency |
| P1 | Elastic deploy of attesters/finders | AI load |
| P1 | Finish Privy + onramp + sponsored gas e2e | Adoption |
| P2 | Multi-provider attester documentation + second operator | Decentralization facts |
| P2 | Multi-chain / multi-token | Post-MVP |

---

## 8. Testing & verification assessment

| Layer | Evidence | Adequacy for mainnet |
|-------|----------|----------------------|
| Contract unit/property | `hardhat/test/*` (~24 files) | Good **baseline**; not substitute for audit |
| Integration | `integration-tests/src` (~49 ts) | Strong for happy paths |
| UI unit | ~108 `*.test.ts*` under `ui/` | Good domain coverage |
| E2E | Playwright under `ui/e2e/` | Present |
| Static analysis | Slither config | Good continuous signal |
| Operational | `verifier/` multi-facet | Differentiator for ops maturity |
| Generative/sim | `fake-data-generation/` | Exists; productionized property suite deferred (`mvp.md`) |

---

## 9. Mainnet readiness scorecard

Scores: **0–100** (independent assessment). Launch bar suggested: **≥75** with no Critical open, or accept residual with counsel sign-off.

| Category | Score | Rationale |
|----------|------:|-----------|
| Contract design quality | 72 | Clear modules, guards, tests; escrow verifier trust is a structural flaw |
| External security assurance | 35 | No external audit / bounty evidenced |
| Key management & recoverability | 48 | Documented threats; cold-key plans incomplete as operational fact |
| Non-custodial discipline | 78 | Core rails solid; verifier + future fees/onramp are watch items |
| Indexer/SDK scale readiness | 55 | Architecture sound; aggregate queries & accumulators incomplete |
| AI ops at scale | 50 | Works; monoculture + cost/rate limits unproven at viral load |
| Multi-domain product completeness | 80 | MVP feature-complete per docs |
| Mainstream UX (wallet/fiat/gas) | 40 | Deferred paths still open |
| Observability / deploy tooling | 75 | Manifests, scripts, verifier, Render/CF |
| Legal-product alignment (tech flags) | 30 | Market + docs not feature-flagged for safe posture |
| **Weighted overall** | **~55** | **Not mainnet-ready for scale marketing** |

### Go-to-mainnet engineering minimums

1. External audit of funds-touching contracts + verifier/escrow path  
2. Production factory parameters + admin multisig  
3. Securities-related **feature flags** (market UI, profit CTAs) matching chosen posture  
4. Wallet screening integration points  
5. Leaderboard/cause-board load strategy  
6. Documented incident runbooks for verifier compromise  

---

## 10. Appendix — STRIDE (abbreviated)

| Threat | Example | Mitigation status |
|--------|---------|-------------------|
| Spoofing | Fake channel claim | Trusted signer today; needs trajectory + monitoring |
| Tampering | Malicious trust-root commit | Git review; needs stronger deploy gates |
| Repudiation | Disputed attestation | On-chain events help; speech process separate |
| Info disclosure | Secret leakage via LLM tools | Partial (security-recoverability) |
| DoS | AI/API rate limits, fold blowups | Partial |
| Elevation | Owner key abuse | Critical residual on ChannelVerifier |

### Economic attacks

| Scenario | Notes |
|----------|-------|
| Assurance scams | Accepted risk; transparency + trust graph |
| Secondary market wash / manipulation | Any price; thin markets |
| Third-party content contracts spam | min purchase must be real |
| Graph spam statements | Gas + UI filters; unique-human deferred |
| Attester bribery / monoculture capture | Single operator keys today |

---

## 11. Conclusion (technical)

The system is an **ambitious, largely implemented MVP** with a sophisticated fold-based architecture and strong internal QA machinery. It is **not yet a scale-mainnet system**: key custody and verifier trust, external audit, aggregate-query scale, mainstream onboarding, and **product flags for the securities posture** are the blockers. Engineering can reach a cautious mainnet for a **narrow donation-first** surface faster than for full retroactive-market + CSM virality.
