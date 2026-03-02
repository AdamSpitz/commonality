# Top-level spec

This is the top-level spec for a software project called Commonality.

It's meant to be built using technology like blockchains and IPFS.

The original motivating thought was something like: Balaji Srinivasan's "network state" sounds great, except that it sorta seems like he's envisioning something like a big monolithic million-member Discord chat with a treasury, which sounds awful - big groups (governments or corporations or whatever) don't really work all that well.

So the overall goal is something like:
  - Make it possible for large numbers of aligned people to coordinate online: keep track of their numbers, and crowdfund projects that are aligned with their cause.
  - But do this in a way that's not a big monolithic group, but rather a big network of individuals (with a really great coordination system to make it all hang together).

Key ideas:
  - Implication attestations reduce coordination friction: Use AI-generated "S1 implies S2" attestations to eliminate the need for everyone to rally around a single canonical statement. People can create improved/alternative versions while inheriting indirect support.
  - Retroactive funding via resellable NFTs: separate the "good at identifying promising projects" skill (investors) from "willing to donate" (donors) by making contribution NFTs tradeable on secondary markets, creating a VC-like system for public goods.
  - Composable delegation enables nano-trustees: Allow people to contribute funds but delegate spending decisions to trusted individuals (who can further delegate), creating chains of specialized judgment without requiring everyone to evaluate every project.
  - AI skills make this system easy to use.


## What to do with this spec

The intention here is to leverage AI to help build this project quickly.

Motivation: I'm doing this to try to address problems that I've had when trying to build projects with AI assistance in the past. I want to see if I can find a sweet spot in between "progress is very slow because I'm insisting on grokking the actual code" and "the AI is producing tons of code but it's kinda messy and broken and doesn't really do what I want".

Here are some techniques that I think I'm finding useful.

### Rambling, then consolidating

I've had some success doing this little dance:

  - Writing (in this file) vague hand-wavy thoughts along the lines of "we should flesh out such-and-such in more detail; we'll ask an AI to do that and put the results in arglebargle.md."
  - Then asking the AI, "Please read specs/README.md and anything else relevant, then write up arglebargle.md for me."
  - And *then* immediately asking the AI, "Can you read through specs/README.md, then read through arglebargle.md, and then if there's anything in the latter that isn't obvious from the former, *concisely* add it to the former? (The point is that I'd like to delete the latter if I can; I just want to make sure that all the stuff in there will be obvious to a future AI implementer.)"

Doing it in two separate steps like that (first generate a big long verbose file with whatever the AI can think of, then analyze it and retain a concise summary in the spec) lets me keep this top-level spec as the single official "source code" of the project, while leveraging AI to help me think through various aspects of the project and flesh out the spec.

(It's not even that weird, now that I think about it. It's a perfectly normal thing that I do in my own thinking too: first I let myself ramble a bunch and write up whatever thoughts I have, and then I look at that and say "okay but are there *actually* any new insights in there?" The long-winded rambling isn't actually useful to keep around.)

### Multi-level specs

When we do eventually reach the point of wanting to build the actual code, I'm not sure whether we'll be able to just do it in one fell swoop ("please read specs/README.md and then implement the entire thing") or whether it'll make more sense to ask it to build a piece at a time, or maybe feed this top-level spec through an AI to generate the medium-detail specs *again* and then feed those mid-level specs through an AI to generate actual runnable code, or whatever. We can experiment.

Useful question to ask the AI occasionally: "Please read specs/README.md and anything else relevant, then let me know whether you think you could write up mid-level specs for each subcomponent, in such a way that AIs reading those mid-level specs could build their subcomponent without needing to understand the entire project. Are there clear integration points (like interfaces and data formats and event schemas and so on), so that rebuilding one subcomponent won't unnecessarily require rebuilding other subcomponents?"

If you're an AI who's reading this top-level spec and generating a mid-level spec:
  - Make sure to include concrete examples and edge cases, not just abstract requirements (especially when that will help to clarify things for an AI that doesn't have as much understanding of the overall wider system).
  - Also make sure to include concrete code examples for integration points, like APIs intended to be called by other modules (because when we regenerate one module, we don't want to need to regenerate all the other modules that call it).
  - Put in a comment mentioning that the file is AI-generated.

At the end of the day, I don't want to be afraid to blow away anything that's AI-generated (or at least anything that I haven't grokked) and regenerate it.


### Generating, then blessing

To some extent I would actually be happy to ask AI to generate some useful mid-level artifacts, so that I can check them for myself and make sure they make sense to me and then "bless" them by considering them part of the top-level spec (i.e. *not* blow them away in the future, but treat them as "source code").

That's roughly what I'm doing with the smart contracts - they're simple enough and important enough that I feel like it's better for me to make sure that I grok them and then include them in the "source code".

But also this might be useful with things other than code artifacts. e.g. It might be useful if AI could write up English descriptions of some things and then I can bless them.


### Reviews

See REVIEWS.md.


## Main components

The overall system is made of two big components: Concept Space and Funding Portals.

See [subsystems/conceptspace/README.md](subsystems/conceptspace/README.md) (statements, beliefs, and AI-generated implication relationships) and [subsystems/fundingportals/README.md](subsystems/fundingportals/README.md) (crowdfunding projects with retroactive funding and delegation) for more detail, but here are the main ideas:

### Concept Space

  - Users create immutable statements (representing ideas/causes) stored on IPFS and sign them onchain to express belief/disbelief.
  - AI attesters publish "S1 implies S2" relationships, enabling indirect support tracking — people can create improved versions of statements while inheriting support via direct implication attestations. This drastically reduces the need for coordination: no need to rally around a single canonical statement, yet the system gently nudges toward coordination by suggesting more-popular equivalent statements. (Note: implications are *not* transitive - if you want to know whether S1 supporters indirectly support S3, you need a direct attestation from S1 to S3, not a chain through S2. This avoids the problem where S1→S2 and S2→S3 each seem reasonable but S1→S3 is a stretch.)
  - Later (don't bother with this for the MVP) we can make it easy for a user (or an AI that the user trusts) to click a button that says "that implication attestation is bogus" and "stop trusting whoever attested to that". Point is, it's not like it's some horrible problem if we have a rogue attester that starts producing bad implication attestations - it's not actually hard for the system to self-correct.

### Funding Portals

  - Each statement has a funding portal showing aligned projects (Kickstarter-style ERC-1155 contracts).
    - Projects inherit alignment through the implication graph, so submitters don't need to worry about exact statement matching.
  - Contribution NFTs are resellable, creating a retroactive funding market: VCs identify promising projects early, then exit by selling to altruistic donors later.
  - Users can create "delegatable notes" to let trusted individuals make funding decisions on their behalf (with composable, revocable delegation chains).
  - The system provides transparency and social recognition by displaying contributor leaderboards and full delegation chains.


## Tech choices

  - Blockchain (some Ethereum L2) and IPFS for trustless verification and censorship resistance
  - Statements are immutable IPFS content (identified by CID)
  - Various events are emitted by onchain transactions
  - Smart contracts in Solidity
  - Indexer uses Ponder, exposes GraphQL APIs
  - UI stack: TypeScript, Vite, Material UI, viem/wagmi/connectkit for blockchain interaction.

See [shared/tech.md](shared/tech.md) for details on tech choices and rationale (why blockchain, which L2, indexer infrastructure, deployment considerations).


## Terminology / concepts

We may want to generate a list of terms and concepts, just to pin down what we mean by each term. For now let's not bother - let's just try to make this top-level spec use terms clearly. (I previously tried generating a file called specs/glossary.md, but honestly it was more trouble than it was worth.)


## AI skills

There can be various AI skills to aid in (or partially automate) using various aspects of the system.

See [ai-skills.md](ai-skills.md) for more info.


## Artifacts

This section describes the conceptually-separate subsystems that make up Commonality. These represent the *logical architecture* - how we think about and organize the code, schemas, and APIs. The *physical deployment* (whether these run as separate services or in a single process) is a separate decision that can change without affecting the code structure.

### Core Subsystems

The system is divided into several independent subsystems, each with its own domain, smart contracts, indexer, and UI components:

#### 1. Concept Space Subsystem
**Domain:** Statements, beliefs, and implication relationships

Components:
  - **Smart contracts:**
    - `Beliefs` - for users to express belief/disbelief in statements
    - `Implications` - for attesters to publish "S1 implies S2" relationships
  - **Indexer:** Tracks statement content (cached from IPFS), user beliefs, and implication attestations organized by attester. Computes indirect support by looking up direct implication attestations (no transitive graph traversal needed).
  - **UI:** Browse/search statements, view statement pages with support metrics, user pages showing signed statements, settings for configuring trusted attesters
  - **Implication Attester AI:** Standalone service that evaluates statement relationships and publishes attestations (can be deployed independently; other attesters can exist too)

#### 2. Pubstarter Subsystem
**Domain:** Individual crowdfunding projects (Kickstarter-style primary market)

Components:
  - **Smart contracts:** `AssuranceContract`, `ERC1155PrimaryMarket` - ERC-1155 project contracts with threshold-based funding, deadlines, refunds (in `hardhat/contracts/individual-projects/`)
  - **Indexer:** Tracks project details, contributions, token holders, burned tokens (donors vs investors)
  - **UI:** Individual project pages showing funding progress, contributor leaderboards

#### 3. Marketplace Subsystem
**Domain:** Secondary market trading for ERC-1155 tokens

Components:
  - **Smart contracts:** `ERC1155SecondaryMarket` - generic order book for any ERC-1155 tokens (in `hardhat/contracts/marketplace/`)
  - **Indexer:** Tracks active buy/sell orders, order fills, price history
  - **UI:** Trading interface with order book display, buy/sell forms

Note: This is generic infrastructure for peer-to-peer trading. Could be used for any ERC-1155 secondary market, not just Pubstarter project tokens.

#### 4. Delegation Subsystem
**Domain:** Delegatable notes and trust chains

Components:
  - **Smart contracts:** `DelegatableNotes` - allows users to delegate funding decisions with composable, revocable chains
  - **Indexer:** Tracks active notes, full delegation chains, and (if implemented) commission structures
  - **UI:** Note management interface, delegation chain visualization, spending controls

#### 5. Funding Portal Subsystem
**Domain:** Cross-cutting views that join concepts, projects, and funding

Components:
  - **Smart contracts:** `AlignmentAttestations` - for attesting that subjects (typically projects) align with statements
  - **Indexer:** Handles complex federated queries by calling the GraphQL APIs of other indexers (Concept Space, Pubstarter, Marketplace, Delegation). Computes indirect project alignment via implication graphs, aggregates funding by cause, generates contributor leaderboards.
  - **UI:** Cause-specific funding portals showing all aligned projects (direct and indirect), available funding from delegatable notes, cross-project contributor rankings

### Subsystem Dependencies

```
Concept Space ──┐
                │
Pubstarter ────┼──> Funding Portal (federates queries to others)
                │
Marketplace ───┤
                │
Delegation ────┘

(Arrows show data flow; Funding Portal queries the APIs of the other four)
```

The four foundational subsystems (Concept Space, Pubstarter, Marketplace, Delegation) are independent and have no dependencies on each other. The Funding Portal subsystem orchestrates cross-cutting queries by federating to their GraphQL APIs.

### Why This Structure?

- **Clear separation of concerns:** Each subsystem has a well-defined domain and can be reasoned about independently
- **Independent testing:** Can test each subsystem with mock upstream dependencies
- **Flexible deployment:** Can deploy as separate services (for scalability) or as a monolith (for simplicity), without changing the code structure
- **Reusability:** Each subsystem could potentially be used in other contexts (e.g., the Pubstarter subsystem works for any crowdfunding system, not just Commonality)

### Technical details

When asking AI to generate mid-level specs and code, I've found that it sometimes gets some key details wrong. So let's pin down some points here:

#### General stuff

In general, there's no need to put timestamps on emitted events; the block's timestamp is good enough.

Which IPFS CID format do we use? How do we do CID → bytes32 conversion? AI recommendation (which is fine with me, I don't know much about it): use CIDv1 with SHA-256. For onchain storage, convert to bytes32 by extracting the 32-byte digest. Need helper functions cidToBytes32() and bytes32ToCid() using the multiformats library.

#### Integration points between artifacts

In the hardhat/ directory (in the root of the project), there should be some already-written smart contracts. We may still need to work on them, but feel free to just copy them as-is into our code base if appropriate. (It's useful to have them there so that other aspects of the code base know what the interface is.)

In specs/graphql, there should be some graphql schema files (or at least a half-English, half-code kind of spec) describing the data that the indexer(s) make available. (In the past I've found that when I ask AI to generate graphql schemas they end up quite verbose and hard for me to grok, so mixing English and code seems to maybe be a sweet spot.)


#### Modelling Statements

A Statement should be represented as a displayable-document (see [subsystems/conceptspace/displayable-documents.md](subsystems/conceptspace/displayable-documents.md)), which is a JSON document that we upload to IPFS. A statement's ID is the IPFS CID of this JSON document. See [subsystems/conceptspace/statements.md](subsystems/conceptspace/statements.md) for more info.

There's also a smart contract called MutableRefUpdater that we use to store a list of "here's the statements this user has created/saved", kept in a mutable ref onchain.


#### Beliefs smart contract

See hardhat/contracts.

A belief state needs to have three possible values: noOpinion, believes, disbelieves (and noOpinion is the default).

Store beliefs in the blockchain's state as well as emitting DirectSupport events; it may be useful for other smart contracts to be able to read that info onchain.

#### Implications smart contract

I've already generated this one too; hardhat/contracts.

#### Conceptspace indexer

Implications are *not* transitive. To find indirect supporters of statement S, simply look up all statements S' where there's a direct implication attestation S'→S (from a trusted attester), then union the direct supporters of all those S' statements. This is a simple DB query, no graph traversal needed. (Exclude anyone who's explicitly indicated disbelief in S.)

Required indexing: Maintain (1) reverse implication map (for each statement, which statements imply it, organized by attester), and (2) direct supporters cache (current set of believers for each statement).

#### Conceptspace UI

Root page for the site: if there's a connected user, show the stuff on his user page (see below)

There's a page for each statement. It shows:
  - the statement itself (displayed in whatever way makes sense given its "statementType")
    - if the statement content includes references to other statements (e.g., "I believe either S1 or S2"), parse and display linked statements with their support numbers
  - the connected user's (if any) belief state for this statement
  - numbers of direct and indirect signers
  - suggestions for other statements you might want to sign also/instead ("you signed S1, and there's a statement S2 that is implied by S1 and is more popular than S1; maybe you'd like to sign S2 as well")

There's a browse/search page for discovering statements, with sorting options including by trending (velocity of new signatures), most supporters, and newest.

There's a page for each user, showing statements that user has signed (with tabs for directly signed vs indirectly supporting). If it's the connected user, also show buttons for sign/unsign/etc., as well as a "create statement" button.

There's a settings page where users can configure which implication attesters they trust, connect social accounts, etc.

(This isn't meant to be an exhaustive list. Include whatever else makes sense.)

#### Implication Attester AI

See [subsystems/conceptspace/implication-attester-ai.md](subsystems/conceptspace/implication-attester-ai.md) for more detail. The main idea is that this is an independent service (probably run by an AI, but could be a human, doesn't matter, and there can be many of these out there) that has an Ethereum address and publishes implication attestations ("if someone believes S1 he probably also believes S2"). It'll have an API so that anyone can ask it "could you please look at S1 and S2 and publish an attestation if you think S1 -> S2?"

#### Funding Portal smart contracts

See the hardhat/contracts directory; the pubstarter stuff is old code that I wrote a while ago, but I think it should be useful.

I don't think that old code includes anything related to doing a whole funding portal for many projects, though. So let's make a smart contract for alignment attestations. (This now exists as `AlignmentAttestations` in hardhat/contracts/alignment-attestations, emitting `AlignmentAttestation` events with a required `topicStatementId` field for indexer filtering.)

In the long run I'd like the DelegatableNotes smart contract to support various DEXes or DEX aggregators for spending the notes; for now it's fine to just use the primary and secondary market capabilities of our own (Kickstarter-like) contracts. (This is also already done.)

Design decisions worth noting:
  - **Assurance contracts: buying is always allowed**, even after the deadline. A "failed" project can still succeed later if more people buy. Refunds are only allowed when the deadline has passed *and* the threshold hasn't been reached.

#### Funding Portal indexer

Keep track of details for all the individual Pubstarter projects.

Also keep track of all the projects aligned directly with a particular statementId. (And we'll also have to look up direct implication attestations to find projects that are indirectly aligned - same simple approach as in the Conceptspace indexer, no transitive graph traversal.) And keep track of top contributors (investors/donors) to any project aligned with this cause.

Make GraphQL queries to the Concept Space indexer, to get the implication data needed to compute indirect project alignment.

#### Funding Portal UI

There's a page that shows many projects that are (directly or indirectly) aligned with a particular statementId. Prominently display total available funding for this cause (from delegatable notes). Offer various ways to sort/filter: date created, assurance-contract deadline, amount needed, trending, etc. Show a "leaderboard" for the top contributors to any project aligned with this cause.

There's a page that shows a particular project (identified by its smart-contract address). Show the project's description, deadline, funding progress, contributor leaderboard (distinguishing donors who've burned tokens vs investors holding tokens, and showing full delegation chains for transparency), etc. Show each token type (since each project is an ERC-1155), how much each one costs to buy from the contract, buttons for buying/selling on the secondary market (if any sell/buy orders exist, show those; also show buttons for creating sell/buy orders), and a button for token holders to burn their tokens (converting from investor to donor), etc.

(This isn't meant to be an exhaustive list. Include whatever else makes sense.)

#### Security & Abuse Prevention

Thoughts on potential threats:
  - **Standard web security**: Sanitize all markdown (use DOMPurify or equivalent), validate JSON strictly, use CSP headers, handle IPFS failures gracefully
  - **Sybil/spam mitigation**: L2 gas costs + UI filtering (sort by trending/supporters) + eventual unique-human verification
  - **Graph attacks**: No transitive graph traversal, so circular references aren't a concern; limit reference expansion depth to 3-5 levels for statement content display; users can switch attesters
  - **Funding scams**: Accept as inevitable; rely on transparency + retroactive funding incentives + social reputation
  - **Smart contract security**: Before mainnet, must implement comprehensive testing, have AI do a basic audit, and get professional audit

#### User queries and actions

See [queries-and-actions.md](queries-and-actions.md) for a comprehensive list of all user queries and actions the system must support (statement browsing, belief actions, funding, delegation, etc.).

#### Indexers

See [indexers.md](indexers.md) for the federated indexer architecture (Concept Space, Pubstarter, Delegation, Funding Portal subsystems), data responsibilities, and implementation review notes.

#### Integration testing (blockchain plus indexer together)

See [testing/integration-tests.md](testing/integration-tests.md).

#### Generative testing

See [testing/generative-testing.md](testing/generative-testing.md) for the overall plan for generative testing (universe generation, user simulation, multiple attester types, test scenarios, invariant validation, metrics tracking). For the actual implementation, see [../fake-data-generation/README.md](../fake-data-generation/README.md).

#### UI testing

See [testing/ui-tests.md](testing/ui-tests.md).


## A bit more philosophizing

In [shared/philosophizing.md](shared/philosophizing.md) there are some not-exactly-relevant thoughts about this system and how it fits into the world (contrast with VC/Kickstarter/centralized funds, "nano" versions of VC/crowdsourcing/trustees enabled by crypto, philosophical stance on neutrality/moderation). If you're an AI whose job is just to implement the spec, you probably don't need to read it. But it's there if you're an AI whose job is to think more broadly about what we need.

## Additional documentation

- [not-there-yet.md](not-there-yet.md) - Scratch file for features discussed in chats but not yet incorporated into the main spec (currently: application lifecycle ideas)
- [chats/](chats/) - Directory containing meeting notes and transcripts from planning sessions (preserved for historical context but not necessary for implementation)


## Future steps

  - A few thoughts from our most recent chat:
    - Sam wants me to set up the node and indexer to run in Docker, so that he can play around with extracting the info and feeding it into a graph database.
  - Generate mid-level specs from this high-level spec.
  - Generate running code from the mid-level specs.
  - Future chat sessions for us to have:
    - Gaming/scamming/abuse prevention session: have a dedicated chat session to identify attack vectors and protections.
    - Marketing session: Dedicated planning for exposure and promotion.
      - Strategic outreach: Approaching Turning Point USA, Daily Wire, Jordan Peterson, etc. with a working prototype. It may not actually be that hard to get them to support this, if we've got something that basically works.
