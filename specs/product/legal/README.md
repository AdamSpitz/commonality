# Legal risks

I'm slightly worried that some of this stuff may run afoul of various laws (in the US or Canada). I'm naive about the legal risks; AI is helping me map out what the real risks are. (Obvious caveat: none of this is legal advice — it's a map of where to spend real lawyer money. Adam is a Canadian resident, so both Canadian and US law matter.)

This directory has one file per risk area, so each can be thought about separately.

## The big picture

The smart contracts themselves are low-risk; the risk concentrates in **how the system is operated and described**. Sharper still: the scariest piece is the *story* — the retroactive-funding marketing narrative currently contradicts the "donation receipts, not investments" legal strategy. Reconciling those is the single highest-leverage move available.

Part of the strategy is to decouple the pieces into genuinely-independent systems, because at least some of them should be totally fine on their own. See [decoupling.md](/specs/tech/shared/decoupling.md) and [operator-posture.md](operator-posture.md) for how much that helps (and doesn't).

## The risks, ranked

1. **[Securities law](securities.md)** — the retroactive-funding narrative (highest risk). Also covers the secondary market and the Jan 2026 third-party-marketplace research.
2. **[Operator posture](operator-posture.md)** — running the default UIs/services undermines the "decentralized protocol" defense; how much the open architecture and community-run UIs help.
3. **[Money transmission](money-transmission.md)** — mostly solved by the non-custodial architecture; keep it that way.
4. **[Sanctions and terrorist financing](sanctions.md)** — the "what if the cause is Bad?" worry, with its concrete legal edge.
5. **[Content and hosted speech](content-and-speech.md)** — statements, attestations, defamation; not as risk-free as it first looked, because Canada has no Section 230.
6. **[Political funding](political-funding.md)** — campaign-finance regimes, CSM and Civility exposure.
7. Smaller items:
   - **[Charitable solicitation](charitable-solicitation.md)** — "donation" framing and fundraising-platform regulation.
   - **[Tax](tax.md)** — "not a tax receipt" disclaimers; Adam's own dev-time funding is ordinary income.
   - **[Privacy](privacy.md)** — PIPEDA and the trust-graph/email/on-chain data combination.
8. **[Publishing the smart contracts](smart-contracts.md)** — why this piece is low-risk (mostly reassurance, but worth keeping the reasoning).

Cross-cutting analysis:

- **[Multiple providers](multiple-providers.md)** — inventory of every subsystem/service: its purpose, the exposure operating it creates, and whether multiple independent providers actually changes the legal analysis.

## Suggested sequence

1. **Now, cheap:** incorporate; ToS/privacy policy; scrub profit-expectation language from every user-facing doc (grep for "return," "reward," "invest," "profit," "price difference"); no-tax-receipt disclaimers.
2. **Before mainnet:** the securities decision (donation-first vs. legal opinion — this is the one place to actually pay a lawyer, one with Canadian + US crypto-securities experience); wallet screening + takedown process; political-funding content policy.
3. **Ongoing:** keep the bridges.md discipline (never touch funds); revisit the Coinbase political-activities disclosure before CSM money flows; pursue decoupling for its own sake, not as the legal strategy.

## Cross-cutting improvements to make

- ~~Generalize ProjectAlignmentAttestation into AlignmentAttestation.~~ **Done.** Now called `AlignmentAttestations` contract with `AlignmentAttestation` event.
- See if there's a third-party secondary marketplace we could use, so we can ditch ERC1155SecondaryMarket. **Research done** (Jan 2026) — see [securities.md](securities.md).
- Split the pieces into separate projects. In particular:
  - conceptspace
  - alignment attestations
  - publish the smart contracts separately from the indexer+UI
- Make the indexer(s) use The Graph rather than Ponder.
- Make the UI(s) deployable on IPFS, not on a centralized hosting service.
- Change the way we describe the secondary-market stuff: tokens are "donation receipts", don't talk about the idea of "investing" or "VCs". The main thing is donation. And emphasize that these tokens have no intrinsic capabilities whatsoever, other than being displayed on the website to give social recognition for donations.
- Also make it clear that this is a decentralized protocol; we (the writers of the smart contracts) aren't endorsing any of the projects. Could be scams, could be illegal projects; we have no control over what people use it for. (But see [operator-posture.md](operator-posture.md) — this can't be the *primary* defense while we're the sole operator.)
