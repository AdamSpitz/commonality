# Newcomer touched-surface report — 2026-06-03 — local repo/docs

## Scope actually covered
Touched surface for this P1 verifier pass: top-level onboarding (`README.md`, `AGENTS.md`), verifier docs (`verifier/README.md`, `verifier/PLAN.md`), local-development docs, UI README, docs-coherence surfaces, and the small indexer startup-script change made to unblock full tests.

## Evidence I used the system / inspected the code or docs
- Read the top-level README role routing and verified `workflow/roles/*` files exist.
- Read `verifier/PLAN.md` and `verifier/README.md` to understand the validation-pass expectations.
- Inspected `workflow/local-development.md`, `.env.example`, `ui/.env.example`, `ui/README.md`, `specs/product/ui-domains.md`, and `specs/tech/ui-domains.md` for the docs-coherence issues.
- Inspected `indexer/start.sh` after the change and ran `sh -n indexer/start.sh`.

## Attempts to break it
- Followed the docs-coherence complaint as a newcomer would: searched for the supposedly missing role files and UI-domain specs instead of assuming they existed.
- Checked whether the environment/local-dev docs had a single place explaining `scripts/services.sh`, `scripts/data.sh`, `.env.example`, and `ui/.env.example`.
- Looked for undefined newcomer-facing jargon around “Subjectiv” in `ui/README.md`.

## Highest-severity finding
None observed in this bounded newcomer pass after the documentation updates. The previous confusing points were addressed by adding explicit links to local-dev/env references, role/spec files to the docs-coherence review surface, and an inline Subjectiv definition/link.

## Other findings
- The pass was documentation/code-inspection focused; it did not include a fresh browser run.
- `workflow/local-development.md` previously said the local admin linked to “nine” stable URLs while listing eight domains; this was corrected.

## Where I used insider knowledge or gave benefit of the doubt
I used repository search and existing verifier reports rather than approaching only through rendered docs. I also accepted that the verifier/docs surface is the touched surface for this P1 task rather than reviewing every product domain.

## Confidence: low / medium / high
medium

## Recommended follow-up tests or automation
- Add a deterministic bounded docs-link/reference check for the docs-coherence surface.
- Keep `review.docs-coherence` input files aligned with the README role-routing and key local-dev docs so LLM reviewers do not flag files merely omitted from the prompt.
