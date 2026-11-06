# Requests for work

Status: **first slice implemented** in `@commonality/sdk/work-requests` and the Commonality Work pages (`/work/requests`).

Product direction: [fundable work requests](/specs/product/fundable-work-requests.md). Decision: [ADR 0020](/specs/decisions/0020-work-requests-are-published-versions.md).

## What is on-chain

`PublishedData` stores the publication of each immutable version. `MutableRefUpdater` stores the author's latest pointer:

| Pointer | Record |
|---|---|
| `wr:req:<slug>` | Request for work |
| `wr:offer:<slug>` | Funding offer |
| `wr:resp:<slug>` | Response |
| `wr:accept:<response-author>:<slug>` | Provider acceptance |
| `wr:decide:<offer-author>:<offer-slug>:<response-author>:<response-slug>` | Approve or decline |
| `wr:link:<slug>` | Link from an offer and response to a contribution transaction |

The document bytes are calldata, not indexer rows. Emptying a pointer withdraws the current tip; older CIDs remain in the ref history.

## Backing

A backed offer counts only while it is open, unexpired, and the named note is an active settlement note (token type 0) whose current owner is the offer author and whose token matches the offer. Receipt notes and someone else's notes count as zero. Several offers that name one note share its current balance in publication order. Pending spends that have not yet reduced `note.amount` are still inside that balance. Nothing here moves funds or changes a project's raised total.

## Limits

Contribution and refund links are offer-author reports, not verified transaction evidence. Totals display these as reported amounts. Response provider/work-item fields are declarations; acceptance checks the signer against the named provider and exact response version, but does not yet verify that provider against the project's beneficiary or work registry. These verification gaps and the remaining revision/withdrawal UI are tracked in [TODO.md](/TODO.md).

The request id is not a work-item id. Provider acceptance is a separate publication and does not replace `acceptWorkProject`. There is no exclusive reservation.
