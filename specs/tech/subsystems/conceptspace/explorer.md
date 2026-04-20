# Conceptspace Explorer

A goal-oriented nudger that helps users discover and sign statements relevant to a specific purpose — finding fundable projects, participating in a movement, or onboarding to the system for the first time.

## Architecture: two-tier LLM

The explorer is a [nudger](../nudger/README.md) — it uses the standard nudger identity and trust model. What makes it different from other nudgers is its two-tier architecture:

### Background LLM (expensive, periodic)

A background process where an LLM maintains a **curated collection** of statements oriented toward the explorer's goal. For the Fundable Project Explorer, this means watching for projects, alignment attestations, and delegatable-notes, and building a map of the funding landscape: a small, non-redundant set of statements (dozens to low hundreds) that covers the space of fundable causes and project areas.

The background LLM:
- Follows new statements being posted to the graph.
- When it finds one that better represents an area, or that genuinely fills in a new part of the map (not idiosyncratic — something other users will also find useful), it adds it to the collection, replacing the old one if any.
- Curates for non-redundancy: no five ways of saying the same thing.
- Publishes its curated collection as a standalone IPFS document — see [Publication model](#publication-model).

The curated collection is the explorer's "map of the territory" for its specific goal. Different explorers have different maps — a funding explorer maps funding areas, a CSM explorer maps the political positions needed for bridge-building.

### Per-user LLM (cheap, on demand)

When a user opens the explorer, the page makes a per-user LLM call: "given this user's signed statements and this explorer's curated collection, which areas are already covered and what should we suggest next?"

This call is cheap because both inputs are small — the user's portfolio (tens to low hundreds of signatures) plus the explorer's curated collection (dozens to low hundreds of statements). The LLM handles all the judgment calls that would otherwise require formalized relations:

- **Anti-correlations:** Don't suggest "I'm pro-life" when the user signed "I'm pro-choice."
- **Redundancy:** Don't suggest things the user has already effectively covered.
- **Prioritization:** Suggest the areas most likely to resonate with this user given what they've already expressed.

This is cheaper and more accurate than trying to encode these judgments as graph relations (see [lean-on-ai.md](../../../product/lean-on-ai.md)).

## Publication model

The curated collection is published as a standalone IPFS document — not through the standard NudgeBatch format. NudgeBatch is pairwise (`target → suggested`) and is the right format for contextual nudges; the explorer's curated map is a different artifact: a shared resource that the explorer page reads directly.

```typescript
type CuratedCollectionEntry = {
  cid: string;        // Statement CID
  label: string;      // Short human-readable label for this area
  topicArea: string;  // Broad topic grouping
};

type CuratedCollection = {
  explorer: string;           // Ethereum address of the explorer nudger
  publishedAt: number;        // Unix timestamp
  entries: CuratedCollectionEntry[];
};
```

The explorer uses the standard nudger identity (Ethereum address, `NudgePublications` contract, `/.well-known/nudger.json`) for trust and discovery, but publishes its curated collection separately. The onchain event points to the collection CID the same way it would point to a NudgeBatch CID — the trust model is the same; only the document format differs.

## The explorer page

The explorer is a dedicated page that shows suggested statements from the curated collection. Each suggested statement is rendered using the standard statement display component. Each card shows:

- The statement content
- Direct and indirect signer counts
- Funding numbers for the associated cause: **money available** (delegatable funds seeking projects) and **money being requested** (projects seeking funding) — both visible, so the user can see both sides of the market
- A **sign** button (to express belief)
- A **save** button (to add to the user's [saved statements list](statements-list.md) without signing)
- A **navigate** link (to explore that statement's full page, implication graph, or funding portal)

The page does not prompt the user to declare whether they are a donor or a doer. The funding numbers are informational — they let the user steer in whichever direction draws them, without any explicit choice being asked for.

### How suggestions are generated

On page load, the page:
1. Fetches the explorer's curated collection from IPFS.
2. Makes a per-user LLM call: given the user's signed statements and the curated collection, which statements should be surfaced?
3. Displays the returned CIDs as statement cards.

### Trust model

The Fundable Project Explorer is included in every user's trusted nudgers list by default. Users can remove it from Settings like any other trusted nudger.

## Two modes of suggestion

When suggesting statements, there are two different bases, and the UI should be clear about which applies:

- **Bottom-up (implication-based):** "You signed S1. There's an implication attestation from S1 to S2 — you may want to sign S2 as well." This is based on the implication graph and is a strong, logical basis for suggestion.
- **Top-down (exploration-based):** "You said you're interested in politics. Here are some more specific positions — which ones resonate?" This is the explorer using its curated collection to suggest areas to explore, without any specific implication link.

Both are valid, but the distinction matters for user trust. Bottom-up suggestions should reference the implication link. Top-down suggestions are the explorer helping the user navigate the landscape.

## Exploring without signing

There's no pressure to sign anything. A user can:

- Click "navigate" on any statement to explore its implications and related statements, without signing it.
- Browse funding portals for causes they haven't signed (the funding portal is at `fundingportals/statement/${statementId}` and works for any statement).
- Save statements to their [saved statements list](statements-list.md) for later consideration.

The explorer is as much a tool for understanding the landscape as it is for declaring beliefs.

## Relationship to other UI pages

The explorer is a standalone page, but it links out to the rest of the system:

- Clicking a statement's "navigate" link goes to that statement's full page (with detailed signer lists, implication graph, etc.) or its funding portal.
- Statements the user signs or saves show up on their user profile page and saved statements list, same as if they'd signed/saved them through any other UI.

## Future: conversational UI

A conversational interface — a chat panel alongside the statement panel — is a natural next step. The LLM would interact with the UI through structured tool calls (`show_statements`, `add_statements`, `search_statements`, `get_implications`, `navigate_to`), keeping the formal "what did I actually sign?" layer clean and auditable. Statement creation (`create_statement`) could be added at this stage as well, allowing the LLM to compose a polished version of something the user described and surface it for signing.

The key architectural principle would remain: **the LLM controls what statements appear in the statement panel, but the statements are rendered by deterministic UI code.** The LLM never generates statement text directly — it either references existing statements by CID, or creates a new statement and then references it.

This is not in scope for v1.
