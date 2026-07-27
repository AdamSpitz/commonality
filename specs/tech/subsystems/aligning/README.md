# Aligning

Each statement in the Concept Space has a link to its own Aligning (i.e. "here are a bunch of fundable projects that are (directly or indirectly) aligned with statement S"). Anyone can submit AlignmentAttestation events of the form "subject S is aligned with statement T" (where the subject is typically a project address). Each project is basically a crypto-based Kickstarter (e.g. an ERC-1155 contract where people can buy NFTs and the proceeds go towards funding the project).

Some points about this:

  -   **Implication arrows reduce need for coordination:** Just like with the number-of-supporters in the Concept Space UI, the Aligning system can make use of the Implication Attestations: the cause board for a statement S can show projects that have been attested to be aligned with *any* statement S2 such that S2 implies S. So people shouldn't need to worry too much about which particular statement S to submit their project under; anything roughly in the right ballpark is probably fine.

  -   **Social recognition:** Contributions mint non-transferable ERC-1155 recognition receipts. They are not shares of stock and do not entitle the holder to project profits or governance. Contributor addresses (or ENS names) can appear on project pages and cause-board leaderboards.

  -   **Retroactive Funding:** Early contributors may retain a recoverable-donation claim. After a project succeeds, later donations make reimbursement available pro rata, capped at exactly what each early contributor put in. Recognition receipts remain non-transferable; there is no interest, premium, bonus, or profit. See [docs/end-user/lazyGiving/retroactive-funding.md](/docs/end-user/lazyGiving/retroactive-funding.md) for the full explanation.
  
  -   **Highlighting successful projects:** A cause board currently shows projects *aligned* with a cause (i.e. that *intend* to produce value). The natural next layer is showing projects that have *already delivered* value aligned with the cause, via a "success attestation" claim type parallel to alignment attestations (same cause anchor, same trust-graph filter, same implication propagation). This is the foundation retroactive funding needs. See [specs/product/successful-projects.md](/specs/product/successful-projects.md).

  -   **More-objective success/alignment verification:** This is more of a vague future idea than a concrete feature, but if some particular project is capable of defining more-objective criteria by which its success/alignment can be verified, that opens up interesting possibilities for tying funding to its success, making decisions based on its predicted success (a la futarchy), etc.

  -   **Delegation:** A DelegatableNotes smart contract allows users to delegate their funding decisions to someone they trust, to eliminate the friction of the money-providers needing to make all those decisions themselves. There's also a NoteIntent smart contract, which the creator of a note can use to say "this note is intended to be put toward this particular purpose (i.e. statement ID)." The cause-board UI should prominently display total available funding for this cause (from delegatable notes). See [delegation.md](delegation.md) for more details.

## Smart contracts

See `hardhat/contracts/alignment-attestations/`. The `AlignmentAttestations` contract emits `AlignmentAttestation` events with a required `topicStatementId` field for indexer filtering. Anyone can submit attestations of the form "subject S is aligned with statement T" (where the subject is typically a project address).

The same contract also emits `SuccessAttestation` events for the parallel claim "subject S delivered value aligned with statement T". Success attestations use the same subject encoding, statement CIDs, trust filtering, and implication propagation as alignment attestations. The cause board's Successful tab uses them as a retroactive-funding queue and only shows projects that still have outstanding, burnable receipts.

Design decisions:
  - **Assurance contracts: buying is blocked only on failure.** A project "fails" when its deadline has passed *and* the threshold hasn't been reached — only then are new purchases rejected and refunds allowed. Before the deadline, and after a successful deadline (threshold already met), buying remains open. This means a successful project continues accepting contributions indefinitely.
  - In the long run, DelegatableNotes may support additional approved spending destinations; for now LazyGiving contributions use assurance contracts, while later donations use the at-cost reimbursement flow.

## Data flow

The SDK computes all Aligning aggregations client-side:
  - Fetches `AlignmentAttestation` events from the event cache to find which projects align with a statement.
  - Fetches `SuccessAttestation` events from the same contract to find projects that delivered value aligned with a statement.
  - Fetches `ImplicationAttestation` events to find indirect alignments/successes (same simple approach as Conceptspace — no transitive graph traversal).
  - For each aligned project, reads on-chain state (totalReceived, threshold, deadline) and folds contribution/refund events to build contributor leaderboards.
  - No federation between indexers — the single event cache serves all subsystems.

## UI

See [ui.md](ui.md).
