# Known-bad stale demo dry-run report fixture

Date: 2020-01-01

This fixture is structurally complete and includes the identifying text that the
report-attestation check searches for, but its date is intentionally stale so
the check must reject it.

Demo dry run validation fixture.

## Scope actually covered

Only this synthetic fixture file.

## Evidence I used the system / inspected the code or docs

Synthetic evidence; this fixture exists only to exercise stale-report detection.

## Attempts to break it

Confirmed the report date is far older than the configured max age.

## Highest-severity finding

None.

## Other findings

None.

## Where I used insider knowledge or gave benefit of the doubt

No insider knowledge was used.

## Confidence: low / medium / high

High confidence that this fixture should be rejected as stale.

## Recommended follow-up tests or automation

Keep this fixture wired into known-bad report-attestation coverage.
