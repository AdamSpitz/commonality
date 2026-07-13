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
