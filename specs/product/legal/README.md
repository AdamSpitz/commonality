# Legal risks

This is a risk map, not legal advice. Adam is a Canadian resident and the product may reach US users, so both Canadian and US counsel matter. The rough ToS / acceptable-use clauses live in [terms-outline.md](terms-outline.md) until counsel replaces them.

## Current assessment (27 Jul 2026)

**Yes, the project is in a materially better position than when this review began.** The two most important engineering mitigations are substantially implemented on testnet:

- **Retroactive funding:** LazyGiving receipts are non-transferable; later donations reimburse early contributors pro-rata at cost; there is no premium, seniority, or LazyGiving secondary-market flow. The UI and end-user documentation were rewritten around “get your money back and fund the next one.” See [the redesign](retroactive-funding-redesign.md) and [ADR 0003](/specs/decisions/0003-reimbursement-only-retroactive-funding.md).
- **User-authored data:** displayable text is published by the author's signed `PublishedData` transaction rather than uploaded to our pinning service; CID-first reads, author retraction, legacy fallback, and runtime display-denylist plumbing exist. LazyGiving no longer accepts image bytes: users choose vetted stock or bring a CID pinned elsewhere. See [statement hosting](statement-hosting.md), [the implementation inventory](/specs/tech/eliminating-ipfs.md), and [ADR 0004](/specs/decisions/0004-user-publishes-displayable-data.md).

Those changes remove the facts that made the original securities story especially alarming and vacate the primary upload/hosting role for new user-authored text. They do **not** make the project legally cleared:

- A securities lawyer still needs to review the contingent, zero-interest reimbursement right and delegation model before mainnet.
- We still operate the default UIs, indexer/API, identity verifier, and editorial agents. We are a platform operator for those acts, not “just a protocol.”
- Displaying and re-serving third-party material still needs a real notice/takedown process. The code has suppression plumbing; an operated policy, monitored contact, configured production list, and response procedure are separate work.
- Incorporation, counsel-written ToS/privacy policy, sanctions/wallet screening, political-funding rules, charitable-solicitation review, and tax disclaimers remain before-mainnet work.
- The repository still contains stale product/technical specs describing resale (for example `specs/product/mvp.md`, `composability.md`, `ai-assistance.md`, and `foolproof-project-creation.md`) and a distinct content-funding design that materializes transferable content-item tokens. Those are specification-coherence and counsel-review items; they must not leak back into the LazyGiving offering or its marketing.

In short: **the highest-risk design was replaced rather than merely renamed, which is a major improvement; operational compliance and professional legal review are now the dominant gaps.**

## Risks, ranked now

1. **[Operator posture](operator-posture.md)** — now the broadest residual risk: we run the default front doors and services. Incorporation, policies, moderation/screening operations, and honest operator framing are not optional.
2. **[Securities](securities.md)** — dramatically reduced for LazyGiving by the implemented reimbursement-only design, but still the highest specialist-counsel question before mainnet. Transferable content-item tokens require separate review and must not inherit the old investment narrative.
3. **[Sanctions and terrorist financing](sanctions.md)** — especially named, unclaimed creator channels and the move from a trusted verifier toward trustless release.
4. **[Content and hosted speech](content-and-speech.md)** — primary publication posture improved; operated redistribution, AI-authored judgments, and Canada's lack of Section 230 remain.
5. **[Political funding](political-funding.md)** — Civility/CSM, generated political content, display/routing, and sponsored gas can create platform-side conduct.
6. **[Privacy](privacy.md)** — public trust/activity graphs and permanent user-authored calldata require a real privacy analysis and policy.
7. **[Money laundering](money-laundering.md)** — non-custodial and transparent architecture helps; stolen-card cash-out and partner controls remain.
8. **[Charitable solicitation](charitable-solicitation.md)** and **[tax](tax.md)** — comparatively cheap compliance/wording work that is still undone.
9. **[Money transmission](money-transmission.md)** — comparatively low while funds remain non-custodial and Commonality charges no flow-based fee.
10. **[Publishing smart contracts](smart-contracts.md)** — low risk as code publication; operated/admin-controlled services are analyzed separately.

Cross-cutting inventories: [multiple providers](multiple-providers.md), [what we host and control](what-we-host-and-control.md), and [statement hosting](statement-hosting.md).

## Before mainnet

1. Obtain Canadian and US securities advice on the four questions in [retroactive-funding-redesign.md](retroactive-funding-redesign.md#open-questions-for-the-securities-lawyer), plus separate advice on transferable content-item tokens.
2. Incorporate and have counsel produce the ToS, acceptable-use policy, and privacy policy; include fraud, stolen-card, laundering, sanctions-evasion, illegal-funding, content, and no-tax-receipt terms.
3. Turn display-denylist capability into an operation: production configuration, reporting address, owner/on-call responsibility, documented decisions, unpinning where applicable, and display **and aggregation** suppression tests. The intended end state, so that independent vertical operators can comply without each building a moderation department, is [composable policy lists](/specs/tech/subsystems/policy-lists/README.md) — subscribable, on-chain-checkpointed blocklists the operator can override.
4. Design sanctions screening for wallet addresses and named unclaimed channels; adopt a political-funding/content policy and sponsored-gas rules.
5. Finish the repository-wide stale-spec/copy scrub. Do not market anonymity, KYC avoidance, investment, returns, token appreciation, or resale as a Commonality benefit.
6. Preserve the architectural boundaries in [ADR 0003](/specs/decisions/0003-reimbursement-only-retroactive-funding.md) and [ADR 0004](/specs/decisions/0004-user-publishes-displayable-data.md): no financial sweeteners or LazyGiving transferability, no operator upload fallback for arbitrary user content, and no baked-in immutable denylist.
