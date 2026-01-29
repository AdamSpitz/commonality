# Legality of this

I'm slightly worried that some of this stuff may run afoul of various laws (in the US or Canada).

I think maybe part of the strategy for dealing with this is to decouple the pieces into genuinely-independent system, because at least some of them should be totally fine. See decoupling.md.

I'm naive about the legal risks. Maybe AI can help me figure out what the real risks are.

The conceptspace stuff (IPFS statement-storage stuff, Beliefs and Implications contracts, and the conceptspace UI) seems fine, no finance involved so no major worries there. (Still might want to be clear, though, about the fact that this is a protocol, not a platform. We're not endorsing these ideas.)

Even for the financial stuff, some of the smart contracts (like FreeERC1155, PremintingERC1155, AssuranceContract, ERC1155PrimaryMarket, and ERC1155SecondaryMarket) seem so simple and generic that they're basically tutorial-level exercises. So my suspicion is that publishing those smart contracts themselves isn't a legal risk (there's gotta be many smart contracts exactly like them already onchain). It's more about how they're all put together and how they're described in the UI/documentation/marketing.

DelegatableNotes feels a bit riskier, but again it's a pure financial primitive. (We've taken out the old idea of "here's the statementId that this note is intended to be put towards"; we'll implement that using separate attestations.)

Hmm, I'm starting to get the picture that (if this analysis is correct) the legally-scarier pieces might be the UIs, not the smart contracts.

  - "Here are some projects that have been attested to be aligned with this cause."
    - What if the cause is Bad? Now our site is helping fund Bad stuff.
    - What if the attestations are malicious/misleading? People might be tricked into donating to bad projects.
  - "Here's a project you can donate to or invest in."
    - What if the project is a scam? Now our site is showing scams.
    - What if the project is for a Bad purpose? Now our site is helping fund Bad stuff.
    - The idea that you can "invest" (by selling your donation receipt on a secondary market) makes this sound like a security.

Improvements to make:
  - ~~Generalize ProjectAlignmentAttestation into AlignmentAttestation.~~ **Done.** Now called `AlignmentAttestations` contract with `AlignmentAttestation` event.
  - See if there's a third-party secondary marketplace we could use, so we can ditch ERC1155SecondaryMarket. **Research done** (Jan 2026) — see findings below.
  - Split the pieces into separate projects. In particular:
    - conceptspace
    - alignment attestations
    - publish the smart contracts separately from the indexer+UI
  - Make the indexer(s) use The Graph rather than Ponder.
  - Make the UI(s) deployable on IPFS, not on a centralized hosting service.
  - Change the way we describe the secondary-market stuff: tokens are "donation receipts", don't talk about the idea of "investing" or "VCs". The main thing is donation. And emphasize that these tokens have no intrinsic capabilities whatsoever, other than being displayed on the website to give social recognition for donations.
  - Also make it clear that this is a decentralized protocol; we (the writers of the smart contracts) aren't endorsing any of the projects. Could be scams, could be illegal projects; we have no control over what people use it for.

### Third-party secondary marketplace research (Jan 2026)

The question: can we replace our custom `ERC1155SecondaryMarket` contract with an existing third-party protocol? This would reduce legal risk (we're just using standard infrastructure, not publishing our own marketplace) and reduce maintenance burden.

**Options investigated:**

1. **OpenSea Seaport** (v1.6): The most widely-used NFT marketplace protocol. Settlement happens on-chain, but the **orderbook is off-chain** — orders are signed by users and stored on OpenSea's backend (or a Reservoir aggregator). There's no on-chain way to browse/discover orders without an off-chain indexer. Seaport 1.6 added "hooks" (like Uniswap v4 hooks) for extensibility, but the fundamental off-chain-orderbook architecture hasn't changed.

2. **SudoSwap** (v2): An on-chain AMM for NFTs. Supports ERC-1155. Fully on-chain — no off-chain orderbook dependency. Uses bonding curves (linear, exponential, XYK) rather than a limit-order book. This is a fundamentally different model: instead of listing specific ask/bid orders, users create liquidity pools with automated pricing. Good for liquid markets; less natural for the "one seller lists a specific lot at a specific price" use case that our current contract handles.

3. **Rarible Protocol**: Open-source NFT exchange contracts. Has a shared orderbook across Rarible-ecosystem apps. However, it's primarily designed around Rarible's own ecosystem and the orderbook sharing is within that ecosystem.

4. **Reservoir**: An aggregator layer that normalizes orders across Seaport, Rarible, SudoSwap, etc. Provides APIs and a React SDK. Useful if we want to tap into existing marketplace liquidity, but it's an off-chain API layer, not a standalone on-chain contract.

**Assessment:**

None of these are a clean drop-in replacement for our `ERC1155SecondaryMarket`. The main issue is that our system needs to interact with the secondary market *from other smart contracts* (specifically, `DelegatableNotes.purchaseFromSecondaryMarket` calls `fulfillSaleListingTo` on our contract). This rules out off-chain-orderbook protocols (Seaport, Reservoir) unless we add an off-chain component to match orders and submit fulfillment transactions — which would significantly complicate our architecture and add centralization.

SudoSwap is the closest to viable (fully on-chain, supports ERC-1155), but it's an AMM, not an orderbook. The mental model is different: instead of "Alice lists 5 tokens at 0.1 ETH each", it's "Alice creates a pool with a bonding curve." This could actually work for our use case, but would require rethinking how we describe secondary-market trading in the UI and how `DelegatableNotes` interacts with it.

**Recommendation:** Keep our custom `ERC1155SecondaryMarket` for now. It's simple (~400 lines), well-tested, and the fact that similar on-chain orderbook contracts are common (as the user noted, "tutorial-level exercises") actually supports the argument that publishing it isn't a legal risk. The bigger legal concerns are around the UI and how things are described, not the existence of this generic contract.

If we want to revisit this later, the most promising path would be integrating with SudoSwap v2 pools, but that's a significant architectural change best deferred until after initial deployment.
