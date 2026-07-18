# Report D — Control Surface & Operator Posture Audit

**Baseline:** `c6faa0a6`  
**Detail tables:** `artifacts/control-surface-inventory.md`  
**Cross-check:** `specs/product/legal/what-we-host-and-control.md`, `operator-posture.md`, `workflow/security-recoverability.md`, contract sources

---

## 1. Why this audit matters

“Protocol vs platform” is not a statute. It decides **whether conduct elements of securities exchange, sanctions facilitation, speech, and political-finance rules attach to the operator**. Claiming protocol while operating eight front doors, AI judgment, and a money-gating verifier is the worst hybrid: platform exposure without platform paperwork.

---

## 2. Independent control findings (code-grounded)

### 2.1 Holds as protocol-shaped

| Surface | Evidence |
|---------|----------|
| Beliefs / Implications publish | `hardhat/contracts/statements/` — no deployer Ownable pattern in core flow |
| Alignment attestation events | Permissionless contract |
| TrustRegistry user scores | `subjectiv/TrustRegistry.sol` |
| Secondary market matching logic | No Ownable on `ERC1155SecondaryMarket.sol` |
| Client-side folds | `sdk/src/**/folds.ts` — computation in browser |
| Assurance withdraw to recipient | Recoverability audit: no operator drain function |

### 2.2 Fails protocol claim (ranked)

| Rank | Control | Path | Why it fails |
|-----:|---------|------|--------------|
| 1 | Channel trusted verifier | `ChannelVerifier.sol` `trustedVerifier` / `setTrustedVerifier` | Sole identity oracle; can redirect escrow |
| 2 | Channel escrow for unclaimed IDs | `ChannelEscrow.sol` | Value earmarked for named channels pre-consent |
| 3 | DelegatableNotes factory allowlists | `delegation/DelegatableNotes.sol` owner setters | Operator gates where delegated money may spend |
| 4 | Content factory economic gates | `CreatorAssuranceContractFactory.sol` onlyOwner setters | Platform parameters on third-party create |
| 5 | UI trust-root defaults | `VITE_DEFAULT_*` / contract addresses in `deployments/*.env` | Configurable in theory; monoculture in fact |
| 6 | AI judgment monoculture | attester/nudger/bridge-creator packages | Implication & content judgments under operator keys |
| 7 | Indexer watched set | `indexer/ponder.config.ts` + env | Defines visible contract universe |
| 8 | Submission queue | platform-api-service file-backed queue | Pre-moderation hosted content |
| 9 | Naming & edge | Cloudflare gateways, `*.commonality.works` | Sole public doors |
| 10 | Sponsored gas parameters | `sponsored-gas/` | Subsidy allocation |

### 2.3 Divergence from pure restatement

This audit **agrees** with the Jul 2026 control audit in-repo on ranking, and **adds operational confirmation**:

1. Secondary market is **permissionless code** but **operator-promoted product** — legal exchange risk lives in UI+narrative more than Ownable.  
2. `thirdPartyMinPurchase = 1` in factory source is a **production misconfiguration risk** if left at unit default (`hardhat/README.md` already warns).  
3. Testnet env shows **political beat-agent** operationalization — control of editorial political AI is not hypothetical.

---

## 3. Content taxonomy (who speaks)

| Content | Author | Operator exposure |
|---------|--------|-------------------|
| Statements (IPFS) | Users | Display choice |
| Project metadata | Creators | Display + funding rails |
| Project alignment/success vouches | Users | Mild; trust-filtered |
| Implication attestations | Operator AI (today) | **High** — editorial |
| Content/civility attestations | Operator AI | High; positive-only helps |
| Bridge-creator statements | Operator AI synthesis | High political flavor |
| Seed causes | Operator | Permanent attribution |
| Channel ownership proofs | Operator verifier key | Identity + money |
| Derived leaderboards | Operator aggregation | Associates people with causes |

---

## 4. What multi-provider / IPFS / The Graph actually buy

| Move | Legal benefit | Operational benefit | Caveat |
|------|---------------|---------------------|--------|
| IPFS UI builds | Mild (distribution) | Censorship resistance | DNS/gateway still operator |
| Second attester operator | Speech/editorial dilution | Resilience | Must be *real* different people |
| The Graph / multi-indexer | Mild | Scale/redundancy | Still whose subgraph people use |
| Community cause UIs | Shifts display/sanctions to UI ops | Matches values | **Dangerous if securities unresolved** |
| Trustless channel verifier | Removes worst platform feature | Removes drain path | Must ship, not roadmap |

**Honest test (from operator-posture.md, applied):** if founder disappears tomorrow, which experiences continue?

| Continues | Stops |
|-----------|-------|
| On-chain contracts, existing IPFS CIDs | Default UIs, verifier signatures, AI attesters, indexer, DNS, submission queue |

---

## 5. Minimum decoupling for a credible mainnet story

**Not optional cosmetics — ordered by leverage:**

1. **Securities posture implemented in product** (else decoupling spreads exchange liability).  
2. **Incorporate + ToS + privacy** (platform paperwork).  
3. **Multisig/cold admin** for ChannelVerifier / factory / notes allowlists.  
4. **Ship one non-tweet trustless verifier path** (ENS/DID) even if niche.  
5. **Document how to run** indexer, attester, UI build with second operator recruited.  
6. **Split marketing:** “Commonality Labs operates moderated front-ends” vs “permissionless contracts.”  
7. Defer encouraging community trading UIs.

---

## 6. Recommended public posture language

**Use:**  
“We publish open-source protocols and operate opinionated applications and AI services under [Entity]. Smart contracts are permissionless; our websites and default services are moderated products.”

**Avoid until true:**  
“We’re just a decentralized protocol and don’t control anything.”

---

## 7. Control residual score

| Subsystem | Protocol score (0–10) | Notes |
|-----------|----------------------:|-------|
| Statements contracts | 9 | Strong |
| LazyGiving funds contracts | 8 | Strong; market product is separate issue |
| Secondary market code | 8 code / 2 product | Narrative+UI dominate |
| Delegation | 6 | Factory allowlists |
| Content funding | 2 | Verifier+escrow+API |
| Civility/CSM | 1 | Editorial by design — own it |
| AI layer | 2 | Monoculture |
| Default UIs | 1 | Sole operator |

---

## 8. Conclusion

Control is **split by subsystem**, not binary. Launch compliance must be **platform-grade** for content funding, default UIs, AI, and political verticals, while preserving protocol virtues of non-custodial assurance contracts. The single most important control fix for funds safety is **ChannelVerifier governance + trustless trajectory**; the single most important control fix for regulatory characterization is **aligning market UI and marketing with a chosen securities posture**.
