# Solidity coverage baseline

**Baseline date:** 2026-07-24  
**Command:** `npm run hardhat:coverage`  
**Suite result:** 421 passing

This is an advisory report, not a gate. See [ADR 0002](../specs/decisions/0002-code-quality-metrics.md).
Generated HTML and JSON reports are intentionally gitignored under `hardhat/coverage/` and
`hardhat/coverage.json`; regenerate them when line-level detail is needed.

## Compact baseline

| Area | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| All production contracts | 94.19% | 73.13% | 89.90% | 94.68% |
| Content funding | 92.86% | 74.26% | 90.63% | 93.56% |
| Delegation and recurring pledges | 95.15% | 71.88% | 89.29% | 96.88% |
| Individual-project assurance | 94.96% | 75.96% | 92.31% | 96.51% |
| Sponsored gas | 97.03% | 62.00% | 100% | 94.44% |

The baseline run exposed `ProjectFactory.sol` at 25.53% line and 0% branch
coverage. Focused end-to-end and rejection tests added during the review raised it
to 89.36% line and 68.18% branch coverage and verify that factory-created projects
are fully wired before ownership is relinquished.

## Prioritized gaps

1. **Recurring pledges:** 47.06% branch / 81.82% line. Add cases around scheduler
   failure, note replacement, and authorization boundaries before enabling the
   production scheduler.
2. **Sponsored gas:** `CreatorGasTank` is 65.48% branch and `GasTankFunder` is
   43.75% branch. Line coverage is high, but malformed UserOps, cap boundaries,
   swap failure/slippage, and authorization branches deserve continued adversarial
   testing because these contracts spend pooled gas funds.
3. **Content receipt lifecycle:** `MaterializedContentTokens` is 46.67% branch /
   80.56% line and `ProspectiveContentTokens` is 66.67% branch / 75% line. Focus on
   claim authorization, duplicate claims, and transfer-boundary behavior.
4. **Project factory:** cover the custom-condition path and remaining array/deadline
   rejection branches if that public path remains part of the mainnet deployment.
5. **NudgePublications:** currently 0%; it is not money-moving, but needs a small
   publication/event test before treating the full deployed contract set as covered.

## Interpretation notes

- Interfaces contain no executable behavior; their 100% entries are not evidence
  of runtime testing.
- `FreeERC20` and `FreeERC1155` are local/testnet faucet utilities, so their low
  coverage is not a mainnet money-safety priority.
- Constructor-generated and defensive branches can be difficult for Istanbul to
  attribute, but none are currently classified as intentionally unreachable.
  Document a specific reason beside any future exclusion rather than suppressing
  a whole contract or chasing the aggregate percentage.
- Revisit a narrowly scoped contract coverage floor only near mainnet and only by
  an explicit ADR, as required by ADR 0002.
