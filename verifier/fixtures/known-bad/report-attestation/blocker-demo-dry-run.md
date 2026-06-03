# Known-bad blocker demo dry-run report fixture

Date: 2026-06-02

This fixture is structurally complete and includes the identifying text that the
report-attestation check searches for, but it names an unresolved blocker so the
check must reject it even though the report is fresh and complete.

Demo dry run validation fixture.

## Scope actually covered

Only this synthetic fixture file.

## Evidence I used the system / inspected the code or docs

Synthetic evidence; this fixture exists only to exercise blocker detection.

## Attempts to break it

Inserted an unresolved blocker into the highest-severity finding section.

## Highest-severity finding

Unresolved blocker: the demo cannot complete the core workflow.

## Other findings

None.

## Where I used insider knowledge or gave benefit of the doubt

No insider knowledge was used.

## Confidence: low / medium / high

High confidence that this fixture should be rejected because the finding is a blocker.

## Recommended follow-up tests or automation

Keep this fixture wired into known-bad report-attestation coverage.
