# Documentation roles

Different roles need different kinds of documentation. This file is the guide to what to read.

Role-based routing is also in the top-level [README.md](README.md#finding-relevant-specs).

---

## Founder

*Either the human founder or an LLM assisting in that role.*

Trying to figure out the entire big picture: goals, what's realistic, what to build, how to build it, why it might work.

**Start with:**
- [docs/vision-and-strategy/](docs/vision-and-strategy/README.md) — motivation for the project. What do we hope this project can accomplish in the world? Why do we think it could succeed?
- [specs/README.md](specs/README.md) — high-level specs. What are we actually building to realize the vision?

Medium-level technical specs are less important at this level, though worth being able to look over.

---

## Product manager

*Turning the overall vision into a high-level product spec.*

Not about thinking through societal implications (that's the founder role) — just figuring out what to build.

**Start with:**
- [specs/README.md](specs/README.md) — system overview
- [specs/product/](specs/product/) — product-manager-level planning: MVP scope, future work, content strategy, AI skills design, currency

---

## Technical lead

*Turning the high-level product spec into medium-level technical specs.*

Making architecture decisions, defining data flows, thinking through trade-offs.

**Start with:**
- [specs/README.md](specs/README.md) — system overview
- [specs/tech/README.md](specs/tech/README.md) — architecture overview and index of all tech docs
- Each subsystem's `README.md`, `indexer.md`, and `queries-and-actions.md` under [specs/tech/subsystems/](specs/tech/subsystems/)

---

## Dev

*Implementing the code from the technical specs.*

Needs technical details. High-level context is useful but not the primary need. Most of the documentation at this level lives in the code packages themselves (`hardhat/README.md`, `sdk/README.md`, `ui/README.md`, etc.).

**Start with:**
- The package-level READMEs
- [specs/tech/subsystems/](specs/tech/subsystems/) for the subsystem you're working on
- [specs/dev/testing/](specs/dev/testing/) — test strategy

---

## User docs

*The plan for generating user-facing documentation for end users (or an LLM assisting an end user).*

The primary audience is a new user who doesn't know what Commonality is and needs to understand: what is it for, what can I do with it, why would I want to, how do I get started.

**Core design decisions:**

### Lead with stories, not abstractions

The system is general-purpose and has a lot of conceptual machinery (assurance contracts, delegation, implication graphs, trust networks, etc.). But the pitch is "each step is individually useful." The docs should mirror that: lead with concrete scenarios, let people absorb concepts through stories rather than definitions.

The walkthroughs are the primary entry point. Each one naturally highlights different subsystems, so a reader who reads two or three absorbs most of the key concepts without being "taught" them.

### Use-case navigation, not a single narrative

Different people arrive with different interests. Rather than a linear "here's how the whole system works" narrative, the landing page offers multiple entry points:
- **Walkthroughs** — pick the story that resonates with you
- **Role-based pages** — "here's what I want to do"
- **Concept pages** — reference, dip in as needed

### No crypto jargon in the main docs

The main docs should talk about "pledges that refund if the goal isn't met," not "ERC-1155 assurance contracts." The trust/transparency story should be told as "the code is open-source, all transactions are public, nobody controls it" — accurate and meaningful without saying "blockchain." A single separate page serves crypto-native users who want the technical details (L2, ERC-1155, IPFS CIDs, Solidity contracts, etc.).

### Human-readable with LLM-friendly structure

Write the docs for humans (narrative, plain language). Then add a structured "TL;DR for AI assistants" block at the top of each concept page: what this concept is, when a user would encounter it, what actions they might want help with. This lets an LLM orient itself quickly without degrading the human reading experience.

**User-facing docs live in:**
- [docs/roles/](docs/roles/) — role-based how-tos
- [docs/use-case-walkthroughs/](docs/use-case-walkthroughs/) — concrete scenarios
- [docs/key-ideas/](docs/key-ideas/) — concept reference pages
