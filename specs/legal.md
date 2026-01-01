# Legality of this

I'm slightly worried that some of this stuff may run afoul of various laws (in the US or Canada).

I think maybe part of the strategy for dealing with this is to decouple the pieces into genuinely-independent system, because at least some of them should be totally fine. See decoupling.md.

I'm naive about the legal risks. Maybe AI can help me figure out what the real risks are.

Even for the token stuff, some of the smart contracts (like FreeERC1155, PremintingERC1155, AssuranceContract, ERC1155PrimaryMarket, and ERC1155SecondaryMarket) seem so simple and generic that they're basically tutorial-level exercises. So my suspiciom (correct me if I'm wrong, I'm just making this up) is that publishing those smart contracts themselves isn't a legal risk (there's gotta be many smart contracts exactly like them already onchain). It's more about how they're all put together and how they're described in the UI/documentation/marketing.

High Risk:
  - DelegatableNotes purchasing from secondary markets
  - The retroactive funding narrative (VCs exit to donors)
  - UI/marketing that emphasizes profit potential
  - Creating an integrated platform that routes belief -> money -> projects

Lower Risk:
  - Publishing standalone contracts
  - Documentation that describes technical capabilities without investment promises
  - Separation between the belief system and the funding system

Specific recommendations from the AI (NOT from a real human legal expert; don't treat this as legal advice, just early-stage vague hints at what direction to go in):

Tier 1: Zero-Risk Generic Infrastructure (Publish freely)
  - Beliefs.sol - "people can attest to bytes32 identifiers"
  - Implications.sol - "attesters can link bytes32 identifiers"
  - FreeERC1155.sol
  - PremintingERC1155.sol
  - ERC1155SecondaryMarket.sol - "generic NFT marketplace" (but note that it might be better to use an already-existing thing; OpenSea Seaport?)
  - AssuranceContract.sol - "crowdfunding primitive"
  - IPFS + DAG-JSON stuff

These are just tools. It's like publishing a database library - it doesn't matter what data people put in it.

Tier 2: Medium-Risk Application-Specific (Document carefully)
  - ProjectAlignment.sol - "link contracts to content IDs"
  - DelegatableNotes.sol - "delegatable smart contract wallet"

These are still fairly generic but getting closer to your specific use case. The key is how you document them:
  - Risky: "This lets VCs invest in public goods projects and exit to donors"
  - Safer: "This is a delegatable wallet that can execute purchases on behalf of a principal"

Tier 3: High-Risk Integration Layer (This is where you need to be careful)
  - UI that connects beliefs -> projects -> funding
  - Indexer that computes "projects aligned with causes"
  - Marketing/documentation that describes the full system
  - Any "official" deployment you promote

Decoupling and genericification suggestions:
  1. Separate the Statement/Attestation System. Like, make Concept Space completely independent: its own repo and website and so on. No mention of funding anywhere. Present it as "decentralized knowledge graph" or "semantic web primitives". (This is genuinely true! The system can absolutely be useful for other purposes: academic citations, fact-checking networks, etc.) We can honestly say "we built a belief attestation system; what people do with that data is up to them."
  2. Generic-ify DelegatableNotes. Remove the intendedStatementId field, or at least make it clear it's just arbitrary bytes32 metadata. Document it as "A smart contract wallet with composable delegation". Focus on the delegation primitive, not the cause-based funding use case. (Which, again, is true. It really is a generic primitive!)
  3. De-emphasize Secondary Markets & Profit Expectation. This is the Achilles heel. The retroactive funding model is great but it's also what triggers securities law. Options:
Don't build the secondary market integration yourself - just provide the ERC1155 tokens and let others build marketplaces
Emphasize the donor path (burning tokens) over the investor path
In UI/docs, focus on "support causes" not "invest in projects"
Don't calculate or display price appreciation or ROI
Why this helps: If tokens are primarily used as "proof of support" (like GitHub sponsors) rather than investments, it's much less clearly a security.
  4. The "Protocol Not Platform" Defense. Structure it so you're publishing open source contracts, optional indexer software, optional UI code, but you're not operating a centralized platform. This is similar to how Uniswap structured things. Courts are more likely to go after platform operators than protocol developers.

Thoughts:
  - If I'm removing the intendedStatementId from the notes, can I add it back in in a more decoupled way? Like, just have some other way of emitting an event that some note is for some purpose? That sounds like a useful decoupling anyway.
  - 

Questions:
  - 

Other stuff from the AI:

The fundamental tension is: your project's coolest feature (retroactive funding creating VC-like incentives) is also its biggest legal risk. You have to decide:
  - Do you make the system less integrated/automatic to reduce risk but also reduce effectiveness?
  - Do you get legal counsel and try to structure it properly?
  - Do you launch it pseudonymously/offshore and accept the risk?
  - Do you pivot to a donation-only model (no secondary markets)?

What Would Minimal Legal Surface Look Like?

If you wanted to be extremely conservative:
  - Publish: Generic attestation contracts (Beliefs, Implications) + generic crowdfunding contracts (AssuranceContract, ERC1155 markets)
  - Document: "Here are some primitives. You can combine them in various ways."
  - Don't build: Integrated UI that routes belief→funding, "official" indexer that computes alignment, marketing about retroactive funding
  - Let emerge: Community builds UIs, runs indexers, creates the integration

This protects you but delays getting traction.


## Summary from me

Okay, so trying to describe all the pieces here and how we describe them:

  - Statements are simple immutable displayable linked documents, stored as DAG-JSON. The system isn't even specific to statements, and has no dependency whatsoever on anything involving finance.
  - Conceptspace is about belief attestations and implication attestations. Nothing to do with finance.
  - If we provide PremintingERC1155 and FreeERC1155 at all, they're very basic tutorial-level smart contracts. Any legal trouble is going to have more to do with whatever larger system we build out of them.
  - AlignmentAttestations can be made generic, not about these token projects specifically. It's a generic way of saying "I attest that this thingy is aligned with that cause." Nothing to do with finance (though some higher-level system might use it to attest to a project's alignment).
  - DelegatableNotes (now that we've removed the intendedStatementId) has nothing to do with purposes, it's just a pure financial primitive.

Hmm, I'm starting to get the picture that (if this analysis is correct) the legally-scarier pieces might be the UIs, not the smart contracts.

  - "Here are some projects that have been attested to be aligned with this cause."
    - What if the cause is Bad? Now our site is helping fund Bad stuff.
    - What if the attestations are malicious/misleading? People might be tricked into donating to bad projects.
  - "Here's a project you can donate to or invest in."
    - What if the project is a scam? Now our site is showing scams.
    - What if the project is for a Bad purpose? Now our site is helping fund Bad stuff.
    - The idea that you can "invest" (by selling your donation receipt on a secondary market) makes this sound like a security.

Thoughts on how to deal with that:
  - Can we make it so that there's a generic indexer system (maybe we can use The Graph?) where we don't index every cause (in fact, I don't even see how we could), but rather if someone out there is interested in a particular cause, they provide the statementId and some payment (not to us, but to The Graph or whatever) and then that's how they spin up the indexer for their cause?
  - Same for UIs? We don't host a universal one. Or we just put the UI on IPFS or something?
  - Don't call it "investing". Call the tokens "donation receipts"; sure, it's possible to buy and sell donation receipts (and we do integrate buttons for that into the UI), but (a) the donation receipts don't have any intrinsic value other than the social recognition from having them displayed online, and (b) maybe it helps if the UI is on IPFS rather than hosted on a domain we control?
