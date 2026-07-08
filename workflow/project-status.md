# High-level overview of current project status

Commonality has **not deployed to mainnet yet**. The current phase is **testnet stabilization and MVP validation**: the MVP exists in code, but the project is still proving that the live testnet deployment, operational workflows, and first-user experience are credible enough for outside review.

The implemented MVP scope matches [the MVP document](../specs/product/mvp.md): Conceptspace, LazyGiving, Delegation, Aligning, Content Funding, Subjectiv trust filtering, Mutable Refs, and the eight branded UI domain builds are represented in the app. Product boundaries for the eight sites are tracked in [UI domain boundaries](../specs/product/ui-domains.md); the technical build/source layout is tracked in [technical UI domains](../specs/tech/ui-domains.md).

Near-term work is operational rather than broad feature discovery:

- deploy and verify the latest contracts/services on testnet;
- validate recurring pledges, account assertions, indexer redeploys, and other already-built paths against the live stack;
- finish the embedded-wallet/on-ramp/sponsored-gas path needed for mainstream no-custody contributions;
- fix verifier-reported testnet website/config failures and local deep-stack failures;
- keep docs aligned with the actual source tree, deployment shape, and MVP status.

For the freshest health report, use the verifier workspace. Run `npm run verifier:go`, or inspect the latest `verifier/artifacts/root/*/report.md` written by the root verifier check.
