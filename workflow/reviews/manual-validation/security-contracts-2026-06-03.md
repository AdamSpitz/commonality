# Smart-contract security review report — 2026-06-03 — local full-test run

## Scope actually covered
Smart-contract security confidence for the current P1 verifier pass, based on the Hardhat suite executed inside `automated.test-full` plus targeted inspection of the failure log. Covered access control, reentrancy, gas-griefing canaries, core assurance-contract accounting, delegation-note operations, content-funding contracts, secondary market, attestation registries, and trust registry tests.

## Evidence I used the system / inspected the code or docs
- Ran `verifier-run automated.test-full`; the overall command failed later in integration-test stack startup, but the Hardhat phase completed.
- The artifact `verifier/artifacts/automated.test-full/2026-06-03T14-09-23.346Z-ccb09ee0/command.log` shows `453 passing (11s)` for Hardhat.
- The same log includes dedicated suites named `Security Regression - Access Control`, `Security Regression - Reentrancy Protection`, and `Security Regression - Gas Griefing`.

## Attempts to break it
- Checked that the security suites include non-owner rejection, unauthorized withdrawal/reclaim/delegation rejection, cancellation access control, reentrant receiver rejection for primary/secondary market flows, bounded delegation depth, and large batch attestation gas canaries.
- Confirmed the full-test failure was not in the contract test phase; it occurred when the local indexer container tried to source a `.env` value containing spaces.

## Highest-severity finding
None observed in the smart-contract test surface covered by this pass. The discovered full-suite failure was operational/integration startup, not a contract-security failure.

## Other findings
- This was not an independent manual audit of Solidity source line-by-line.
- The report inherits the limits of the existing Hardhat security regression coverage; release-candidate work should still decide which additional contract edge cases deserve dedicated tests.

## Where I used insider knowledge or gave benefit of the doubt
I used the project’s existing security regression suite names and the verifier artifact log as evidence. I did not replay adversarial transactions outside the test suite.

## Confidence: low / medium / high
medium

## Recommended follow-up tests or automation
- Keep promoting any release-candidate smart-contract gap from `coverage.readiness` into explicit Hardhat tests.
- Consider a small deterministic verifier check that extracts the latest Hardhat security-suite result from `automated.test-full` artifacts if contract-security attestation remains a required light-confidence report.
