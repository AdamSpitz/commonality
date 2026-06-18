# Conceptspace Explorer

A goal-oriented nudger pattern that helps users discover and sign statements relevant to a specific purpose — finding fundable projects, participating in a movement, or onboarding to the system [for the first time](/specs/product/new-user-experience.md). The explorer mechanism is reusable, but each concrete explorer has a specific goal and stream; there is no generic Tally `/explore` surface yet.

## Architecture: two-tier LLM

The explorer is a [nudger](../nudger/README.md) — it uses the standard nudger identity and trust model. What makes it different from other nudgers is its two-tier architecture:

### Background LLM (expensive, periodic)

A background process where an LLM maintains a **curated collection** of statements oriented toward the explorer's goal. For the Fundable Project Explorer, this means watching for projects, alignment attestations, delegatable-notes, and Tally support numbers, and building a map of the funding landscape: a small, non-redundant set of statements (dozens to low hundreds) that covers the space of fundable causes and project areas.

The background LLM:
- Follows new statements being posted to the graph.
- When it finds one that better represents an area, or that genuinely fills in a new part of the map (not idiosyncratic — something other users will also find useful), it adds it to the collection, replacing the old one if any.
- Curates for non-redundancy: no five ways of saying the same thing.
- Factors in verified supporter counts (direct signers plus indirect supporters via trusted implication attestations) as a demand signal when deciding which areas are active and worth prioritizing.
- Publishes its curated collection as a nudger `curated-collection` publication — see [Publication model](#publication-model).

For v1, the curator should reevaluate the map periodically, but only publish a new snapshot when the proposed map has changed materially. This is meant to be a curated resource, not a twitchy event stream. "Materially" does not need a rigid formal definition yet; the intended cases are things like:

- a genuinely new area that deserves inclusion
- a clearly better representative statement replacing an old one
- a meaningful reorganization of the map

If nothing important has changed, the curator should keep the existing snapshot rather than republishing equivalent data.

The curated collection is the explorer's "map of the territory" for its specific goal. Different explorers have different maps — a funding explorer maps funding areas, a CSM explorer maps the political positions needed for bridge-building.

### Tally support as a curation signal

The Fundable Project Explorer should not treat Tally support numbers as merely decorative card metadata. Verified supporter counts are evidence that many people are already near an area of the conceptspace, so helping funders and doers find that area is more likely to produce useful coordination.

For each candidate statement, the curator should make the following quantities available to the background LLM:

- `directBelievers`: accounts that directly signed the statement.
- `directDisbelievers`: accounts that directly opposed the statement.
- `indirectSupporters`: accounts that signed other statements which trusted implication attesters say imply this statement, excluding users who directly oppose it.
- `totalSupporters`: `directBelievers + indirectSupporters`.

Curation should use these numbers as prioritization evidence, not as a mechanical ranking. High `totalSupporters` is a strong demand signal for active funding areas; high `directBelievers` is stronger evidence that this exact wording is a good representative statement; high `indirectSupporters` is evidence that the broader area has latent demand even if exact wording is fragmented. But the curator must still preserve map quality: semantic coverage, non-redundancy, usefulness as a navigable funding map, and emerging underrepresented areas can justify including a lower-support statement.

Indirect support should be computed through the curator operator's configured trusted implication attesters. If no curator-specific trusted attester list is configured in a local/demo environment, using all indexed implication attestations is acceptable as a fallback, but production curation should use an explicit trusted list.

### Per-user LLM (cheap, on demand)

When a user opens the explorer, the page makes a per-user LLM call: "given this user's signed statements and this explorer's curated collection, which areas are already covered and what should we suggest next?"

This call is cheap because both inputs are small — the user's portfolio (tens to low hundreds of signatures) plus the explorer's curated collection (dozens to low hundreds of statements). The LLM handles all the judgment calls that would otherwise require formalized relations:

- **Anti-correlations:** Don't suggest "I'm pro-life" when the user signed "I'm pro-choice."
- **Redundancy:** Don't suggest things the user has already effectively covered.
- **Prioritization:** Suggest the areas most likely to resonate with this user given what they've already expressed.

This is cheaper and more accurate than trying to encode these judgments as graph relations (see [lean-on-ai.md](../../../product/lean-on-ai.md)).

## Publication model

The explorer publishes its map as a nudger `curated-collection` publication. This uses the same trust/discovery path as other nudgers — the publication is uploaded to IPFS and its CID is published on-chain by the nudger address — but it has different fold semantics from ordinary pairwise nudges.

```typescript
type CuratedCollectionEntry = {
  cid: string;        // Statement CID
  label: string;      // Short human-readable label for this area
  topicArea: string;  // Broad topic grouping used by this version of the map
  parentCid?: string; // Optional parent entry in this version of the map
};

type CuratedCollectionPublication = {
  kind: 'curated-collection';
  schemaVersion: 1;
  nudger: string;             // Ethereum address of the explorer nudger
  publishedAt: number;        // Unix timestamp
  stream: string;             // e.g. "fundable-project-explorer"
  entries: CuratedCollectionEntry[];
};
```

The client treats this as a snapshot resource: for a given explorer stream, the latest valid publication from that nudger wins. This is different from `nudge-batch`, where publications accumulate and can revoke individual pairwise suggestions.

The important thing about `topicArea` and `parentCid` is that they are **map-local structure**, not canonical facts about the statement itself. They are there to help this particular explorer version feel navigable:

- `topicArea` is just a rough clustering label chosen by the curator for this snapshot.
- `parentCid` is an optional lightweight "this sits under that" hint within this snapshot.

Neither field is meant to be formal, permanent, or globally authoritative. If a later version of the explorer reorganizes the terrain differently, it simply publishes a new `curated-collection` snapshot with different groupings and parent links.

## The explorer page

The explorer is a dedicated page that shows suggested statements from the curated collection. Each suggested statement is rendered using the standard statement display component. Each card shows:

- The statement content
- Direct and indirect signer counts
- Funding/activity numbers for the associated cause. The explorer should keep track of the underlying quantities separately — for example:
  - delegatable funding available for aligned projects
  - additional funding demand from aligned projects
  - number of aligned projects
  - money already raised by aligned projects
  The UI may later choose to combine or summarize these in different ways, but the underlying numbers should remain available rather than being prematurely collapsed into a single metric.
- A **sign** button (to express belief)
- A **navigate** link (to explore that statement's full page, implication graph, or cause board)

The page does not prompt the user to declare whether they are a donor or a doer. The funding numbers are informational — they let the user steer in whichever direction draws them, without any explicit choice being asked for.

### How suggestions are generated

On page load, the page:
1. Fetches the explorer's latest `curated-collection` publication.
2. Makes a per-user LLM call: given the user's signed statements and the curated collection, which statements should be surfaced?
3. Displays the returned statements as cards, along with a short reason for each one.

For v1, the per-user call should return a small structured result for each surfaced statement — not just the statement CID, but also a brief human-readable reason explaining why it was shown. For example:

```typescript
type ExplorerSuggestion = {
  cid: string;
  reason: string; // e.g. "Broad entry point into housing-related causes" or "Fits with statements you've already signed about local government"
};
```

The goal is not to expose the full chain-of-thought of the model. It is simply to give the user a lightweight explanation of why this statement is appearing, since the model is already doing that reasoning anyway.

For v1, this personalization call should be statement-context-based rather than identity-based. The client sends the user's signed statement CIDs; the explorer service does not need the user's wallet address in order to personalize the result.

```typescript
type ExplorerSuggestRequest = {
  stream: string;
  signedStatementCids: string[];
};
```

This keeps the interface simple and privacy-preserving, while leaving open the option of a richer request format later if we ever want to support draft or hypothetical statements.

### Trust model

The Fundable Project Explorer is the Aligning site's `/explore` page and uses stream `fundable-project-explorer`. It is included in every user's trusted nudgers list by default. Users can remove it from Settings like any other trusted nudger. Tally intentionally does not expose `/explore` for now; a future Tally explorer would need its own product goal rather than reusing the funding map.

## Two modes of suggestion

There are two different bases for suggestion in the broader product:

- **Bottom-up (implication-based):** "You signed S1. There's an implication attestation from S1 to S2 — you may want to sign S2 as well." This is based on the implication graph and is a strong, logical basis for suggestion.
- **Top-down (exploration-based):** "You said you're interested in politics. Here are some more specific positions — which ones resonate?" This is the explorer using its curated collection to suggest areas to explore, without any specific implication link.

Both are valid, and the distinction matters for user trust.

For the narrow v1 described here, the explorer page should be **top-down only**: it reads from the explorer's curated map and uses the per-user LLM call to decide what parts of that map to surface. Implication-based suggestions belong on their own existing surfaces (such as statement detail pages), where the implication link can be shown explicitly.

## Exploring without signing

There's no pressure to sign anything. A user can:

- Click "navigate" on any statement to explore its implications and related statements, without signing it.
- Browse cause boards for causes they haven't signed (the cause board is at `/portal/${statementCid}` and works for any statement).

The explorer is as much a tool for understanding the landscape as it is for declaring beliefs.

## Relationship to other UI pages

The concrete Fundable Project Explorer is a standalone page on Aligning `/explore`, but it links out to the rest of the system:

- Clicking a statement's cause-board link goes to `/portal/${statementCid}` on Aligning.
- Statement-detail navigation may link to Tally's statement page, since Tally owns statement/profile routes.
- Statements the user signs show up on their user profile page the same as if they'd signed them through any other UI.

## Still needed

The architecture in this document is now fairly well-defined. The local demo seed path currently publishes a deterministic first `fundable-project-explorer` collection from the formal seed content.

**Decision (2026-06-17): the Alignment explorer is cause-neutral and should not special-case seed content.** The Fundable Project Explorer is a *meta-level* explorer — it surfaces whatever causes people are actually funding and makes no value judgments. CSM (left/right bridging) is one *use case* built on Alignment, not the whole of it; the existing seed statements are CSM-flavored and serve that cause, and a CSM-specific explorer would have its own cause-specific seed map. So the launch plan is **not** to freeze a curated seed map. Instead, run the real curator live and neutral: it already curates over all on-chain statements with no seed awareness (`explorer-curator/src/curator.ts`), so it picks up the seed statements early simply because they are early content. The deterministic fixture stays as local-dev/test scaffolding only.

Two pieces of work fall out of this:

- **Responsiveness and cost control.** "Comes up to speed quickly as content arrives" is the real requirement. The live curator now runs a frequent cheap intake pass that tracks new statements/support-signal changes and accumulates pending importance, while the expensive full-strength map review runs only about every 6 hours, when pending importance crosses a threshold, or when an operator explicitly forces it. `POST /curate` accepts `mode: "intake"` or `mode: "full"` so launch/demo operators can choose the cheap pass or force a full LLM review after new content lands.
- **Graceful sparse/empty state.** With no frozen launch map, the Aligning `/explore` page renders an explicit empty-map fallback and a sparse-map notice while the curated collection is thin early on.

We still need to verify the Aligning UI presents the map well. Product curation questions remain:

- which broad funding/cause areas belong in the initial map
- which entries should serve as onboarding entry points
- how much depth or parent/child structure the first version should have

This is a seed-content / product-curation task, not just an implementation task.

## Future: conversational UI

A conversational interface — a chat panel alongside the statement panel — is a natural next step. The LLM would interact with the UI through structured tool calls (`show_statements`, `add_statements`, `search_statements`, `get_implications`, `navigate_to`), keeping the formal "what did I actually sign?" layer clean and auditable. Statement creation (`create_statement`) could be added at this stage as well, allowing the LLM to compose a polished version of something the user described and surface it for signing.

The key architectural principle would remain: **the LLM controls what statements appear in the statement panel, but the statements are rendered by deterministic UI code.** The LLM never generates statement text directly — it either references existing statements by CID, or creates a new statement and then references it.

This is not in scope for v1.
