# What's in the MVP?

The MVP is fully implemented. This document describes what's in scope, what was deliberately deferred, and a brief description of the user-facing entry points.

## What's in scope

All seven subsystems are implemented:

- **Conceptspace** — Statements, beliefs, and implication relationships. Users sign statements on-chain; AI attesters publish "S1 implies S2" links; indirect support propagates through the implication graph.
- **Pubstarter** — Kickstarter-style assurance contracts with ERC-1155 resellable tokens. Includes a secondary market for token trading.
- **Delegation** — Composable, revocable delegation chains. Donors deposit funds into delegatable notes and delegate spending authority to trusted people (`DelegatableNotes.sol`, `NoteIntent.sol`).
- **Funding Portals** — Per-statement portals showing projects aligned with a cause (directly or via implication chain), contributor leaderboards, and full delegation-chain transparency.
- **Content Funding** — Retroactive funding for individual pieces of online content via per-creator assurance contracts. Twitter, YouTube, and Substack all have complete creator verification flows.
- **Subjectiv** — Trust-graph-mediated filtering. Users set direct trust scores on each other; transitive trust computation runs in a Web Worker and rehydrates from IndexedDB on startup; the funding portal filters alignment attestations by the trusted set.
- **Mutable Refs** — On-chain mutable named pointers to IPFS content. SDK layer is complete; no UI yet (deliberately deferred).

## Multiple UI domains

The system is deployed as four focused branded sites built from one shared codebase:

- **Commonality** — The full platform: conceptspace, pubstarter, funding portals, delegation, trust management.
- **Content Funding** — Creator/fan site for funding online content.
- **Noninflammatory Content** — Content Funding focused on the noninflammatory criteria (steelmanning, no contempt/tribal signaling).
- **Common Sense Majority** — Movement site layered on top of Noninflammatory Content, adding organizing/advocacy project funding.

Each domain is a separate build artifact. See [specs/tech/ui-domains.md](../tech/ui-domains.md) and [specs/product/ui-domains.md](ui-domains.md).

## Currency

The contracts and SDK are fully generalized to ERC-20 settlement tokens. USDC is used in production for MVP. See [currency.md](currency.md).

## Entry points

**Raising funds for a project:**
Go to the Commonality or appropriate domain site, create a project on Pubstarter. Set a funding target and deadline; contributors get resellable ERC-1155 tokens as donation receipts. Attest that your project is aligned with a cause to make it visible on funding portals. Delegation chains let supporters entrust their funding decisions to you.

**Contributing to a cause:**
Browse funding portals for statements you care about. The portal shows projects attested as aligned with that statement, filtered by your personal trust network (Subjectiv). You can fund directly or delegate to someone you trust.

**Content creators (Twitter, YouTube, Substack):**
Verify your channel on the Content Funding site. Fans can set up content-funding contracts on your behalf or you can create your own. The noninflammatory-content attester evaluates your content; high scores increase your earnings.

**Expressing a position:**
Visit the Commonality conceptspace, find or write a statement that expresses what you believe, and sign it. Implication attestations connect your statement to others saying similar things — so even if your exact wording is new, your support is counted alongside people who expressed the same idea differently.

## What was deliberately deferred

- **Fiat bridges** — Credit card / Apple Pay / Google Pay onramp. See [specs/tech/bridges.md](../tech/bridges.md) for the design.
- **Embedded wallet provisioning** — Keeping crypto invisible to non-crypto-native users.
- **Unique-human verification** — Worldcoin, BrightID, etc.
- **Mutable Refs UI** — The SDK is done; the UI is deferred.
- **Explorer AI / AI-assisted statement discovery** — Specced in [specs/product/content.md](content.md); not yet implemented.
- **Seed content** — Curated real statements haven't been written yet. See [specs/tech/subsystems/conceptspace/seed-content/README.md](../tech/subsystems/conceptspace/seed-content/README.md).
- **Per-contract token choice** — Contracts are token-general but the UI constrains to one token (USDC). Post-MVP each project can choose its own token.
- **foldVersion + accumulator storage** — Client-side caching of fold accumulators in localStorage; see [specs/tech/indexer/README.md](../tech/indexer/README.md) for the design.
- **Generative testing** — Infrastructure is prepped; the generative test suite itself isn't written.
- **AI skills** — Formal SKILL.md files for the assistant roles described in [ai-assistance.md](ai-assistance.md).
