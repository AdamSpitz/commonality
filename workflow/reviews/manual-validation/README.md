# Manual validation reports

Verifier report-attestation checks look for timestamped Markdown reports in this directory (or subdirectories).

Use the template from `workflow/testing/manual-tests/README.md`:

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

Recommended filenames for the first verifier-attested roles:

- `newcomer-touched-surface-YYYY-MM-DD.md`
- `real-ui-touched-domain-YYYY-MM-DD.md`
- `security-contracts-YYYY-MM-DD.md`
- `demo-dry-run-YYYY-MM-DD.md`
- `qa-synthesis-release-candidate-YYYY-MM-DD.md`
- `qa-synthesis-full-launch-YYYY-MM-DD.md`

A report with an unresolved blocker/high-confidence severe issue should say so plainly in `## Highest-severity finding`; the attestation check treats that as a verifier `fail` rather than a missing-report `uncertain`.
