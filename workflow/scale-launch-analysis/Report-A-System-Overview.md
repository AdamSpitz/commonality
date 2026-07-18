# Report A — System Overview for Decision-Makers

**Audience:** founder, board, partners  
**Baseline:** `c6faa0a6` (repo under `commonality/`)  
**Related:** Reports B–F, `artifacts/risk-register.csv`

---

## 1. What Commonality is

Commonality is a **crypto-native public-goods funding and coordination stack**: people express causes as free-text **statements**, AI and users link related ideas through an **implication graph**, donors fund work via **assurance contracts** (pledge-or-refund), optionally **delegate** spending authority, and discover projects through **trust-filtered cause boards**. A parallel **content funding** path funds social-media work (Twitter/YouTube/Substack). Movement brands **Civility** and **Common Sense Majority (CSM)** sit on top of the same rails.

**One monorepo, eight public faces** (from `ui/src/domains/index.ts`):

| Domain | Role |
|--------|------|
| Commonality | Movement / public-goods narrative |
| LazyGiving | Create/browse/pledge assurance projects |
| Aligning | Cause boards, alignment/success vouches |
| Tally | Statement signing / polling |
| Content Funding | Creator/fan content contracts |
| Civility | Noninflammatory content funding |
| Common Sense Majority | Political-adjacent common-ground movement |
| Conceptspace | Infra UI for statements, trust, attesters |

Settlement for MVP is intended as **USDC on an L2** (testnet: Base Sepolia; mainnet **not deployed** — `workflow/project-status.md`).

---

## 2. What it is not (yet)

| Claim | Reality |
|-------|---------|
| Live mainnet product | **No** — testnet stabilization phase |
| Fully decentralized “just a protocol” | **No** — operator runs UIs, indexer, AI, channel verifier (`what-we-host-and-control.md`) |
| Fiat-native consumer app | **Deferred** — bridges/onramp incomplete (`mvp.md`) |
| Legally scrubbed donation platform | **No** — end-user docs still market scout **profit** via secondary market |
| Externally audited contracts | Hardhat suite + Slither exist; **no** named external audit package in-repo |

---

## 3. Architecture in one page

```
Users / Wallets
    │
    ▼
Eight branded UIs (Vite/React, IPFS+Cloudflare edge)
    │  SDK client-side FOLDS
    ├──────────► Ponder indexer (raw events only)
    ├──────────► Platform API (verify channels, submissions)
    ├──────────► AI services (attesters, finders, nudgers, beat agents)
    └──────────► Chain (Base L2) + IPFS content
```

**Design signature:** the indexer is intentionally dumb; business logic lives in `sdk/src/**/folds.ts` and browser queries (`specs/tech/indexer/README.md`). That is excellent for verifiability and terrible for “global leaderboard” scale unless engineered carefully.

**Money path (LazyGiving):** donor buys ERC-1155 “donation receipt” tokens via primary market → funds escrowed under assurance conditions → success pays recipient / failure refunds. **Secondary market** (`ERC1155SecondaryMarket.sol`) allows resale at **any price > 0** — the mechanical backbone of retroactive funding.

---

## 4. Maturity snapshot

| Area | Status |
|------|--------|
| MVP subsystems (Conceptspace, LazyGiving, Delegation, Aligning, Content Funding, Subjectiv, Mutable Refs) | Implemented per `specs/product/mvp.md` |
| Test coverage | Hardhat ~24 suites; integration ~49 files; UI unit/e2e large; verifier workspace |
| Testnet | Base Sepolia manifests under `deployments/` |
| Mainnet | Not deployed |
| Legal self-map | Strong internal docs under `specs/product/legal/` (post–PR #27) |
| Legal/product alignment | **Weak** — strategy docs vs end-user profit narrative contradict |

---

## 5. Top 10 strengths

1. Unusually complete product vision with multi-domain UX from one codebase  
2. Non-custodial core funding rails (user funds in contracts, not hot wallets of operator) — if discipline holds  
3. Thin indexer + open fold logic = auditable, forkable computation  
4. Deep internal legal risk mapping (securities, sanctions, speech, political)  
5. Broad automated testing + “verifier” operational health system  
6. Content-funding veto windows and third-party creation fees show procedural thoughtfulness  
7. Explicit trust trajectory away from centralized channel verifier  
8. USDC-only MVP reduces exotic ERC-20 footguns  
9. No upgradeable proxy pattern observed on core funding contracts (recoverability audit: no selfdestruct/pause drain)  
10. Clear founder documentation culture (`workflow/`, `specs/`, end-user docs)

---

## 6. Top 10 risks (launch-relevant)

1. **Securities:** profit-from-scout-mechanism marketed while uncapped market is live in code (**R01**)  
2. **Exchange/CTP characterization** if tokens are securities and operator hosts trading UI (**R02**)  
3. **ChannelVerifier key** as indirect drain on escrow (**R03**)  
4. **No external audit** before mainnet (**R17**)  
5. **Sanctions facilitation** via unscreened project display (**R04**)  
6. **Canadian speech/defamation** without §230 (**R08**)  
7. **CSM/Civility political-finance** edges (**R07**)  
8. **Sole-operator platform posture** while claiming protocol (**R06**)  
9. **Scale:** cause-board/leaderboard folds (**R13**)  
10. **Secrets/ops risk** in LLM-assisted operation model (**R16**)

Full register: `artifacts/risk-register.csv`.

---

## 7. The single decision that unlocks (or blocks) scale

**Resolve the securities posture before mainnet marketing.**

Four options (detail: `artifacts/securities-posture-matrix.md`):

| | Posture | One-line |
|---|---------|----------|
| A | Donation-first | Market off; scrub profit story |
| B | Reimbursement-capped | On-chain listing ≤ cost |
| C | Waterfall, no market | Non-transferable receipts + cost recovery |
| D | Own it | Keep profit market; **pay for formal opinion first** |

Shipping current code + current end-user docs is **D without the opinion**.

---

## 8. Recommended launch narrative (business)

1. **Incorporate** (Canadian personal operation is worst liability posture — per internal `operator-posture.md`).  
2. Launch **LazyGiving + Aligning + Tally** under **Posture A or B**, not full CSM money day one.  
3. Treat **content funding** as a **platform** product with screening and verifier hardening.  
4. Treat **Civility/CSM** as openly editorial movements with separate content policy.  
5. Complete audit + sanctions tooling + ToS/privacy before scaling spend on growth.

---

## 9. How to read the rest of this package

| Need | Open |
|------|------|
| Engineering readiness | Report B |
| US/Canada legal diligence | Report C |
| What you actually control | Report D |
| Checklist / Go-No-Go | Report E |
| Hire counsel / auditors | Report F |
