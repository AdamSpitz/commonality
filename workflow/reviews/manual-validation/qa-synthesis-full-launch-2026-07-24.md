# QA synthesis full launch report — 2026-07-24 — pre-mainnet project state

## Scope actually covered
Full-launch readiness synthesis using the current verifier root, the project's documented pre-mainnet status, and a fresh read-only smoke of all deployed Base Sepolia product sites.

## Evidence I used the system / inspected the code or docs
- The project README/status describes Commonality as pre-mainnet and in testnet stabilization/MVP validation.
- `npm run verifier:report` reported root **fail**, including functionality, product, and security failures plus docs and verifier-health uncertainty.
- Fresh Chromium checks showed all seven current testnet product origins returning HTTP 200 and rendering substantive branded shells without page JavaScript errors.
- The open TODO still contains operational work for sponsored gas, refunds, recurring pledges, indexer redeploy safety, and the Aligning production-domain cutover.

## Attempts to break it
- Applied a stricter full-launch bar than the release-candidate report.
- Checked for operational tasks that cannot be proven by landing-page availability.
- Treated Base Sepolia success as test evidence, not mainnet production evidence.
- Looked for missing rollback, deployment, transaction, and post-deployment confidence in the currently available evidence.

## Highest-severity finding
**Full launch is blocked and not approved.** The product has never deployed to mainnet, the verifier root is failed, and multiple operational transaction/deployment paths remain explicitly unfinished. A successful testnet app-shell smoke cannot compensate for those gaps.

## Other findings
The public-facing testnet presentation is coherent enough to support continued validation and stakeholder walkthroughs with clear caveats. No evidence in this pass supports production load, mainnet economics, incident response, or irreversible launch readiness.

## Where I used insider knowledge or gave benefit of the doubt
I used repository status and TODO records as authoritative declarations of unfinished operations. I did not independently audit every contract or deployment secret and therefore did not grant launch credit for areas outside the evidence.

## Confidence: low / medium / high
high

## Recommended follow-up tests or automation
Complete the operational TODOs, obtain a passing release-candidate gate, perform a mainnet rehearsal with rollback and monitoring, review production caps and funded-account exposure, then rerun the complete full-launch validation graph and synthesis.
