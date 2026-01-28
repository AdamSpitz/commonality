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
  - See if there's a third-party secondary marketplace we could use. (OpenSea Seaport? Hmm, maybe not, it uses offchain orderbooks.) Then we can ditch ERC1155SecondaryMarket.
  - Split the pieces into separate projects. In particular:
    - conceptspace
    - alignment attestations
    - publish the smart contracts separately from the indexer+UI
  - Make the indexer(s) use The Graph rather than Ponder.
  - Make the UI(s) deployable on IPFS, not on a centralized hosting service.
  - Change the way we describe the secondary-market stuff: tokens are "donation receipts", don't talk about the idea of "investing" or "VCs". The main thing is donation. And emphasize that these tokens have no intrinsic capabilities whatsoever, other than being displayed on the website to give social recognition for donations.
  - Also make it clear that this is a decentralized protocol; we (the writers of the smart contracts) aren't endorsing any of the projects. Could be scams, could be illegal projects; we have no control over what people use it for.
