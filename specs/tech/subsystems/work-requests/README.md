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

Contribution and refund links are still offer-author reports. Totals keep those amounts as reported and do not label them verified. A contribution is verified only when its transaction hash matches an indexed buy for the same chain, project, settlement token, and amount. The buyer does not have to be the offer author. A refund is verified only when its refund transaction matches an indexed sell for the same chain, project, token, and the exact linked amount. Partial and larger refunds are not verified. Missing chain evidence leaves verified amounts at zero; the board still loads.

Provider acceptance counts as project authority only when all of these hold: the acceptance signer is the provider named on the current response version, that provider is the project's work beneficiary (an unset work-beneficiary id uses the project beneficiary), and every work item named by the response is registered to that project. If project authority was not loaded, the acceptance is not project authority.

The fold stays pure. The loader supplies payment evidence from the existing contribution and refund queries, and project authority from the existing work-state read. Request, offer, and response revision and withdrawal controls in the UI remain in [TODO.md](/TODO.md).

The request id is not a work-item id. Provider acceptance is a separate publication and does not replace `acceptWorkProject`. There is no exclusive reservation.
