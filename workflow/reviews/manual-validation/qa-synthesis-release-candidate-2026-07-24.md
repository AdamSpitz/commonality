# QA synthesis release candidate report — 2026-07-24 — current verifier state and deployed testnet

## Scope actually covered
Release-candidate synthesis across the retained verifier root and facets, the fresh deployed seven-origin UI smoke, and the three refreshed manual reports produced in this pass.

## Evidence I used the system / inspected the code or docs
- `npm run verifier:report` reported root **fail** at `2026-07-24T17:18:23.977Z`.
- The retained child statuses were functionality fail, docs uncertain, product fail, security fail, and verifier health uncertain.
- Drove all seven deployed Base Sepolia UI origins in Chromium; each returned HTTP 200, rendered branded substantive content, and produced no page JavaScript error.
- Reviewed the refreshed real-UI, newcomer, and demo reports alongside their explicit scope limits.

## Attempts to break it
- Refused to infer release readiness from a successful app-shell smoke.
- Compared manual visual evidence with automated, deep, and security facet status.
- Treated uncertain and stale evidence as missing confidence rather than a pass.
- Distinguished a deployable/rendering release candidate from a transactionally and operationally validated one.

## Highest-severity finding
**Release candidate is not approved.** The authoritative root is failed, with failures in functionality, product, and security and uncertainty in docs and verifier health. The fresh browser evidence only establishes that deployed landing pages are reachable and coherent.

## Other findings
The deployed presentation layer is suitable for continued internal testnet testing. The current evidence does not justify claims about contribution completion, sponsored gas, refunds, recurring pledges, indexer redeploy safety, or the `aligning.works` production cutover.

## Where I used insider knowledge or gave benefit of the doubt
I relied on the verifier's retained check graph rather than independently reproducing every leaf. I accepted a scoped browser smoke as evidence for presentation availability only and gave no benefit of the doubt to unexecuted mutation paths.

## Confidence: low / medium / high
high

## Recommended follow-up tests or automation
Resolve and rerun every failing root child, refresh stale guarded journeys, execute the exact wallet/transaction release path on Base Sepolia, and regenerate this synthesis only after `validation.release-candidate` has current evidence.
