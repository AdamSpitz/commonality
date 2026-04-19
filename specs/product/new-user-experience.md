# New-user experience and exploration

How a new user gets started and discovers content.

## The core tension

New users need guidance — the statement graph is unfamiliar, they don't know what conceptspace is, and they need a path from "I just showed up" to "I've signed some statements that represent my beliefs."

But the mechanisms that provide guidance (nudgers, suggestions, prompts to sign things) are inherently pushy. If they're too eager, they become the equivalent of a clingy app sending notifications you didn't ask for. Worse, because nudges touch on *beliefs*, being pushy feels manipulative rather than just annoying.

## Exploration vs. nudging

These are fundamentally different experiences and should be treated as separate systems.

### Exploration (pull-based)

The user is actively looking: "I'm new, show me what's here, help me find my corner of this space." This should feel like browsing a well-organized library, not like someone following you around suggesting books.

The [explorer](../tech/subsystems/conceptspace/explorer.md) is the primary tool for this. It's a conversational AI interface where the user can ask questions, browse topics, and sign statements at their own pace. The explorer is a **page you go to** — it never reaches out to you.

### Nudging (push-based)

The system is reaching out: "You've been here a while, you've signed some things, here's something related you might have missed." Nudges appear contextually on pages the user is already viewing — on statement detail pages, in a suggestions panel, etc.

See the [nudger spec](../tech/subsystems/nudger/README.md) for the technical architecture.

### Why explorers are not nudgers

It's tempting to treat the explorer as "just another nudger," since both suggest statements. But they differ in important ways:

| | Explorer | Nudger |
|---|---|---|
| Initiated by | The user (opens the explorer page) | The system (nudges appear on pages the user is viewing) |
| Interaction model | Conversational, back-and-forth | One-shot suggestions |
| Per-user AI cost | Yes (live LLM conversation) | No (pre-generated batches, client-side filtering) |
| Trust model | Part of the core UI, no trust configuration needed | User selects which nudgers to trust |
| When it's useful | Early on, or when the user wants to deliberately explore | Ongoing, as the user builds up a portfolio of signed statements |

The explorer uses an LLM to have a real-time conversation with the user. Nudgers pre-generate batches of suggestions and publish them; the client filters and displays them. These are different architectures serving different needs.

## The explorer as the new-user entry point

When a new user arrives with zero signatures, the explorer should be prominent — a clear "Start here" path. It walks the user through:

1. "What is this system?" — a conversational explanation, adapted to what the user seems to already know.
2. "What's out there?" — showing high-level topic areas (politics, technology, environment, etc.) as statements the user can browse without commitment.
3. "What do you believe?" — helping the user articulate and sign their first few statements.
4. "What can you do with this?" — introducing funding portals, delegation, and other features once the user has some context.

The explorer doesn't need to cover everything in one session. It should feel like a natural conversation that the user can leave and return to.

### Pre-generated exploration structure

One important insight: much of the explorer's guidance doesn't need to be generated live per user. The "top of the hierarchy" navigation — from broad topics down to specific positions — can be **pre-generated** by a background process that periodically enriches the statement graph with exploration-friendly links.

This pre-generated structure is just data in the statement graph (statements and implication links). The live LLM in the explorer uses it to guide the conversation, but the structure itself is created offline. This means:

- No expensive per-user LLM cost for the basic "browse topics" flow
- The navigation structure can be reviewed and curated
- The live LLM adds value through personalization and conversation, not through generating the structure from scratch

## Nudge UX

As the user becomes more established, nudges become relevant. See [nudge-ux.md](nudge-ux.md) for the full design — graduated visibility, surface area budgets, dismissal, user controls, and filtering strategy. The key point for new users: **no nudges at all until they've signed at least a few statements.** The explorer is the onboarding path, not nudges.

## Relationship to content bootstrapping

See [content.md](content.md) for the broader content strategy.

The new-user experience depends on there being enough content in the system to explore. If the statement graph is nearly empty, even a great explorer and great nudgers can't help. The [seed content](../tech/subsystems/conceptspace/seed-content/README.md) and [content finder](../tech/subsystems/content-finder/) services address this from the supply side; the explorer and nudgers address it from the demand/discovery side.

## What exists vs. what needs to be built

| Component | Status |
|---|---|
| Explorer spec (conversational AI UI) | Specified ([explorer.md](../tech/subsystems/conceptspace/explorer.md)) |
| Explorer implementation | Not built |
| Pre-generated exploration structure | Not built |

For nudge-related build status, see [nudge-ux.md](nudge-ux.md).
