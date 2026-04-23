# AI assistance

## Three layers

The system has three layers:

1. **Basic primitives** — writing statements, making attestations, buying/selling/burning tokens, delegating funding, etc. These work without AI.
2. **AI services** — autonomous background processes (attesters, finders, nudgers, explorers) that enrich the statement graph and publish suggestions. They run without a human in the loop. Users configure which ones they trust in Settings.
3. **User-facing AI skills** — interactive assistants that help a human navigate and use the system in a conversation. These are skills you load into Claude Code, OpenClaw, a hosted Commonality assistant, or whatever AI environment you use.

The distinction matters because a lot of things that might initially sound like "AI skill" work are actually better handled by services: nudgers already suggest statements you might want to sign, explorers already map the funding landscape, finders already submit attestation candidates. User-facing skills are for things that genuinely require a human in the loop — designing a project, deciding on a funding strategy, getting onboarded.

---

## Layer 2: Services

These are autonomous background processes. They don't interact with users directly; they publish things on-chain (or into IPFS, with on-chain pointers) that users discover through the platform.

### Attesters
Evaluate claims and publish on-chain attestations. Anyone can run one; users configure which ones they trust.
- **Implication attester** — evaluates whether S1 implies S2. See [attester-core/](../../attester-core/README.md) and [implication-attester/](../../implication-attester/README.md).
- **Content attester** — evaluates whether a content item aligns with a statement. See [content-attester/](../../content-attester/README.md).

### Finders
Proactively discover candidates and submit them to attesters.
- **Implication finder** — scans the statement graph for pairs worth submitting to the implication attester. See [implication-finder/](../../implication-finder/README.md).
- **Content finder** — processes a submission queue for the content attester. See [content-finder/](../../content-finder/README.md).

### Nudgers
Publish typed suggestion batches (on-chain CID → IPFS document). Users configure which nudgers they trust; the SDK fetches and folds their publications. See [specs/tech/subsystems/nudger/README.md](../tech/subsystems/nudger/README.md) for the full publication model.
- **Implication-graph nudger** — "you signed S1; you might want to sign S2 which implies it and is more popular," plus clarification nudges toward clearer statements when S1 is too ambiguous to connect safely. See [implication-graph-nudger/](../../implication-graph-nudger/README.md).
- **Bridge-creator nudger** — synthesizes new common-ground statements between opposing views and publishes them as nudges. See [bridge-creator.md](bridge-creator.md).

### Explorers
Explorers are nudgers with a particular strategy and UI surface. A background LLM maintains a curated collection of statements for a specific goal (e.g. "map the space of fundable causes"); when a user opens the explorer page, a cheap per-user LLM call personalizes which parts of the map to surface. See [specs/tech/subsystems/conceptspace/explorer.md](../tech/subsystems/conceptspace/explorer.md) and [new-user-experience.md](new-user-experience.md).
- **Fundable Project Explorer** — helps new users discover funding areas they're likely to care about.
- **Movement-specific explorers** (e.g. CSM) — elicits what a user believes in order to find bridging opportunities.

---

## Layer 3: User-facing AI skills

These are skills for a conversational AI assistant — things that genuinely need a human in the loop. We'll write and publish them (on clawhub or wherever AI skills are published), and they can be loaded into any AI assistant.

The skills should be thin: a high-level summary of what the skill is for, with pointers to the project's own documentation rather than duplicating it. That way updates to the docs don't require republishing the skills.

### Onboarding and education
**Mode: interactive** — inherently conversational.
- Progressively explain what the system is and why it might be valuable to this particular person.
- Adapt based on how familiar the user already is: different framing for a crypto-native vs. a civic engagement person vs. a first-time user.
- Guide through the first concrete action: "let's sign a statement together", "let's look at what's funded in causes you care about."
- Answer questions about mechanics and philosophy: "why are implications non-transitive?", "what happens if a project doesn't reach its goal?"

### Delegation advisor
**Mode: hybrid** — interactive for decisions, autonomous monitoring once a delegation is in place.
- Help the user understand when to delegate vs. make direct funding decisions.
- Suggest credible delegates based on their track record.
- Help set up and manage delegatable notes: amounts, intentions, splits.
- Explain delegation chains in plain language.
- Monitor delegate activity and flag when a delegate seems inactive or is making choices the user might disagree with.

### Funding strategy advisor
**Mode: hybrid** — interactive for planning, autonomous for market monitoring.
- Help investors (not just donors) understand the retroactive funding model: when to buy tokens, when to hold, when to sell on the secondary market.
- Help donors understand the burn decision (converting from investor to donor for social recognition and impact lock-in).
- Analyze current market state for tokens the user holds.
- Suggest portfolio diversification: "you've funded five journalism projects; here are some other well-supported areas."
- Alert on price movements and buy/sell opportunities for tokens the user holds.

### Project creation assistant
**Mode: interactive** — project design is a human-driven process.
- Help draft a compelling project description and choose appropriate funding goals and deadlines.
- Guide through technical setup: ERC-1155 contract, token types/tiers, assurance contract parameters.
- Suggest which statements to align with, based on the available delegatable notes and the funding landscape.
- Advise on strategy: assurance contract vs. continuous funding, single vs. multiple token types, pricing.
- Help draft communications to contributors.

### Analytics and insights
**Mode: hybrid** — periodic reports autonomous, deep-dives interactive.
- Show personal impact: signed statements, funded projects, delegation history, amounts.
- Show project outcomes: which early investments hit their goals, token appreciation, secondary market activity.
- Identify patterns and opportunities: underserved causes (high signers, few projects), trending causes, portfolio gaps.
- Respond to direct queries: "show me my impact over the last year", "what has my delegate funded?"

### Attester and nudger trust configuration
**Mode: interactive** — trust choices are personal and the trade-offs need explaining.
- Help the user understand what implication attesters and nudgers are and why multiple independent services might exist.
- Explain the trade-offs of different attesters (conservative vs. aggressive linking) and nudgers (different strategies, different goals).
- Guide through configuring trusted attesters and nudgers in Settings, including fetching nudger metadata from `/.well-known/nudger.json` when available.
- Explain how non-transitive implications work and why.
- Flag when a trusted attester makes an implication that looks questionable.

---

## What else?

What other user-facing skills would be useful? This is a living document; add more ideas as they emerge.
