# Specs

Specifications for Commonality — a system for decentralized crowdfunding of public goods.

## What is Commonality?

Right now, funding public goods means choosing between government (slow, captured, expensive) or charity (opaque, overhead-heavy, centralized). Commonality offers a third path: decentralized crowdfunding via blockchain and IPFS, with trustlessly verifiable transactions, very low overhead, and almost no need for people to coordinate upfront.

The core concept: large numbers of people who share values can fund projects aligned with those values — not by forming a big monolithic organization, but as a network of individuals making independent decisions, with a system that makes their choices legible and coordinated without requiring top-down structure.

See [/docs/end-user/commonality/vision-and-strategy/README.md](/docs/end-user/commonality/vision-and-strategy/README.md) for the full motivational discussion.

## Who is reading this?

See [roles](/workflow/roles/README.md) for role-based guidance on what docs to read, depending on whether you're in the role of founder, product manager, technical lead, developer, or user.

## Subsystems

The system is composed of seven subsystems, all sharing a single thin event-cache indexer:

- **[Conceptspace](tech/subsystems/conceptspace/README.md)** — Statements, beliefs, and AI-generated implication relationships. Users sign statements to express support; AI attesters publish "S1 implies S2" links so indirect support propagates through a graph of related ideas. The implication graph drastically reduces coordination costs: you don't need everyone to rally around one canonical statement.
- **[Pubstarter](tech/subsystems/pubstarter/README.md)** — Individual crowdfunding projects: Kickstarter-style assurance contracts (ERC-1155) with resellable tokens. Investors can exit by selling to altruistic donors, creating a secondary market for public-goods funding.
- **[Delegation](tech/subsystems/delegation/README.md)** — Composable, revocable delegation chains. Donors deposit funds into "delegatable notes" and can delegate spending authority down a chain of trusted people, eliminating the friction of every donor needing to make every decision.
- **[Funding Portals](tech/subsystems/fundingportals/README.md)** — Per-statement portals showing projects aligned with a cause (directly or via the implication graph), with contributor leaderboards and full delegation-chain transparency.
- **[Content Funding](tech/subsystems/content-funding/README.md)** — Retroactive funding for individual pieces of online content (YouTube, Twitter, Substack, etc.) via per-creator assurance contracts.
- **[Subjectiv](tech/subsystems/subjectiv/README.md)** — Trust-graph-mediated filtering. Users set trust scores on each other; alignment attestations are filtered by transitive trust so each user sees only projects vouched for by people they (transitively) trust.
- **[Mutable Refs](tech/subsystems/mutable-refs/README.md)** — Utility subsystem: onchain mutable named pointers to IPFS content, for when you need a stable reference to data that can change over time.

## Speculative

- **[product/volunteer-discovery.md](product/volunteer-discovery.md)** — Consider linking out to existing volunteer/activity platforms (Discord, Meetup, GitHub, etc.) as a "where's the energy?" navigational signal, without building any volunteer-management subsystem ourselves.

## Tech docs

[tech/](tech/README.md) — architecture, technology choices, subsystem specs, and cross-cutting concerns.

## Product docs

[product/](product/README.md) — product-manager-level planning. Includes MVP scope, post-MVP roadmap, content strategy, AI skills design, currency, and UI domain decisions.

## Dev docs

[dev/testing/README.md](dev/testing/README.md) — test strategy: smart contract unit tests, blockchain+indexer integration tests, generative testing, and UI tests.

