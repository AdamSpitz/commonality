# Report C — US & Canada Legal Risk Analysis

**Counsel-ready diligence map**  
**Baseline:** `c6faa0a6` · Sources: code + `specs/product/legal/*` + `docs/end-user/*` + UI  

---

## Disclaimer (read first)

This report is **not legal advice** and **not a formal legal opinion**. It is independent strategic diligence and a briefing aid for licensed counsel in the United States and Canada. No attorney-client relationship is created. Laws and regulatory interpretations change; facts must be re-verified against the then-current deployment, entity structure, and marketing.

---

## 1. Facts assumed & facts verified

### Verified against repository

| Fact | Evidence |
|------|----------|
| Uncapped ERC-1155 secondary market exists | `hardhat/contracts/marketplace/ERC1155SecondaryMarket.sol` — any `pricePerToken > 0` |
| End-user docs teach scout profit via market buyout | `docs/end-user/lazyGiving/retroactive-funding.md` ll.18–28 (“make a profit”) |
| Same narrative in fund/create docs | `docs/end-user/lazyGiving/fund-something.md`, `get-your-project-funded.md` |
| “nano-VC” framing | `docs/end-user/lazyGiving/retroactive-funding.md` |
| Legal strategy identifies this as highest risk | `specs/product/legal/securities.md`, `legal/README.md` |
| Donation-first reframe planned not fully resolving mechanism | `workflow/donation-first-reframe-plan-2026-06-22.md` |
| Operator runs multi-surface platform | `ui/src/domains/index.ts`; architecture docs |
| Channel verification is sole trusted signer | `ChannelVerifier.sol` |
| Unclaimed channel escrow by channel ID | `ChannelEscrow.sol` |
| Mainnet not live | `workflow/project-status.md` |
| Political AI surfaces configured on testnet | `deployments/base-sepolia.env` beat-agent politics comments |
| Canada/US dual concern acknowledged by project | `specs/product/legal/README.md` (Adam Canadian resident) |

### Assumed (not independently verified outside repo)

- Founder is a Canadian resident (per project docs)  
- No existing incorporation / ToS / privacy policy in production  
- No formal securities opinion on file  
- Intended settlement asset USDC  

---

## 2. Operator identity & multi-jurisdiction exposure

| Factor | Implication |
|--------|-------------|
| Canadian resident operator | Provincial securities regulators + FINTRAC + PIPEDA + Canadian sanctions/criminal law can attach **regardless of server location** |
| US users / US dollar stablecoin / US infrastructure | US federal (SEC/CFTC contours, FinCEN, OFAC, FEC edges) + state MTL/charity/privacy |
| Global UI | Other jurisdictions residual; prioritize US+CA for launch |

**Worst posture called out in-repo:** unincorporated individual personally operating the platform (`operator-posture.md`). **Agree.**

---

## 3. Securities deep dive (highest risk)

### 3.1 Economic substance of the scout configuration

1. Investor of money: yes (buys tokens / funds early)  
2. Common enterprise: yes (pooled project funding)  
3. **Expectation of profit:** **created by platform marketing** — e.g. receipts trade above cost; scouts “make a profit”  
4. Efforts of others: contestable (later donors’ valuation vs promoter managerial efforts) — **one weak prong does not save a four-prong test if profit expectation is promoter-created**

Canadian lens: *Pacific Coast Coin Exchange* (SCC) — instruments with no yield can still be investment contracts when sold with a **promoted liquid resale market**. CSA Staff Notices 46-307/46-308 target token distributions; CTP guidance (SN 21-329 family) relevant if trading facility characterization attaches.

US marketing precedents cited in-repo (Impact Theory / Stoner Cats-style “NFTs with no rights” still charged on profit expectation marketing) are directionally correct for diligence purposes.

### 3.2 Labels do not save the current middle path

Calling tokens “donation receipts” while publishing:

- “scouts with good judgment make a profit”  
- “nano-VC system for public goods”  
- “financially rewarded” / “compensation for the risk”  

…is **self-inflicted evidence** of expectation of profit. Internal legal docs already say this (`securities.md`). **Independent confirmation: contradiction is live in end-user docs as of baseline.** See `artifacts/profit-language-inventory.md`.

### 3.3 Secondary market & exchange characterization

`ERC1155SecondaryMarket` is a full ask/bid orderbook with escrowed assets. If tokens are securities, **operating a UI that discovers and matches trades** risks unregistered exchange/ATS (US) / crypto trading platform (Canada) analysis. Community UIs with trading **distribute** rather than dissolve that risk (`operator-posture.md`) — **do not encourage community trading front-ends until securities posture resolved**.

### 3.4 Four postures (decision matrix)

Full matrix: `artifacts/securities-posture-matrix.md`.

| Posture | Summary | Verdict for scale launch |
|---------|---------|--------------------------|
| **A Donation-first** | Disable/de-emphasize market; scrub profit narrative | Fastest safe product path |
| **B Reimbursement-capped** | On-chain `listing ≤ primary` | Strong if engineered strictly; **code does not implement today** |
| **C Waterfall, no market** | Non-transferable + cost recovery waterfall | Cleanest retro-compatible redesign (`retroactive-funding-redesign.md`) |
| **D Own it** | Keep profit market | **Only with formal opinion before mainnet** |

### 3.5 Fan-created content contracts

Third-party `createThirdPartyContract` can attach funding vehicles to **named creators who have not consented**, with funds waiting in channel escrow. If receipts are securities, strangers may be creating investment contracts referencing non-consenting persons — **amplifies** securities + publicity risk (`securities.md` Jul 2026 re-rank). Even if not securities, **appropriation of personality / right of publicity** theories (US state / Canadian common law flavors) need UX framing and policy.

---

## 4. Money transmission / MSB / virtual currency

### US

Non-custodial architecture (users send to contracts; Coinbase as on-ramp principal) aligns with FinCEN guidance contours for pure software **if** operator never takes possession/control of customer value. Project discipline in `specs/tech/bridges.md` / `money-transmission.md`: **never touch funds**.

**Watch items:** platform fees on fund flows; mis-designed sponsored gas; any hot-wallet pooling; escrow optics of ChannelEscrow (contract escrow ≠ operator wallet, but **verifier control** muddies “control” facts).

### Canada

FINTRAC “dealing in virtual currency” can be **broader** than US MSB framing. **Counsel must specifically analyze Canadian MSB registration** even if US analysis is clean. Same non-custodial facts are the defense; do not assume symmetry.

---

## 5. Sanctions & terrorist financing

| Issue | US | Canada |
|-------|----|--------|
| Facilitating value to listed persons | OFAC strict-ish facilitation exposure | SEMA + Criminal Code TF provisions; personal exposure for resident |
| On-ramp screening insufficient alone | UI still displays/routes | Same |
| Unclaimed channel named payees | Screen at identity/channel level before create/display | Same |

**Required before mainnet:** wallet screening at contribute UI; project/address blocklist; documented takedown; abuse reporting. **Unspecced gap:** platform-identity screening for unclaimed channels (flagged in `legal/README.md` re-rank).

---

## 6. Speech, defamation, intermediary liability

| | US | Canada |
|--|----|--------|
| Intermediary shield | §230 (with carveouts); DMCA process | **No §230 equivalent** — notice can create exposure |
| User statements on IPFS | Still displayed by operator UI | Higher residual |
| AI implications / bridges | Operator speech | Operator speech |
| Civility attestations | Positive-only on-chain softens disparagement | Softens but does not eliminate residual explanation/API leakage |

**Mitigations:** notice-and-takedown SOP; US DMCA agent; methodology disclosure for AI; community-UI long-term shift for display risk.

---

## 7. Political funding (CSM / Civility)

| Concern | US | Canada |
|---------|----|--------|
| Campaign contributions / coordination | FECA; foreign national prohibition relevant if foreign person provides money or **in-kind** (e.g. sponsored gas for political contribution) | Canada Elections Act third-party regimes; provincial rules |
| Platform as political vendor | Risk rises with election-period advocacy funding | Same |
| Coinbase political activities disclosure | On-ramp partner policy interaction | — |

**Recommendation:** explicit **launch content policy** excluding election-period campaign funding; delay significant CSM money flows until policy + partner disclosure review; treat sponsored gas carefully in political verticals.

---

## 8. Charitable solicitation & tax

| Topic | Guidance |
|-------|----------|
| “Donation” marketing | May trigger **fundraising platform / charitable solicitation** registration analysis (US state patchwork; Canadian provincial rules) — counsel after entity formation |
| Tax receipts | Users must **not** be told contributions are tax-deductible; disclaimers on pledge UX (`tax.md`) |
| Operator revenue | Dev funding / any fees = ordinary income analysis for founder |

---

## 9. Privacy (PIPEDA + US states)

Trust scores on-chain + identity anchors + email/Privy + contribution history = **personal information** under PIPEDA. Cross-border processing (US hosts, CA operator, global users) needs transparency, purpose limitation, retention, and breach process. US: CCPA/state privacy may apply depending on thresholds and data.

**Table stakes:** privacy policy, cookie/wallet disclosure, data map — currently not evidenced as production artifacts in-repo.

---

## 10. Publicity / personality rights

Fan-created funding vehicles naming creators before consent: economic harm partially mitigated by veto/fee; **publicity harm is not fully mitigated**. Need clear “created by a fan; not affiliated” framing on all claim/display pages (`legal/README.md`).

---

## 11. Smart contract publication vs operated service

Publishing code is lower risk than operating services (Tornado Cash / Uniswap Labs lessons as framed in `operator-posture.md`). **Admin keys and sole verifier convert published code into operated service.** See Report D.

---

## 12. Contradiction findings (legal strategy vs live copy)

| # | Finding | Strategy doc | Live copy / code | Severity |
|---|---------|--------------|------------------|----------|
| C1 | Profit expectation marketed | `securities.md` says scrub / choose posture | `docs/end-user/lazyGiving/retroactive-funding.md` profit language | **Critical** |
| C2 | “nano-VC” / scout compensation | Strategy rejects middle path | Same + `fund-something.md` | **Critical** |
| C3 | Donation-first reframe incomplete | Planned in workflow | Market contract still uncapped; docs unchanged | **High** |
| C4 | Protocol claim vs sole operator | `operator-posture.md` | 8 UIs + AI + verifier still sole | **High** |
| C5 | Positive-only civility | Softens speech risk | Consistent with noninflammatory specs | OK residual |
| C6 | Non-custodial money path | Keep discipline | Core contracts match; verifier is residual control | **Medium** |

**Explicit statement:** contradictions **were found** (not “none after search”). Inventory: `artifacts/profit-language-inventory.md`.

---

## 13. Residual risk heat map (after recommended remediations)

Assume: entity + ToS/privacy; Posture A or B implemented; screening + takedown; multisig verifier; audit complete; CSM delayed.

| Risk | Residual |
|------|----------|
| Securities (A/B implemented) | Low–Med |
| Exchange | Low |
| Money transmission | Low |
| Sanctions | Med (always residual) |
| Speech (CA) | Med |
| Political | Low–Med if policy holds |
| Privacy | Low–Med with policy |
| Publicity | Med |
| Verifier compromise | Low–Med with multisig + trajectory |

If mainnet ships **current** code+docs: securities + exchange remain **Critical**.

---

## 14. Recommended formal opinion scopes (pay counsel once)

1. **Securities characterization** of LazyGiving receipts under chosen posture (Howey + *Pacific Coast* + CSA notices) — **mandatory before any profit market**  
2. Canadian **MSB / virtual currency** analysis of operated stack  
3. If CSM Day-1: elections / political advertising memo US+CA  
4. Optional: charitable solicitation multi-state/province registration map  

See Report F for engagement pack.

---

## 15. Bottom line (legal)

The project’s **internal legal thinking is sophisticated and largely correct**. The launch blocker is **execution gap**: product narrative and market mechanism still embody the configuration the legal map identifies as highest risk. For scale launch under Canadian residence + US users, **resolve securities posture in product (A/B/C) or pay for Posture D opinion before mainnet**, incorporate, and adopt honest **platform** compliance for operated layers—especially content funding and political verticals.
