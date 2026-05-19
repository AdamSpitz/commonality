# AI assistance

## Three layers

The system has three layers:

1. **Basic primitives** — writing statements, making attestations, buying/selling/burning tokens, delegating funding, etc. These work without AI.
2. **AI services** — autonomous background processes (attesters, finders, nudgers, explorers, and contextual/platform helpers) that enrich the statement graph, evaluate content, and publish suggestions. They need AI, but run without a human in the loop; humans make use of the AI's outputs, without needing an AI in the loop. (e.g. The UI suggests nudges that were previously produced by the AI nudger services.)
3. **User-facing AI skills** — interactive assistants that help a human navigate and use the system in a conversation. Both a human and an AI in the loop. These are skills you load into Claude Code, OpenClaw, a hosted Commonality assistant, or whatever AI environment you use.

The distinction matters; if the AI<->human loop can be split apart without degrading the quality of the service, that's probably a good idea (because cheaper, etc.). (e.g. Nudgers can suggest "anyone who signed S1 might want to sign S2" without needing a human in the loop, and produce suggestions that can then be used by many humans without needing to rerun the AI. Explorers can map the funding landscape, finders can submit attestation candidates, etc.) User-facing skills are for tasks that genuinely require a human and AI to interact back-and-forth in an individualized way.

We'll be providing default AI services to bootstrap the system, but none of this requires people to trust our AIs; users can configure which AIs they trust in Settings. (See [trust model](docs/common-sense-majority/vision-and-strategy/trust-model.md) for more detail.)

---

## Layer 2: Services

These are autonomous background processes. They don't interact with users directly; they publish things on-chain (or into IPFS, with on-chain pointers) that users discover through the platform.

The service ecosystem is easiest to understand as a pipeline:

- **Attesters judge** — "is this relation true?"
- **Finders discover candidates** — "what should an attester look at next?"
- **Nudgers and explorers guide users** — "what should this user consider next?"
- **Platform/context services connect to the outside world** — "what is this tweet/video/channel, and what surrounding context is needed to judge it?"

These are separate logical roles even when several are bundled into one physical deployment.

### Attesters
Evaluate claims and publish on-chain attestations. Anyone can run one; users configure which ones they trust.
- **Implication attester** — evaluates whether S1 implies S2. See [attester-core/](../../attester-core/README.md) and [implication-attester/](../../implication-attester/README.md).
- **Content attester** — evaluates whether a content item aligns with a statement. See [content-attester/](../../content-attester/README.md).
- **Beat agent** — a purpose-guided discourse-following agent for a configured beat. Stateful content attestation is the first concrete capability: when a beat agent evaluates context-dependent content positively, it publishes the same `AlignmentAttestation` output as a content attester. The same beat memory may also support content discovery, context-provider APIs, or CSM bridge-opportunity detection. See [beat-agent/](../../beat-agent/README.md) and [beat-agents.md](../tech/subsystems/content-funding/noninflammatory-content/beat-agents.md).

### Finders
Proactively discover candidates and submit them to attesters. Finders are not the trust boundary: a bad finder can waste budget or miss opportunities, but the attester still decides what gets published as an attestation.
- **Implication finder** — scans the statement graph for pairs worth submitting to the implication attester. See [implication-finder/](../../implication-finder/README.md).
- **Content finder** — processes a submission queue for the content attester. See [content-finder/](../../content-finder/README.md).

### Nudgers
Publish typed suggestion batches (on-chain CID → IPFS document). Users configure which nudgers they trust; the SDK fetches and folds their publications. See [specs/tech/subsystems/nudger/README.md](../tech/subsystems/nudger/README.md) for the full publication model.
- **Implication-graph nudger** — "you signed S1; you might want to sign S2 which implies it and is more popular," plus clarification nudges toward clearer statements when S1 is too ambiguous to connect safely. See [implication-graph-nudger/](../../implication-graph-nudger/README.md).
- **Bridge-creator nudger** — synthesizes new common-ground statements between opposing views and publishes them as nudges. See [bridge-creator.md](bridge-creator.md).

### Explorers
Explorers are nudgers with a particular strategy and UI surface. A background LLM maintains a curated collection of statements for a specific goal (e.g. "map the space of fundable causes"); when a user opens the explorer page, a cheap per-user LLM call personalizes which parts of the map to surface. See [specs/tech/subsystems/conceptspace/explorer.md](../tech/subsystems/conceptspace/explorer.md) and [new-user-experience.md](new-user-experience.md).
- **Fundable Project Explorer** — helps new users discover funding areas they're likely to care about.
- **Movement-specific explorers** (e.g. CSM) — elicits what a user believes in order to find bridging opportunities. For the vision behind the CSM bridge-creator-plus-explorer combination, see [the CSM mediator doc](/docs/common-sense-majority/vision-and-strategy/mediator.md).

The currently implemented package for this pattern is [explorer-curator/](../../explorer-curator/README.md).

The nudger/explorer family has several services because they suggest different things:

| Service | Suggests | Product home |
|---|---|---|
| **Implication-graph nudger** | Existing related statements from the implication graph. | Tally / Conceptspace infrastructure |
| **Explorer curator** | Existing statements or areas to browse within a purpose-specific explorer. | Alignment initially; other explorers later |
| **Bridge-creator nudger** | New or modified common-ground statements. | Common Sense Majority, consumed through Tally |

### Platform/context services

Some services are not primarily "AI judgment" services, but they are part of the AI-service ecosystem because attesters, finders, beat agents, and UIs depend on them for canonical external-world context.

- **Platform API service** — resolves Twitter/YouTube/Substack identities and content URLs into stable canonical IDs, handles channel-claim verification challenges, and provides local content context to content services. See [platform-api-service/](../../platform-api-service/README.md).
- **Beat-agent ingestion and context memory** — follows configured discourse sources for a beat, extracts purpose-relevant observations, and retrieves relevant ambient context for later evaluations or downstream services such as `bridge-creator`. This is what makes beat agents distinct from stateless content attesters.

These services have different failure modes from attesters and nudgers: a bad platform resolver can corrupt canonical identity/content mapping, while bad context ingestion can make an otherwise reasonable evaluator reason from a distorted picture of the discourse.

### Logical services vs physical deployment

The list above is a list of **logical services**, not necessarily a list of containers. Logical separation is important because different roles have different prompts, trust identities, product homes, failure modes, and scaling profiles. Physical deployment can still be consolidated.

Locally and on cheap hosting tiers, several logical services can run inside a shared [service-host/](../../service-host/README.md) process. If one service later needs independent scaling or isolation, it can be split out as a deployment/configuration choice without changing the conceptual architecture. See [service-bundling.md](../tech/service-bundling.md).

### Why not consolidate the logical services?

The service split exists for several reasons:

1. **Different trust objects.** An implication attester is trusted for semantic implication; a content attester is trusted for content/criterion matching; a bridge-creator is trusted for CSM-style bridge-building suggestions; a platform resolver is trusted for canonical identity mapping.
2. **Different product homes.** Tally cares about statement signing and nudges, Alignment about explorers and cause funding, Content Funding/Civility about content evaluation, and CSM about bridge-building. A single generic "AI service" would blur these product boundaries.
3. **Different failure modes.** Bad attesters publish misleading attestations; bad finders waste evaluation budget; bad nudgers annoy or manipulate users; bad platform/context services corrupt the inputs other services rely on.
4. **Different scaling and cost patterns.** Attesters are reactive HTTP services; finders are background loops; explorers may combine periodic curation with per-user personalization; platform APIs hit external rate limits; beat agents maintain state over time.
5. **Different accountability surfaces.** Users and operators need to reason about which attesters, nudgers, beat agents, and resolvers they trust. That only works if the services remain legible as separate actors.

So the intended architecture is: **separate logical services, shared libraries and shared hosting where convenient**.

### UI-domain ownership

Most services are infrastructure, but each has a natural product home:

| Service | Primary UI domain(s) | Notes |
|---|---|---|
| Implication attester / finder | Conceptspace, Tally | Conceptspace is the substrate; Tally is the main consumer-facing signing/support-count UI. |
| Implication-graph nudger | Tally | Uses Conceptspace nudger infrastructure. |
| Explorer curator | Alignment initially | Other purpose-specific explorers may exist later for Content Funding, Civility, or CSM. |
| Content attester / finder | Content Funding, Civility | CSM uses these through Civility/content flows. |
| Beat agent | Civility initially; CSM as a likely context consumer | Uses Content Funding/content-attestation infrastructure when running in attester mode. More generally, follows a beat for declared purposes such as civility attestation or bridge-opportunity detection. |
| Bridge-creator nudger | CSM | Consumed through Tally; uses Conceptspace/nudger infrastructure. |
| Platform API service | Content Funding, Civility, CSM | Supports channel/content resolution and verification. |

### Trust requirements vary by service kind

These service kinds have meaningfully different trust profiles. The differences come partly from one question — **does this service's output persist into the shared state of the system, or is it ephemeral?** — and partly from what kind of input the service controls.

| | Output persists? | Trust list is... | Failure-mode cost | Recourse if you don't trust the operator |
|---|---|---|---|---|
| **Attesters** | Yes — onchain attestations affect support counts and the implication graph for everyone aggregating with the same trusted set. | Onchain, publicly visible. Your choice has public consequences. | Misleading attestations cost gas to correct and can mislead support counts in the meantime. | Run your own attester (operationally non-trivial: needs an onchain identity, stable hosting, and gas). |
| **Finders** | No — finders only submit candidates to attesters, which then decide. The attester is the trust boundary. | Implicit — you're trusting whichever finder feeds your trusted attester(s). | A bad finder wastes attester budget; the attester filters out bad candidates. | Run your own finder, or trust an attester that uses a finder you're comfortable with. |
| **Nudgers** | No — nudges are ephemeral; once you sign a suggested statement, the suggestion's provenance plays no further role. | Local/private. Doesn't need to be onchain, public, or even visible to the platform. | A bad suggestion is just ignored. | Run the nudger yourself locally — uniquely tractable here, because there's no onchain state to reproduce. See [the three-layer trust story](/specs/tech/subsystems/nudger/README.md#three-layers-of-nudger-trust). |
| **Explorers** | No — same publication mechanism as nudgers (typed publications under a nudger identity). | Same as nudgers. | Same as nudgers. | Same as nudgers. |
| **Platform/context services** | Sometimes — channel verification can produce durable claims; content/context lookup also shapes later evaluations. | Usually configured by the UI/operator rather than chosen per attestation. | Bad canonicalization or distorted context can poison downstream content evaluation. | Use another resolver/context source where possible; keep canonicalization rules transparent and client-verifiable. |

The asymmetry is structural: attesters affect public state, so the trust around them has to be public state. Nudgers and explorers don't, so the trust around them doesn't have to be either. This is the strongest form of the configurability principle from [trust-model.md](/docs/common-sense-majority/vision-and-strategy/trust-model.md): for nudgers and explorers, "configurability" can mean "I run it myself locally," not just "I choose which operator's I listen to."

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
