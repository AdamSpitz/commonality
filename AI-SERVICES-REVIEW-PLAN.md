# AI Services Ecosystem Review Plan

This plan reviews the coherence, completeness, and implementation status of the AI services ecosystem (attesters, finders, nudgers, explorers), identifies what needs to change, and produces an updated TODO.md.

Created: 2026-04-21

## Overview of the Ecosystem

The project has three tiers of AI services, plus a planned user-facing AI skill layer:

### Tier 1: Attesters (reactive — evaluate claims, publish on-chain attestations)
- **Implication Attester** — evaluates whether S1 implies S2
- **Content Attester** — evaluates whether a content item aligns with a statement
- (Conceptually, a **Noninflammatory Content Attester** is discussed in the specs but is currently just the content attester with a particular prompt focus)

### Tier 2: Finders (proactive — discover candidates and submit them to attesters)
- **Implication Finder** — discovers statement pairs for the implication attester
- **Content Finder** — processes a submission queue for the content attester

### Tier 3: Nudgers (suggest statements to users via typed on-chain publications)
- **Implication Graph Nudger** — suggests statements based on the implication graph
- **Bridge Creator** — synthesizes common-ground statements between opposing views
- **Explorer** — maintains a curated collection of statements for goal-oriented exploration (fundable projects, movement-specific onboarding, etc.)

### Cross-cutting: AI Skills (user-facing assistants)
- Described in `specs/product/ai-assistance.md` — a layer of skills that help users navigate and use the system (statement finder/writer, project discovery, delegation advisor, etc.)

### Three levels of "linking" between statements
1. **Implication attestations** — rigorous, on-chain, affects support counts
2. **Nudges** — probabilistic suggestions, on-chain CID pointing to IPFS batch, user decides
3. **Noninflammatory content persuasion** — longer-form social media content making the case for a nudge, backed by attestation that it won't be inflammatory

This three-level model is well-articulated across the bridge-creator spec, the hints spec, and the nudger spec. It's one of the most coherent parts of the design.

---

## Coherence Assessment

### What's coherent and well-designed

1. **The attester/finder/nudger taxonomy is clean.** Each tier has a clear role, and the specs consistently describe how they interact.

2. **"Explorers are nudgers"** — this insight (in `new-user-experience.md`) is excellent. It eliminates a whole parallel architecture by recognizing that exploration and nudging are the same operation with different UI surfaces and strategies. The `curated-collection` publication kind in the nudger spec supports this cleanly.

3. **The nudger publication model** is well-designed: typed publications (`nudge-batch` vs `curated-collection`), on-chain CID for verifiability, IPFS content for extensibility, per-nudge revocations. The fold semantics are clear and different for each kind.

4. **Trust model is consistent** — users configure trusted attesters AND trusted nudgers in the same Settings pattern. This scales naturally to new services.

5. **The three-level linking model** (attestation → nudge → persuasion) is clear and the specs are consistent about when each level is appropriate.

6. **The bridge-creator's relationship to the system** is well-specified: it's a nudger that also submits legitimate implications to the attester. The spec is careful about not misrepresenting users' beliefs.

### What's contradictory or outdated

1. **`specs/product/ai-assistance.md` is outdated.** It contains a TODO note saying "rewrite this page in light of our new ecosystem of attesters and finders and nudgers." Many of the "skills" it describes (statement finder/writer, cause discovery, bridge creator) overlap heavily with what the nudger/explorer/finder services now do. The page needs to be rewritten to clarify: which of these "skills" are actually *services* (nudgers, explorers, finders), which are genuinely *user-facing AI assistant skills* (onboarding, delegation advice, funding strategy), and how the two layers relate.

2. **`specs/product/bridge-finder.md` is partially superseded.** It was written before the bridge-creator-as-nudger architecture was settled. The spec itself acknowledges this ("Is this premature?", "Maybe prototype this as a mode flag"). The bridge-creator nudger now handles the active synthesis case. The "focused finder" idea (submitting priority-ranked pairs to the implication attester) is still potentially useful but should be reconciled with the current architecture — is it a finder strategy or a nudger strategy? It's probably just a mode of the implication finder.

3. **The implication-graph nudger README** (`implication-graph-nudger/README.md`) describes an HTTP API with `/nudges?targetStatementCid=` endpoints. But the nudger spec says nudgers publish batches to IPFS and record CIDs on-chain — they don't serve nudges via HTTP. The README reflects an older per-request design that predates the publication model. The actual implementation needs to be checked against the spec, and the README needs updating.

4. **`nudger-core/README.md`** mentions `NudgeMessage` type and EIP-191 signing helpers — this sounds like the older per-message signing model rather than the batch publication model. May need updating.

### What's missing from the specs

1. **Anti-evil-nudger immune system.** The TODO.md sketches an interesting idea: a service that monitors nudgers and publishes "hey, this nudger is doing bad things, here are the receipts." This is only in TODO.md — no spec exists. It deserves at least a sketch spec because it's the answer to "how do we prevent abuse in a system where anyone can run a nudger?"

2. **Content submission flow.** The TODO.md notes there's no user-facing way to submit content to the content finder. The content finder reads from a JSON file. A simple API or UI for submissions should be specced.

3. **Adversarial AI evaluation.** TODO.md mentions "three AIs: pro argues with con, then judge decides" as a way to ensure fairness in subjective AI services. This is an interesting idea that could apply to attesters and nudgers, but it's only a passing thought — not specced. Worth at least a brief design note.

4. **Noninflammatory content attester vs. content attester.** The specs reference "noninflammatory content attesters" as if they're a separate service type (e.g., "both sides' noninflammatory-content attesters"), but architecturally it seems like this is just the content attester with a particular prompt. Should this be clarified? Is there a separate service, or is it the same content attester configured differently?

5. **The "statement-creator service" / "lattice completion service"** mentioned in `intersections.md` — a service that creates intermediate/abstraction nodes in the implication graph. This is a powerful idea (especially for geographic x topical intersections) but it's only mentioned in passing. Is it a finder? A nudger? A new service type? It probably fits as a specialized finder that creates statements and submits them to the implication attester.

---

## Implementation Status

### Done
| Component | Location |
|-----------|----------|
| Attester core | `attester-core/` |
| Implication attester | `implication-attester/` |
| Content attester | `content-attester/` |
| Finder core | `finder-core/` |
| Implication finder | `implication-finder/` |
| Content finder | `content-finder/` |
| Nudger core | `nudger-core/` |
| Implication graph nudger (service) | `implication-graph-nudger/` |
| NudgePublications smart contract | `hardhat/` |
| Settings UI: trusted nudgers | `ui/` |
| `getStatementSuggestions` (proto-nudger) | `sdk/` |
| `StatementSuggestions` UI component | `ui/` |

### Not Done (by priority for the nudger pipeline to work end-to-end)
| Component | Spec status | Notes |
|-----------|-------------|-------|
| SDK: fetch + fold typed nudger publications from indexer | Specced | **Critical path** — nothing downstream works without this |
| UI: display `nudge-batch` suggestions | Specced | Replaces the current proto-nudger |
| Nudger metadata discovery UI (`.well-known/nudger.json`) | Specced | Nice-to-have for trust configuration |
| UI: explorer pages backed by `curated-collection` | Specced | The new-user entry point |
| Explorer nudger strategy (background LLM + per-user LLM) | Specced | The fundable-project-explorer |
| Bridge-creator nudger | Stub exists | `bridge-creator/` has scaffolding but `findBridgeCandidates` is not implemented |
| Nudge dismissal / "seen" tracking | Specced in nudge-ux.md | Important for not being annoying |
| Nudge intensity settings | Specced in nudge-ux.md | User control |
| Client-side nudge filtering | Specced in nudge-ux.md | Already-signed, staleness, caps |
| Content submission UI/API | Not specced | JSON file is the only input path |
| Anti-evil-nudger immune system | Not specced | Only sketched in TODO.md |

### Needs reconciliation (spec says one thing, code may say another)
| Component | Issue |
|-----------|-------|
| `implication-graph-nudger/` | README describes HTTP API; spec says batch publication model |
| `nudger-core/` | README mentions per-message EIP-191 signing; spec uses batch CID publication |

---

## Chunked Plan

Each chunk below is designed to be completed by a single fresh LLM instance. Do them in order.

### Chunk 1: Rewrite `specs/product/ai-assistance.md`
- [ ] Read the current `specs/product/ai-assistance.md`
- [ ] Read the nudger spec (`specs/tech/subsystems/nudger/README.md`), explorer spec (`specs/tech/subsystems/conceptspace/explorer.md`), and new-user-experience spec (`specs/product/new-user-experience.md`) to understand what services now handle
- [ ] Rewrite `ai-assistance.md` with two clear sections:
  1. **Services** (autonomous background processes): attesters, finders, nudgers/explorers — briefly describe each, point to the relevant spec, note that these handle what was previously imagined as autonomous AI skill work
  2. **User-facing AI skills** (interactive assistants): the skills that are genuinely about helping a human in a conversation — onboarding/education, delegation advice, funding strategy, project creation, analytics. These are the ones that would be loaded into Claude Code / OpenClaw / a hosted assistant.
- [ ] Remove the TODO note at the top. Remove or consolidate skills that are now covered by services (statement finder/writer is largely the explorer + nudger; cause discovery / coalition building overlaps with bridge-creator + explorer; bridge creator / statement synthesis IS the bridge-creator nudger; watchdog / notification is the nudger pipeline).
- [ ] Keep the "two layers" framing at the top — it's good. Just make it clear which layer each thing is in.

### Chunk 2: Reconcile `specs/product/bridge-finder.md` with the current architecture
- [x] Read `specs/product/bridge-finder.md` and `specs/product/bridge-creator.md`
- [x] Read the nudger spec and implication-finder code/spec
- [x] Rewrite `bridge-finder.md` to clarify:
  - The "bridge-creator nudger" handles the *active synthesis* case (creating new statements)
  - The "bridge-finder" idea (prioritizing cross-side moderate pairs for the implication attester) could be a mode/configuration of the existing implication finder, not a separate service
  - Resolve the open questions in the spec (is it premature? is it necessary? etc.) — recommend making it a priority-scoring enhancement to the implication finder
- [x] Update `bridge-creator.md` if needed to ensure it clearly cross-references the nudger spec and doesn't repeat outdated information

### Chunk 3: Check nudger-core and implication-graph-nudger code against the publication-model spec
- [ ] Read the nudger spec's publication model (`specs/tech/subsystems/nudger/README.md`)
- [ ] Read the actual code in `nudger-core/` and `implication-graph-nudger/`
- [ ] Identify discrepancies: does the code use the batch publication model or the older per-message HTTP model?
- [ ] Write a summary of what needs to change in the code (do NOT implement changes — just document)
- [ ] Update the READMEs for both packages to reflect the current spec, noting any code that doesn't yet match

### Chunk 4: Write a brief spec for the anti-evil-nudger immune system
- [ ] Read the relevant TODO.md notes about evil nudgers and the immune-system idea
- [ ] Read the nudger spec's trust model section
- [ ] Write a new spec file at `specs/product/nudger-immune-system.md` (or similar) covering:
  - What it is: a monitoring service that watches nudger behavior and publishes assessments
  - How it works: subscribes to `NudgesPublished` events, evaluates nudge quality, publishes "reputation reports" (a new publication kind? or just a separate system?)
  - The key insight from TODO.md: "publish the bad stuff they do and let individuals decide" — this is consistent with the subjective trust model
  - How users subscribe to it (probably just another trusted service in Settings?)
  - Relationship to the "adversarial AI" idea (pro/con/judge) — this could be the evaluation methodology used by the immune system
  - Keep it brief — this is a sketch spec, not a full design
- [ ] Also note the TODO.md idea about making nudger decisions nonrepudiable (CIDs on-chain) — this is ALREADY part of the spec (the `NudgePublications` contract does exactly this). Note that the spec already solves this.

### Chunk 5: Write a brief spec for user-facing content submission
- [ ] Read the content finder code/spec (`content-finder/`)
- [ ] Spec out how users (or fans of content writers) can submit channels/posts for the content finder to process
- [ ] This could be:
  - A simple form in the UI that writes to a submissions API endpoint
  - The platform-api-service could host the endpoint
  - The content finder polls the API instead of (or in addition to) the JSON file
- [ ] Write the spec to `specs/product/content-submission.md` or add a section to the content finder spec
- [ ] Keep it simple — this is a straightforward CRUD feature

### Chunk 6: Clarify the noninflammatory-content attester and the "statement-creator / lattice-completion" service
- [ ] Read `specs/tech/subsystems/conceptspace/content-patterns/noninflammatory-content.md` and the content attester code
- [ ] Clarify in the spec: is a "noninflammatory content attester" a separate service from the content attester, or just the content attester with a specific prompt? Write a brief clarifying note.
- [ ] Read `specs/tech/subsystems/conceptspace/content-patterns/intersections.md`
- [ ] Write a brief note about where the "statement-creator / lattice-completion" idea fits in the architecture. It's probably a specialized finder that creates intermediate statements and submits them to the implication attester. Add this to the intersections spec or as a new brief spec.

### Chunk 7: Update TODO.md
- [ ] Read the current TODO.md
- [ ] Read this plan file for context on what's been analyzed
- [ ] Consolidate the scattered AI-services items into a clear, organized section with:
  - A brief summary of the ecosystem (or pointer to the specs)
  - A prioritized list of what needs to be built, starting with the critical path (SDK nudger publication fetching → UI nudge display → explorer)
  - Items that are spec work vs. implementation work, clearly distinguished
  - Remove items that have been completed or are now covered by specs
  - Keep non-AI-services items (e2e tests, deployment, seed content, etc.) in their own section
- [ ] Remove duplicated/scattered items that are now consolidated
- [ ] The TODO.md should be a clean, actionable task list — not a notebook of ideas (ideas belong in specs)

---

## Notes for future LLMs executing this plan

- This plan is about **specs and documentation**, not implementation. Don't build features — write/edit spec files and TODO.md.
- The specs are in `specs/` with product specs in `specs/product/` and technical specs in `specs/tech/`.
- Read `AGENTS.md` for project conventions. Prefer editing existing files to creating new ones.
- The project uses no particular documentation framework — specs are plain markdown.
- When editing specs, preserve the author's voice and thinking-out-loud style where it exists. These aren't corporate docs; they're a founder working through ideas.
