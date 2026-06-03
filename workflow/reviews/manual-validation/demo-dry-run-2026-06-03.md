# Demo dry-run report — 2026-06-03 — local verifier P1 pass

## Scope actually covered
Dry-run of the current “can we show this?” verifier story for the P1 blockers: PR validation status, full-test failure triage, light-confidence report attestations, docs coherence, and Alignment workflow clarity. This was a verifier/demo narrative dry-run rather than a polished live product demo.

## Evidence I used the system / inspected the code or docs
- Ran `npm run verifier:report`; root was failing because release-candidate/full-launch inherited `automated.test-full` failure and light-confidence was missing four reports.
- Ran `verifier-run automated.test-full`; SDK and Hardhat tests passed, then integration stack startup failed because `indexer/start.sh` sourced an unquoted `.env` value containing spaces.
- Inspected and patched `indexer/start.sh` to parse `.env` as key/value lines instead of shell-sourcing it.
- Produced the four light-confidence manual-validation reports in `workflow/reviews/manual-validation/`.
- Triaged the docs-coherence and workflow-clarity advisory findings and made bounded doc/UI fixes.

## Attempts to break it
- Followed the root verifier failure down to the exact child/artifact instead of accepting the summary.
- Treated missing report attestations as real confidence gaps and wrote scoped reports with explicit limits.
- Checked that the full-suite failure was reproducible and attributable to local stack startup, not SDK/contract test failures.
- Looked for ways the Alignment delegation hand-off would still confuse a newcomer.

## Highest-severity finding
None blocking for a local P1 verifier dry-run after the indexer startup fix and documentation/UI updates. Release-candidate/full-launch still have expected guarded or missing prerequisites outside P1.

## Other findings
- The stack failure exposed a fragile `.env` loading pattern in the indexer container; the fix should be validated by rerunning `automated.test-full`.
- The four manual-validation reports are light-confidence scoped and should not be mistaken for release-candidate QA synthesis.

## Where I used insider knowledge or gave benefit of the doubt
I used verifier artifacts and repository inspection rather than presenting to an external audience. I counted this as a dry-run of the validation narrative, not a sales/demo rehearsal.

## Confidence: low / medium / high
medium

## Recommended follow-up tests or automation
- Rerun `verifier-run automated.test-full`, then `validation.light-confidence`, then `root`.
- Add deterministic checks for docs broken references and report-attestation freshness/shape so fewer P1 blockers depend on ad hoc manual review.
