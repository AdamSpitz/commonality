# Report F — Counsel & Vendor Engagement Pack

**Purpose:** Hire the right specialists quickly with a scoped brief.  
**Baseline:** `c6faa0a6`  
**Attach when engaging:** Reports C, D, E; `artifacts/risk-register.csv`; `artifacts/securities-posture-matrix.md`; `artifacts/profit-language-inventory.md`; selected contracts listed below.

---

## 1. Outside counsel — US + Canada crypto / securities

### 1.1 Profile

- Dual capability or coordinated pair: **US securities + Canadian (provincial) securities / fintech**  
- Experience with: token / NFT marketing enforcement, crypto trading platform guidance, non-custodial architectures, Canadian resident founders serving US users  
- Nice-to-have: elections/campaign finance; charitable solicitation  

### 1.2 Engagement objective

Obtain **formal advice** (and, if pursuing Posture D or novel B/C, a **written opinion** suitable for board reliance) on whether LazyGiving donation receipts + secondary market / redesign under the chosen posture are investment contracts and whether the operated UI is an exchange/CTP.

### 1.3 Questions for counsel

1. Under the **chosen posture** (A/B/C/D), are primary-market purchases investment contracts in the US? In Ontario/other provinces?  
2. Does operating `ERC1155SecondaryMarket` + discovery UI create exchange/ATS/CTP obligations if tokens are securities? If not securities?  
3. Does reimbursement-capped resale or waterfall-no-market sufficiently defeat profit expectation under Howey and *Pacific Coast*?  
4. FINTRAC MSB / “dealing in virtual currency” — does ChannelEscrow + Platform API + sponsored gas change the answer?  
5. OFAC/Canadian sanctions — minimum viable screening program for this architecture?  
6. Foreign national / third-party political rules if CSM funds advocacy?  
7. Recommended entity jurisdiction and intercompany (IP vs ops) structure?  
8. Charitable solicitation triggers for “donation” UX in top user states/provinces?  

### 1.4 Document bundle to send

| Item | Location |
|------|----------|
| This pack + Reports C–E | `analysis-results/` |
| Legal self-map | `commonality/specs/product/legal/*` |
| End-user retro docs | `docs/end-user/lazyGiving/retroactive-funding.md` etc. |
| Secondary market contract | `hardhat/contracts/marketplace/ERC1155SecondaryMarket.sol` |
| Assurance + factory | `hardhat/contracts/individual-projects/` |
| Content funding set | `hardhat/contracts/content-funding/` |
| Bridges non-custody design | `specs/tech/bridges.md` |
| Operator posture | `specs/product/legal/operator-posture.md` |
| Control audit | `specs/product/legal/what-we-host-and-control.md` |

### 1.5 Suggested phases & budget framing (indicative only)

| Phase | Deliverable | Relative cost |
|-------|-------------|---------------|
| 1 | Risk memo on current baseline (2–3 weeks) | $$ |
| 2 | Opinion on chosen posture | $$$ |
| 3 | ToS/privacy/political policy drafting support | $$ |
| 4 | Optional sandbox application support (CSA) | $$ |

---

## 2. Smart-contract audit firm

### 2.1 Scope (in)

- All funds-touching contracts: assurance, primary market, secondary market, delegation notes, content-funding factory/escrow/registry/verifier, sponsored-gas  
- Auth surfaces: Ownable2Step, trusted verifier, factory authorizations  
- Token assumptions (USDC/standard ERC-20)  
- Economic edge cases: partial fills, refunds, third-party content create, veto windows  

### 2.2 Scope (out / separate)

- Full AI prompt security  
- Off-chain platform API beyond signature scheme review  
- Formal verification unless budgeted  

### 2.3 In-repo test harness for auditors

- `hardhat/test/*`  
- `hardhat/slither.config.json`  
- `integration-tests/`  
- `workflow/security-recoverability.md` threat notes  

### 2.4 Success criteria

- Written report with severity ratings  
- Fix review pass  
- Public summary optional for trust  

---

## 3. Optional specialists

| Specialist | When |
|------------|------|
| Privacy counsel (PIPEDA / Québec Law 25 / CCPA) | Before collecting email/Privy at scale |
| Elections / political law (US+CA) | Before CSM money or political sponsored gas |
| Charity registration multi-jurisdiction | If marketing as donations heavily in regulated provinces/states |
| Communications / crisis | If political vertical attracts media |

---

## 4. Vendor shortlist categories (not endorsements)

| Need | Vendor type |
|------|-------------|
| Wallet/address screening | Chainalysis, TRM, Elliptic, or equivalent API |
| Bug bounty | Immunefi / HackerOne crypto programs |
| Key management | Hardware wallets + multisig (Safe) for admin |
| On-ramp | Coinbase Onramp (spike exists: `spikes/coinbase-onramp/`) — review political disclosures |
| RPC / infra | Standard Base/Ethereum providers; avoid single point |
| IPFS CDN | Pinata/public gateway + caching CDN |

---

## 5. Internal prep checklist before first counsel call

- [ ] Chosen securities posture (even if provisional)  
- [ ] Who will be directors/beneficial owners of entity  
- [ ] Target user geos (US-only vs global)  
- [ ] Whether secondary market must ship wave 1  
- [ ] Whether CSM is wave 1  
- [ ] Current testnet URLs / is any real value at risk (should be no)  
- [ ] Any prior legal advice  

---

## 6. RFP email template (short)

```
Subject: Engagement request — crypto public-goods funding protocol (US+CA)

We operate an open-source, non-custodial assurance-contract system with ERC-1155
donation receipts and (currently) an uncapped secondary market used for
"retroactive funding." Founder is Canada-based; users expected in US/Canada.

We need counsel to (1) assess securities characterization under four product
postures, (2) exchange/CTP risk if we host trading UI, (3) FINTRAC/MSB and
sanctions minimum program, and (4) entity/ToS priorities before mainnet.

We can share a diligence package (architecture, control audit, profit-language
inventory, and contract paths). Please propose scope, timeline, and conflicts check.
```

---

## 7. What this pack is not

- Not a retainer agreement  
- Not a formal opinion  
- Not permission to mainnet  

Counsel and auditors own their conclusions after independent review.
