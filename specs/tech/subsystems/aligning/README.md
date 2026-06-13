# Aligning

Each statement in the Concept Space has a link to its own Aligning (i.e. "here are a bunch of fundable projects that are (directly or indirectly) aligned with statement S"). Anyone can submit AlignmentAttestation events of the form "subject S is aligned with statement T" (where the subject is typically a project address). Each project is basically a crypto-based Kickstarter (e.g. an ERC-1155 contract where people can buy NFTs and the proceeds go towards funding the project).

Some points about this:

  -   **Implication arrows reduce need for coordination:** Just like with the number-of-supporters in the Concept Space UI, the Aligning system can make use of the Implication Attestations: the cause board for a statement S can show projects that have been attested to be aligned with *any* statement S2 such that S2 implies S. So people shouldn't need to worry too much about which particular statement S to submit their project under; anything roughly in the right ballpark is probably fine.

  -   **Social recognition:** The NFTs have no intrinsic capabilities themselves (i.e. they're not like shares of stock; they don't entitle the holder to a share of the project's profits or a say in the project's decisions; these projects are intended to be "public good" kinds of projects, in the sense that economists use the term: non-excludable and non-rivalrous), other than that investors and donors receive social recognition by having their account address (or ENS name) appear on the website (both for the individual project and for the cause board for that cause, e.g. "here are the top 10 contributors to projects aligned with this cause").

  -   **Retroactive Funding:** NFTs can be resold on the secondary market, creating a distinction between "investors" (holding tokens, may sell later) and "donors" (tokens burned). See [docs/end-user/lazyGiving/retroactive-funding.md](/docs/end-user/lazyGiving/retroactive-funding.md) for the full explanation. The mechanism: early backers can exit by selling to altruistic donors later — nano-VCs for public goods.
  
  -   **Highlighting successful projects:** A cause board currently shows projects *aligned* with a cause (i.e. that *intend* to produce value). The natural next layer is showing projects that have *already delivered* value aligned with the cause, via a "success attestation" claim type parallel to alignment attestations (same cause anchor, same trust-graph filter, same implication propagation). This is the foundation retroactive funding needs. See [specs/product/successful-projects.md](/specs/product/successful-projects.md).

  -   **More-objective success/alignment verification:** This is more of a vague future idea than a concrete feature, but if some particular project is capable of defining more-objective criteria by which its success/alignment can be verified, that opens up interesting possibilities for tying funding to its success, making decisions based on its predicted success (a la futarchy), etc.

  -   **Delegation:** A DelegatableNotes smart contract allows users to delegate their funding decisions to someone they trust, to eliminate the friction of the money-providers needing to make all those decisions themselves. There's also a NoteIntent smart contract, which the creator of a note can use to say "this note is intended to be put toward this particular purpose (i.e. statement ID)." The cause-board UI should prominently display total available funding for this cause (from delegatable notes). See [delegation.md](delegation.md) for more details.

## Smart contracts

See `hardhat/contracts/alignment-attestations/`. The `AlignmentAttestations` contract emits `AlignmentAttestation` events with a required `topicStatementId` field for indexer filtering. Anyone can submit attestations of the form "subject S is aligned with statement T" (where the subject is typically a project address).

Design decisions:
  - **Assurance contracts: buying is blocked only on failure.** A project "fails" when its deadline has passed *and* the threshold hasn't been reached — only then are new purchases rejected and refunds allowed. Before the deadline, and after a successful deadline (threshold already met), buying remains open. This means a successful project continues accepting contributions indefinitely.
  - In the long run, DelegatableNotes should support various DEXes or DEX aggregators for spending; for now it's fine to use just the primary and secondary market capabilities of our own contracts.

## Data flow

The SDK computes all Aligning aggregations client-side:
  - Fetches `AlignmentAttestation` events from the event cache to find which projects align with a statement.
  - Fetches `ImplicationAttestation` events to find indirect alignments (same simple approach as Conceptspace — no transitive graph traversal).
  - For each aligned project, reads on-chain state (totalReceived, threshold, deadline) and folds contribution/refund events to build contributor leaderboards.
  - No federation between indexers — the single event cache serves all subsystems.

## UI

See [ui.md](ui.md).
