# What's in the MVP?

The MVP is fully implemented. This document describes what's in scope, what was deliberately deferred, and a brief description of the user-facing entry points.

## What's in scope

All seven subsystems are implemented:

- **Conceptspace** — Statements, beliefs, and implication relationships. Users sign statements on-chain; AI attesters publish "S1 implies S2" links; indirect support propagates through the implication graph. Seed content has been created.
- **LazyGiving** — Kickstarter-style assurance contracts with ERC-1155 resellable tokens. Includes a secondary market for token trading.
- **Delegation** — Composable, revocable delegation chains. Donors deposit funds into delegatable notes and delegate spending authority to trusted people (`DelegatableNotes.sol`, `NoteIntent.sol`).
- **Aligning** — Per-statement portals showing projects aligned with a cause (directly or via implication chain), contributor leaderboards, and full delegation-chain transparency.
- **Content Funding** — Retroactive funding for individual pieces of online content via per-creator assurance contracts. Twitter, YouTube, and Substack all have complete creator verification flows.
- **Subjectiv** — Trust-graph-mediated filtering. Users set direct trust scores on each other; transitive trust computation runs in a Web Worker and rehydrates from IndexedDB on startup; the cause board filters alignment attestations by the trusted set.
- **Mutable Refs** — On-chain mutable named pointers to IPFS content. SDK and UI are both complete (`ui/src/mutablerefs/MyRefsPage.tsx` — CRUD, IPFS inspection, history, delete confirmation).

## Multiple UI domains

The system is deployed as eight focused branded sites built from one shared codebase:

- **Commonality** — movement site for internet-age public-goods funding.
- **LazyGiving** — individual assurance contracts: create, browse, pledge, refund, retroactively fund.
- **Aligning** — cause-based cause boards, project-alignment attestations, and delegation-based giving.
- **Tally** — consumer-facing statement signing / polling with implication-derived supporter counts.
- **Content Funding** — creator/fan site for funding online content.
- **Civility** — Content Funding focused on the noninflammatory criteria (steelmanning, no contempt/tribal signaling).
- **Common Sense Majority** — movement site layered on top of Civility, Tally, Aligning, and LazyGiving.
- **Conceptspace** — mostly developer-facing infrastructure for statements, implication graph, signing, trust, attesters, and nudgers.

Each domain is a separate build artifact. See [specs/tech/ui-domains.md](../tech/ui-domains.md) and [specs/product/ui-domains.md](ui-domains.md).

## Currency

The contracts and SDK are fully generalized to ERC-20 settlement tokens. USDC is used in production for MVP. See [currency.md](currency.md).

## Entry points

**Raising funds for a project:**
Go to LazyGiving or the appropriate vertical site, create a project on LazyGiving. Set a funding target and deadline; contributors get resellable ERC-1155 tokens as donation receipts. Attest that your project is aligned with a cause to make it visible on cause boards. Delegation chains let supporters entrust their funding decisions to you.

**Contributing to a cause:**
Browse cause boards for statements you care about. The portal shows projects attested as aligned with that statement, filtered by your personal trust network (Subjectiv). You can fund directly or delegate to someone you trust.

**Content creators (Twitter, YouTube, Substack):**
Verify your channel on the Content Funding site. Fans can set up content-funding contracts on your behalf or you can create your own. The noninflammatory-content attester evaluates your content; high scores increase your earnings.

**Expressing a position:**
Visit Tally, find or write a statement that expresses what you believe, and sign it. Implication attestations connect your statement to others saying similar things — so even if your exact wording is new, your support is counted alongside people who expressed the same idea differently.

## What was deliberately deferred

(TODO: check this; some of this is wrong.)

- **Fiat bridges** — Credit card / Apple Pay / Google Pay onramp. See [specs/tech/bridges.md](../tech/bridges.md) for the design.
- **Embedded wallet provisioning** — Keeping crypto invisible to non-crypto-native users.
- [Unique-human verification](/specs/tech/shared/unique-human-id.md).
- Thought that I'd like to explore for Tally: some notion of [private beliefs](specs/product/privacy-slider.md)?
- **Per-contract token choice** — Contracts are token-general but the UI constrains to one token (USDC). Post-MVP each project can choose its own token.
- Support [user-selectable chains](../tech/multi-chain.md)
- **foldVersion + accumulator storage** — Client-side caching of fold accumulators in localStorage; see [specs/tech/indexer/README.md](../tech/indexer/README.md) for the design. (TODO: is this right? I thought we did at least some of this.)
- **Generative testing** — Infrastructure is prepped; the generative test suite itself isn't written. (TODO: wait, is that right? What's in fake-data-generation? Doesn't it come with properties that can be checked?)
- **AI skills** — Formal SKILL.md files for the assistant roles described in [ai-assistance.md](ai-assistance.md).
- [Volunteer discovery](./volunteer-discovery.md)?
- A way of using the CSM nudger that I think might be useful: "Here's me, here's my friend, nudge us both towards common ground." (The point is that this might be something more people are interested in than simply "nudge me towards Abstract Moderate Left-Wing Average".) The nudger will probably still do this with the understanding that the common [patterns of finding common ground](/docs/end-user/common-sense-majority/hidden-majority-patterns.md) still apply and the widely-held common-ground beliefs are still probably good ones to aim for; unless these two people are very idiosyncratic, the normal patterns will probably work for them. But I doubt that most people are as interested in "nudge me towards the other side" as they are in "help me repair my relationship with my friend."
