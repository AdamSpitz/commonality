# Report E — Scale Launch Playbook & Sequenced Checklist

**Baseline:** `c6faa0a6`  
**Inputs:** Reports A–D, `artifacts/risk-register.csv`, `artifacts/securities-posture-matrix.md`

---

## 1. Recommended launch configuration

### 1.1 Securities posture (choose one — default recommendation)

**Primary recommendation for first mainnet:** **Posture A (Donation-first)** or **Posture B (reimbursement-capped)** if engineering can land B before launch.

| If you need… | Choose |
|--------------|--------|
| Fastest path + lowest legal spend | **A** |
| Keep retro story without profit | **B** or **C** |
| Full scout profit market | **D** only after formal opinion |

**Do not launch** with current end-user profit docs + uncapped market UI enabled (unofficial Posture D).

### 1.2 Domain order

| Wave | Domains | Rationale |
|------|---------|-----------|
| **1 — Mainnet MVP** | LazyGiving, Aligning, Tally, Conceptspace (limited) | Core funding + statements; lower political heat |
| **2** | Content Funding | After verifier multisig + screening + third-party params |
| **3** | Civility | Editorial product; speech/political policy ready |
| **4** | Common Sense Majority + Commonality marketing push | After political policy + Coinbase disclosure review |
| Optional | Heavy secondary market UX | Only under B/C/D-cleared |

### 1.3 Feature flags (product)

| Flag | Wave 1 default |
|------|----------------|
| Secondary market UI | **Off** (A) or **capped** (B) |
| Profit/scout marketing pages | **Off / rewritten** |
| Third-party content contracts | Off or high min purchase |
| Sponsored gas for political verticals | Off |
| CSM donation drives | Off |
| Community “run your own trading UI” docs | Off until securities clear |

### 1.4 Chain / token

- Chain: Base mainnet (consistent with Base Sepolia testnet path) unless counsel/ops dictate otherwise  
- Token: USDC only  
- No multi-token until re-audit  

---

## 2. Go / No-Go mainnet gates

### Hard No-Go (any one fails → do not mainnet with scale marketing)

| Gate | Criterion | Evidence owner |
|------|-----------|----------------|
| G1 Securities | Written choice of A/B/C/D; if D, formal opinion received; if A/B/C, code+docs match | Founder + Counsel |
| G2 Profit scrub | Grep-clean end-user + UI for invest/profit-return narrative (or intentional D language only post-opinion) | Product |
| G3 Audit | External audit of funds-touching contracts complete or accepted risk memo with scope limits | Tech |
| G4 Verifier | Admin keys multisig/cold; rotation runbook; monitoring for trust-root changes | Tech |
| G5 Entity | Corporation (or equivalent) exists; not sole unincorporated individual as public operator | Founder |
| G6 ToS/Privacy | Published ToS + privacy policy on all operated UIs | Ops/Counsel |
| G7 Sanctions | Screening + takedown SOP live on contribute paths | Ops |
| G8 Factory params | Production `thirdPartyMinPurchase` / durations set intentionally | Tech |
| G9 Testnet | Critical paths green on testnet verifier for chosen wave-1 surface | Tech |

### Soft Go (can mainnet narrow; block scale spend)

| Gate | Criterion |
|------|-----------|
| S1 | Privy/onramp/sponsored-gas e2e polished |
| S2 | CDN for IPFS |
| S3 | Leaderboard projection or hard UX limits |
| S4 | Second attester provider OR clear “editorial AI” labeling |
| S5 | Bug bounty live |
| S6 | CSM content policy published |

---

## 3. Sequenced checklist

### Now (week 0–2)

- [ ] Incorporate operating entity; open corporate accounts  
- [ ] Decide securities posture A/B/C/D in writing  
- [ ] Engage US+CA crypto-capable counsel (Report F brief)  
- [ ] Freeze marketing: stop amplifying profit-scout narrative externally  
- [ ] Inventory secrets; move operator keys cold (`security-recoverability.md`)  
- [ ] Branch protection / deploy key policy  
- [ ] Draft ToS + privacy (counsel polish)  
- [ ] Run full profit-language scrub plan against `docs/end-user` and UI strings  

### Before mainnet (wave 1)

- [ ] Implement posture in code (market flag / cap / waterfall)  
- [ ] Rewrite end-user retroactive funding docs to match posture  
- [ ] External contract audit (or time-boxed internal+AI audit with explicit residual acceptance — **not preferred**)  
- [ ] Multisig for ChannelVerifier + critical owners  
- [ ] Wallet screening integration  
- [ ] Takedown / report-abuse endpoints and on-call  
- [ ] Production factory parameters  
- [ ] Deploy runbooks; key ceremony notes  
- [ ] No-tax-receipt disclaimers on pledge UX  
- [ ] Mainnet deploy dry-run on staging addresses  
- [ ] Verifier security facet green  

### First 90 days post-mainnet

- [ ] Bug bounty  
- [ ] Monitor TVL, scam reports, AI error rates  
- [ ] Content Funding wave 2 only if G4–G8 still green  
- [ ] Recruit second independent service operator  
- [ ] Ship ENS/DID verifier path if not already  
- [ ] Fold accumulator storage if hot projects appear  
- [ ] CDN if IPFS latency user-visible  
- [ ] Revisit fees decision **without** skimming fund flows  

### Scale (90–180 days)

- [ ] Political verticals only with elections memo  
- [ ] Community UI program **after** securities clear  
- [ ] Leaderboard server projection if needed  
- [ ] Consider CSA sandbox only if pursuing novel B/C structures needing comfort  
- [ ] Multi-chain only with re-audit  

---

## 4. Metrics for “safe scale”

| Metric | Early warning |
|--------|---------------|
| TVL / escrow balances | Sudden spikes before screening capacity |
| Secondary market volume | Any volume under Posture A = bug or third-party surface |
| Third-party content contracts created | Spam / publicity complaints |
| Takedown SLAs | >72h unresolved after notice |
| Verifier key alerts | Any owner/trust-root change |
| AI attester failure/rate-limit errors | >X% → degrade UI honesty |
| Political content funding volume | Trigger counsel review |
| Support tickets: “tax receipt?” / “investment?” | Copy failure |

---

## 5. Residual risks after playbook (owners)

| Risk ID | Residual | Owner |
|---------|----------|-------|
| R01–R02 | Low–Med if A/B; High if skipped | Founder |
| R03 | Med → Low with multisig + trajectory | Tech |
| R04 | Med always | Ops |
| R07 | Low if CSM delayed | Founder |
| R08 | Med (CA speech) | Ops |
| R13 | Med until projections | Tech |
| R17 | Low after audit | Founder |

---

## 6. Decision record template

```
Date:
Posture chosen: A / B / C / D
Counsel engaged: Y/N (firm:)
Wave-1 domains:
Market UI: off / capped / on
Mainnet target date:
Accepted residuals:
Signed:
```

---

## 7. Bottom line

**Mainnet for a narrow, donation-framed LazyGiving+Aligning surface is a project-management problem.**  
**Mainnet for full retro profit market + CSM at scale is a legal gating problem.**  

Do not conflate MVP completeness in code with launch readiness. Overall technical readiness ~55/100 (Report B); legal-product alignment is the swing factor.
