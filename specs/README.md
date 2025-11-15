# Spec: Commonality Project

This is the top-level spec for a software project called Commonality (for now, until Sam comes up with a better name).

It's meant to be built using technology like blockchains and IPFS.

The original motivating thought was something like: Balaji Srinivasan's "network state" sounds great, except that it sorta seems like he's envisioning something like a big monolithic million-member Discord chat with a treasury, which sounds awful - big groups (governments or corporations or whatever) don't really work all that well.

So the overall goal is something like:
  - Make it possible for large numbers of aligned people to coordinate online: keep track of their numbers, and crowdfund projects that are aligned with their cause.
  - But do this in a way that's not a big monolithic group, but rather a big network of individuals (with a really great coordination system to make it all hang together).


## What to do with this spec

The intention here is to leverage AI to help build this project quickly.

We'll feed this top-level spec through an AI to generate medium-detail specs for various components (in a mixture of English and code examples). Then we'll feed those mid-level specs through an AI to generate actual runnable code.

If you're an AI who's reading this top-level spec and generating a mid-level spec:
  - Make sure to include concrete examples and edge cases, not just abstract requirements (especially when that will help to clarify things for an AI that doesn't have as much understanding of the overall wider system).
  - Also make sure to include concrete code examples for integration points, like APIs intended to be called by other modules (because when we regenerate one module, we don't want to need to regenerate all the other modules that call it).

I don't want to be afraid to blow away the code and regenerate it from the mid-level specs. I also don't want to be afraid to blow away a mid-level spec and regenerate it from this high-level spec.

(Motivation: I'm doing this to try to address problems that I've had when trying to build projects with AI assistance in the past. I want to see if I can find a sweet spot in between "progress is very slow because I'm insisting on grokking the actual code" and "the AI is producing tons of code but it's kinda messy and broken and doesn't really do what I want". So I'm wondering whether maybe it'll work well to treat the top-level spec as the official thing that I need to grok and be comfortable with, and then generate lower-level artifacts from that.)


## Main components

The overall system is made of two big components: Concept Space and Funding Portals.

### Concept Space

Users can create (by uploading to IPFS) immutable "statements" representing concepts/ideas/causes. Users can "sign" these statements to show agreement/belief (or disbelief - the system defaults to assuming that the user has no opinion about the statement, and a user can explicitly express "no, I don't believe that" if he wants to). Anyone (though this'll probably be done by AI, not by humans) can publish Implication Attestation events of the form "if someone believes statement S1 he probably also believes statement S2", to connect related statements.

Some points about this:
    
  - **Transparency:** The Concept Space website should be transparent about how many accounts have directly signed, versus how many have indirectly shown probable support. (i.e. "17 people signed this statement; 118 people have signed these other five statements that the system thinks imply this statement, and so those people probably also believe this statement.") We don't want the UI to mislead anyone about a statement's level of support - it can simply be clear about direct explicit support vs indirect probable support.

  - **Reducing need for coordination:** The point of the implication system is to drastically reduce the need to coordinate around a single canonical definition of an idea. People are going to want to rewrite statements for many reasons: maybe there was a typo in the original statement, maybe someone wants to express a slightly different thought, maybe someone wants to elaborate or publish a v2, maybe someone just wants to rewrite it in a way that he likes better... by having implication arrows between statements, we make coordination much less important. Even if a statement has already gained a lot of support, anyone should feel free to create a rewritten/improved version of the statement; the UI page for his new-and-improved statement will still show just as much support (albeit indirect support) as the original statement. 

  - **Nudging towards coordination:** OTOH, it is still kinda *nice* to know that a statement has direct (rather than indirect) support. So to try to nudge the system gently in the direction of avoiding unneeded proliferation of very-similar statements, there should be a suggestion system: the UI can offer the user hints/nudges of the form "you signed S1, and there's a statement S2 that is implied by S1 and is more popular than S1; maybe you'd like to sign S2 as well."

  - **Multiple attesters:** Any account is allowed to publish these Implication Attestations. Each user can (in the Settings section of the website) configure the site to accept implications from a particular set of attesters. (The point being that this idea of "if someone believes S1 then he probably believes S2" is subjective and so maybe the AI is doing a bad/biased/malicious job of producing these implication attestations.) In the beginning we'll simply create a single AI whose job is to do that, and we'll do so honestly, so I expect there won't be too much need at first for creating alternative attesters. But the system will (at least eventually) support it, to allow people to route around perceived bias.

  - **Coalitions/alliances/commonality:** Implication arrows are useful for more than just "S1 is pretty much the same as S2"; they're also useful for finding common ground. e.g. Someone could take S1 and S2, which are significantly different, and write a "commonality statement" S. (I don't mean "commonality statement" to be a technical term within the code; it's just a normal statement that happens to be implied by both S1 and S2. It's just useful to think about, conceptually.) The system should notice, though, when a particular statement contains references to other statements, so that people can write a statement S like "I believe either S1 or S2" and the UI page for statement S can show both S1 and S2 (and the support numbers for each); this ought to be useful for forming alliances.


### Funding Portals

Each statement in the Concept Space has a link to its own Funding Portal (i.e. "here are a bunch of fundable projects that are aligned with statement S". Anyone can submit Project Alignment Attestation events of the form "project P is aligned with statement S". Each project is basically a crypto-based Kickstarter (e.g. an ERC-1155 contract where people can buy NFTs and the proceeds go towards funding the project).

Some points about this:

  -   **Implication arrows reduce need for coordination:** Just like with the number-of-supporters in the Concept Space UI, the Funding Portal system can make use of the Implication Attestations: the funding portal for a statement S can show projects that have been attested to be aligned with *any* statement S2 such that S2 implies S. So people shouldn't need to worry too much about which particular statement S to submit their project under; anything roughly in the right ballpark is probably fine.

  -   **Social recognition:** The NFTs have no intrinsic capabilities themselves (i.e. they're not like shares of stock; they don't entitle the holder to a share of the project's profits or a say in the project's decisions; these projects are intended to be "public good" kinds of projects, in the sense that economists use the term: non-excludable and non-rivalrous), other than that investors and donors receive social recognition by having their account address (or ENS name) appear on the website (both for the individual project and for the funding portal for that cause, e.g. "here are the top 10 contributors to projects aligned with this cause").

  -   **Retroactive Funding:** These NFTs can be resold on the secondary market, meaning that we have a concept of both "investors" (people who've bought some tokens but may resell them) and "donors" (people who've bought some tokens and then burned them), along the lines of the Retroactive Funding idea that's been championed by people like Vitalik Buterin. (The motivation is that there are people like VCs who are good at identifying promising projects/founders, and there are people who are willing to altruistically donate their money to further a cause; these are not usually the same people. So having resellable tokens enables a project to receive early funding from the first type of person, who are willing to invest because they hope to exit by eventually selling their tokens to the second type of person.)

  -   **Delegation:** A "delegatable notes" smart contract allows users to delegate their funding decisions to someone they trust. (e.g. Alice is happy to put $20/month towards this cause, but she doesn't have time to evaluate all the different potential fundable projects herself; she decides to let her friend Bob do that for her, because she trusts his judgment on this topic and he's more willing than she is to watch the funding portal and figure out which projects are worth funding.) (So you can think of Bob as a "nano-trustee", entrusted to make some decisions on Alice's behalf.) Some further points:

      - **Composition:** Delegation decisions are composable (i.e. Bob can then further delegate to Charlie).

      - **Revocation:** Delegation decisions are revocable at any point along the chain (i.e. Bob can then cancel his delegation to Charlie, or Alice can can cancel her delegation to Bob which then of course also cancels the subdelegation to Charlie).

      - **Transparency:** The funding website is transparent about this for the purpose of social recogition (i.e. the site shows "Alice has contributed 5% of this project's funds; the full delegation chain was Alice -> Bob -> Charlie").

      - **Intention:** Each delegatable note is marked with the cause (i.e. statement ID) that it is intended to be put toward. This means that the existence of notes intended to be used to support a particular cause might help bring into existence projects aligned with that cause (because potential project creators can see on the funding portal website "there's a total of $N/month available for projects that are aligned with this cause"). (Notice that this means that it might even make sense for Alice to create a note but not delegate it - even if she intends to make her funding decisions herself, she might want to make it publically known that this money is available to be put towards this cause.)


## Tech choices

The point of using decentralized tech like blockchains and IPFS is that we want this system to be trustlessly-verifiable and censorship-resistant.
  - e.g. If we're going to claim that a million people support some statement, we need that claim to be verifiable (so let's implement the "I support this" events as digitally-signed onchain transactions, and let's implement the definition of the statement itself as immutable data whose ID is its IPFS CID).

In general an Ethereum L2 (or validium?) is probably the best choice for which chain to use. (Ethereum gives us best-in-class trustlessness/decentralization, but L1 will be too expensive for an app like this that needs to support a high volume of small transactions.) So write the smart contracts in Solidity. I expect it to be easy to switch L2s later (there are many EVM-compatible ones these days), so for now let's set up our configuration to use Base (and Base Sepolia for testnet) and we can switch later if we want to.

Regarding any indexers we need for the blockchain data, I'm open to suggestions. The Graph? Ponder? Do we need some kind of high-performance graph database for running interesting graph-analysis algorithms on the statement-implication graph? Beats me.

For UI code, let's use TypeScript, Vite, and viem and wagmi for blockchain stuff.





Technical Summary
-----------------

The project described is a decentralized, two-part system designed to facilitate
the organization, funding, and execution of "causes" or "beliefs." It aims to
create a more granular, transparent, and fluid alternative to traditional
organizations, referred to as "nano-economies" or "nano-governments."

The system's foundation is trustless and on-chain (e.g., Ethereum L2, IPFS),
ensuring all actions are transparent and verifiable.

**Core Components:**

1.  **The "Concept Space":** A decentralized database of "statements" (beliefs,
    ideas, causes). Users can "sign" these statements to show agreement. The
    statements are immutable (e.g., stored on IPFS) to ensure integrity. An
    AI-driven "implication" system connects related statements, allowing for
    coalescence around ideas (e.g., "Statement A is a typo of Statement B")
    without forcing rigid coordination.

2.  **The "Funding Portal":** A dedicated funding mechanism, similar to
    Kickstarter, tied to *each* statement in the Concept Space. This portal
    allows:

    -   **Project Funding:** Developers, journalists, or creators can propose
        projects aligned with a cause.

    -   **Assurance Contracts:** Pledges are held until a project reaches its
        funding goal.

    -   **NFT-based "Shares":** Funding is represented by NFTs. Users can either
        "invest" (by holding the NFT) or "donate" (by "burning" the NFT), with
        both actions providing social recognition.

    -   **Retroactive Funding:** A key economic model that separates early
        investors from altruistic donors. This allows a market to form around
        funding public goods, where donors can retroactively "buy out" the
        initial investors after a project has proven its value.

    -   **Delegation:** A "delegatable notes" smart contract allows users to
        delegate their funding decisions to trusted "trustees," creating a
        market for "nano-VCs" or cause managers.

The ultimate goal is to create a scalable, decentralized, and transparent
platform that replaces rigid hierarchical structures with fluid, network-based
"nano-coalitions."

I. Core Project Vision & Philosophy
-----------------------------------

### A. Inspiration and Goals

1.  **Inspiration:** Based on Balaji Srinivasan's "network states," but aiming
    for a more granular, "network-based" system rather than large, monolithic groups
    ("big Discord chat with a treasury").

2.  **Core Goal:** To create a neutral, open-source tool that allows groups of
    any kind to organize, coordinate, and fund projects aligned with their
    shared values.

3.  **Desired Outcome:** To build "nano-economies," "nano-parties," or even
    "nano-governments" that are more fluid, transparent, and resilient than
    current systems.

### B. The "Nano" Concept

-   A recurring theme of breaking down large, top-down structures into small,
    composable, bottom-up units (e.g., nano-VCs, nano-standards, nano-bills,
    nano-economies).

### C. Core Problem: Coordination

1.  **The Challenge:** Getting large groups of humans to coordinate is
    very hard.

2.  **The Solution:** Build a system that *reduces the need* for perfect
    coordination by transparently linking related-but-separate efforts.

II. Component 1: The "Concept Space" (Beliefs & Statements)
-----------------------------------------------------------

### A. Defining the Space

-   A "space of all possible ideas" where users can find or create statements,
    causes, or beliefs.

### B. Statement Mechanics

1.  **Immutability:** Statements are immutable (e.g., a text string hashed and
    stored on IPFS). This ensures that what a user "signs" can never be changed.

2.  **Versioning:** If a statement needs to be edited (e.g., typo, improvement),
    a *new* statement is created.

3.  **Signing:** Users cryptographically "sign" a statement to signal their
    belief or agreement. The UI can then display "1,000 people believe in this."

### C. The Implication & Coalescence System (AI)

1.  **Problem:** Immutability and free creation lead to statement proliferation
    (e.g., 100 versions of the same idea with minor typos).

2.  **AI Solution:** An "implication attestation" system.

    -   An AI or users can attest: "If you believe Statement A, you probably
        also believe Statement B."

    -   This links similar statements, creating a graph or "cloud" of related
        ideas.

3.  **UI Nudging:** The UI uses this data to:

    -   Show aggregate support (e.g., "17 people signed this directly, but 1,000
        people signed statements that imply this").

    -   Nudge users toward coalescence ("This similar statement is more popular.
        Do you want to sign it instead?").

### D. Entity Life Cycle & Ontology

1.  **Sam's Input:** A discussion on the "life cycle" of ideas (creation,
    bifurcation, merging).

2.  **Abstraction:** The system could automatically generate higher-level
    "class" abstractions to group commonalities (e.g., "This is the 'Pro-Crypto'
    class of statements").

3.  **Knowledge Graph:** This "idea space" is effectively a large knowledge
    graph representing the relationships between beliefs.

III. Component 2: The "Funding Portal" (Projects & Causes)
----------------------------------------------------------

### A. Overview

-   For *every* statement in the Concept Space, a corresponding "project funding
    portal" exists.

-   This portal shows (a) funds available for the cause and (b) projects seeking
    funding for that cause.

### B. Project Alignment and Verification

1.  **Attestation:** A project (e.g., an open-source app, a research paper) can
    "attest" that it is "aligned with this cause."

2.  **Trust Graph:** The system would rely on a trust graph of attestations to
    verify these claims (e.g., "People you trust have attested this project is
    aligned").

### C. Success Metrics & "Well-being"

1.  **The Question:** How do you *verify* a project successfully advanced a
    cause?

2.  **Objective Metrics:** For some causes, this can be objective (e.g., Cause:
    "More crypto use." Metric: "Verifiable increase in blockchain traffic from
    this app.").

3.  **Subjective Metrics:** For others, it's subjective (e.g., "The community
    attests this was valuable").

4.  **"Nano-Standards":** Each cause's community can define its own "well-being
    metrics" or "nano-standards" for success.

IV. Key Economic & Governance Models
------------------------------------

### A. Funding Mechanism (Kickstarter / Assurance Contracts)

-   Projects use an "assurance contract" model:

    1.  A project sets a funding goal.

    2.  Users "pledge" funds.

    3.  Funds are only released if the goal is met, protecting contributors from
        being the "only one."

### B. Investing vs. Donating

-   Funding is represented by tokens (e.g., NFTs with cute pictures).

-   **Investing:** A user buys and *holds* the NFT. Their name appears on the
    project's UI ("This slide brought to you by..."). They can later *sell* this
    NFT.

-   **Donating:** A user buys and *burns* the NFT. This signals pure altruism,
    and their name is also recorded.

-   **Social Recognition:** Both actions provide social credit.

### C. Retroactive Funding

1.  **Core Idea (via Vitalik Buterin):** This model separates two key groups:

    -   **Investors/Speculators:** Good at identifying valuable projects *in
        advance*.

    -   **Altruistic Donors:** Good at identifying what *has been* valuable in
        retrospect.

2.  **Mechanism:**

    -   Early "investors" fund a project by buying its NFTs.

    -   If the project succeeds and proves its value to the cause...

    -   "Donors" (who want to support the cause) can then "buy out" the early
        investors by purchasing the NFTs from them (often at a profit).

3.  **Benefit:** Creates a VC-like ecosystem for public goods, making it
    profitable to be an early, "speculative" investor in projects that do good.

### D. Delegation & "Nano-VCs"

1.  **Problem:** Most people will pledge money to a cause (e.g., "\$20/month")
    but won't have time to research individual projects.

2.  **Solution:** A "delegatable notes" smart contract.

3.  **Mechanism:**

    -   A user (the "delegator") allocates funds to a cause and delegates
        the *decision-making* to a "trustee" (a trusted friend, expert, or
        influencer).

    -   The trustee can then direct those funds to specific projects.

    -   Delegation can be revoked at any time.

    -   The UI gives social credit to both the delegator (who put up the money)
        and the trustee (who made the decision).

4.  **Outcome:** Creates a market for professional "cause managers" or
    "nano-VCs" who can even take a small commission (e.g., 1%).

### E. Futarchy (Robin Hanson's idea)

-   A more advanced concept: "government by prediction markets."

-   If a cause has a verifiable, objective well-being metric, you could use
    prediction markets to decide funding.

-   **Mechanism:** The system automatically funds projects that the
    market *predicts* will increase the metric.

V. Trust, Identity, & Social Mechanisms
---------------------------------------

### A. Trust & Transparency

-   The entire system must be "trustlessly verifiable."

-   All data (beliefs, attestations, funding) is on-chain, making it transparent
    and uncensorable.

-   This is the primary defense against accusations of being a "scam" or "run by
    the man."

### B. User Identity

1.  **Base Layer:** Ethereum Accounts (e.g., `0x...` hex strings or ENS names
    like `adamspitz.eth`).

2.  **Sybil Resistance:** How to prove 1,000 "believers" isn't one person with
    1,000 accounts?

3.  **Future Enhancement:** Use Zero-Knowledge (ZK) proofs to allow users to
    prove they are a "verified unique human" without revealing *which* human
    they are.

4.  **UI:** The system would show "1,000 accounts signed this, 300 of which are
    verified unique humans."

### C. Social Proof & Marketing

1.  **Key Insight:** Coalitions are built on social proof.

2.  **Mechanism:** Allow users to link their on-chain account to their Twitter/X
    account.

3.  **UI Feature:** The "Concept Space" UI will show "High-profile people who
    believe this," sorted by follower count.

4.  **Effect:** This gamifies adoption, encouraging users to get high-profile
    individuals to "sign" their statement to boost its visibility and
    legitimacy.

VI. Technical Implementation & Architecture
-------------------------------------------

### A. Core Technology Stack

1.  **Blockchain:** An Ethereum L2 (Layer 2) for cheap, fast transactions (e.g.,
    emitting events, running smart contracts).

2.  **Data Storage (Immutable):** IPFS (InterPlanetary File System) to store the
    content of statements, identified by their content-hash.

3.  **Database/Ontology:** A Knowledge Graph (e.g., AWS Neptune, using
    Gremlin/TinkerPop) to model the complex relationships (implications,
    attestations) between statements, users, and projects.

### B. Data Model: Input vs. Derived Data

1.  **Input Data (Source of Truth):** The on-chain events (e.g., "User X signed
    Statement Y," "User A delegated to User B"). This is immutable.

2.  **Derived Data (Application Layer):** An "indexer" service reads the input
    data and populates the Knowledge Graph. This derived data is for efficient
    querying by the UI. If the database is compromised or lost, it can be
    deterministically rebuilt from the on-chain input data.

### C. Smart Contracts

-   The on-chain logic would be relatively simple and modular.

-   **Key Contracts:**

    1.  A contract to emit "belief" events.

    2.  The "delegatable notes" contract.

    3.  The "assurance contract" (Kickstarter) for projects.

VII. Strategy & Next Steps
--------------------------

### A. Development Approach

1.  **AI-Assisted:** Use AI (like NotebookLM) to process the transcript and
    generate a high-level conceptual spec.

2.  **Iterative:** Break the project into separable pieces (Concept Space,
    Funding Portal) and build them.

3.  **Code:** Use AI to generate "slop code" for prototypes and non-critical UI,
    while hand-crafting the high-security smart contracts.

4.  **Test:** Use cloud elasticity (e.g., AWS) to spin up massive test networks
    (e.g., "10 million cause networks") to test scalability and then shut them
    down.

### B. Marketing & Adoption

1.  **Manifesto:** Write a manifesto explaining the "why" of the project.

2.  **Eat Your Own Dog Food:** Fund the development of the project *using the
    project itself*.

3.  **Strategic Outreach:** *After* a working prototype exists, approach
    high-profile figures (e.g., Turning Point USA, Daily Wire, Jordan Peterson)
    to be "marquee" users. One plug from a major figure could drive massive
    adoption.

### C. Future Risks & Considerations

1.  **Gaming/Scamming:** A "red team" session is needed to explore how the
    system can be abused.

2.  **Centralization Risk:** The "Oprah" problem—what if everyone just delegates
    to one person? (The consensus was this is an acceptable outcome, as
    delegation is fluid and can be revoked.)

3.  **Negative Causes:** The tool is neutral and could be used to organize "bad"
    causes. (The consensus was to build an open, trustworthy system and have
    faith that good ideas will outcompete bad ones.)
