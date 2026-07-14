# Legal risks

I'm slightly worried that some of this stuff may run afoul of various laws (in the US or Canada). I'm naive about the legal risks; AI is helping me map out what the real risks are. (Obvious caveat: none of this is legal advice — it's a map of where to spend real lawyer money. Adam is a Canadian resident, so both Canadian and US law matter.)

This directory has one file per risk area, so each can be thought about separately.

## The big picture

The smart contracts themselves are low-risk; the risk concentrates in **how the system is operated and described**. Sharper still: the scariest piece is the *story* — the retroactive-funding marketing narrative currently contradicts the "donation receipts, not investments" legal strategy. Reconciling those is the single highest-leverage move available.

Part of the strategy is to decouple the pieces into genuinely-independent systems, because at least some of them should be totally fine on their own. See [decoupling.md](/specs/tech/shared/decoupling.md) and [operator-posture.md](operator-posture.md) for how much that helps (and doesn't).

## The risks, ranked

1. **[Securities law](securities.md)** — the retroactive-funding narrative (highest risk). Also covers the secondary market and the Jan 2026 third-party-marketplace research. See [retroactive-funding-redesign.md](retroactive-funding-redesign.md) for the Jul 2026 design — **now the chosen posture** — that keeps the core of retroactive funding while removing the securities exposure (reimbursement waterfall, no market; reward via reputation/delegation), pending lawyer review of that specific variant.
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
- **[What we host and control](what-we-host-and-control.md)** — taxonomy of every kind of content the system carries (and who authors it), plus a concrete audit of the specific control points where "just a protocol" currently fails (owner keys, sole-signer roles, baked-in defaults, server chokepoints).

## Re-rank after the control audit (Jul 2026)

Assuming the [trustless channel-verification trajectory](/specs/tech/subsystems/content-funding/channel-claiming.md#the-trust-trajectory-why-we-are-not-stuck-with-a-central-verifier) ships its first trustless verifier and the [owner-key triage](/workflow/security-recoverability.md) completes, the ranking shifts below the top:

1. **Securities** — unchanged and now dominant by a wider margin; nothing in the control-audit work touches it. New wrinkle: if tokens are securities, fan-created content-contracts are third parties creating investment vehicles referencing non-consenting named creators.
2. **Operator posture of the editorial layer** — the control-audit residue after content-funding fixes: eight front doors, attester/nudger monoculture, baked-in defaults, submission queue, indexer-defined universe.
3. **Sanctions** — rises: the unclaimed-channel escrow accumulates funds for a *named person* before any wallet exists, so screening must happen at the platform-identity level at display/creation time; a trustless verifier removes the human choke point at release. Unspecced design requirement.
4. **Political funding** — rises: Civility/CSM are political-adjacent verticals, bridge-creator generates political content under our key, sponsored gas can be an in-kind contribution.
5. **Content/hosted speech** — softened on the civility side (positive-only attestations, see [content-and-speech.md](content-and-speech.md)); base statement-display exposure intact.
6. **Unconsented-creator publicity** — newly visible: strangers attach a named person's identity to a funding vehicle before consent (appropriation-of-personality flavor; veto/fee mitigate economic harm, not publicity harm). Wants explicit "created by a fan; @creator is not affiliated" framing on claim/display pages.
7. Housekeeping (charitable-solicitation wording, tax disclaimers, privacy policy) — unchanged, cheap, do now.

Caveat: "trustless verifier ships" realistically means ENS/DID for creators who have one while the tweet-based trusted backend stays the mainstream path until zkTLS matures — much better posture, not zero.

## Suggested sequence

1. **Now, cheap:** incorporate; ToS/privacy policy; scrub profit-expectation language from every user-facing doc (grep for "return," "reward," "invest," "profit," "price difference"); no-tax-receipt disclaimers.
2. **Before mainnet:** the securities posture is now **chosen** — the reimbursement-waterfall-no-market design (Design 1 + Design 2 in [retroactive-funding-redesign.md](retroactive-funding-redesign.md), decisions of record in its [Resolved decisions (Jul 2026)](retroactive-funding-redesign.md#resolved-decisions-jul-2026) section): non-transferable receipts, pro-rata simultaneous reimbursement capped at cost, no market, scout reward via reputation/UI-only delegation. What remains before mainnet is to **pay a securities lawyer (Canadian + US crypto-securities experience) to review this specific variant** — the four open questions at the end of retroactive-funding-redesign.md — not to re-choose among postures. Also: wallet screening + takedown process; political-funding content policy.
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
