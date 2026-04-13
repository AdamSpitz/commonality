# Top-level spec

This is the top-level spec for a software project called Commonality. It's meant to be built using technology like blockchains and IPFS.

## What is this?

TODO: Read the stuff in the docs/vision-and-strategy directory, then see if you can rewrite this section a bit better using the insights from there. 

Right now, if you want to fund public goods, your options are basically: hope the government does it, or donate to a charity. Both of these have serious problems - government is slow and expensive and captured, charities are opaque and overhead-heavy.

Commonality is a system for crowdfunding public goods without needing a central organization. The theory is that we can build something that does what government and charities do (fund public goods) but better in many ways: much better transparency, much less overhead, and - crucially - almost no need for people to coordinate with each other upfront.

The original motivating thought came from Balaji Srinivasan's "network state" idea: large numbers of aligned people coordinating online to get things done sounds great, except that Balaji seems to envision something like a big monolithic million-member Discord chat with a treasury, which sounds awful. Big groups (governments or corporations or whatever) don't really work all that well. So the goal is: make it possible for large numbers of aligned people to coordinate online and crowdfund projects aligned with their cause, but do it as a network of individuals rather than a big monolithic group.

See [here](/docs/vision-and-strategy/README.md) for the full discussion of what this is and why it might actually work.

## Key ideas

See [here](/docs/key-ideas/README.md).

## Main components

The overall system can be broken down into subsystems:
  - [pubstarter](subsystems/pubstarter/README.md): individual "projects" (Kickstarter-style assurance contracts, implemeneted as ERC-1155 tokens; importantly, these tokens can be resold on secondary markets, enabling profit-seeking investors to supply early funds and then exit by selling to altruistic donors later).
  - [delegation](subsystems/delegation/README.md): donors can create "delegatable notes" to let trusted individuals make funding decisions on their behalf (with composable, revocable delegation chains).
  - [conceptspace](subsystems/conceptspace/README.md): statements, beliefs, and AI-generated implication relationships. Used for declaring a project's alignment ("project P is aligned with statement S") and for declaring a delegatable-note's intended purpose ("this note is intended to be donated to projects aligned with statement S").
    - Importantly, the system allows the (probably AI-assisted) creation of a web of implication arrows, so that a project can be attested to be aligned with S1 and a note can be intended for S2 and the system can notice that S1 -> S2 and so the project is a suitable candidate for that note.
    - As a somewhat-unrelated purpose, individuals can also "sign" statement S, so the statement's page can show the number of supporters (of S or any other statement S2 such that S2 -> S). Not directly related to funding, but a useful other purpose of the conceptspace system.
  - [fundingportals](subsystems/fundingportals/README.md): Each statement has a funding portal showing projects aligned with that statement. (Projects inherit alignment through the implication graph, so submitters don't need to worry about exact statement matching.) The system provides transparency and social recognition by displaying contributor leaderboards and full delegation chains.

## Tech choices

  - Blockchain (some Ethereum L2) and IPFS for trustless verification and censorship resistance
  - Statements are immutable IPFS content (identified by CID)
  - Various events are emitted by onchain transactions
  - Smart contracts in Solidity
  - Indexer is a thin event cache (Ponder storing raw events in a single `events` table, served via REST API). No business logic in the indexer — all state reconstruction happens client-side via SDK fold functions.
  - SDK fetches raw events from the event cache, folds them into entity state, reads current on-chain state via view functions, and fetches IPFS content directly from a gateway. No GraphQL.
  - UI stack: TypeScript, Vite, Material UI, viem/wagmi/connectkit for blockchain interaction.

See [shared/tech.md](shared/tech.md) for details on tech choices and rationale (why blockchain, which L2, indexer infrastructure, deployment considerations).


## Terminology / concepts

We may want to generate a list of terms and concepts, just to pin down what we mean by each term. For now let's not bother - let's just try to make this top-level spec use terms clearly. (I previously tried generating a file called specs/glossary.md, but honestly it was more trouble than it was worth.)


## AI skills

There can be various AI skills to aid in (or partially automate) using various aspects of the system.

See [ai-assistance.md](ai-assistance.md) for more info.


## Artifacts

This section describes the conceptually-separate subsystems that make up Commonality. The subsystems organize the code logically (smart contracts, SDK queries/folds, UI components), but they all share a single thin event cache indexer.

### Core Subsystems

The system is divided into several independent subsystems, each with its own domain, smart contracts, and SDK query/fold logic:

#### 1. Concept Space Subsystem
**Domain:** Statements, beliefs, and implication relationships

Components:
  - **Smart contracts:**
    - `Beliefs` - for users to express belief/disbelief in statements
    - `Implications` - for attesters to publish "S1 implies S2" relationships
  - **SDK:** Fold functions reconstruct belief counts, user beliefs, and implication maps from raw `DirectSupport` and `ImplicationAttestation` events. IPFS content (statement text) is fetched directly from an IPFS gateway.
  - **UI:** Browse/search statements, view statement pages with support metrics, user pages showing signed statements, settings for configuring trusted attesters
  - **Implication Attester AI:** Standalone service that evaluates statement relationships and publishes attestations (can be deployed independently; other attesters can exist too)

#### 2. Pubstarter Subsystem
**Domain:** Individual crowdfunding projects (Kickstarter-style primary market)

Components:
  - **Smart contracts:** `AssuranceContract`, `ERC1155PrimaryMarket` - ERC-1155 project contracts with threshold-based funding, deadlines, refunds (in `hardhat/contracts/individual-projects/`)
  - **SDK:** Fold functions reconstruct project state, contributions, refunds, and secondary market orders from raw events. On-chain view functions provide current balances, thresholds, and deadlines.
  - **UI:** Individual project pages showing funding progress, contributor leaderboards

#### 3. Marketplace Subsystem
**Domain:** Secondary market trading for ERC-1155 tokens

Components:
  - **Smart contracts:** `ERC1155SecondaryMarket` - generic order book for any ERC-1155 tokens (in `hardhat/contracts/marketplace/`)
  - **SDK:** Fold functions reconstruct active listings, buy orders, and trade history from raw events.
  - **UI:** Trading interface with order book display, buy/sell forms

Note: This is generic infrastructure for peer-to-peer trading. In the current implementation, secondary-market indexing is folded into the Pubstarter SDK subsystem (since it shares the same project context).

#### 4. Delegation Subsystem
**Domain:** Delegatable notes and trust chains

Components:
  - **Smart contracts:** `DelegatableNotes` - allows users to delegate funding decisions with composable, revocable chains
  - **SDK:** Fold functions reconstruct note state, delegation chains, and note intent attestations from raw events.
  - **UI:** Note management interface, delegation chain visualization, spending controls

#### 5. Funding Portal Subsystem
**Domain:** Cross-cutting views that join concepts, projects, and funding

Components:
  - **Smart contracts:** `AlignmentAttestations` - for attesting that subjects (typically projects) align with statements
  - **SDK:** Computes indirect project alignment via implication events, aggregates funding across aligned projects using on-chain reads and event folds, and generates contributor leaderboards. All cross-cutting aggregation happens client-side in the SDK.
  - **UI:** Cause-specific funding portals showing all aligned projects (direct and indirect), available funding from delegatable notes, cross-project contributor rankings

### Subsystem Dependencies

The four foundational subsystems (Concept Space, Pubstarter, Marketplace, Delegation) are independent and have no dependencies on each other. The Funding Portal subsystem's SDK orchestrates cross-cutting queries by calling the other subsystems' SDK query functions.

### Why This Structure?

- **Clear separation of concerns:** Each subsystem has a well-defined domain and can be reasoned about independently
- **Independent testing:** Can test each subsystem with mock event data
- **Simple infrastructure:** A single thin event cache serves all subsystems — no per-subsystem indexers or federation
- **Reusability:** Each subsystem could potentially be used in other contexts (e.g., the Pubstarter subsystem works for any crowdfunding system, not just Commonality)

## Implementation notes

When asking AI to generate mid-level specs and code, I've found that it sometimes gets some key details wrong. So let's pin down some points here:

### Integration points between artifacts

In the hardhat/ directory (in the root of the project), there are some smart contracts. These are the primary integration point between pieces of the system; most user actions are done via onchain transactions which emit events.

The indexer exposes a single REST API endpoint (`GET /api/events`) for fetching raw events by contract address, event name, and topic filters. The SDK's `eventCacheClient.ts` wraps this. All data shaping happens via SDK fold functions, not in the indexer.

### Modelling Statements

A Statement should be represented as a displayable-document (see [subsystems/conceptspace/displayable-documents.md](subsystems/conceptspace/displayable-documents.md)), which is a JSON document that we upload to IPFS. A statement's ID is the IPFS CID of this JSON document. See [subsystems/conceptspace/statements.md](subsystems/conceptspace/statements.md) for more info.

There's also a smart contract called MutableRefUpdater that we use to store a list of "here's the statements this user has created/saved", kept in a mutable ref onchain.


### Beliefs smart contract

See hardhat/contracts.

A belief state needs to have three possible values: noOpinion, believes, disbelieves (and noOpinion is the default).

Store beliefs in the blockchain's state as well as emitting DirectSupport events; it may be useful for other smart contracts to be able to read that info onchain.

### Implications smart contract

I've already generated this one too; hardhat/contracts.

### Conceptspace data flow

Implications are *not* transitive. To find indirect supporters of statement S, simply look up all statements S' where there's a direct implication attestation S'→S (from a trusted attester), then union the direct supporters of all those S' statements. No graph traversal needed. (Exclude anyone who's explicitly indicated disbelief in S.)

The SDK fetches raw `DirectSupport` and `ImplicationAttestation` events from the event cache and folds them client-side to reconstruct belief counts, implication maps, and supporter lists.

### Conceptspace UI

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

### Implication Attester AI

See [subsystems/conceptspace/implication-attester-ai.md](subsystems/conceptspace/implication-attester-ai.md) for more detail. The main idea is that this is an independent service (probably run by an AI, but could be a human, doesn't matter, and there can be many of these out there) that has an Ethereum address and publishes implication attestations ("if someone believes S1 he probably also believes S2"). It'll have an API so that anyone can ask it "could you please look at S1 and S2 and publish an attestation if you think S1 -> S2?"

### Funding Portal smart contracts

See the hardhat/contracts directory; the pubstarter stuff is old code that I wrote a while ago, but I think it should be useful.

I don't think that old code includes anything related to doing a whole funding portal for many projects, though. So let's make a smart contract for alignment attestations. (This now exists as `AlignmentAttestations` in hardhat/contracts/alignment-attestations, emitting `AlignmentAttestation` events with a required `topicStatementId` field for indexer filtering.)

In the long run I'd like the DelegatableNotes smart contract to support various DEXes or DEX aggregators for spending the notes; for now it's fine to just use the primary and secondary market capabilities of our own (Kickstarter-like) contracts. (This is also already done.)

Design decisions worth noting:
  - **Assurance contracts: buying is always allowed**, even after the deadline. A "failed" project can still succeed later if more people buy. Refunds are only allowed when the deadline has passed *and* the threshold hasn't been reached.

### Funding Portal data flow

The SDK computes all Funding Portal aggregations client-side:
  - Fetches `AlignmentAttestation` events from the event cache to find which projects align with a statement.
  - Fetches `ImplicationAttestation` events to find indirect alignments (same simple approach as Conceptspace — no transitive graph traversal).
  - For each aligned project, reads on-chain state (totalReceived, threshold, deadline) and folds contribution/refund events to build contributor leaderboards.
  - No federation between indexers — the single event cache serves all subsystems.

### Funding Portal UI

There's a page that shows many projects that are (directly or indirectly) aligned with a particular statementId. Prominently display total available funding for this cause (from delegatable notes). Offer various ways to sort/filter: date created, assurance-contract deadline, amount needed, trending, etc. Show a "leaderboard" for the top contributors to any project aligned with this cause.

There's a page that shows a particular project (identified by its smart-contract address). Show the project's description, deadline, funding progress, contributor leaderboard (distinguishing donors who've burned tokens vs investors holding tokens, and showing full delegation chains for transparency), etc. Show each token type (since each project is an ERC-1155), how much each one costs to buy from the contract, buttons for buying/selling on the secondary market (if any sell/buy orders exist, show those; also show buttons for creating sell/buy orders), and a button for token holders to burn their tokens (converting from investor to donor), etc.

(This isn't meant to be an exhaustive list. Include whatever else makes sense.)

### User queries and actions

See [conceptspace queries and actions](subsystems/conceptspace/queries-and-actions.md) and [fundingportals queries and actions](subsystems/fundingportals/queries-and-actions.md) for comprehensive lists of user queries and actions each subsystem must support.

### Indexer

See the [indexer](./indexer/README.md) directory for the thin event cache architecture and the [indexer redesign spec](./indexer/redesign.md) for the rationale behind the current design (single `events` table, SDK fold functions, no GraphQL, no federation).

## Additional documentation

- [Vision and strategy](/docs/vision-and-strategy/README.md) - Goes deeper on the motivation: detailed comparison with government and private charity, why every piece of the system avoids requiring coordination, concrete pitches to different types of users (donors, project creators, delegates), censorship resistance, and the "won't this be used for evil?" question. If you're an AI whose job is just to implement the spec, you probably don't need to read it. But it's there if you're thinking about the big picture.
- [scalability](scalability.md) - How each component is expected to scale, and potential bottlenecks
- [security and abuse-prevention](./security.md)
- [testing](./testing/README.md)
- [docs/](docs/README.md) - Structure and design decisions for user-facing documentation (the plan from which actual docs are generated)
- [chats/](chats/) - Directory containing meeting notes and transcripts from planning sessions (preserved for historical context but not necessary for implementation)
- [bridges.md](bridges.md) - Fiat bridge implementation: Stripe flow, ETH conversion options, licensed third-party services (Transak, Wert, Crossmint), refunds
- [content.md](content.md) - Content bootstrapping: seed statements, AI-assisted discovery, handling the empty-field problem
- [mvp.md](mvp.md) - MVP planning notes and entry-point descriptions
- [future.md](future.md) - post-MVP planning notes
- [ai-assisted-development.md](ai-assisted-development.md) - Notes on the AI-assisted development process used to build this project
