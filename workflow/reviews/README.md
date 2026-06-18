# General stuff to review every so often

I'm worried about this code base getting away from me. So let's try doing regular reviews of various components or aspects of the code base.

## Skills to use

Use the `project-wide-reviewer` skill, or whichever specific skills (mentioned inside the `project-wide-reviewer` skill) are relevant.

## Smart-contract review practice

When reviewing a new or changed contract, treat emitted events as a versioned public API: the indexer stores raw events, and SDK folds/UI/services consume those shapes. Prefer adding a new event over changing an existing event's fields or meaning. If a breaking event-shape change is unavoidable, rename the event (for example, `NoteCreatedV2`) so old and new handlers can coexist. Also classify any new contract against [`specs/tech/contract-versioning.md`](../../specs/tech/contract-versioning.md) before it ships.

## Most recent reviews

Let's put each one in a separate file in this directory.

  - project-wide review, 2026-06-12 — **complete and harvested**; actionable items are now in `TODO.md`, `inbox.md`, `verifier/PLAN.md`, or verifier reports/maps. The original review file was archival and may be absent.
  - [big founder-level review before deploying to testnet](./before-testnet.md)

