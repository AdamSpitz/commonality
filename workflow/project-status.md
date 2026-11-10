# High-level overview of current project status

Commonality has **not deployed to mainnet yet**. The milestone ladder and where we are on it live in [milestones.md](./milestones.md).

As of 2026-11-06: the two-person testnet lab works (milestone 1, a few leftovers) and 100-user fake-data campaigns have run on testnet (milestone 2, v2 step 14 paused). Milestone 3 (ready for outside review) still needs a definition.

The implemented MVP scope matches [the MVP document](../specs/product/mvp.md): Conceptspace, LazyGiving, Delegation, Aligning, Content Funding, Subjectiv trust filtering, Mutable Refs, and the eight branded UI domain builds are represented in the app. Product boundaries for the eight sites are tracked in [UI domain boundaries](../specs/product/ui-domains.md); the technical build/source layout is tracked in [technical UI domains](../specs/tech/ui-domains.md).

For the freshest health report, use the verifier workspace. Run `npm run verifier:go`, or inspect the latest `verifier/artifacts/root/*/report.md` written by the root verifier check.
