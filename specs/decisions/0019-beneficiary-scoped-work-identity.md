# 0019. Ordinary work identity belongs to its beneficiary

- **Status:** Accepted
- **Date:** 2026-10-13
- **Related specs:** [structured fundable work](../product/structured-fundable-work.md), [work items](../tech/subsystems/work-items.md)

## Context

The first work-item implementation keyed occupancy by the local ID alone. Unrelated performers using the same concert-date ID competed for one slot, and one successful funding blocked the other permanently. Scoping to the contract initiator would separate them but also allow different initiators to fund the same beneficiary's work repeatedly. Adam requested independent beneficiary slots and third-party initiation for ordinary work.

## Decision

Ordinary work identity is `(stable beneficiary identity, exact local work ID)`. Factories derive the beneficiary from the payout target, independently of the initiator and project owner. Named identities survive payout rotation; direct wallet recipients use a distinct wallet identity. Content retains canonical IDs, which already identify the channel.

Ordinary third-party proposals require beneficiary acceptance and a seven-day project-specific veto window before success. Veto frees reservations. Proposals whose acceptance window did not finish before their funding deadline fail and permit refunds even if funded. Identity verification alone does not accept a project. Proceeds remain held by each project and retain its existing claim/refuse rules.

## Alternatives considered

- **Global local-ID uniqueness:** lets unrelated beneficiaries block one another.
- **Scope to the initiator:** allows duplicate funding through different initiators.
- **Ask clients to prefix IDs:** cannot enforce scope against direct contract calls.
- **Require global registry control to accept ordinary work:** unnecessarily restricts future proposals and couples otherwise independent project decisions. Ordinary work has per-project acceptance; content retains its existing takeover policy.

## Consequences

Attestations and lookups use the beneficiary-scoped hash. Proposal acceptance adds a beneficiary transaction and a seven-day wait. Beneficiaries can still initiate their own projects without that gate. Deadline-less custom conditions remain restricted to recipient-started projects.

Changing a named identity or using a direct wallet creates a different scope. This is not global real-world duplicate detection. Revisit cross-identity equivalence when there is a concrete need for it, or acceptance timing when real beneficiaries need different windows.
