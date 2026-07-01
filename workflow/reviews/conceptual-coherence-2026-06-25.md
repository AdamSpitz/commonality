# Conceptual coherence — 2026-06-25

A synthesis pass over the three reviews done today ([piece-by-piece](./piece-by-piece-2026-06-25.md), [SDK deep-dive](./sdk-deep-dive-2026-06-25.md), [UI deep-dive](./ui-deep-dive-2026-06-25.md)), read against the [product domain spec](../../specs/product/ui-domains.md).

Those reviews answer "is each piece small, standalone, and well-wired?" This one asks a different question: **do the pieces make sense as ideas?** Can you hold each one in your head, say what it's for and how it's used, and see why the whole set is a coherent bundle rather than an arbitrary pile? Almost no function-level detail below — this is about concepts and their fit.

**Bottom line.** Yes — the system is conceptually coherent to an unusual degree, and the reason is a single organizing idea that the reviews kept rediscovering from different angles: **one concept, manifested identically at every layer.** A "thing" in this system (say, assurance contracts) shows up as a contract family, *and* an SDK subsystem, *and* a UI feature module, *and* a product site — all wearing the same name and sitting in the same place in the stack. That isomorphism is what makes the codebase legible: learn a concept once and you know where it lives in four places. Every coherence *defect* the reviews found is a place where one copy of a concept slipped out of alignment with the others — and the fix was always to restore the alignment. The system has, in effect, a working theory of its own shape, and it polices it.

---

## 1. The two axes

The whole system resolves into **two conceptual axes** that meet at the substrate. If you understand these two, you understand the bundle.

**Axis A — the value stack (vertical).** A tower of concepts, each built on the one below:

```
movements          Commonality · Common Sense Majority   ← why anyone should care
   │
signing            Tally                                  ← express / measure belief
   │
funding verticals  Aligning · Content Funding · Civility  ← specialized money flows
   │
funding primitive  LazyGiving (assurance contracts)       ← the base money flow
   │
substrate          Conceptspace                           ← statements + implication arrows + trust
```

This is exactly the "How the sites relate" tree in the product spec, and it is the spine of the system. Each layer **builds on** the one below and **doesn't reach back up**. Conceptspace is the floor ("exactly one idea: implication arrows between statements"); movements are the roof. Everything physical in the repo — a contract, an SDK subsystem, a UI module — sits at one rung of this ladder.

**Axis B — the AI service taxonomy (orthogonal).** A separate family of pieces that *operate on* the substrate rather than living in the stack. They sort cleanly into three verbs:

- **attesters** — make a judgment about a pair of things ("does S1 imply S2?", "does this content match this statement?")
- **finders** — discover *what to judge* (mine the graph for candidate pairs, drain a submission queue)
- **nudgers** — *suggest* new things to the graph (implied statements, curated collections)

These don't belong on a rung of the value stack; they're agents that read and write the substrate from the side. That's why they have their own `*-core` shared libs and their own aggregator (`service-host`) instead of being folded into the SDK subsystems. **Keeping these two axes separate is itself a good conceptual decision** — the reviews found the AI tier to be the best-designed neighborhood precisely because it's not entangled with the value stack.

Everything else is **plumbing that belongs to neither axis**: `indexer` (a dumb event cache), the two Cloudflare gateways (edge proxies), `platform-api-service` (resolves external handles/URLs), `verifier` (health-check harness), `fake-data-generation` (seeding). These are the easy "yes, this makes sense" pieces — each does one obviously-named job and nobody's confused about why it exists.

---

## 2. The isomorphism — the reason it all hangs together

The single most important conceptual property of this codebase is that **one concept occupies the same-named slot at four different levels of abstraction:**

| Concept | Contract family (hardhat) | SDK subsystem | UI feature module | Product site |
|---|---|---|---|---|
| statements/implications | conceptspace contracts | `conceptspace` | `conceptspace/` | Conceptspace + Tally |
| assurance contracts | lazy-giving contracts | `lazy-giving` | `lazy-giving/` | LazyGiving |
| creator/content | content-funding contracts | `content-funding` | `content-funding/` | Content Funding + Civility |
| cause boards | fundingportals contracts | `fundingportals` | `fundingportals/` | Aligning |
| notes/pledges | delegation contracts | `delegation` | `delegation/` | (cross-cutting) |

The SDK dive found the feature modules "mirror SDK subsystems one-for-one"; the UI dive found "a reviewer who learned the SDK already knows the UI's layout." That's the isomorphism in action. It's *why* a newcomer can get oriented: the concepts don't get renamed or re-cut as they move between layers. A vertical slice through the system — contract → events → SDK fold → UI page — stays inside one concept the whole way down.

This is also what makes the **Client-Side Folding** design legible rather than clever. The indexer is deliberately dumb (it just caches raw events); all the meaning is reconstructed by pure `folds.ts` functions in the SDK. That only works as a comprehensible design because the folding is organized by the *same* subsystem concepts — `conceptspace/folds.ts` rebuilds conceptspace state, `lazy-giving/folds.ts` rebuilds lazy-giving state. The data-flow story and the concept story are the same story.

**Verdict on "does each piece make sense and how does it fit": yes, because the answer is the same at every layer.** You don't have to learn four different decompositions; you learn one and apply it four times.

---

## 3. Where concepts had slipped — and what the fixes reveal

The interesting finding is that today's reviews didn't just *describe* this structure — they **enforced** it. Every significant defect was a concept that had drifted out of its slot, and every fix pushed it back. This is worth dwelling on, because it tells you the coherence is real and maintained, not accidental.

**The substrate had reached upward (twice, same shape).**
- In the SDK, `conceptspace` — the supposed *floor* — was importing *up* into the `content-funding` vertical to resolve channel ownership. A floor that leans on a wall it's supposed to be holding up.
- In the UI, six feature modules were importing `getDomainUrl` *up* from the `domains/` composition layer, and `shared/` itself was reaching up into `domains/`. The substrate leaning on the roof again.

Both are the *same conceptual error*: a lower-layer concept depending on a higher-layer one. And both got the *same fix* — **move, not inject**. The misplaced thing wasn't core to the layer it was stuck in; it was a distinct concept that had no proper home, so it had squatted in the wrong layer. The fix gave it a home:
- the SDK extracted `signer-profiles` (social identity — sits *above* both conceptspace and content-funding) and `nudger-publications` (AI-service output — a clean new leaf).
- the UI moved `domainUrls` down into `shared/` where cross-brand URL resolution genuinely belongs.

**This is the most reassuring thing in all three reviews.** When a concept is in the wrong place, the right fix is almost never "add an abstraction to launder the dependency" — it's "you've found a concept that didn't have a slot; give it one." The fact that the misplaced code *factored cleanly out into a new well-named subsystem* is proof it was a real, separable concept all along. A genuinely incoherent system can't be fixed this way; the bad dependencies don't come apart along clean lines.

**The package boundary didn't reflect the concepts.** The SDK exposed 540 symbols through one flat barrel — the internal concept structure was real, but invisible at the front door. The fix (per-subsystem subpath exports, then full migration, then deleting the barrel) made the *interface* finally match the *internal* concept map. Notably, 557 of 559 symbols had exactly one natural home — near-zero ambiguity, which is itself hard evidence the subsystem split cuts along real conceptual joints.

**`shared/` was de-cohering into a grab-bag.** ~30 flat entries mixing routing, caches, trust computation, config, theming. The fix grouped them into named sub-areas (`config/`, `routing/`, `trust/`, …). Note the *trust* cluster in particular was "a coherent subsystem hiding inside `shared/`" — another concept that existed but lacked a visible slot.

The pattern across all of these: **the system has a strong notion of where each concept should live, and drift gets corrected back toward it.**

---

## 4. The one genuine conceptual question mark

Almost everything sits cleanly on one of the two axes. The conspicuous exception, flagged in piece-by-piece and not yet resolved:

**`beat-agent` — is this one concept or four?** It's 6× the size of the next AI service and explicitly plays attester *and* finder *and* context *and* memory "in any combination." On Axis B, every other service is *one verb*; beat-agent is all of them at once. That's the one place where the taxonomy that makes the AI tier so legible breaks down. The review's framing — "one piece or four wearing a trench coat?" — is exactly the right conceptual question. It hasn't been answered yet, and it's the single most valuable next conceptual investigation, because it's the only piece whose *identity* is unclear. (Contrast `service-host`, which also touches everything but is *obviously* one concept — "run all the services" — so it reads as a clean hub, not a blob.)

> **Update (resolved, refactoring planned).** The answer is "one substrate plus three consumers." The genuinely-new primitive is the standing **beat memory** (ingestion + ambient-context store); the attester, finder, and context API are ordinary consumers of it that were merely packaged together. The fix is the same move this review celebrates elsewhere — give the real concept its own slot: extract `beat-memory` as a new **fourth Axis-B verb (a "follower"/context-provider substrate)**, and let the attester and finder become thin consumers, structurally like every other attester/finder. This preserves the original shared-ingestion rationale (all consumers still point at one memory) and leaves the *multi-purpose* memory complexity intact — only the multi-*consumer* bundling is removed. The code is already decoupled along this seam (near-zero cross-imports), so it's mostly a packaging move. See the "Planned refactoring: split the substrate from its consumers" section in [`beat-agents.md`](../../specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md).

Lesser question marks, all minor:
- **`finder-core` (197 LOC)** is anomalously thin next to its sibling cores (attester-core 1.3k, nudger-core 343). Either the finder concept is genuinely lighter, or the abstraction is under-developed. A quick look settles it; it's not load-bearing for coherence.
- **`christian-commonality`** is a true orphan — wired into nothing, on neither axis. Not incoherent, just unhomed. Keep/relocate/delete is a one-line decision.
- **`fake-data-generation`** has a 528-line README and is the only non-service consumer of an AI service — worth confirming domain logic hasn't quietly taken up residence there (a concept leaking into the plumbing).

---

## 5. Why eight sites is coherent, not sprawl

The product spec worries the eight sites "feel like a lot." Conceptually they're *not* sprawl, and it's worth saying why, because it's the same isomorphism story one level up:

The eight sites are not eight products — they're **eight views onto the same value stack, cut for eight audiences.** Conceptspace and Tally are two faces of the substrate (developer-facing vs. consumer-facing) — same concept, different door. Civility is Content Funding with a filter. CSM and Commonality are movement framings over the funding/signing machinery. The split isn't "we built eight things"; it's "we built one stack and exposed the rungs separately so that someone who wants to fund a Kickstarter project isn't forced to confront the political-movement framing, and vice versa." The spec's own reasoning ("the opinionatedness will turn people off… it needs to feel like a whole nother site") is a *product* justification for what is, underneath, a single coherent substrate. The open-data point (no company owns the shared database) is what makes the separation honest rather than a façade.

So the eight-site count isn't a coherence problem — it's the *presentation layer* of the same value stack, and it inherits the stack's coherence. The thing to watch is whether any site grows machinery that doesn't trace back to a rung of the stack; none currently does.

---

## 6. Holding the whole thing in your head

The honest test the user posed — *can I understand what each piece does, how it's used, how it fits, and why it's a coherent bundle?* — comes out **yes**, with one asterisk:

- **What each does / how it's used:** clear for every piece. The naming and the four-layer isomorphism mean a piece's name tells you its concept and its layer tells you its role.
- **How they fit:** governed by the two axes. Value stack = vertical build-on relationships; AI taxonomy = orthogonal agents on the substrate; plumbing = neither. Three buckets, no piece ambiguous about which bucket it's in — *except beat-agent*.
- **Why it's a coherent bundle:** because it's not a bundle of independent things — it's one substrate (Conceptspace) with progressively more specialized layers built on it, plus a clean orthogonal set of agents that read/write that substrate, plus boring plumbing. Everything earns its place by reference to the substrate.

The asterisk is beat-agent: the one piece you *can't* yet cleanly say "this is one concept" about. Resolve that and the conceptual map has no remaining ambiguous territory.

**The deeper reassurance** isn't any single verdict — it's that the system demonstrably knows its own shape. Today's reviews found four "concept in the wrong slot" defects and fixed all four by *relocating the concept to a home that turned out to already make sense*, not by papering over the dependency. A system where misplaced things factor out cleanly into well-named new homes is a system whose conceptual joints are real. That's the strongest evidence of coherence there is.

---

*Synthesis of the three 2026-06-25 reviews + the product domain spec. No new code reading; this pass re-reads the existing findings through a concepts-and-fit lens rather than a structure-and-wiring one. The one open conceptual investigation it points to — beat-agent's identity — is already on the piece-by-piece dig-deeper list (#3).*
