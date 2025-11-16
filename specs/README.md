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
  - Put in a comment mentioning that the file is AI-generated.

I don't want to be afraid to blow away the code and regenerate it from the mid-level specs. I also don't want to be afraid to blow away a mid-level spec and regenerate it from this high-level spec.

(Motivation: I'm doing this to try to address problems that I've had when trying to build projects with AI assistance in the past. I want to see if I can find a sweet spot in between "progress is very slow because I'm insisting on grokking the actual code" and "the AI is producing tons of code but it's kinda messy and broken and doesn't really do what I want". So I'm wondering whether maybe it'll work well to treat the top-level spec as the official thing that I need to grok and be comfortable with, and then generate lower-level artifacts from that.)


## Main components

The overall system is made of two big components: Concept Space and Funding Portals.

### Concept Space

Users can create (by uploading to IPFS) immutable "statements" representing concepts/ideas/causes. Users can "sign" these statements to show agreement/belief (or disbelief, or no-opinion - the system defaults to assuming that the user has no opinion about the statement, and a user can explicitly express "no, I don't believe that" if he wants to). Anyone (though this'll probably be done by AI, not by humans) can publish Implication Attestation events of the form "if someone believes statement S1 he probably also believes statement S2", to connect related statements.

Some points about this:
    
  - **Transparency:** The Concept Space website should be transparent about how many accounts have directly signed, versus how many have indirectly shown probable support. (i.e. "17 people signed this statement; 118 people have signed these other five statements that the system thinks imply this statement, and so those people probably also believe this statement.") We don't want the UI to mislead anyone about a statement's level of support - it can simply be clear about direct explicit support vs indirect probable support.

  - **Reducing need for coordination:** The point of the implication system is to drastically reduce the need to coordinate around a single canonical definition of an idea. People are going to want to rewrite statements for many reasons: maybe there was a typo in the original statement, maybe someone wants to express a slightly different thought, maybe someone wants to elaborate or publish a v2, maybe someone just wants to rewrite it in a way that he likes better... by having implication arrows between statements, we make coordination much less important. Even if a statement has already gained a lot of support, anyone should feel free to create a rewritten/improved version of the statement; the UI page for his new-and-improved statement will still show just as much support (albeit indirect support) as the original statement. 

  - **Nudging towards coordination:** OTOH, it is still kinda *nice* to know that a statement has direct (rather than indirect) support. So to try to nudge the system gently in the direction of avoiding unneeded proliferation of very-similar statements, there should be a suggestion system: the UI can offer the user hints/nudges of the form "you signed S1, and there's a statement S2 that is implied by S1 and is more popular than S1; maybe you'd like to sign S2 as well."

  - **Multiple attesters:** Any account is allowed to publish these Implication Attestations. Each user can (in the Settings section of the website) configure the site to accept implications from a particular set of attesters. (The point being that this idea of "if someone believes S1 then he probably believes S2" is subjective and so maybe the AI is doing a bad/biased/malicious job of producing these implication attestations.) In the beginning we'll simply create a single AI whose job is to do that, and we'll do so honestly, so I expect there won't be too much need at first for creating alternative attesters. But the system will (at least eventually) support it, to allow people to route around perceived bias.

  - **More sophisticated statement-linking:** I have a suspicion that in the future we'll realize that our very basic ImplicationAttestation concept is much too simplistic and we need more-sophisticated ways of linking concepts. That's fine, we can do that later (by creating other smart contracts allowing the emission of other kinds of events), after we have a better idea of what we need.

  - **Coalitions/alliances/commonality:** Implication arrows are useful for more than just "S1 is pretty much the same as S2"; they're also useful for finding common ground. e.g. Someone could take S1 and S2, which are significantly different, and write a "commonality statement" S. (I don't mean "commonality statement" to be a technical term within the code; it's just a normal statement that happens to be implied by both S1 and S2. It's just useful to think about, conceptually.) The system should notice, though, when a particular statement contains references to other statements, so that people can write a statement S like "I believe either S1 or S2" and the UI page for statement S can show both S1 and S2 (and the support numbers for each); this ought to be useful for forming alliances. (It may even be possible to run fancy graph-analysis algorithms to identify useful commonality statements.)

  - **Unique-human verification:** At first it's fine for the system to count up all accounts who've signed a statement, but in the long run we'll probably want some way of counting up unique humans (i.e. combating Sybil attacks). One thing we can do is allow users to link their Commonality account with their unique-human identity (using whatever kinds of unique-human identity systems exist - Worldcoin, BrightID, anything else too). We can use zero-knowledge proofs to allow this to be done in a privacy-preserving way. (Don't bother implementing this yet, it's just a thought for later.)
  
  - **High-profile signers:** If people can link their account to (for example) their Twitter handle (in a verifiable way), we can have a statement's UI page show not only the total number of supporters, but also the Twitter handles of any high-profile supporters (e.g. supporters who have a verified Twitter account with more than 10k followers). That might help a lot in making this project go viral: if you support a cause, you might be motivated to find a way to spread the link to your cause "up the popularity hierarchy", in the hope of getting a high-profile signer.


### Funding Portals

Each statement in the Concept Space has a link to its own Funding Portal (i.e. "here are a bunch of fundable projects that are aligned with statement S". Anyone can submit ProjectAlignmentAttestation events of the form "project P is aligned with statement S". Each project is basically a crypto-based Kickstarter (e.g. an ERC-1155 contract where people can buy NFTs and the proceeds go towards funding the project).

Some points about this:

  -   **Implication arrows reduce need for coordination:** Just like with the number-of-supporters in the Concept Space UI, the Funding Portal system can make use of the Implication Attestations: the funding portal for a statement S can show projects that have been attested to be aligned with *any* statement S2 such that S2 implies S. So people shouldn't need to worry too much about which particular statement S to submit their project under; anything roughly in the right ballpark is probably fine.

  -   **Social recognition:** The NFTs have no intrinsic capabilities themselves (i.e. they're not like shares of stock; they don't entitle the holder to a share of the project's profits or a say in the project's decisions; these projects are intended to be "public good" kinds of projects, in the sense that economists use the term: non-excludable and non-rivalrous), other than that investors and donors receive social recognition by having their account address (or ENS name) appear on the website (both for the individual project and for the funding portal for that cause, e.g. "here are the top 10 contributors to projects aligned with this cause").

  -   **Retroactive Funding:** These NFTs can be resold on the secondary market, meaning that we have a concept of both "investors" (people who've bought some tokens but may resell them) and "donors" (people who've bought some tokens and then burned them), along the lines of the Retroactive Funding idea that's been championed by people like Vitalik Buterin. (The motivation is that there are people like VCs who are good at identifying promising projects/founders, and there are people who are willing to altruistically donate their money to further a cause; these are not usually the same people. So having resellable tokens enables a project to receive early funding from the first type of person, who are willing to invest because they hope to exit by eventually selling their tokens to the second type of person. VCs for public goods. And these can be really small - nano-VCs.)
  
  -   **More-objective success/alignment verification:** This is more of a vague future idea than a concrete feature, but if some particular project is capable of defining more-objective criteria by which its success/alignment can be verified, that opens up interesting possibilities for tying funding to its success, making decisions based on its predicted success (a la futarchy), etc.

  -   **Delegation:** A "delegatable notes" smart contract allows users to delegate their funding decisions to someone they trust. (e.g. Alice is happy to put $20/month towards this cause, but she doesn't have time to evaluate all the different potential fundable projects herself; she decides to let her friend Bob do that for her, because she trusts his judgment on this topic and he's more willing than she is to watch the funding portal and figure out which projects are worth funding.) (So you can think of Bob as a "nano-trustee", entrusted to make some decisions on Alice's behalf.) Some further points:

      - **Composition:** Delegation decisions are composable (i.e. Bob can then further delegate to Charlie).

      - **Revocation:** Delegation decisions are revocable at any point along the chain (i.e. Bob can then cancel his delegation to Charlie, or Alice can can cancel her delegation to Bob which then of course also cancels the subdelegation to Charlie).

      - **Transparency:** The funding website is transparent about this for the purpose of social recogition (i.e. the site shows "Alice has contributed 5% of this project's funds; the full delegation chain was Alice -> Bob -> Charlie").

      - **Intention:** Each delegatable note is marked with the cause (i.e. statement ID) that it is intended to be put toward. This means that the existence of notes intended to be used to support a particular cause might help bring into existence projects aligned with that cause (because potential project creators can see on the funding portal website "there's a total of $N/month available for projects that are aligned with this cause"). (Notice that this means that it might even make sense for Alice to create a note but not delegate it - even if she intends to make her funding decisions herself, she might want to make it publically known that this money is available to be put towards this cause.)
  
    - **Many kinds of projects:** Note that "a project aligned with this cause" can include many kinds of things: technical projects, but also journalism, etc. If someone wants to earmark a note for a particular kind of project supporting a cause (e.g. journalism), I think that should be doable by creating a statement of the form "I want to support journalism projects for 
      
      - **Commission for trustees:** Make it possible for the person whose money it is to specify "the person I delegate to can take an N% commission (as a fee for managing the money)", and also for a delegate to further pass on some of this commission to whoever he delegates to. This could incentivize people to take on this role (so that we're not just expecting people to do it altruistically because they believe in the cause).


## Tech choices

The point of using decentralized tech like blockchains and IPFS is that we want this system to be trustlessly-verifiable and censorship-resistant.
  - e.g. If we're going to claim that a million people support some statement, we need that claim to be verifiable (so let's implement the "I support this" events as digitally-signed onchain transactions, and let's implement the definition of the statement itself as immutable data whose ID is its IPFS CID).

It's probably fine to have the input data (i.e. all the various events that people can publish) onchain so that it's verifiable, and not worry so much (at least for now) about having the indexer's database being verifiable. (The indexer's DB is all derived data; it can be verified onchain, or blown away and recreated from scratch from the onchain input data if necessary.)

In general an Ethereum L2 (or validium?) is probably the best choice for which chain to use. (Ethereum gives us best-in-class trustlessness/decentralization, but L1 will be too expensive for an app like this that needs to support a high volume of small transactions.) So write the smart contracts in Solidity (using Hardhat). I expect it to be easy to switch L2s later (there are many EVM-compatible ones these days), so for now let's set up our configuration to use Base (and Base Sepolia for testnet) and we can switch later if we want to.

Regarding any indexers we need for the blockchain data, let's start with using Ponder, deploy on Railway for now, and we can switch/add to that later if necessary. Questions for the future:
  - Do we need some kind of high-performance graph database for running interesting graph-analysis algorithms on the statement-implication graph? Beats me. (Sam mentioned setting up a knowledge graph database using AWS Neptune with Gremlin query language and Jupyter notebooks. I don't have experience with any of that, but I wanted to record it here.)
  - Hopefully we can choose infrastructure that's scalable up and down - cheap while small, but can scale quickly if this thing takes off.

For UI code, let's use TypeScript, Vite, and viem and wagmi for blockchain stuff.

For accessing Twitter follower counts... I dunno, I still want to look into the actual cost of that. Sam thinks it's not too expensive?


## Terminology / concepts

See glossary.md for a list of terms and concepts.

(It isn't meant to be a detailed description of each term; this is just meant to pin down what concepts we have and what word we're using for each concept.)


## Artifacts

Let's flesh this out with a list of how to divide up this system into concrete technical artifacts.

  - Concept Space:
    - smart contracts:
      - Beliefs (for emitting DirectSupport events)
      - Implications (for emitting ImplicationAttestation events)
    - indexer
    - UI
  - Pubstarter (for making kickstarter-like projects):
    - smart contracts (many contracts, see below for elaboration)
  - Funding Portal (for showing many projects in a single UI):
    - smart contracts:
      - ProjectAlignment (for emitting ProjectAlignmentAttestation events)
    - indexer (let's use this for indexing the Pubstarter contracts too)
    - UI (has various pages: a page for each individual project, and also a funding-portal page for each statementId)

### Integration points between artifacts

See integration.md for a list of integration points between these different artifacts:

  - Which smart contracts emit which events
  - What queries each indexer needs to support
  - API contracts between indexers and UIs
  - Concrete code examples of calling these APIs
  - anything else I've forgotten

(The idea is to allow us to ask an AI to build each artifact separately, without requiring unnecessary rebuilding of other artifacts that depend on it.)


### Technical details

When asking AI to generate mid-level specs and code, I've found that it sometimes gets some key details wrong. So let's pin down some points here:

  - In general, there's no need to put timestamps on emitted events; the block's timestamp is good enough.
  - A Statement should be represented as a JSON document that we upload to IPFS. Let's put a "statement-type" field on it, so that in the future we can support different schemas. (e.g. For now let's just have statements that look like { "statement-type": "simple-string", "definition": "blah blah" }.) A statement's ID is the IPFS CID of this JSON document.
  - Beliefs smart contract:
    - A belief state needs to have three possible values: noOpinion, believes, disbelieves (and noOpinion is the default).
    - Store beliefs in the blockchain's state as well as emitting DirectSupport events; it may be useful for other smart contracts to be able to read that info onchain.
  - Funding Portal smart contracts:
    - See the specs/pubstarter-contracts directory; that's old code that I wrote a while ago, but I think it should be useful. (There's also specs/pubstarter-contracts/AI-generated-summary.md, in case that's useful.) Feel free to just directly copy those into our code base and use them (though they may need to be fixed up a bit).
    - I don't think that old code includes anything related to doing a whole funding portal for many projects, though. So let's make a smart contract called ProjectAlignment that allows anyone to emit ProjectAlignmentAttestation events.


## Future steps

  - Generate mid-level specs from this high-level spec.
  - Generate running code from the mid-level specs.
  - Future chat sessions for us to have:
    - Gaming/scamming/abuse prevention session: have a dedicated chat session to identify attack vectors and protections.
    - Marketing session: Dedicated planning for exposure and promotion.
      - Strategic outreach: Approaching Turning Point USA, Daily Wire, Jordan Peterson, etc. with a working prototype. It may not actually be that hard to get them to support this, if we've got something that basically works.
