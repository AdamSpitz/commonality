# Big Test Plan

This is the project-wide test plan. The goal is not just "the automated tests pass" but the
founder's question: **would I feel confident telling the world "come see this, it's ready to be
used"?** Automated tests are necessary but not sufficient — we also want intelligent agents (or
humans) to actually *use* the thing, try to break it, and come back and say "yes, it really works."

The plan has two halves:

  - **Automated tests** — fast/cheap, run constantly, catch regressions. Covered in §1 below.
  - **LLM-driven "manual" validation** — expensive, run occasionally, catches things automated
    tests can't (does it make sense? is it compelling? can a newcomer use it? can a hostile
    reviewer break it?). Covered in §2, with the full role-by-role plan in
    [manual-tests/README.md](./manual-tests/README.md).

## 1. Automated tests

See [developer docs](/workflow/roles/developer.md#feedback-loops-aka-tests) for the exact commands.
Summary of the layers:

| Layer | What it covers | Command | When it runs |
|---|---|---|---|
| Lint | Style/static checks | `npm run lint` | pre-commit |
| Build / typecheck | Everything compiles and type-checks | `npm run build` | pre-commit |
| Fast suite | SDK unit, Hardhat contract tests, integration-test harness unit tests, UI Vitest (no Docker/indexer/Playwright) | `npm run test:fast` | every commit to `dev` |
| Full suite | Fast suite + integration tests + UI Playwright e2e | `npm run test` | merge to `master` (pre-commit hook) |
| Seed regression | Curated implication-decision corpus vs. current seed statements | `npm run test:seed:implication-regression --workspace=fake-data-generation` | after editing seed statements/variants |

The UI e2e suite (`ui/e2e/`) drives real user flows: statement creation/signing, wallet
connection, LazyGiving and Content Funding flows, delegation, browsing, profiles, and negative
paths. New product flows should land an e2e spec here.

### Automated-test gaps to keep filling

The `thorough-tester` role (§2) exists partly to find these. As of this writing, areas worth
auditing for automated coverage:

  - Per-domain UI flows that lack an e2e spec.
  - Smart-contract edge cases: refund correctness, goal boundaries, reentrancy guards, access
    control, ERC-1155 token math.
  - Indexer correctness over chain re-orgs / replays, and indexer/cache drift over time.
  - SDK aggregation of attestations and nudges under different trusted-set configurations.

## 2. LLM-driven "manual" validation

Conventional tests pass but we still need something *intelligent* to look at the system and judge
whether it's compelling, legible, secure, and ready. We're too cheap to hire humans, so we point
LLMs at it instead. The full plan — the roster of validation "roles," what each one must try to
break, and how to run a validation pass — lives in
[manual-tests/README.md](./manual-tests/README.md).

The generic machinery for designing and running such a multi-role validation pass (shared setup,
checklists, per-role reports, the QA-lead synthesizer, the adversarial posture, the
shared-mutable-state warning, what a passing report must contain) is documented in the
`big-test-plan-designer` skill. This directory holds the **project-specific** instantiation.

### Light vs. Full validation passes

  - **Light** (run before any notable change goes out, or when something feels off): demo
    dry-runner + one cold-start newcomer + smart-contract security review of any touched contracts.
  - **Full** (run before a real launch milestone, e.g. testnet → mainnet): the entire roster in
    [manual-tests/README.md](./manual-tests/README.md), ending with the QA-lead synthesis.

## 3. Cross-cutting concerns

These don't belong to a single component; make sure some role in a Full pass owns each one:

  - **Incentive / mechanism-design attacks** — anything with money, voting, reputation, or ranking
    (assurance contracts, support counts, retroactive funding, attester trust). Who profits from
    gaming it? Owned by the smart-contract reviewer + cross-domain integration tester.
  - **Trust & safety / adversarial input** — prompt injection into any LLM-backed service
    (attesters, nudgers, beat agents, explorers); abusive/malicious content. Owned by the Layer-2
    AI-service validator.
  - **Long-term data integrity** — does on-chain + indexed history stay correct over time?
    Re-orgs, indexer drift, migrations. Includes a self-consistency-across-restarts check (do
    things, restart the stack, verify the world still makes sense). Owned by the Layer-2 validator
    + integration tester.
  - **Accessibility & cognitive load** — especially for non-expert, non-crypto users. Owned by the
    cold-start newcomer + end-user personas.
  - **Operations / degradation / chaos** — what happens when a dependency (indexer, IPFS, an AI
    service, an RPC node) is slow, lagging, or down? Graceful degradation vs. silent corruption.
  - **Hostile-analyst narrative review** — a skeptic, not a friendly demo, poking at whether the
    story holds up. Owned by the demo dry-runner (run adversarially) + the movement-site cofounder
    reviews.
