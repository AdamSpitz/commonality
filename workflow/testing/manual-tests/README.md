# Manual / LLM-Driven Validation Plan

Use this when conventional tests pass but we still need intelligent judgment: does the system make sense, can real users use it, does it withstand skeptical/adversarial review, and is it ready to show?

This file is the project-specific roster of validation roles. The project-wide checklist is [`../README.md`](../README.md).

## 0. Runbook for a validation pass

### 0.1 Prepare the pass

- [ ] Choose pass size: Light, release-candidate, or Full.
- [ ] Create a per-pass directory under [`workflow/reviews/`](/workflow/reviews/).
- [ ] Create `checklist.md` in that directory with one row per selected role.
- [ ] Include these checklist columns:
  - [ ] Role.
  - [ ] Scope/domain.
  - [ ] Environment.
  - [ ] State class: read-only / mutating disposable / dirty-world longitudinal.
  - [ ] Report file path.
  - [ ] Done?
- [ ] Stand up a fresh seeded local stack when needed:
  - [ ] Read [`workflow/local-development.md`](/workflow/local-development.md).
  - [ ] `./scripts/data.sh --wipe` unless preserving state is intentional.
  - [ ] `./scripts/services.sh --start`.
  - [ ] `./scripts/data.sh --seed=demo`.

### 0.2 Manage shared state

- [ ] Read-only roles may share the seeded demo environment.
- [ ] Mutating roles need a fresh seeded world or snapshot/restore.
- [ ] Dirty-world / longitudinal roles deliberately mutate over time and should run near the end.
- [ ] After mutations, include at least one restart self-consistency check.
- [ ] If a role observes surprising behavior, record whether the environment may have been polluted by an earlier role.

### 0.3 Run each role

- [ ] Use a fresh LLM per role.
- [ ] Give the role this file, the relevant role docs, and the exact scope.
- [ ] Make the role adversarial by default: try to break it, do not rubber-stamp.
- [ ] Require a timestamped report in the pass directory.
- [ ] Check the role off in `checklist.md` only after the report exists.

### 0.4 Required report template

Each report must use at least this structure:

```md
# <Role> report — <date/time> — <environment>

## Scope actually covered
## Evidence I used the system / inspected the code or docs
## Attempts to break it
## Highest-severity finding
## Other findings
## Where I used insider knowledge or gave benefit of the doubt
## Confidence: low / medium / high
## Recommended follow-up tests or automation
```

### 0.5 Finish the pass

- [ ] Run the QA-lead role last.
- [ ] QA lead confirms every selected checklist row is done or explicitly skipped.
- [ ] QA lead reads all reports and writes the single launch-confidence answer.

### 0.6 Automation triage rule

Before spending LLM time on a role, ask: **is this checking objective behavior that code can check?** If yes, automate it first and leave the LLM role to judge the subjective parts.

Automation should still be cost-aware:

- Prefer the cheapest layer that proves the behavior; do not default to Playwright just because the manual checklist was phrased as a user action.
- If a full-stack flow already exists, prefer adding a small assertion there over creating another slow scenario.
- Keep restart/persistence and dependency-failure tests representative. A few canaries are valuable; an exhaustive cross-product of every domain × every dependency failure is not.
- If the behavior depends on LLM quality, use fixture/golden/schema checks for routine automation and reserve live-model judgment for explicit validation passes.

Good candidates for conventional tests:

- [ ] Link resolves / route renders / deep link survives reload.
- [ ] Button or form flow produces the expected chain/indexer/UI state.
- [ ] Error state appears when a dependency is down or malformed.
- [ ] Contract boundary condition, access-control rule, or accounting invariant.
- [ ] Service accepts fixtures and emits well-formed output.
- [ ] Documentation file exists and references required concepts.

Keep as LLM/human validation:

- [ ] Is the movement thesis compelling?
- [ ] Is a first-time user confused?
- [ ] Does copy feel partisan, manipulative, or overpromising?
- [ ] Are AI-generated bridges/content evaluations substantively fair?
- [ ] Can a skeptical outsider construct a coherent narrative?

## 1. Per-domain validation roster

Run these for each of the eight domains in [`specs/product/ui-domains.md`](/specs/product/ui-domains.md).

### 1.1 Checks to run for every domain

- [ ] **Automated-suite gap finder:** `thorough-tester` scoped to the domain.
  - [ ] Design a test plan without looking at existing tests.
  - [ ] Diff against actual tests.
  - [ ] Report missing automated coverage.
- [ ] **Real UI user:** `intelligent-tester` + `real-ui-user` scoped to the domain.
  - [ ] Use the site like a real user.
  - [ ] Exercise the domain's core actions.
  - [ ] Report bugs, confusing copy, and dead ends.
- [ ] **Cross-link check.**
  - [ ] Links to other domains resolve.
  - [ ] Docs links resolve.
  - [ ] External links go where intended.
- [ ] **Deployable artifact check.**
  - [ ] Use stable local IPFS-domain URL, not only Vite dev server.
  - [ ] Reload works.
  - [ ] Deep links work.
  - [ ] Branding/nav/footer match intended site.

### 1.2 Domain-specific checklists

#### Commonality

Tester goal: decide whether the movement thesis is legible and points to concrete product surfaces.

- [ ] Public-goods thesis is understandable.
- [ ] Visitor can tell what concrete products exist.
- [ ] There is a clear next action.
- [ ] Links to product sites do not feel like a maze.
- [ ] Copy survives a skeptical first scroll.

Canonical failure modes:

- [ ] Vague umbrella story.
- [ ] No clear next action.
- [ ] Product boundaries contradict [`ui-domains.md`](/specs/product/ui-domains.md).
- [ ] Movement copy sounds compelling only to insiders.

#### LazyGiving

Tester goal: create, browse, fund, refund, and/or withdraw from an assurance contract.

- [ ] Project creation is understandable.
- [ ] Funding flow makes wallet state and risk clear.
- [ ] Deadline and goal semantics are clear.
- [ ] Refund flow is discoverable when appropriate.
- [ ] Withdraw flow is discoverable when appropriate.
- [ ] Project metadata remains readable across list/detail views.

Canonical failure modes:

- [ ] Confusing deadlines/goals.
- [ ] Unsafe or misleading wallet states.
- [ ] Bad refund/withdraw affordances.
- [ ] Project metadata unreadable or inconsistent.

#### Alignment

Tester goal: find a cause, understand aligned projects, and delegate or directly fund.

- [ ] Cause/portal concept is legible.
- [ ] Trust filtering is visible and explainable.
- [ ] Alignment attestations are understandable.
- [ ] Direct funding and delegated funding are distinguishable.
- [ ] Spam or low-quality attestations do not dominate the experience.

Canonical failure modes:

- [ ] Trust filtering invisible or confusing.
- [ ] Alignment attestation spam.
- [ ] Portal/board terminology drift.
- [ ] User cannot tell why a project appears in a cause view.

#### Tally

Tester goal: find, write, sign, and inspect statements; understand direct vs implied support.

- [ ] Statement creation discourages duplicates.
- [ ] Signing flow is clear.
- [ ] Direct support is distinguishable from implication-derived support.
- [ ] Implication links are not misleading.
- [ ] Profile/support history makes sense.

Canonical failure modes:

- [ ] Support counts look magical.
- [ ] Implication links imply more certainty than they should.
- [ ] Statement creation invites duplicates.
- [ ] Raw CIDs/addresses confuse ordinary users.

#### Content Funding

Tester goal: creator verifies a channel, supporter funds content, creator understands withdrawal.

- [ ] Creator identity verification is clear.
- [ ] Channel claim/control/takeover behavior is safe.
- [ ] Supporter can identify the content being funded.
- [ ] Unsupported content/platform states are explained.
- [ ] Escrow and withdrawal states are clear.

Canonical failure modes:

- [ ] Platform identity mismatch.
- [ ] Claim takeover bugs.
- [ ] Unsupported content confusion.
- [ ] Escrow/withdrawal ambiguity.

#### Civility

Tester goal: evaluate whether noninflammatory-content framing is credible and useful.

- [ ] Criteria for noninflammatory content are visible.
- [ ] Scoring/review does not hide political bias.
- [ ] Content Funding inheritance is understandable.
- [ ] Tally/CSM links support the narrative without confusing the product boundary.

Canonical failure modes:

- [ ] Political bias hidden in scoring.
- [ ] Content criteria unclear.
- [ ] Inflammatory content sneaks through.
- [ ] Site feels like disguised partisanship.

#### Common Sense Majority (CSM)

Tester goal: skeptical visitor evaluates the quiet-middle story and bridge-building workflow.

- [ ] Quiet-middle thesis is legible.
- [ ] Visitor can tell what signing/funding/action means.
- [ ] Bridge statements are fair, not strawmen.
- [ ] Links to Civility/Tally/Alignment/LazyGiving support a coherent journey.

Canonical failure modes:

- [ ] Feels partisan despite claims.
- [ ] Bridge statements are strawmen.
- [ ] No credible path from signing to action.
- [ ] Landing copy would fail with a hostile reader.

#### Conceptspace

Tester goal: developer/advanced user inspects substrate, APIs, trust model, and primitives.

- [ ] Statement/implication/trust model is discoverable.
- [ ] API/developer docs are findable.
- [ ] Advanced UI exposes raw data without overwhelming users.
- [ ] Trusted attesters/nudgers are explainable and configurable.

Canonical failure modes:

- [ ] Too much product jargon.
- [ ] API/trust model undiscoverable.
- [ ] Raw CIDs/addresses without explanation.
- [ ] Developer-facing surface does not help developers build.

## 2. Persona validation roster

Use `real-ui-user` plus [`workflow/roles/end-user.md`](/workflow/roles/end-user.md). Start cold from the public landing page. **When stuck, stop and report; do not rescue yourself with insider knowledge.**

### 2.1 Personas to run

- [ ] Crypto-native person who wants to fund a project.
- [ ] Civic-engagement person who has never touched a wallet.
- [ ] Content creator wondering whether they can get funded here.
- [ ] Founder evaluating whether they could build a vertical on this substrate.
- [ ] Skeptic from the political opposite of CSM's framing.
- [ ] First-time visitor with no context at all.

### 2.2 Things every persona should report

- [ ] First thing they thought the site was for.
- [ ] First point of confusion.
- [ ] Whether they found a concrete action.
- [ ] Whether wallet/blockchain concepts blocked them.
- [ ] Whether the next step felt safe.
- [ ] What they would tell a friend the product does.

## 3. Newcomer / cold-start validation roster

### 3.1 Developer-side newcomer

Role: `demanding-newcomer`.

- [ ] Start from top-level README only.
- [ ] Follow docs without browsing random specs.
- [ ] Get local stack running.
- [ ] Run appropriate tests.
- [ ] Stop and report at the first blocking ambiguity or broken command.

Failure modes:

- [ ] Setup step silently fails.
- [ ] Docs route the reader to stale or irrelevant material.
- [ ] Required environment variables are missing or unclear.
- [ ] New developer cannot tell which package owns a feature.

### 3.2 User-side newcomer

Role: `demanding-newcomer`, but with public sites and end-user docs only.

- [ ] Start from a public landing page.
- [ ] Do not read internal specs.
- [ ] Try to understand the product and take one action.
- [ ] Stop and report when stuck.

Failure modes:

- [ ] Onboarding assumes insider knowledge.
- [ ] User cannot tell which site is for them.
- [ ] First few minutes leave user unsure what to do next.

## 4. Documentation validation roster

Role: `documenter`.

- [ ] Project README routes roles correctly.
- [ ] Developer getting-started is accurate.
- [ ] End-user docs exist for each public domain that needs them.
- [ ] Trusted attesters and nudgers are findable and explained.
- [ ] Conceptspace API/developer docs are adequate.
- [ ] Each AI service in [`ai-assistance.md`](/specs/product/ai-assistance.md) has a useful README or equivalent.
- [ ] Trust model docs are discoverable, especially CSM trust model docs.
- [ ] Stale docs are flagged or removed.

## 5. AI-service validation roster

### 5.1 Layer-2 service checks

For each service in [`ai-assistance.md §Layer 2`](/specs/product/ai-assistance.md), run `intelligent-tester` + `thorough-tester`.

Services to cover:

- [ ] Implication attester.
- [ ] Content attester.
- [ ] Implication finder.
- [ ] Content finder.
- [ ] Implication-graph nudger.
- [ ] Bridge-creator nudger.
- [ ] Explorer curator.
- [ ] Beat agent.
- [ ] Platform API service.

Checks for each service:

- [ ] Starts and stays up.
- [ ] Produces sensible outputs on a curated corpus.
- [ ] Handles adversarial/prompt-injection inputs.
- [ ] Publishes well-formed on-chain/IPFS outputs when applicable.
- [ ] Outputs are discoverable by the SDK/UI.
- [ ] Trust-config flow lets users swap or distrust the service.
- [ ] Downstream behavior is safe when the service produces garbage.

Canonical failure modes:

- [ ] Attesters publish misleading attestations that corrupt support counts/graphs.
- [ ] Attesters are vulnerable to prompt injection in claims/content.
- [ ] Finders flood queues or waste attester budget.
- [ ] Nudgers become annoying or manipulative.
- [ ] Platform/context services corrupt canonical identity mapping.
- [ ] Validator rubber-stamps because both validator and service are LLM-shaped.

### 5.2 Layer-3 skill checks

For each user-facing skill in [`ai-assistance.md §Layer 3`](/specs/product/ai-assistance.md), if implemented:

- [ ] Load it into a fresh assistant.
- [ ] Use it for its intended end-user task.
- [ ] Check that it points at correct docs/data.
- [ ] Check that it produces actionable guidance.
- [ ] Try adversarial or confused-user prompts.

Candidate skill areas:

- [ ] Onboarding.
- [ ] Delegation advisor.
- [ ] Funding-strategy advisor.
- [ ] Project-creation assistant.
- [ ] Analytics/insights.
- [ ] Attester/nudger trust configuration.

## 6. Cross-domain integration / dirty-world roster

Role: `intelligent-tester`. State class: mutating or dirty-world longitudinal.

### 6.1 Required flows

- [ ] LazyGiving contract anchors against a Conceptspace statement.
- [ ] Alignment attestation is created for that project/statement.
- [ ] Project appears in relevant Alignment cause board/portal.
- [ ] Sign a statement on Tally.
- [ ] Implication-graph nudger suggests a related statement.
- [ ] Signing the related statement feeds support counts elsewhere.
- [ ] Deposit a delegatable note.
- [ ] Delegate it.
- [ ] Spend through delegated authority on a project.
- [ ] Revoke/reclaim behavior remains coherent.
- [ ] Content contract on Content Funding is evaluated by content attester.
- [ ] Result is visible from Civility/noninflammatory surfaces.
- [ ] CSM bridge creator publishes a new statement.
- [ ] Statement appears on Tally.
- [ ] Signing it feeds movement counts on CSM.

### 6.2 Restart self-consistency checks

After the above mutations:

- [ ] Stop and restart services.
- [ ] Balances still agree.
- [ ] Support counts still agree.
- [ ] Attestations are still visible and not duplicated.
- [ ] Project status is still correct.
- [ ] Creator dashboards still agree.
- [ ] No stale indexer/cache state misleads the UI.

## 7. Smart-contract security validation roster

Run the built-in `/security-review` slash command against on-chain code (`hardhat/`, attester-core on-chain bits, assurance contracts, ERC-1155 token logic). Review the prior audit at [`workflow/reviews/smart-contract-audit-2026-05-07.md`](/workflow/reviews/smart-contract-audit-2026-05-07.md).

Checklist:

- [ ] Reentrancy.
- [ ] Access control.
- [ ] Arithmetic and rounding.
- [ ] Upgradeability / initialization, if applicable.
- [ ] Gas griefing and denial of service.
- [ ] Frontrunning / ordering attacks.
- [ ] Refund correctness.
- [ ] Goal/deadline boundary behavior.
- [ ] ERC-1155 token accounting.
- [ ] Secondary-market settlement.
- [ ] Delegation authority and revocation.

## 8. Demo dry-run / whole-system legibility roster

Role: `cofounder` hat. Run adversarially, as a skeptic.

- [ ] Start from the public entry point most likely to be shown.
- [ ] Explain the problem in plain language.
- [ ] Explain the approach in plain language.
- [ ] Show a working end-to-end path in the live system.
- [ ] Explain how the eight domains relate without making it feel like a maze.
- [ ] Identify where the narrative breaks, if it breaks.
- [ ] Decide whether a founder could confidently demo this to an outsider.

Failure modes:

- [ ] Component tests pass but the whole story is incoherent.
- [ ] Demo requires insider explanation at every step.
- [ ] The strongest product surface is buried.
- [ ] Movement claims overpromise relative to working software.

## 9. Operations / chaos validation roster

Role: `intelligent-tester` + developer docs.

### 9.1 Dependency degradation scenarios

- [ ] IPFS gateway unavailable.
- [ ] IPFS returns malformed JSON.
- [ ] Ponder/indexer is lagging.
- [ ] Ponder/indexer is empty.
- [ ] Platform API is down.
- [ ] RPC provider is slow.
- [ ] RPC provider fails.
- [ ] AI service returns malformed output.
- [ ] AI service returns hostile/prompt-injected output.
- [ ] Wallet connected to wrong chain.
- [ ] Local chain reset with stale indexer data.

### 9.2 What to verify in each scenario

- [ ] UI explains the situation.
- [ ] Retries work or fail clearly.
- [ ] Write actions are blocked when state is unsafe.
- [ ] No silent corruption occurs.
- [ ] Logs make diagnosis possible.
- [ ] Recovery path is documented.

## 10. QA lead synthesis — run last

Role: `project-wide-reviewer`.

### 10.1 Inputs

- [ ] `checklist.md` for the pass.
- [ ] Every individual role report.
- [ ] Automated test results.
- [ ] List of skipped environments/roles.

### 10.2 Required output

- [ ] Launch recommendation: **ship / ship with caveats / do not ship**.
- [ ] Top 5 blocking or confidence-limiting findings.
- [ ] Coverage matrix by domain.
- [ ] Coverage matrix by subsystem.
- [ ] Coverage matrix by environment.
- [ ] Coverage matrix by role.
- [ ] Issues that need automated regression tests before being considered fixed.
- [ ] Explicit list of things not tested.
- [ ] Final confidence level and reasoning.

## 11. Automation backlog extracted from this manual plan

These are manual-plan checks that should become conventional automated tests so LLM validation can focus on judgment, not mechanical verification.

### 11.1 Highest-priority automation

- [x] **Per-domain deployable artifact smoke:** for all eight domains, add Playwright coverage against `npm run build:ipfs:domains` served through the local gateway. (`npm run test:e2e --workspace=ui -- --project=ipfs-domain-artifacts` builds IPFS domain artifacts, serves `ui/dist` through `ui/scripts/serve-ipfs-domains-smoke.mjs`, renders each domain home page, and reloads representative deep links; included in full `npm run ui:test` / `npm test`.)
  - [x] Home page renders with expected domain branding.
  - [x] Primary nav/footer links resolve.
  - [x] Representative deep links reload successfully.
  - [ ] Wrong-domain routes either work intentionally or fail with a clear not-found state.
- [x] **Cross-link crawler for UI/docs:** add a deterministic crawler that extracts internal UI links, docs links, and configured external links from domain manifests/pages. (`npm run test:vitest --workspace=ui -- CrossLinkCrawler` renders sampled routes for every public domain, checks console-error-free route renders, validates rendered internal app links against public route tables, verifies public-doc absolute app links, and allowlists rendered external links; included in `npm run test:fast` via `ui:test:vitest`.)
  - [x] Internal app links render without console errors. (`CrossLinkCrawler` renders every public domain route sample and checks rendered internal links resolve in a public domain route table.)
  - [x] Docs links point to existing public docs. (`npm run test:vitest --workspace=ui -- DocsPage` plus `npm run check:docs-inventory` crawls every public end-user doc, included in `npm run test:fast`)
  - [x] External links match an allowlist or return successful HTTP status in a scheduled/non-precommit job. (`ExternalLinksAllowlist` covers public docs/navigation/landing pages; `CrossLinkCrawler` extends allowlist checks to rendered route samples. Live HTTP status checks remain intentionally outside precommit.)
- [x] **Cross-domain persistence e2e:** automate the core dirty-world flow that creates or seeds a project, anchors it to a statement, creates/loads an alignment attestation, verifies it appears in the relevant cause board/portal, restarts services, then verifies indexed UI state still agrees. (`npm run test:e2e --workspace=ui -- --project=tally cross-domain-persistence.spec.ts` creates a statement, LazyGiving project, and alignment attestation through SDK calls, verifies the portal and project detail UI, restarts the indexer, then verifies both UIs still agree; included in full `npm run ui:test` / `npm test`.)
- [ ] **Operations/degradation canaries:** add Playwright or integration tests that deliberately break representative dependencies — IPFS, indexer, platform API, RPC, and wrong-chain state — then assert the UI shows safe errors and blocks misleading writes. Keep this as a small canary set rather than an exhaustive domain × dependency matrix. (There are focused negative-path, unavailable-platform-API, and wallet/wrong-state tests in UI/SDK/service suites; deliberate dependency-failure coverage across IPFS/indexer/RPC/platform API remains pending.)
- [ ] **AI-service fixture harness:** for every Layer-2 service, add fixture-based tests that start the service, submit curated benign/adversarial inputs, and assert schema validity, publication shape, and downstream SDK/UI discoverability without requiring live model calls in the fast or default full suite. (Individual service tests already cover many helpers/app routes/evaluators for beat-agent, bridge-creator, content-attester, implication-attester/finder, explorer-curator, and platform-api-service; a uniform cross-service fixture harness and downstream discoverability checks remain pending.)

### 11.2 Domain-flow automation candidates

- [ ] **LazyGiving:** automate deadline/goal boundary UI states, refund/withdraw affordance visibility, wallet wrong-chain/disconnected states, and metadata consistency between browse/detail views. (Hardhat/integration/UI tests cover many deadline, refund, withdraw, wallet, browse/detail, and fold/query cases; LazyGiving landing actions and links to assurance/retroactive/delegation docs are covered in `npm run test:vitest --workspace=ui -- LandingPage`; keep this item focused on remaining UI-state matrix gaps rather than duplicating existing contract/integration coverage.)
- [ ] **Alignment:** automate cause-board filtering, trust-filter toggles, alignment-attestation visibility, direct-vs-delegated funding labels, and spam/duplicate attestation display limits. (Funding-portal SDK/integration/UI tests cover alignment attestations, portal queries, metrics, leaderboards, and several component states; remaining gaps are mostly UI interaction matrices and spam/duplicate display behavior.)
- [ ] **Tally:** automate duplicate-statement warning behavior, direct-vs-implied support display, implication-link navigation, raw CID/address explanation affordances, and profile support history. (Conceptspace/Tally UI and e2e tests cover statement creation/browse/profile/support/implication pieces; keep this item for remaining end-user regression flows and explanatory-affordance gaps.)
- [ ] **Content Funding:** automate platform identity mismatch cases, claim takeover/control permissions, unsupported content/platform errors, escrow state transitions, and withdrawal visibility. (Hardhat, SDK, UI component, and Playwright flow tests cover channel verification, claim flows, canonicalization, unsupported-platform cases, and content-funding basics; broader mismatch/takeover/escrow/withdrawal matrices remain pending.)
- [ ] **Civility:** automate that content criteria pages/sections exist, content-attester results are shown where expected, and Civility routes to/from Content Funding and Tally resolve correctly. (Route/link coverage partly automated in `npm run test:vitest --workspace=ui -- CrossDomainSmoke`; Civility criteria/filter/nomination/statement placeholder pages are covered in `npm run test:vitest --workspace=ui -- ContentPages`; content-attester result placement still pending.)
- [ ] **CSM:** automate bridge-statement publication visibility on Tally, signing-to-movement-count propagation if implemented, and CSM links to Civility/Tally/Alignment/LazyGiving. (Cross-domain link coverage automated in `npm run test:vitest --workspace=ui -- CrossDomainSmoke`; CSM mediator configuration and Tally nudger opt-in deep-link construction are covered in `npm run test:vitest --workspace=ui -- csmMediatorNudger`; publication/count propagation still pending.)
- [ ] **Conceptspace:** automate discoverability of API/trust-model docs, trusted-attester/nudger configuration UI, and explanatory affordances for CIDs/addresses. (Docs/API/trust-model inventory partly automated in `npm run check:docs-inventory`; Conceptspace landing-page links to developer/API/trust docs are covered in `npm run test:vitest --workspace=ui -- LandingPage`; statement CID fallback explanation and trusted attester/nudger settings are covered by UI Vitest in `npm run test:fast`; broader UI affordance checks still pending.)
- [x] **Commonality:** automate that each product surface linked from the movement landing page resolves and that no landing-page CTA points to a missing or stale route. (`npm run test:vitest --workspace=ui -- CrossDomainSmoke`)

### 11.3 Newcomer/docs automation candidates

- [x] **Docs link and role-routing tests:** extend docs-link checks to assert README role links, developer setup links, end-user docs links, and trust-model links exist. (`npm run check:docs-inventory`)
- [x] **Docs freshness smoke:** add a script that checks referenced package paths, commands, and env-example files in developer docs still exist. (`npm run check:docs-inventory`)
- [x] **Required-doc inventory:** add a test that every public domain has a discoverable docs home or an explicit documented reason it does not. (`npm run check:docs-inventory`)
- [x] **AI-service README inventory:** add a test that each service named in `specs/product/ai-assistance.md` has a README or equivalent docs file. (`npm run check:docs-inventory`)

### 11.4 Smart-contract automation candidates

- [ ] Add property/invariant tests for assurance-contract accounting: contributions, refunds, withdrawals, token balances, and exact goal/deadline boundaries. (Exact threshold/deadline boundary cases covered in `npm run hardhat:test`; broader property/invariant coverage still pending.)
- [ ] Add negative tests for access control and delegation authority/revocation. (Some access-control and delegation negative cases exist in Hardhat and integration tests; audit for remaining contract-specific authority/revocation gaps before adding new tests.)
- [ ] Add reentrancy and malicious-receiver tests where contracts transfer value or tokens.
- [ ] Add gas/griefing regression tests for loops over contributors, attestations, delegation chains, or orders.
- [ ] Add secondary-market settlement edge-case tests. (Basic create/fill/cancel sale listing and buy order flows are covered in integration tests and SDK folds; settlement edge cases beyond those happy/near-happy paths remain pending.)

### 11.5 AI-output automation candidates

These cannot prove semantic quality, but they can cheaply catch regressions before an LLM reviews substance. Keep these deterministic for routine runs; live-model evaluations belong in explicit validation passes.

- [ ] Snapshot/schema tests for attester outputs on curated corpora. (Individual attester/evaluator tests exist for several services; curated-corpus snapshot coverage remains pending.)
- [ ] Prompt-injection fixture tests that assert services do not emit privileged instructions, malformed attestations, or untrusted publication actions. (Beat-agent has prompt-wrapping/forged-delimiter helper coverage; cross-service adversarial fixture tests remain pending.)
- [ ] Finder budget/flooding tests with large or adversarial input queues. (Finder-core and service-specific finder tests cover normal state/runner/candidate behavior; adversarial queue-size/flooding budgets remain pending.)
- [ ] Nudger manipulation guardrail tests using banned-pattern fixtures and human-reviewed snapshots.
- [ ] Platform identity mapping fixtures for ambiguous, renamed, or conflicting social accounts. (Platform API, Twitter utility, channel-display, and canonicalization tests cover some identity/error cases; ambiguous/renamed/conflicting-account fixture matrices remain pending.)

### 11.6 Keep manual/LLM even after automation

Do not try to automate these away completely:

- [ ] Movement-site persuasiveness and hostile-analyst narrative review.
- [ ] Cold-start user confusion and cognitive load.
- [ ] Whether political/content judgments feel fair rather than merely schema-valid.
- [ ] Whether bridges are substantively non-strawman and signable by both sides.
- [ ] Final QA-lead synthesis and launch recommendation.
