# 0004. Users publish their own displayable data

- **Status:** Accepted
- **Date:** 2026-07-27 (recorded retrospectively; decision and implementation were made in July 2026)
- **Related specs:** [`specs/tech/eliminating-ipfs.md`](../tech/eliminating-ipfs.md), [`specs/product/legal/statement-hosting.md`](../product/legal/statement-hosting.md), [`specs/tech/subsystems/published-data/README.md`](../tech/subsystems/published-data/README.md)

## Context

Commonality previously uploaded and pinned arbitrary user-authored statements and project metadata through infrastructure it operated. That made Commonality the ingestion and ongoing hosting party. Moving the same uploads to another permanent storage vendor would preserve that role while making compliance harder.

## Decision

User-authored displayable text is published by the user's own signed transaction through `PublishedData`; Commonality provides CID-first reads and only legacy IPFS fallback. Authors can record retractions, and operated displays can honor a runtime denylist. Commonality does not accept image bytes: projects may select vetted stock images or provide a CID they pin elsewhere.

IPFS remains intentionally for legacy reads, operator-authored nudge batches, vetted/BYO images, and UI build artifacts. This is a role-boundary decision, not a blanket ban on IPFS.

## Alternatives considered

- **Continue pinning all user content ourselves** — rejected because it makes Commonality the ongoing host of arbitrary third-party material.
- **Upload user content to Arweave, Filecoin, or another store ourselves** — rejected because changing vendors does not vacate the publisher/host role and may remove useful compliance levers.
- **Require users to maintain rented IPFS pins for all text** — rejected because availability depends on ongoing payment and complicates the ordinary authoring flow.
- **Put arbitrary image bytes in calldata** — rejected because changing storage does not address image-possession/distribution hazards.

## Consequences

Authorship is cryptographically attributable and Commonality no longer runs the primary text-upload/pinning path. Operated UIs and APIs still redistribute content, so runtime suppression, notice handling, and honest platform posture remain necessary. On-chain bytes cannot be erased: author retraction affects compliant display, not chain history, so publication UX must make permanence clear. Revisit if counsel rejects this controller/publisher-role analysis, calldata economics change materially, or a storage system offers equivalent author-paid, pay-once publication and attribution.
