# Verifier design & philosophy

The *why* behind this workspace. For how to **run** it, see [`README.md`](./README.md); for what's **left to build**, see [`PLAN.md`](./PLAN.md). Per-check behavior is documented in the `*.def.json` files under [`checks/`](./checks/), which are the source of truth.

## The overarching goal

I want this verifier workspace to grow into something that could conceivably start giving me confidence that this whole huge project actually works.

That doesn't just mean "basic functionality tests pass" — it also means "docs make sense", "landing pages are compelling", "performance is acceptable", "the UI offers a clear way to complete every workflow we want to support", and meta-stuff like "we're actively looking for ways to improve this verification system" and "we're watching for tasks currently done by LLM-based checks and looking for chances to turn them into conventional automated tests."

If this project were a startup and I were the founder, I'd have employees — not just to write the code (the main thing I've used LLMs for so far) but to test it and reassure me that the thing actually works. Automated tests are fine and good and we have lots, but the founder would still insist on humans actually using the software, thinking it through, and so on.

I don't want to hire real humans; I want to use LLMs for those roles. (Not necessarily as long-running autonomous agents — just: define the "employees'" roles and use LLMs to carry them out.)

So the question that drives every check is: **If I were the founder, what roles would I want filled by intelligent employees such that, when they tell me "yup, it works, it's doing what it's supposed to," I'd feel confident telling the world "come see this, it's ready"?**

### How much intelligence and briefing the LLM-using checks need

The "strongest" (most expensive) version of an LLM-using check is: get a frontier model up to speed (read a lot of the docs and specs, including founder-level ones), then point it at one page or use case or aspect and let it judge. If we did *every* check that way, the "test suite" would be a big list of project aspects (each site feature by feature, scalability, doc coherence, robustness, …), each item read as "brief yourself to a founder-level understanding, then look at X." That's like having an army of cofounders running all my tests.

That's probably too expensive to do uniformly, so in practice we made *some* checks **exploration-mode LLM leaves**: rather than stuffing a hand-picked file bundle into the prompt, we tell the leaf its role and purpose, point it at the top-level [README.md](/README.md), and give it read-only repo access (`pi --tools read,grep,find,ls`) so it briefs itself from the docs hierarchy the way a person in that role would — then judges.

This makes the verifier a **forcing function for documentation quality**: if a leaf can't find what it needs starting from the README, that's a reportable docs-organization gap (a `docs-gap` finding), not a prompt to tweak. Each such leaf writes a `files-read.md` artifact recording what it read, so the reading trail is auditable. The shared machinery lives in `checks/lib/llm-judgment.mjs` (`explorationBriefing`, the `explore` flag on `getLlmResponse`, `writeFilesReadArtifact`); a leaf opts in with `explore: true`. Mechanical, page-local leaves (e.g. `review.page-copy-sense`) deliberately stay sandboxed (`--no-tools`) and cheap.

**When touching an LLM check, first decide which kind it is** — the two kinds get opposite treatment:

- **Exploration-mode "cofounder-eye" checks** ("get up to speed on the *whole* project, then judge this one aspect"). The value here is broad context and judgment, not instruction-following — an army of LLM helpers who understand the overarching goals as well as the founder does and notice things a narrow reviewer would wave through. Do **not** narrow these to a hand-picked file bundle, and do **not** `memoize: true` them: they must keep full-project context and re-run fresh, or they stop doing their job.
- **Mechanical, page-local checks** (copy lints, link/nav reachability, folder-name drift — the stuff `meta.llm-to-automated-candidates` flags as promotable). Two-stage refactors, deterministic extraction, narrowing, and `memoize: true` are all fine (and encouraged) here.

## Concern facets, not confidence tiers

The dashboard is organized by **concern facet**, not by confidence tier. There are four gating facets, each answering one kind of question and each independently watchable:

- `facet.functionality` — does it work? (lint/build/tests, deployable artifacts, local stack, degradation, testnet)
- `facet.docs` — do the docs cohere?
- `facet.product` — is it compelling and usable?
- `facet.security` — is the on-chain surface sound?

`root` ("is this ready to deploy?") rolls up all four plus `meta.verifier-health`; any red facet makes `root` red. The point of faceting is **isolation**: while working on functionality you watch `facet.functionality` (or the fast `validation.pr` loop), and broken docs/product/security live in *other* facets that can't turn it red.

The old confidence-tier supervisors (`validation.light-confidence`, `validation.release-candidate`, `validation.full-launch`) were retired. Their tier vocabulary survives only as **readiness planning labels** (`targetConfidence` in `coverage/testing-plan-items.json`, `requiredPasses` in `coverage/validation-roster.json`) answering "before which milestone must this gap be fixed," independently of dashboard topology.

### Gating is derived from findings, not the model's self-report

The standing LLM-judgment leaves (`review.docs-coherence`, `review.landing-compelling`, the `review.workflow-clarity*` targets) emit only `pass`/`uncertain` for their *own opinion*. The harness derives the gating status from each finding's `severity` via `statusFromFindings`: any `high` finding → `fail` (red), any findings → `uncertain` (yellow), none → `pass`. So the model can neither talk a gap into a pass nor downgrade a high-severity finding.

### Honest unknowns age toward yellow, never silently green

Missing/stale/manual prerequisites surface as `uncertain`, never hidden as `pass`. Guarded deep checks (local stack, IPFS, testnet) sit "skipped by policy" in ordinary development, which is indistinguishable from "never once proven the system boots" — so `stack.deployment-depth` reads the deep checks' retained history, reports "last end-to-end boot: N days ago," and ages `facet.functionality` toward yellow when that proof is stale (>7d) or never happened. It never returns `fail` (a never-booted stack is an honest unknown, not a defect).

## Cost guardrails

Good automated coverage is worth having, but don't turn the slow suite into an exhaustive browser-click matrix.

- Prefer the cheapest layer that proves the behavior: pure/unit tests, contract tests, SDK/indexer integration tests, then Playwright only when browser + wallet + backend integration genuinely matters.
- Add assertions to an existing full-stack flow rather than starting another fresh Playwright scenario — the new scenario re-pays all the setup cost.
- Keep full-stack restart/persistence coverage to a few representative canaries, not one clone per domain.
- Use fixture/golden tests for AI-service automation; don't put live model calls in the fast or default full suite unless the run is explicitly meant to spend that money.
- If a check is objective but expensive to automate end-to-end, automate a representative slice and leave broader judgment to a manual/LLM pass.

This is also the standing **automation-triage rule**: before spending LLM time on a role, ask *is this checking objective behavior that code can check?* If yes, automate it first and reserve the LLM for the subjective parts. `meta.llm-to-automated-candidates` is the standing scan for exactly these promotion opportunities.

## Manual / LLM validation-pass runbook

Use a manual validation pass when conventional tests pass but we still need intelligent judgment: does the system make sense, can real users use it, does it withstand skeptical/adversarial review, is it ready to show? The per-role rosters now live as structured data in [`coverage/validation-roster.json`](./coverage/validation-roster.json) (enforced by `coverage.validation-roster`); this is the procedure for running a pass.

1. **Prepare.** Choose pass size (Light / release-candidate / Full). Create a per-pass directory under [`workflow/reviews/`](/workflow/reviews/) with a `checklist.md` (one row per role: Role, Scope/domain, Environment, State class, Report path, Done?). Stand up a fresh seeded stack when needed (`./scripts/data.sh --wipe`, `./scripts/services.sh --start`, `./scripts/data.sh --seed=demo`).
2. **Manage shared state.** Read-only roles may share the seeded demo world; mutating roles need a fresh world or snapshot/restore; dirty-world/longitudinal roles mutate over time and run near the end. After mutations, run at least one restart self-consistency check.
3. **Run each role.** Use a fresh LLM per role. Give it this procedure, the relevant role docs, and the exact scope. Make it adversarial by default — try to break it, don't rubber-stamp. Require a timestamped report; check the role off only after the report exists.
4. **Report template.** Each report uses at least this structure (these section headings are enforced by `checks/review/report-attestation.mjs`):

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

5. **Finish.** Run the QA-lead role last: it confirms every checklist row is done or explicitly skipped, reads all reports, and writes the single launch-confidence answer.

## Operating model: refreshes, staleness, the dashboard

- Leaf checks read the live project/system. Cheap leaves should use `cron`; expensive/manual/LLM leaves are intentionally `manual` unless their definition says otherwise.
- Deterministic inner nodes use `onInputChange` — they rerun automatically when a child result changes while `verifier-scheduler` is running. `root` is `onInputChange` too, so the top-level report follows refreshed facets. Without the scheduler, `onInputChange` does not fire on its own; a manual `verifier-run <id>` still updates descendants' inputs for the next run.
- Supervisors use `freshness.requiredMaxAgeMinutes` to turn old non-failing child results into `uncertain` — the warning that evidence is old enough to consider refreshing.
- `meta.report-currency` runs hourly and cheaply rechecks whether commits since the last evaluation plausibly invalidate checks; advisory, never gating.
- `meta.liveness` runs every 30 minutes and warns when scheduled checks have gone silent or overdue.
</content>
</invoke>
