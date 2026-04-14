# User Documentation — Design Decisions

## Audience

The primary audience is a new user (or an LLM assisting a new user) who doesn't know what Commonality is and needs to understand: what is it for, what can I do with it, why would I want to, and how do I get started.

Secondary: existing users looking up how a specific concept works.


## Core design decisions

### Lead with stories, not abstractions

The system is general-purpose and has a lot of conceptual machinery (assurance contracts, delegation, implication graphs, trust networks, etc.). But the pitch is "each step is individually useful." The docs should mirror that: lead with concrete scenarios, let people absorb concepts through stories rather than definitions.

The walkthroughs are the primary entry point. Each one naturally highlights different subsystems, so a reader who reads two or three of them absorbs most of the key concepts without being "taught" them.

### Use-case navigation, not a single narrative

Different people will arrive with different interests. Rather than a linear "here's how the whole system works" narrative, the landing page offers multiple entry points:
- **Walkthroughs** — pick the story that resonates with you
- **Role-based pages** — "here's what I want to do"
- **Concept pages** — reference, dip in as needed

### No crypto jargon in the main docs

The main docs should talk about "pledges that refund if the goal isn't met," not "ERC-1155 assurance contracts." The trust/transparency story should be told as "the code is open-source, all transactions are public, nobody controls it" — accurate and meaningful without saying "blockchain." A single separate page serves crypto-native users who want the technical details (L2, ERC-1155, IPFS CIDs, Solidity contracts, etc.).

### Human-readable with LLM-friendly structure

Write the docs for humans (narrative, plain language). Then add a structured "TL;DR for AI assistants" block at the top of each concept page: what this concept is, when a user would encounter it, what actions they might want help with. This lets an LLM orient itself quickly without degrading the human reading experience.
