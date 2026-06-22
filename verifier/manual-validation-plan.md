# Manual / LLM-Driven Validation Plan

Use this when conventional tests pass but we still need intelligent judgment: does the system make sense, can real users use it, does it withstand skeptical/adversarial review, and is it ready to show?

This file is the project-specific roster of validation roles. The project-wide checklist is [`testing-plan.md`](./testing-plan.md); the verifier harness that runs both is documented in [`README.md`](./README.md).

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

#### Aligning

Tester goal: find a cause, understand aligned projects, and delegate or directly fund.

- [ ] Cause board concept is legible.
- [ ] Trust filtering is visible and explainable.
- [ ] Alignment attestations are understandable.
- [ ] Direct funding and delegated funding are distinguishable.
- [ ] Spam or low-quality attestations do not dominate the experience.

Canonical failure modes:

- [ ] Trust filtering invisible or confusing.
- [ ] Alignment attestation spam.
- [ ] Cause board terminology drift.
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
- [ ] Links to Civility/Tally/Aligning/LazyGiving support a coherent journey.

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

Use the standing [`ai-service-watchlist.md`](./ai-service-watchlist.md) during these passes so real-world service review covers the same cross-service and service-specific questions each time, and so repeated objective findings can be promoted into verifier checks.

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
- [ ] Project appears in relevant Aligning cause board.
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

These are manual-plan checks that should become conventional automated tests so LLM validation can focus on judgment, not mechanical verification. Only the remaining (unfinished) work is listed here; completed automation is documented by the tests themselves and, at a section level, in [`coverage/testing-plan-items.json`](./coverage/testing-plan-items.json). The per-domain artifact smoke, cross-link crawler, cross-domain persistence e2e, newcomer/docs inventory, and smart-contract security/edge-case suites are all done.

### 11.1 Highest-priority automation

- [ ] **Operations/degradation canaries:** add Playwright or integration tests that deliberately break representative dependencies — IPFS, indexer, platform API, RPC, and wrong-chain state — then assert the UI shows safe errors and blocks misleading writes. Keep this as a small canary set rather than an exhaustive domain × dependency matrix. (There are focused negative-path, unavailable-platform-API, platform API network-failure normalization, malformed platform API response-shape validation, LazyGiving IPFS-metadata-unavailable fallbacks, SDK malformed event-cache response rejection, and wallet/wrong-state tests in UI/SDK/service suites, plus the `operations.degradation-canary` verifier check; deliberate end-to-end dependency-failure coverage across IPFS/indexer/RPC/platform API remains pending.)
- [ ] **AI-service fixture harness:** for every Layer-2 service, add fixture-based tests that start the service, submit curated benign/adversarial inputs, and assert schema validity, publication shape, and downstream SDK/UI discoverability without requiring live model calls in the fast or default full suite. (Individual service tests already cover many helpers/app routes/evaluators for beat-agent, bridge-creator, content-attester, implication-attester/finder, explorer-curator, and platform-api-service; the `ai-fixtures.deterministic` verifier check exercises several. A uniform cross-service fixture harness and downstream discoverability checks remain pending.)

### 11.2 Domain-flow automation candidates

Remaining UI-state/affordance gaps per domain (Commonality is done — covered by `CrossDomainSmoke`):

- [ ] **LazyGiving:** automate deadline/goal boundary UI states, refund/withdraw affordance visibility, wallet wrong-chain/disconnected states, and metadata consistency between browse/detail views. (Hardhat/integration/UI tests cover many deadline, refund, withdraw, wallet, browse/detail, metadata-unavailable fallbacks, and fold/query cases; LazyGiving landing actions and links to assurance/retroactive/delegation docs are covered in `npm run test:vitest --workspace=ui -- LandingPage`; keep this item focused on remaining UI-state matrix gaps rather than duplicating existing contract/integration coverage.)
- [ ] **Aligning:** automate cause-board filtering, trust-filter toggles, alignment-attestation visibility, direct-vs-delegated funding labels, and spam/duplicate attestation display limits. (Funding-portal SDK/integration/UI tests cover alignment attestations, portal queries, metrics, leaderboards, and several component states; remaining gaps are mostly UI interaction matrices and spam/duplicate display behavior.)
- [ ] **Tally:** automate duplicate-statement warning behavior, direct-vs-implied support display, implication-link navigation, raw CID/address explanation affordances, and profile support history. (Conceptspace/Tally UI and e2e tests cover statement creation/browse/profile/support/implication pieces; keep this item for remaining end-user regression flows and explanatory-affordance gaps.)
- [ ] **Content Funding:** automate platform identity mismatch cases, claim takeover/control permissions, unsupported content/platform errors, escrow state transitions, and withdrawal visibility. (Hardhat, SDK, UI component, and Playwright flow tests cover channel verification, claim flows, canonicalization, unsupported-platform cases, content-funding basics, safe platform API malformed-response handling, and explicit negative content-attestation display; broader mismatch/takeover/escrow/withdrawal matrices remain pending.)
- [ ] **Civility:** automate that content criteria pages/sections exist, content-attester results are shown where expected, and Civility routes to/from Content Funding and Tally resolve correctly. (Route/link coverage partly automated in `npm run test:vitest --workspace=ui -- CrossDomainSmoke`; Civility criteria/filter/nomination/statement placeholder pages are covered in `npm run test:vitest --workspace=ui -- ContentPages`; positive content-attester result placement on content rows is covered in `npm run test:vitest --workspace=ui -- ChannelPage`; the Civility about page now has tested links to Content Funding, Tally, and Common Sense Majority.)
- [ ] **CSM:** automate bridge-statement publication visibility on Tally, signing-to-movement-count propagation if implemented, and CSM links to Civility/Tally/Aligning/LazyGiving. (Cross-domain link coverage automated in `npm run test:vitest --workspace=ui -- CrossDomainSmoke`; CSM mediator configuration and Tally nudger opt-in deep-link construction are covered in `npm run test:vitest --workspace=ui -- csmMediatorNudger`; CSM product signpost links to Civility/Tally/Aligning/LazyGiving and published bridge-anchor-to-Tally statement link construction are covered in `npm run test:vitest --workspace=ui -- CsmPages`; publication/count propagation still pending.)
- [ ] **Conceptspace:** automate discoverability of API/trust-model docs, trusted-attester/nudger configuration UI, and explanatory affordances for CIDs/addresses. (Docs/API/trust-model inventory partly automated in `npm run check:docs-inventory`; Conceptspace landing-page links to developer/API/trust docs are covered in `npm run test:vitest --workspace=ui -- LandingPage`; statement CID fallback explanation and trusted attester/nudger settings are covered by UI Vitest in `npm run test:fast`; broader UI affordance checks still pending.)

### 11.3 AI-output automation candidates

These cannot prove semantic quality, but they can cheaply catch regressions before an LLM reviews substance. Keep these deterministic for routine runs; live-model evaluations belong in explicit validation passes.

- [ ] Snapshot/schema tests for attester outputs on curated corpora. (Individual attester/evaluator tests exist for several services; curated-corpus snapshot coverage remains pending.)
- [ ] Prompt-injection fixture tests that assert services do not emit privileged instructions, malformed attestations, or untrusted publication actions. (Beat-agent and content-attester have prompt-wrapping/forged-delimiter helper coverage; broader cross-service adversarial fixture tests remain pending.)
- [ ] Finder budget/flooding tests with large or adversarial input queues. (Finder-core and service-specific finder tests cover normal state/runner/candidate behavior; adversarial queue-size/flooding budgets remain pending.)
- [ ] Nudger manipulation guardrail tests using banned-pattern fixtures and human-reviewed snapshots.
- [ ] Platform identity mapping fixtures for ambiguous, renamed, or conflicting social accounts. (Platform API, Twitter utility, channel-display, and canonicalization tests cover some identity/error cases; ambiguous/renamed/conflicting-account fixture matrices remain pending.)

### 11.4 Keep manual/LLM even after automation

Do not try to automate these away completely:

- [ ] Movement-site persuasiveness and hostile-analyst narrative review.
- [ ] Cold-start user confusion and cognitive load.
- [ ] Whether political/content judgments feel fair rather than merely schema-valid.
- [ ] Whether bridges are substantively non-strawman and signable by both sides.
- [ ] Final QA-lead synthesis and launch recommendation.
