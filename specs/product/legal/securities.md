# Securities law — the retroactive-funding narrative (highest risk)

Original worry, from the early notes: the idea that you can "invest" (by selling your donation receipt on a secondary market) makes this sound like a security.

The planned fix was: call tokens "donation receipts," don't talk about "investing," emphasize they have no intrinsic capabilities. But `docs/end-user/commonality/vision-and-strategy/why-its-better/retroactive-funding.md` says, in marketing copy aimed at users:

- "Scouts **make a return on their good judgment**"
- "The **price difference** between what scouts paid and what retroactive funders pay is **the reward for taking the risk of betting early**"
- Scouts "buy tokens in projects they think will succeed"

That is close to a textbook recitation of the Howey test's "expectation of profit" prong, published by the platform operator. Regulators look at economic substance, not labels — renaming tokens "donation receipts" in one doc doesn't help while another doc explains how to profit from flipping them. Canada is not a safe harbor here: the CSA applies essentially the same investment-contract analysis (*Pacific Coast Coin Exchange*), and CSA Staff Notices 46-307/46-308 specifically target token distributions. As a Canadian resident, Adam is subject to his provincial securities regulator regardless of where the servers live.

The partially good news: the "efforts of others" prong is genuinely weaker here than in a typical token sale — scout profits come from later donors valuing the *project's* delivered results, not from Commonality's managerial efforts. That's a real argument. But operating the secondary market, the cause boards, and the promotional narrative all pull the other way, and if the tokens are securities, running `ERC1155SecondaryMarket` with a UI makes the operator look like an unregistered exchange/dealer (in Canada: CSA SN 21-329 crypto-trading-platform territory).

Note also that the securities risk attaches to the **author of the mechanism and the promotional narrative**, not the host — so the decentralized architecture and community-run UIs barely help here. See [operator-posture.md](operator-posture.md) for the full analysis, including the flip side: if the tokens are securities, community-run UIs with trading distribute exchange liability onto our supporters. The securities posture must be resolved *before* encouraging community front-ends.

**What to do:** Decide which product ships first. Two coherent postures:

- **Donation-first launch:** ship LazyGiving with transfers/secondary market disabled or de-emphasized (per-project opt-in, off by default), scrub the profit narrative from *all* user-facing docs (not just the list in the old legal notes), and defer the scout/retroactive mechanism until a securities lawyer has looked at it — possibly via the CSA Regulatory Sandbox, which exists for exactly this kind of novel structure.
- **Own it:** keep retroactive funding as the headline feature and get a formal legal opinion *before mainnet*, structured around the weak-efforts-of-others argument.

What we can't safely do is the current middle path: securities-flavored marketing plus "but we called them receipts."

### A third posture: reimbursement-capped resale (Jul 2026)

Adam's idea: tell a "get reimbursed" story instead of a "make a profit" story, and have the UI default — or the contract hard-code — that the seller's asking price is exactly what they paid. Assessment: this works, and how well depends on where it's enforced.

- **Story-only** (market still allows any price): partial credit. Promoter statements drive the expectation-of-profit prong, so it reduces the expectation *we* create — but the appreciation mechanism still exists, and observed markup flipping becomes the evidence. A better-dressed middle path.
- **UI default = cost:** real evidence of intent and of the typical user experience, but bypassable (direct contract calls, third-party UIs) and arguably cosmetic.
- **Contract-level cap (`listingPrice ≤ primaryPrice`, strict, chaining flat through resales):** qualitatively different. An instrument that can never return more than was paid has no profit expectation — Howey prong 3 collapses, and Howey is conjunctive, so the token isn't an investment contract at all. (*Edwards* makes *fixed returns* securities, but those are returns above investment; ≤-cost is the opposite.) The exchange/dealer problem largely evaporates with it. The scout mechanism becomes a **recoverable donation** (a recognized philanthropic structure): advance money, get made whole if retroactive funders show up, never profit, always bear time-value cost — which makes the altruistic motive structurally undeniable (*Forman* in its strongest form). Implementation is tractable: primary prices are per token type, so reimbursement price is computable on-chain; allow asking *less* than cost.

Caveats: (1) **no sweeteners ever** — any premium/interest/bonus resurrects the profit prong via *Edwards*; (2) we lose the scout/retro **price-difference signal** (keep "scouted N, reimbursed M" reputation signals instead) — a product trade-off; (3) weaker scout incentive ("free loan + recognition" vs. "returns"); (4) the protection only holds if we don't reopen the door — no integrating third-party markets where the tokens trade at markup, and the marketing must stay strictly reimbursement-framed; (5) fixes securities only, other risk files unchanged.

This arguably dominates the donation-first posture, since it keeps retroactive funding alive. If we pay a securities lawyer to review one design variant, review this one.

### A fourth posture: reimbursement waterfall, no market (Jul 2026)

One step past the contract-level cap: make receipt tokens non-transferable and delete the secondary market entirely; retroactive donations route through an on-chain waterfall (pro-rata scout reimbursement at cost, overflow to the project), and the scout reward moves to reputation/delegated budget. This removes the exchange/dealer category outright rather than shrinking it, and structurally forecloses the third-party markup-venue scenario below. Full analysis: [retroactive-funding-redesign.md](retroactive-funding-redesign.md).

**What if a genuine third party builds an uncapped market/UI?** Mostly their problem, not ours — and *Gary Plastic* itself is the authority: the banks issuing the CDs had no securities problem; Merrill, the third party that built the market and marketed the flip, did. Issuer and market-promoter are analyzed separately on their own conduct. Our offering is judged by what *we* led purchasers to expect at the time of sale (third-party appreciation is the collectibles situation — scalped concert tickets don't become securities). The third party running a markup venue may be creating *their own* investment-contract offering — their exposure, worth warning would-be community-UI operators about explicitly. Our protection depends on the separation staying real: (1) **no integration** — no DelegatableNotes adapter for the markup venue, no displaying its listings/prices on our surfaces, no linking to it; (2) **no profit from it** — in particular no ERC-1155 royalty hooks collecting on third-party markup sales; (3) **no promotion** — one "you can get more elsewhere" wink reattaches the expectation to us, and the *old* profit-narrative docs are historical evidence of intent, so the scrub matters under every posture; (4) **no theater** — if markup trading becomes the dominant known use and our story stays unchanged, substance-over-form can eventually reach us. Caveat: the SEC token framework lists secondary-market availability as a profit-expectation factor, so a third-party market is *a* factor against us — a weak one when everything we control says reimbursement-only. Design implication: this strengthens the contract-level cap over the UI-level cap — with a UI cap, a "third-party UI" is just another front-end on *our* market contract and markup listings land in our event stream for our own indexer/UIs to filter; with a contract cap, a third party must deploy a structurally separate market, making the separation legible and unmistakably theirs.

**What if people create separate LazyGiving contracts to reward scouts with good records?** Depends on whether the pattern is emergent or engineered:

- **Organic, discretionary, unpromoted:** safe-ish. Howey's profit expectation must be reasonable, promoter-created, and exist at the time of the outlay. Third-party after-the-fact generosity is the tips-and-prizes category (waiters aren't investors; the Nobel Prize doesn't make physics an investment contract; GitHub Sponsors doesn't make code contributions securities purchases) — no entitlement, no common enterprise between the scout's outlay and the tipper's gift.
- **Platform-featured/promoted:** re-creates the original problem with one extra hop, and the hop doesn't launder it — "put money in early; our mechanism reliably routes more back later" is an investment contract regardless of the return's delivery vehicle (cf. airdrop-expectation treatment: technically discretionary gifts still count as profit expectation once promoted/dependable). A "reward this scout" button, expected-reward stats, or "good scouts get rewarded" marketing makes the expectation ours.
- **The trap in the middle — what rewards are indexed to:** rewards compensating the scout's *work* (diligence write-ups, curation) are retroactive payment for services — income, not an investment return. But rewards proportional to *the amount advanced* collapse that framing: investment selection is what an investor does, and courts hold it is not the "own efforts" that defeat Howey (those must be managerial/operational). Per-dollar rewards are a return on capital wearing a gift costume.

Design levers if the pattern emerges: never index rewards to amount contributed (reward the record/work product, per-person not per-dollar); keep initiation with third parties (no protocol mechanics or buttons); no expectation-building displays ("scouted 12, reimbursed 9" is a record; "scouts earn on average $X" is a prospectus); never market the pattern.

Meta-point: the securities risk lives in the **expectation ecosystem**, not in any single mechanism, and expectation ecosystems route around individual caps. The cap works only while the surrounding system doesn't rebuild the expectation elsewhere. Engineered retroactive-reward patterns re-raise the question; genuinely emergent generosity, un-fed by us, generally doesn't.

## Why "the tokens have no intrinsic value" doesn't settle it (Jul 2026)

Adam's hoped-for defense: the tokens entitle holders to nothing but name-display on the website; the projects have no way (at least none provided by us) to distribute profits to holders. Why that's necessary but not sufficient:

- **Securities law tests the arrangement, not the instrument.** *Howey*'s four prongs (investment of money, common enterprise, expectation of profit, from the efforts of others) say nothing about the token carrying rights or cash flows — in *Howey* the instrument was plots of orange grove. "The token confers nothing" answers a question the test doesn't ask.
- **Where the intuition is right:** *United Housing Found. v. Forman* (1975) — co-op shares literally called "stock" were *not* securities because buyers were motivated by consumption (living there), not profit. Buyers motivated by altruism/recognition are the same shape. LazyGiving configured as contribute → receipt → name display is Kickstarter-with-extra-steps, and that configuration is close to airtight.
- **Where it breaks:** (1) *Forman* itself defines profit to include **capital appreciation** — no dividend needed, and the scout mechanism is capital appreciation by design; (2) *Gary Plastic v. Merrill Lynch* (2d Cir. 1985) — ordinary bank CDs became securities because the promoter **created a secondary market and marketed the liquidity/appreciation**; the instrument was innocuous, the promoter's market-plus-story converted it; (3) SEC v. Impact Theory / Stoner Cats (2023) — NFTs with no rights beyond images/community were charged as securities purely on profit-expectation marketing; (4) *Pacific Coast Coin Exchange* (SCC 1978) — physical silver coins with zero yield were an investment contract because sold with a promised liquid resale market. That's the controlling Canadian analysis.
- **Self-inflicted evidence:** the Aligning spec's own vocabulary distinguishes "investors (holding tokens, may sell later)" from "donors (tokens burned)" — conceding that one buyer class holds in expectation of resale value.
- **Prong-by-prong:** money yes; common enterprise yes (pooled funds, fortunes rise together); profit expectation — no for burners, yes for scouts *and we create the expectation*; efforts-of-others — the genuinely contestable prong (scout profit comes from later donors' altruistic valuation of delivered results, not our managerial efforts), but it's one contested prong out of four.
- **Fair counterpoint:** collectibles appreciate on secondary markets without being securities — but courts distinguish appreciation that happens *to* an asset from an appreciation mechanism the promoter designed and advertises. We designed the mechanism and wrote the ad.

**Upshot:** the no-intrinsic-value defense fully covers the donation configuration and cannot cover the scout configuration, because the scout configuration's entire value proposition is the thing the defense denies. Same token, different offering — which is why donation-first severs cleanly and the middle path doesn't work.

## Third-party secondary marketplace research (Jan 2026)

The question: can we replace our custom `ERC1155SecondaryMarket` contract with an existing third-party protocol? This would reduce legal risk (we're just using standard infrastructure, not publishing our own marketplace) and reduce maintenance burden.

**Options investigated:**

1. **OpenSea Seaport** (v1.6): The most widely-used NFT marketplace protocol. Settlement happens on-chain, but the **orderbook is off-chain** — orders are signed by users and stored on OpenSea's backend (or a Reservoir aggregator). There's no on-chain way to browse/discover orders without an off-chain indexer. Seaport 1.6 added "hooks" (like Uniswap v4 hooks) for extensibility, but the fundamental off-chain-orderbook architecture hasn't changed.

2. **SudoSwap** (v2): An on-chain AMM for NFTs. Supports ERC-1155. Fully on-chain — no off-chain orderbook dependency. Uses bonding curves (linear, exponential, XYK) rather than a limit-order book. This is a fundamentally different model: instead of listing specific ask/bid orders, users create liquidity pools with automated pricing. Good for liquid markets; less natural for the "one seller lists a specific lot at a specific price" use case that our current contract handles.

3. **Rarible Protocol**: Open-source NFT exchange contracts. Has a shared orderbook across Rarible-ecosystem apps. However, it's primarily designed around Rarible's own ecosystem and the orderbook sharing is within that ecosystem.

4. **Reservoir**: An aggregator layer that normalizes orders across Seaport, Rarible, SudoSwap, etc. Provides APIs and a React SDK. Useful if we want to tap into existing marketplace liquidity, but it's an off-chain API layer, not a standalone on-chain contract.

**Assessment:**

None of these are a clean drop-in replacement for our `ERC1155SecondaryMarket`. The main issue is that our system needs to interact with the secondary market *from other smart contracts* (specifically, `DelegatableNotes.purchaseFromSecondaryMarket` calls `fulfillSaleListingTo` on our contract). This rules out off-chain-orderbook protocols (Seaport, Reservoir) unless we add an off-chain component to match orders and submit fulfillment transactions — which would significantly complicate our architecture and add centralization.

SudoSwap is the closest to viable (fully on-chain, supports ERC-1155), but it's an AMM, not an orderbook. The mental model is different: instead of "Alice lists 5 tokens at 0.1 ETH each", it's "Alice creates a pool with a bonding curve." This could actually work for our use case, but would require rethinking how we describe secondary-market trading in the UI and how `DelegatableNotes` interacts with it.

**Recommendation:** Keep our custom `ERC1155SecondaryMarket` for now. It's simple (~400 lines), well-tested, and the fact that similar on-chain orderbook contracts are common ("tutorial-level exercises") actually supports the argument that publishing it isn't a legal risk. The bigger legal concerns are around the UI and how things are described, not the existence of this generic contract.

If we want to revisit this later, the most promising path would be integrating with SudoSwap v2 pools, but that's a significant architectural change best deferred until after initial deployment.
