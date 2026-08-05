# ADR 0007: Channel-bound prospective content materialization

- Status: Accepted
- Date: 2026-08-05

## Context

The old permissionless assembly path could not authorize a materialized collection in production and accepted arbitrary content IDs, allowing namespace squatting. It also did not establish authentic round provenance or require funding success.

## Decision

Prospective content rounds are created atomically by `ProspectiveContentRoundFactory` and only by the current verified owner of the round's channel. The factory records authoritative round, channel, condition, receipt-token, and receipt-ID provenance. Content can be materialized only after the assurance condition's canonical `hasSucceeded()` check and only once per round.

The resulting `MaterializedContentTokens` collection is bound immutably to the channel and source round. It accepts content suffixes and derives canonical IDs and hashes in the verified channel namespace. `ContentRegistry` maps each resulting ID to the source assurance round, not to the recognition-token collection.

Prospective and materialized receipts are non-transferable. Pending or failed prospective receipts cannot be burned directly because they back failure refunds; successful receipts can be burned, reducing later recognition claims without changing assurance-contract reimbursement accounting.

Registrar authorization is structural deployment plumbing: the existing `CreatorAssuranceContractFactory`, which owns `ContentRegistry`, authorizes the prospective factory and collections deployed through its validated path.

## Alternatives rejected

- Permissionless token/assurance assembly: constructor arguments do not authenticate a channel or round.
- UI-only success and namespace checks: direct contract calls could still occupy globally meaningful IDs.
- Registering IDs to the materialized ERC-1155: this would break the registry's established assurance-contract meaning.
- Burning pending receipts with a warning: this can destroy the token-backed failure refund.

## Consequences

There is one trusted creation path and one materialized collection per round. Channel ownership changes transfer fulfillment authority to the current verified owner. Consumers resolve content funding history through the assurance contract and follow its one-time `materializedContentTokens` link for recognition inventory.

Living specification: [future-content materialization](../tech/subsystems/content-funding/materialization.md).
