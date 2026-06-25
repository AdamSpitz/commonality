# Piece-by-piece survey — 2026-06-25

**Purpose.** A preliminary, breadth-first pass over every distinct piece in the monorepo, scored against one lens: *is this piece small, simple, coherent, standalone, and equipped with a sensible interface?* This is a **skeleton for deeper analysis**, not a deep audit of any one piece. It deliberately stays shallow per component; the goal is to map where the good and bad pieces probably are, so we can decide where to dig next.

This complements [`architecture-2026-06-12.md`](./architecture-2026-06-12.md) (a process/findings review of the whole system). Where that asked "is the system healthy and are the action items tracked," this asks "could each piece survive being lifted out of the monorepo on its own terms."

**Method.** Counted source LOC / file counts per workspace (excluding `node_modules`, `dist`, generated), read every README and the architecture/UI-domain specs, and extracted the internal `@commonality/*` dependency graph. No deep code reading yet — verdicts below are first impressions with explicit "look closer" flags.

---

## The layering (internal dependency graph)

The internal dependencies form a clean, mostly-acyclic layering. `sdk` is the universal foundation; `service-host` is the aggregation point for AI services.

```
                         ┌─────────┐
                         │   sdk   │  ← everything funnels through here
                         └────┬────┘
        ┌──────────────┬──────┼───────────────┬─────────────────┐
        │              │      │               │                 │
       ui          indexer  hardhat      platform-api    integration-tests
   (sdk only)      (no deps) (no deps)      (sdk)            (sdk)

  AI service cores (shared libs):  attester-core   finder-core   nudger-core
        │                              │   │            │              │
  logical AI services:                 ▼   ▼            ▼              ▼
   implication-attester  content-attester   implication-finder  content-finder
   implication-graph-nudger  bridge-creator  explorer-curator  beat-agent
        └──────────────────────────┬──────────────────────────────────┘
                                    ▼
                              service-host   ← depends on ALL AI services (by design)
```

Standalone islands (no internal deps): **indexer**, **hardhat**, and the two **cloudflare gateways**. Orphan (wired into nothing): **christian-commonality**.

---

## Scorecard

Legend — **✓** looks solid · **~** watch / mild smell · **?** needs a closer look before judging · sizes are non-generated source LOC.

| Piece | LOC | Files | Role | Standalone | Iface clarity | Coherence | Notes / flag |
|---|---:|---:|---|:--:|:--:|:--:|---|
| **sdk** | 28,960 | 119 | Core lib: contract reads/writes, client-side folding, 9 subsystems | ✓ (no internal deps) | ? | ? | The linchpin — *everything* depends on it. Highest-leverage place to get coherence right. Prior review flagged a dead GraphQL layer inside it. **Top dig-deeper candidate.** |
| **hardhat** | 16,089 | 72 | Smart contracts (45 `.sol`) + deploy/test | ✓ | ✓ (events = public API) | ~ | 6 contract families in one workspace. Coherent by convention; size warrants checking family boundaries. Already audited 2026-05-07 & 06-22. |
| **indexer** | 9,998 | 34 | Thin Ponder event cache, **no business logic** | ✓ | ✓ | ✓ | Intentionally dumb (Client-Side Folding). The cleanest "small + one job" story in the repo. |
| **ui** | 58,652 | 299 | 8 branded sites from one Vite/React build | ✓ (sdk only) | ~ | ? | The elephant. Clean *external* boundary (sdk only), but large internal surface: feature modules (`lazy-giving`, `fundingportals`, `content-funding`, `conceptspace`, `delegation`) + `domains/` composition + `shared/`. **Dig-deeper candidate** for internal modularity. |
| **integration-tests** | 16,815 | 53 | Cross-contract/SDK e2e harness | ✓ | n/a | ✓ | Test-only; size expected. |
| **fake-data-generation** | 8,340 | 29 | Seed/proliferation data + curated decision corpus | ~ | ~ | ~ | 528-line README for 8k LOC — heavy process surface. Depends on `implication-attester` (only non-service consumer of an AI service). Worth checking it isn't a second home for domain logic. |
| **attester-core** | 1,347 | 13 | Shared lib for attesters | ✓ | ✓ | ✓ | Clean core lib. |
| **finder-core** | 197 | 7 | Shared lib for finders | ✓ | ? | ~ | Suspiciously thin (197 LOC vs attester-core's 1.3k). Either elegantly minimal or under-abstracted vs its siblings — quick look. |
| **nudger-core** | 343 | 5 | Shared lib for nudgers | ✓ | ✓ | ✓ | Small, focused. |
| **implication-attester** | 1,547 | 9 | Does S1 imply S2? | ✓ | ✓ | ✓ | Exemplary small service: thorough README (235 lines), clear single job. |
| **content-attester** | 1,620 | 11 | Does content align with statement? | ✓ | ✓ | ✓ | Parallel to implication-attester. |
| **implication-finder** | 894 | 13 | Discovers statement pairs to attest | ✓ | ✓ | ✓ | Tidy. |
| **content-finder** | 476 | 8 | Processes content submission queue | ✓ | ✓ | ~ | Only 1 test file — thin coverage for a queue processor. |
| **implication-graph-nudger** | 397 | 5 | Suggests implied statements | ✓ | ✓ | ~ | 1 test file. |
| **bridge-creator** | 2,944 | 26 | Synthesizes common-ground statements | ✓ | ~ | ~ | Largest of the "pure" AI services; has its own `anchorCli`. 11 test files (well-covered). Check whether anchors/proposals/synthesis are one job or three. |
| **explorer-curator** | 1,462 | 10 | Maintains curated collection, personalizes | ✓ | ✓ | ✓ | Reasonable size, decent tests (5). |
| **beat-agent** | 10,311 | 36 | Ingests a "beat"; acts as attester/finder/context/memory **in any combination** | ~ | ~ | **?** | **Outlier.** 6× the next AI service; explicitly multi-role. Strongest coherence smell in the AI tier — is this one piece or four wearing a trench coat? 17 test files (well-covered, at least). **Dig-deeper candidate.** |
| **service-host** | 1,578 | 10 | Runs all AI services in one supervised process | ~ (fan-in) | ✓ | ✓ | Depends on every AI service *by design* (it's the host). Legitimate hub, but the one place a single piece sees everything. |
| **platform-api-service** | 4,238 | 17 | Resolves handles/URLs; channel verification (Twitter/YouTube) | ✓ | ✓ | ~ | Coherent theme (external-platform identity). Size warrants a glance that verification + resolution haven't sprawled. |
| **cloudflare-service-gateway** | 130 | 2 | Edge proxy to Render backends | ✓ | ✓ | ✓ | Tiny, one job. Model citizen. |
| **cloudflare-ui-gateway** | 400 | 2 | Serves IPFS/IPNS UI builds | ✓ | ✓ | ✓ | Tiny, one job. |
| **verifier** | 8,942 | 72 | QA harness: graph of health checks (own DESIGN/PLAN) | ✓ (not a workspace) | ? | ~ | A whole subsystem unto itself, deliberately outside the npm workspace graph. Large; has its own architecture docs. Coherent in intent; worth confirming it hasn't accreted. |
| **christian-commonality** | 0 | 0 | Single static `index.html` (~20KB) + README | — | — | **?** | **Orphan.** Not a workspace, wired into nothing, one-off static page. Decide: keep, relocate, or delete. |

---

## Reading of the landscape

**The AI service tier is the best-designed neighborhood.** The `*-core` shared-lib + logical-service + `service-host` aggregator pattern is textbook: most services are 400–1,600 LOC, single-purpose, well-README'd, and depend only on their core lib + sdk. If you want a model of "small, simple, coherent, standalone" to hold the rest of the repo against, it's `implication-attester`. Two soft spots in this otherwise-clean tier:
- **beat-agent** breaks the pattern — large and explicitly multi-role. This is the single most likely place to find a piece that should be split.
- **finder-core** is anomalously thin (197 LOC) next to its sibling cores, hinting the finder abstraction is either leaner or less developed than the attester/nudger ones.

**The big three carry the real complexity risk, and it's internal, not interface.** `sdk` (29k), `ui` (59k), and `hardhat` (16k) each present a clean *external* boundary — `ui` depends only on `sdk`, `hardhat`/`indexer` depend on nothing — but each is large enough that "is it coherent *inside*?" is unanswered by this pass. `sdk` is the highest-leverage of the three because everything else inherits its coherence (or lack of it).

**The edges and the indexer are exemplary.** `indexer` (dumb-by-design cache) and the two Cloudflare gateways are exactly what "small piece with a sensible interface" should look like. They're the easy "yes" column.

**Two genuine oddities** worth a quick decision regardless of deeper analysis: the **christian-commonality** orphan, and **fake-data-generation**'s unusually heavy process surface (528-line README, and the only non-service consumer of an AI service).

---

## Where to dig deeper next (suggested order)

1. **sdk** — highest leverage; everything depends on it. → **Done: [`sdk-deep-dive-2026-06-25.md`](./sdk-deep-dive-2026-06-25.md).** Verdict: structurally healthy; warts are dead GraphQL deps, a conceptspace→content-funding layering inversion, a 540-symbol flat barrel, and a 9-positional-arg constructor.
2. **ui** — largest piece; assess internal modularity. → **Done: [`ui-deep-dive-2026-06-25.md`](./ui-deep-dive-2026-06-25.md).** Verdict: internally healthy — feature modules mirror SDK subsystems and don't cross-import; `domains/` composes them correctly. Warts: a small upward inversion (features import `getDomainUrl` from `domains/`), a grab-bag `shared/`, and a few oversized page files.
3. **beat-agent** — strongest "should this be split?" candidate. Validate whether the attester/finder/context/memory roles are one coherent agent or several.
4. **hardhat** — confirm the 6 contract families are cleanly separated (events-as-API discipline already enforced by review practice).
5. Quick triage, low effort: **finder-core** (too thin?), **fake-data-generation** (logic creep?), **platform-api-service** (sprawl?), **christian-commonality** (keep/move/delete?), and the thin-test services (content-finder, implication-graph-nudger, nudger-core).

---

*Verdicts here are first impressions from metrics + READMEs + the dependency graph, not code reads. Treat the **?** rows as "unknown, go look," not as criticism.*
