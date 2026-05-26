# User documentation specs/plans/guidelines

*The plan for generating user-facing documentation for end users (or an LLM assisting an end user).*

The primary audience is a new user who doesn't know what Commonality is and needs to understand: what is it for, what can I do with it, why would I want to, how do I get started.

**Core design decisions:**

## Lead with stories, not abstractions

The system is general-purpose and has a lot of conceptual machinery (assurance contracts, delegation, implication graphs, trust networks, etc.). But the pitch is "each step is individually useful." The docs should mirror that: lead with concrete scenarios, let people absorb concepts through stories rather than definitions.

The walkthroughs are the primary entry point. Each one naturally highlights different subsystems, so a reader who reads two or three absorbs most of the key concepts without being "taught" them.

## Use-case navigation, not a single narrative

Different people arrive with different interests. Rather than a linear "here's how the whole system works" narrative, the landing page offers multiple entry points:
- **Walkthroughs** — pick the story that resonates with you
- **Role-based pages** — "here's what I want to do"
- **Concept pages** — reference, dip in as needed

## No crypto jargon in the main docs

The main docs should talk about "pledges that refund if the goal isn't met," not "ERC-1155 assurance contracts." The trust/transparency story should be told as "the code is open-source, all transactions are public, nobody controls it" — accurate and meaningful without saying "blockchain." A single separate page serves crypto-native users who want the technical details (L2, ERC-1155, IPFS CIDs, Solidity contracts, etc.).

## Human-readable with LLM-friendly structure

Write the docs for humans (narrative, plain language). Then add a structured "TL;DR for AI assistants" block at the top of each concept page: what this concept is, when a user would encounter it, what actions they might want help with. This lets an LLM orient itself quickly without degrading the human reading experience.

**User-facing docs live in:**
- Role-based how-tos live on the site where the role is actually performed (e.g. `lazyGiving/get-your-project-funded.md`, `alignment/become-a-delegate.md`, `tally/express-what-you-care-about.md`). The cross-ecosystem index is in [docs/end-user/commonality/index.md](/docs/end-user/commonality/index.md) under "What can I do across the ecosystem?". Each role doc ends with an "On other sites" footer pointing at the cross-site connections.
- [docs/end-user/shared/use-case-walkthroughs/](/docs/end-user/shared/use-case-walkthroughs/README.md) — concrete scenarios
- [docs/end-user/shared/key-ideas/](/docs/end-user/shared/key-ideas/README.md) — concept reference pages
