# Commonality — Analysis & Reporting Plan

**Engagement posture:** Independent technical + legal (US/Canada) counsel-ready diligence for scale launch  
**Repo:** [github.com/AdamSpitz/commonality](https://github.com/AdamSpitz/commonality) (`dev` branch; latest commits already include substantial in-repo legal work)  
**Current phase (repo self-assessment):** MVP implemented in code; **no mainnet**; testnet stabilization / MVP validation  
**Workspace:** `commonality analysis` (local clone under this folder)

---

## 1. Executive orientation (what this system is)

**Commonality** is a multi-surface, crypto-native coordination stack for **public-goods / cause-aligned funding**, built as a monorepo (~83k LOC in contracts + SDK + UI alone) with:

| Layer | Role |
|--------|------|
| **Smart contracts** (Hardhat, ~46 Solidity files) | Statements/beliefs, assurance contracts, ERC-1155 receipts, secondary market, delegation notes, content funding, alignment/success attestations, trust registry, etc. |
| **Indexer** (Ponder) | Thin event cache — **no business logic** |
| **SDK** | Client-side **folding** of raw events into state |
| **UI** | Eight branded domains from one Vite/React app (Commonality, LazyGiving, Aligning, Tally, Content Funding, Civility, CSM, Conceptspace) |
| **AI service ecosystem** | Attesters, finders, nudgers, bridge-creator, beat-agents, explorer-curator, service-host |
| **Edge** | Cloudflare Workers + Render + IPFS/IPNS UI |
| **Verifier** | First-class health/security/docs/product facets |

**Core economic primitives that drive legal risk:**

- Assurance contracts + refunds
- Donation receipts (ERC-1155)
- **Secondary market / retroactive funding narrative**
- Composable delegation
- Content-channel escrow for unclaimed creators
- Political-adjacent verticals (Civility / Common Sense Majority)

**Founder’s legal self-ranking (already in-repo, Jul 2026):** securities (retroactive funding) dominates; then operator posture, sanctions, political funding, speech (Canada ≠ §230), unconsented-creator publicity; money transmission largely mitigated if non-custodial discipline holds.

---

## 2. Engagement goals & success criteria

### Primary goal

Produce a **launch-at-scale decision package**: what can ship, under which product posture, with what technical hardening, what legal residual risk, and what sequence of “pay a lawyer / change the product / keep as-is.”

### Success criteria for the analysis package

1. **Independent validation** of in-repo legal maps (not just restatement) against current code, copy, and control points
2. **Mainnet readiness scorecard** (security, ops, scale, compliance gates)
3. **Clear product-law forks** (donation-first vs reimbursement-capped vs waterfall-no-market vs “own it + formal opinion”) with implementation cost and go-to-market impact
4. **US + Canada dual-track** where Canadian residence of the operator is first-class, not an afterthought
5. **Reports usable by:** founder, outside counsel, technical leads, potential partners/investors, and (where appropriate) regulators/sandbox applications

### Explicit non-goals (this engagement)

- Formal legal opinion / bar-licensed advice (this work is **diligence mapping + counsel briefing**, not substitute for counsel)
- Full formal smart-contract audit firm deliverable (we prepare scope, threat model, and pre-audit findings; recommend external auditor)
- Rewriting the product unless you later commission implementation

---

## 3. Work already available in-repo (baseline we will stress-test)

The project has unusually strong self-documentation. Analysis will **treat these as hypotheses**, not conclusions:

| Area | Key sources |
|------|-------------|
| Product/MVP | `specs/product/mvp.md`, `workflow/project-status.md` |
| Architecture | `docs/dev/architecture.md`, subsystem specs under `specs/tech/` |
| Scale | `specs/tech/scalability.md` |
| Security | `specs/tech/security.md`, `workflow/security-recoverability.md`, Slither + Hardhat suite |
| Legal map | `specs/product/legal/*` (14 risk files + control audit) |
| Product reframe | `workflow/donation-first-reframe-plan-2026-06-22.md`, `specs/product/legal/retroactive-funding-redesign.md` |
| Ops | `workflow/deployment.md`, verifier, Render/Cloudflare/IPNS deploy scripts |

**Critical observation for the plan:** recent git history (`legal-analysis` PR) means legal thinking is advanced *on paper*. Launch risk is whether **code + UX copy + marketing + operator control** still contradict the intended legal posture—especially retroactive-funding “scout profit” language still present in end-user documentation (e.g. TL;DR for LLMs).

---

## 4. Analysis methodology

### Phase 0 — Kickoff & scope lock (½–1 day)

- Confirm launch target: **which of 8 domains first**, chain (Base?), token (USDC), geo (US-only, CA, global), and whether CSM/Civility is Day-1
- Confirm preferred **securities posture** candidates for deep comparison
- Identify document classification (public vs privileged for counsel handoff)

### Phase 1 — System mapping & control inventory (2–3 days)

**Technical**

- Contract topology: factories, escrow, ownership, upgradeability/admin keys, fee sinks
- Off-chain chokepoints: platform API, channel verifier, AI services, indexer as “universe,” Cloudflare gateways, sole attester keys
- Data flows: IPFS content, trust graph, email/Privy identity, on-chain addresses

**Legal-relevant control points** (from `what-we-host-and-control.md` + code audit)

- Who can pause, blacklist, take down, front-run narrative, release unclaimed-channel funds
- Whether “protocol not platform” is factually true today

**Deliverable:** *Control Surface Inventory* (diagram + table)

### Phase 2 — Deep technical analysis (5–8 days)

Parallel tracks:

#### 2A — Smart contracts & economic mechanisms

- Assurance contracts, refund paths, ERC-1155 primary/secondary markets
- Content-funding third-party contracts, veto windows, escrow
- Delegation (`DelegatableNotes`, intents, recurring pledges)
- Trust, attestations, implications (no on-chain graph abuse surface vs client fold)
- Admin/ownership, reentrancy/token assumptions (USDC-only claims)
- Cross-check Hardhat + Slither + integration tests vs untested paths

#### 2B — Client-side folding & scale path

- Validate “thin indexer + fold” under multi-entity boards/leaderboards
- Hot paths for cause boards, supporter counts, contribution rank
- IPFS + CDN readiness; fold caching / cursors (noted as deferred)
- Elastic AI services, rate limits (Twitter/YouTube), beat-agent load

#### 2C — Product surface & UX risk

- Eight-domain consistency of legal framing
- Donation-first reframe completeness
- Privy / sponsored gas / onramp path maturity (mainnet mainstream UX)
- Political vertical prompts (bridge-creator, beat-agent US politics)

#### 2D — Security & abuse

- Sybil, spam, scams, graph/attestation monoculture
- Secrets, key custody, recoverability
- Web: CSP, XSS via markdown/IPFS, gateway trust
- Sanctions-relevant identity surfaces

#### 2E — Operability at scale

- Deploy/rollback, multi-env manifests, verifier gates
- Observability, cost model (`verifier-cost`, AI OpenRouter)
- Multi-provider readiness (legal + ops story)

**Deliverable:** *Technical Scale & Mainnet Readiness Report*

### Phase 3 — Legal analysis US + Canada (5–8 days, overlaps Phase 2)

Independent counsel-style **risk memos** (analysis only; not formal opinions):

| Risk area | US focus | Canada focus | Code/copy anchors |
|-----------|----------|--------------|-------------------|
| **Securities** | Howey; exchange/dealer; NFT/token marketing precedents | *Pacific Coast*; CSA SN 46-307/308; CTP SN 21-329; provincial commission jurisdiction (operator residence) | Secondary market, retroactive funding docs, UI copy |
| **Money transmission / MSB** | FinCEN guidance; state MTL; non-custodial design | FINTRAC MSB; whether any “dealing in virtual currency” touchpoints remain | Escrow, gateways, onramps (Coinbase spike), sponsored gas |
| **Sanctions / TF** | OFAC; blocked persons; facilitation | OSFI / sanctions lists; AML program expectations if MSB | Unclaimed-channel escrow for named persons |
| **Speech / defamation / intermediary** | §230 limits & carveouts; DMCA | **No §230**; provincial defamation; intermediary liability | Statements, attestations, hosted UI |
| **Political / campaign finance** | FECA, in-kind, coordination | Elections Canada, provincial rules, foreign influence | CSM, Civility, sponsored gas, bridge-creator content |
| **Charitable solicitation** | State charity regs; “donation” marketing | Provincial solicitation / fundraising platform rules | Marketing, ToS |
| **Tax** | 1099/crypto reporting; no deduction claims | CRA; no official donation receipt; operator income | Disclaimers, founder funding |
| **Privacy** | CCPA/state privacy; wallet+identity | **PIPEDA** + provincial (e.g. Québec Law 25 if relevant) | Trust graph, email, Privy, logs |
| **Publicity / personality** | Right of publicity (state) | Appropriation of personality | Fan-created content contracts naming creators |
| **Smart contract publication** | Code as speech / product liability edges | Similar + consumer protection | Repo publish vs operated service |

**Method**

1. Map **economic substance** of each user journey (early backer, retro funder, delegate, content fan, political vertical user)
2. Score each journey under **four product postures** already sketched in-repo
3. Gap analysis: in-repo legal docs vs **live copy** in `docs/end-user` and UI strings
4. Entity/ops recommendations (incorporate where, which roles, which disclaimers)
5. Produce **counsel engagement brief**: questions, documents, and “pay-once vs pay-often” items

**Deliverable:** *US/Canada Legal Risk Report* + *Counsel Briefing Memo*

### Phase 4 — Launch architecture & decision synthesis (2–3 days)

- Recommended **launch configuration** (domain sequence, market feature flags, copy freeze)
- **Go / No-Go gates** for mainnet
- 30/90/180-day roadmap: legal hardening + scale engineering
- Optional: regulatory sandbox path (CSA) if retroactive mechanism retained

**Deliverable:** *Scale Launch Playbook*

### Phase 5 — Optional add-ons (if commissioned)

- Pre-audit package for external auditor
- Securities redesign implementation PR plan (aligned with existing donation-first / waterfall specs)
- Privacy policy / ToS skeleton for counsel polish
- Tabletop: sanctions hit, defamation demand, secondary-market abuse, attester key compromise

---

## 5. Expected report suite (deliverables)

### Report A — *System Overview for Decision-Makers* (15–25 pp)

**Audience:** founder, board, non-technical partners

- What Commonality is and is not
- Architecture diagram (protocol vs operator-run surfaces)
- Eight domains and why that multiplies legal surface
- Current maturity (testnet, verifier, deferred fiat path)
- Top 10 risks and top 10 strengths

### Report B — *Technical Architecture & Scale Readiness* (30–50 pp + appendices)

**Sections:**

1. Component map & dependency graph
2. Contract subsystem review (per folder: purpose, funds flow, admin powers)
3. Indexer + SDK fold model: complexity bounds, known non-scalable queries
4. AI services: trust model, monoculture risk, cost/latency at scale
5. Multi-domain UI & edge deployment
6. Security findings (severity-ranked: Critical → Informational)
7. Performance/scalability backlog prioritized for launch
8. Testing/verification assessment (Hardhat, integration, e2e, verifier facets)
9. Mainnet readiness scorecard (0–100 per category)
10. Appendix: threat model STRIDE + economic attack scenarios

### Report C — *US & Canada Legal Risk Analysis* (40–60 pp, counsel-ready)

**Sections:**

1. Facts assumed & facts verified against code
2. Operator identity & multi-jurisdiction exposure
3. **Securities deep dive** with four postures comparison matrix
4. Money transmission / VASP / non-custody discipline
5. Sanctions & unclaimed-channel design requirements
6. Speech, defamation, content moderation process
7. Political funding for CSM/Civility
8. Charitable solicitation & tax communications
9. Privacy (PIPEDA + US state) for trust graphs and identity
10. Publicity rights for fan-created creator funding
11. Control-audit residue vs “just a protocol” narrative
12. Residual risk heat map after recommended remediations
13. **Not legal advice** framing; recommended formal opinion scopes

**Matrix example (core of the launch decision):**

| Posture | Product intact? | Securities risk | Exchange risk | Eng cost | GTM story |
|---------|-----------------|-----------------|---------------|----------|-----------|
| Donation-first (market off/default off) | Partial | Low–Med | Low | Low–Med | Strong |
| Reimbursement-capped on-chain | Retro alive | Low* | Low–Med | Med | Good |
| Waterfall, no market | Retro redesigned | Lowest | Lowest | High | Strong if explained |
| Own it + formal opinion | Full scout profit | High until opinion | High | Low product / High legal | Strong if cleared |

\*If caps + copy scrub + no sweeteners hold.

### Report D — *Control Surface & Operator Posture Audit*

- Every key, admin role, default UI, sole service, baked-in attester
- What multi-provider / IPFS UI / The Graph actually buys legally vs operationally
- Minimum decoupling for a credible “protocol” story at mainnet

### Report E — *Launch Playbook & Sequenced Checklist*

**Now / Before mainnet / First 90 days / Scale:**

- Entity formation, ToS/privacy, copy scrub grep list
- Feature flags (secondary market, political verticals, third-party content contracts)
- Screening & takedown SOPs
- External audit, bug bounty, key ceremony
- Domain launch order recommendation
- Metrics for “safe scale” (TVL, political content volume, AI error rates)

### Report F — *Counsel & Vendor Engagement Pack*

- RFP-style brief for US+CA crypto securities counsel
- Smart-contract audit firm scope
- Optional: privacy counsel; elections counsel if CSM Day-1

### Artifacts package

- Architecture diagrams (Mermaid/SVG)
- Risk register (CSV/Notion-ready): ID, severity, likelihood, owner, mitigation, residual
- Grep inventory of profit/invest/return language
- Journey maps for 6–8 user personas

---

## 6. Technical analysis deep-dives (planned review list)

| Priority | Target | Why it matters at scale |
|----------|--------|-------------------------|
| P0 | `ERC1155SecondaryMarket` + retroactive funding UX/docs | Securities + exchange narrative |
| P0 | Assurance contract factories, escrow, refunds, thresholds | User funds safety |
| P0 | Content-funding channel claim, third-party min purchase, veto, unclaimed escrow | Sanctions + publicity + custody optics |
| P0 | Owner keys / admin / upgrade paths / `security-recoverability` | Operator liability + incident response |
| P1 | `DelegatableNotes` + recurring pledges | Complex fund routing; political in-kind edges |
| P1 | Indexer fold + Aligning leaderboards / cause boards | Scale bottleneck at product core |
| P1 | Platform API + Twitter/YouTube verification | Central chokepoint; ToS of third platforms |
| P1 | AI attester monoculture & bridge-creator political generation | Speech + political + trust integrity |
| P2 | Sponsored gas / Privy / Coinbase onramp spikes | Money transmission & UX for mass adoption |
| P2 | IPFS CDN, Cloudflare gateways, Render topology | Availability at scale |
| P2 | Subjectiv trust graph client performance | UX collapse under dense graphs |
| P3 | Multi-chain / multi-token generalization | Future scale, not Day-1 |

### Scale hypotheses to confirm or falsify

1. Per-entity folds stay acceptable up to N events without cursors
2. Cause-board aggregation needs server projection before viral CSM launch
3. AI services must be multi-tenant elastic with circuit breakers before mainnet marketing
4. IPFS without CDN is a cold-start failure mode for mainstream users
5. Single-operator eight front doors defeats decentralization narrative under regulator scrutiny

---

## 7. Legal analysis deep-dives (planned)

### 7.1 Securities (highest leverage)

- Reconcile **end-user retroactive-funding pages** with legal strategy
- Instrument analysis: donation receipt vs investment contract under Howey + *Pacific Coast*
- Operator as **exchange/ATS/CTP** if market UI ships
- Fan-created content contracts as third-party investment vehicles naming non-consenting creators
- CSA sandbox candidacy if innovative structure retained

### 7.2 Money transmission & virtual currency

- Prove non-custody for every path; flag any residual (onramp, sponsored gas, platform escrow optics)
- FINTRAC MSB registration triggers if Canadian-operated services “deal in virtual currency”
- State-by-state US MTL risk if any custody-like feature creeps in

### 7.3 Sanctions

- Screening at **display/create time** for named payees (unclaimed channels)
- Wallet screening vs identity-level screening
- Design requirement doc if not fully specified

### 7.4 Speech (Canada-weighted)

- Hosting statements + AI-generated implications under Canadian defamation
- Positive-only civility attestations vs residual statement display risk
- Notice-and-takedown process recommendation

### 7.5 Political funding

- Whether CSM/Civility money flows are campaign-adjacent
- Sponsored gas / AI content generation as in-kind contribution theories
- Coinbase political-activities disclosures interaction (noted in-repo)

### 7.6 Privacy

- Trust graph + on-chain identity + email/Privy = high sensitivity under PIPEDA
- Cross-border processing (US hosts, Canadian operator, global users)

---

## 8. Suggested timeline & effort

| Phase | Calendar (full-time equivalent) | Output |
|-------|----------------------------------|--------|
| 0 Kickoff | 0.5–1 day | Scope lock |
| 1 Mapping | 2–3 days | Control inventory |
| 2 Technical deep dive | 5–8 days | Report B draft |
| 3 Legal deep dive | 5–8 days (parallel) | Report C draft |
| 4 Synthesis | 2–3 days | Reports A, E, F + risk register |
| 5 Review cycle | 2 days | Founder comments → final |
| **Total** | **~3–4 weeks** for full package | Or phased: legal-critical path first (~10 days) |

### Fast-track option (10 business days)

Reports A + C (securities-focused) + E (launch gates only) + thin B (P0 technical only).

Recommended if mainnet pressure is high and product posture decision is the bottleneck.

---

## 9. Working principles

1. **Code and copy beat docs** — in-repo legal strategy is advanced; contradictions in user-facing narrative are treated as live risk.
2. **Dual jurisdiction by default** — Canadian operator residence means provincial securities + FINTRAC + PIPEDA even if users are US-centric.
3. **Mechanism over labels** — “donation receipt” language is scored only if economic substance matches.
4. **Decoupling is evidence, not magic** — multi-UI / IPFS helps operator posture; it does not cure securities marketing authored by the protocol designer.
5. **Scale = technical × compliance** — a viral CSM launch without market feature discipline or sanctions screening is a failure mode even if contracts are correct.
6. **All legal output is analysis for decision-making and counsel briefing**, not a formal opinion or substitute for licensed attorneys in relevant jurisdictions.

---

## 10. Immediate next steps (when you green-light execution)

1. Confirm launch domain order and preferred securities posture shortlist
2. Freeze a **git commit SHA** as the diligence baseline
3. Run verifier health snapshot + collect latest testnet manifests
4. Automated inventories: contracts admin roles, profit-language grep, domain route map
5. Produce Phase 1 Control Surface Inventory within first 72 hours

---

## 11. What is needed from stakeholders (optional but accelerates quality)

- Intended incorporation venue and who will operate mainnet services
- Whether CSM/Civility must ship Day-1 or can follow LazyGiving/Content Funding
- Risk appetite: “minimize legal surface” vs “preserve scout incentive”
- Any existing outside counsel or prior opinions
- Whether reports should be **public-safe** or **internal/privileged-style**

---

## 12. Bottom line

This repo is **MVP-complete and unusually self-aware** on legal risk, but **not mainnet-proven**. The highest-value analysis for a scale launch is not greenfield discovery—it is **independent validation, contradiction hunting (code/copy vs legal strategy), and a decision-grade comparison of securities postures**, paired with a hard-nosed scale/security readiness scorecard for the fold-based architecture, AI monoculture, and multi-domain operator surface.

**Execution choice when ready:**

- Full package: **~3–4 weeks**
- Legal-critical fast track: **~10 business days**

Confirm preferred path, first-to-market domain, and securities posture shortlist to begin Phase 0.

---

## Disclaimer

This plan and any subsequent analysis deliverables are for **strategic diligence and counsel briefing**. They are **not legal advice**, not a formal legal opinion, and not a substitute for licensed attorneys or professional smart-contract auditors in the United States, Canada, or other jurisdictions.
