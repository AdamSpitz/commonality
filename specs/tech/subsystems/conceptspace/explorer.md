# Conceptspace Explorer

A goal-oriented nudger that helps users discover and sign statements relevant to a specific purpose — finding fundable projects, participating in a movement, or onboarding to the system for the first time.

## Architecture: two-tier LLM

The explorer is a [nudger](../nudger/README.md) — it publishes suggestions through the standard nudger framework. What makes it different from other nudgers is its two-tier architecture:

### Background LLM (expensive, periodic)

A background process where an LLM maintains a **curated collection** of statements oriented toward the explorer's goal. For example, the Fundable Project Explorer watches for projects and their alignment attestations, delegatable-notes, and builds a decision tree: a small, non-redundant set of statements (dozens to low hundreds) that routes users from broad interests to specific funding areas.

The background LLM:
- Follows new statements being posted to the graph.
- When it finds one that's better than its current pick for an area, or that genuinely fleshes out its map in a new direction (not idiosyncratic — something other users will also find useful), it adds it to the collection, replacing the old one if any.
- Curates for non-redundancy: no five ways of saying "I lean right."
- Publishes its curated collection as nudge batches through the standard `NudgePublications` contract.

The curated collection is the explorer's "map of the territory" for its specific goal. Different explorers have different maps — a funding explorer maps funding areas, a CSM explorer maps the political positions needed for bridge-building.

### Per-user LLM (cheap, on demand)

When a user opens the explorer, the system makes a per-user LLM call: "given this user's signed statements and this explorer's curated collection, which branches are already covered and what should we suggest next?"

This call is cheap because both inputs are small — the user's portfolio (tens to low hundreds of signatures) plus the explorer's curated collection (dozens to low hundreds of statements). The LLM handles all the judgment calls that would otherwise require formalized relations:

- **Anti-correlations:** Don't suggest "I'm pro-life" when the user signed "I'm pro-choice."
- **Redundancy:** Don't suggest things the user has already effectively covered.
- **Prioritization:** Suggest the branches most likely to be useful for this user given what they've already expressed.

This is cheaper and more accurate than trying to encode these judgments as graph relations (see [lean-on-ai.md](../../../product/lean-on-ai.md)).

## Conversational UI

The explorer can also be presented as a conversational interface — a chat panel alongside a statement panel. This is optional (the explorer works as a standard nudger even without it), but it's the best experience for new users who want guided exploration.

### Layout: chat panel + statement panel

The page has two panels side by side:

- **Chat panel** (left): A standard chat interface. The user types messages; the LLM responds with text. This is where the conversation happens.
- **Statement panel** (right): Displays statements that the LLM has surfaced. Each statement is rendered using the standard statement display component (not LLM-generated HTML). Each statement shows:
  - The statement content
  - Direct and indirect signer counts
  - A **sign** button (to express belief)
  - A **save** button (to add to the user's [saved statements list](statements-list.md) without signing)
  - A **navigate** link (to explore that statement's implications, or to jump to its funding portal)

The key architectural principle: **the LLM controls what statements appear in the statement panel, but the statements themselves are rendered by deterministic UI code.** The LLM never generates statement text directly into the chat — it either references existing statements by CID, or creates a new statement (uploading to IPFS) and then references it. This keeps the formal "what did I actually sign?" layer clean and auditable.

### How the LLM interacts with the UI

The LLM is called via a standard chat-completions-style API. The page maintains the conversation history (an array of messages) and sends the full history with each API call. The LLM has access to a set of **tool calls** that let it act on the UI:

#### Tools available to the LLM

- **`show_statements(cids: string[])`** — Display these statements in the statement panel. Replaces the current contents. The UI fetches statement content from IPFS/indexer and renders them.
- **`add_statements(cids: string[])`** — Add these statements to the statement panel without clearing what's already there.
- **`create_statement(content: DisplayableDocument)`** — Create a new statement (upload to IPFS), then display it in the statement panel. Used when the LLM composes a polished version of something the user said.
- **`search_statements(query: string, filters?: {...})`** — Search the indexer for statements matching a query. Returns results to the LLM (not directly to the UI) so the LLM can decide which ones to surface.
- **`get_implications(cid: string, direction: "implies" | "implied_by")`** — Look up implication links for a statement. Returns results to the LLM.
- **`get_statement_info(cid: string)`** — Get metadata about a statement (signer counts, trending velocity, etc.). Returns results to the LLM.
- **`navigate_to(target: string)`** — Navigate the user to another page (e.g., a funding portal, a statement's full page, a user profile).

This is not meant to be exhaustive — an implementor should add whatever other tools make sense. The point is that the LLM communicates with the UI through structured tool calls, not by generating HTML or free-text statement content.

#### Handling UI events

When the user takes an action in the statement panel (signs a statement, saves one, clicks navigate), the page appends a system message to the conversation history describing what happened:

```
{"role": "system", "content": "User signed statement bafyrei... ('I generally lean right-wing')"}
```

Then the page sends the updated history to the LLM, which can respond naturally ("Great, now let's dig into what kind of right-wing views you hold...").

This means the LLM doesn't need any special subscription or polling mechanism — it's just a standard request/response API where UI events get folded into the conversation as system messages.

### Session context and limits

The conversation history grows over the session. For a typical onboarding or exploration session this won't hit context limits. If a session gets very long, the page should summarize older messages (e.g., keep the last N messages verbatim and prepend a summary of what came before). This is a standard technique for long chat sessions.

The LLM receives a system prompt describing the Commonality system, the tools available to it, and the user's current state (connected wallet address, statements they've signed, etc.). This system prompt should be written as a dedicated skill — see [ai-assistance.md](../../ai-assistance.md) for the broader AI skills framework.

## Example interaction

1. User opens the explorer page for the first time.
2. The page sends an initial LLM call with a system prompt and no user messages. The LLM responds with a greeting and calls `show_statements` with a set of high-level "I am interested in X" statements.
3. User signs "I am interested in politics." The page appends this event to the history and calls the LLM.
4. The LLM says "Great — do you lean left or right?" and calls `show_statements` with two statements.
5. User types "Not really either, I'm kind of a mix" and explains their views.
6. The LLM calls `create_statement` with a polished version of the user's views. The new statement appears in the panel.
7. User signs it.
8. The LLM calls `get_implications` to find related statements, then calls `add_statements` to show several that the user probably also believes, explaining: "You signed S1, which implies these — take a look and sign any that fit."
9. User signs some, ignores others, saves one for later.
10. The LLM says "Want to explore crypto next, or see what projects are looking for funding in causes you've signed?"

## Two modes of suggestion

When the LLM suggests statements, there are two different bases for suggestion, and the UI/LLM should be clear about which one applies:

- **Bottom-up (implication-based):** "You signed S1. There's an implication attestation from S1 to S2, meaning S1 essentially implies S2. You may want to sign S2 as well." This is based on the implication graph and is a strong, logical basis for suggestion.
- **Top-down (exploration-based):** "You said you're interested in politics. Here are some more specific political positions — which ones resonate with you?" This is the LLM using the explorer's curated collection (and its own general knowledge) to suggest areas to explore, without any specific implication link.

Both are valid, but the distinction matters for user trust. Bottom-up suggestions should reference the implication link. Top-down suggestions are the explorer helping the user navigate.

## Exploring without signing

The explorer supports a purely exploratory mode. A user can:

- Click "navigate" on any statement to explore its implications and related statements, without signing it.
- Browse funding portals for causes they haven't signed (the funding portal is at `fundingportals/statement/${statementId}` and works for any statement).
- Save statements to their [saved statements list](statements-list.md) for later consideration.
- Simply read and discuss statements with the LLM without taking any action.

There's no pressure to sign anything. The explorer is as much a tool for understanding the landscape as it is for declaring beliefs.

## Relationship to other UI pages

The explorer is a standalone page, but it links out to the rest of the system:

- Clicking a statement's "navigate" link can go to that statement's full page (with detailed signer lists, implication graph, etc.).
- The LLM can use `navigate_to` to send the user to a funding portal for a cause they've expressed interest in.
- Statements the user signs or saves in the explorer show up on their user profile page and saved statements list, same as if they'd signed/saved them through any other UI.
