# 0020. Requests for work are published versions, not work-item ids

- **Status:** Accepted
- **Date:** 2026-10-13
- **Related specs:** [`specs/product/fundable-work-requests.md`](../product/fundable-work-requests.md), [`specs/tech/subsystems/work-requests/README.md`](../tech/subsystems/work-requests/README.md)

## Context

A request for work has to exist before a provider or project does, and a later edit must not silently rewrite an offer or an acceptance. The work registry already gives a beneficiary's work item one active funding slot. Using the request id as that work id would block a second, competing response.

## Decision

Publish each request, funding offer, response, provider acceptance, decision, and contribution link as an immutable `PublishedData` document. The author's `MutableRefUpdater` pointer names the latest version only. Offers, responses, and acceptances store the exact version CID they concern. Recognized note backing is computed from live note state, capped once per note, and never added to a project's raised total.

## Alternatives considered

- **A new workflow contract.** Rejected for the first slice: publication, attribution, and history already exist, and the feature must not add delivery gates to ordinary projects.
- **Reuse the work-item id as the request id.** Rejected because competing responses would collide under the once-funded rule.
- **Store only the latest mutable JSON.** Rejected because old terms would disappear from discovery.

## Consequences

History depends on calldata (or a mirror) remaining readable and on the ref event log. Exclusive reservations, automatic selection, and reputation scores stay out. Revisit if ref-name discovery becomes too coarse or a reservation contract is specified.
