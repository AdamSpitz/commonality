# High-level overview of current project status

Commonality has **not deployed to mainnet yet**. The current project phase is **testnet stabilization and MVP validation**.

The MVP feature set is implemented in code: Conceptspace, LazyGiving, Delegation, Aligning, Content Funding, Subjectiv, Mutable Refs, and the eight branded UI domain builds are all in scope and represented in the app. See [the MVP scope](../specs/product/mvp.md) and [UI domain boundaries](../specs/product/ui-domains.md).

Current work is about making that implemented MVP credible enough for external review and, later, mainnet:

- deploy and verify the latest contracts/services on testnet;
- validate operational paths such as recurring pledges, account assertions, indexer redeploys, and embedded-wallet/on-ramp flows;
- clean up first-visitor UX copy and recovery states surfaced by verifier reviews;
- keep docs aligned with the actual code and deployment shape.

For the freshest health report, use the verifier workspace. Run `npm run verifier:go`, or inspect the latest `verifier/artifacts/root/*/report.md` written by the root verifier check.
