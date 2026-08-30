# 0013. Checkpointed reimbursement claim tokens

- **Status:** Accepted
- **Date:** 2026-08-30
- **Related specs:** [`specs/tech/subsystems/lazyGiving/README.md`](../tech/subsystems/lazyGiving/README.md), [`specs/product/legal/retroactive-funding-redesign.md`](../product/legal/retroactive-funding-redesign.md)

## Context

The reimbursement pool derived every contributor's earned and remaining amount from
one mutable contribution basis. Forgoing that basis after money arrived therefore
reallocated reimbursement the contributor had already earned. We wanted the clearer
rule that each later donation converts part of the current holder's future claim into
money permanently withdrawable by that holder, without making each donation iterate
over an unbounded contributor set.

Recognition receipts cannot themselves represent this claim: ordinary donors receive
the same receipts while explicitly taking no reimbursement claim.

## Decision

Each project issues a separate ERC-20 reimbursement-claim share token to early funders.
The token is nontransferable. A global reimbursement-per-share accumulator lets later
donations consume future claims pro rata in O(1); accounts checkpoint lazily, and
accrued reimbursement remains with the holder who earned it. Forgoing burns only the
holder's remaining future claim.

The transfer hook checkpoints both sides so the accounting has a coherent technical
seam if transferability is reconsidered, but holder-to-holder transfers revert. This
is a technical refactor, not a change to the reimbursement-only legal or product
posture accepted in [ADR 0003](./0003-reimbursement-only-retroactive-funding.md).

## Alternatives considered

- **Write every holder's mappings on each donation** — rejected because reimbursement
  cost would grow with contributor count and could eventually exceed the block gas limit.
- **Keep deriving earned reimbursement from mutable contribution basis** — rejected
  because a later forgo could reallocate reimbursement that had already been earned.
- **Make recognition receipts carry claims** — rejected because pure donors and scouts
  can hold indistinguishable recognition receipts with different reimbursement rights.
- **Enable claim-token transfers now** — rejected because that would reverse ADR 0003's
  legal-risk decision and materially change the product into a transferable-claim system.

## Consequences

Later donations remain O(1), withdrawals remain pull-based, and reimbursement cannot
exceed the at-cost claim. Claim balances decline economically as reimbursement accrues;
earned balances survive later claim burns. The separate ERC-20 adds contract surface
and fixed-point rounding that tests and clients must handle.

Transferability, resale UI, markup, or a secondary market remain prohibited. The
checkpoint-ready hook is not authorization or an assertion of legality. Reconsidering
the revert requires Canadian and US securities counsel to review a concrete design,
followed by an explicit product decision and a new ADR that supersedes ADR 0003 where
necessary.
