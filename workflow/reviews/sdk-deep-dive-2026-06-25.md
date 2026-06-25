# SDK deep-dive — 2026-06-25

Follow-up to [`piece-by-piece-2026-06-25.md`](./piece-by-piece-2026-06-25.md), which flagged `sdk` as the highest-leverage dig-deeper candidate (everything depends on it, so it inherits the SDK's coherence). This pass reads the structure, the public surface, the internal dependency graph, and the debt markers — not every line, but enough to give verdicts with evidence.

**Bottom line.** The SDK is **structurally healthy with a few specific warts**, none of them systemic. The repeated per-subsystem template (actions / events / folds / queries / types) is genuinely good architecture and the thing most worth protecting. The warts are: a fully-dead GraphQL dependency set still in `package.json`, one subsystem-layering inversion (the "base substrate" `conceptspace` depends *upward* into the `content-funding` vertical), a very large flat public surface (540 exports through a single barrel), an awkward 9-positional-arg constructor, and a stale README. All are bounded and fixable; none threatens the design.

---

## What's healthy (protect this)

- **Clean external boundary.** `sdk` has zero internal `@commonality/*` dependencies and is depended on by everything. It is the foundation, and it doesn't reach back into its consumers. Good.
- **The subsystem template is excellent and consistent.** All 9 subsystems follow the same shape: `actions.ts` (writes), `events.ts` (decoded event types), `folds.ts` (pure event→state functions), `queries.ts` (fetch + fold + return typed state), `types.ts`, `index.ts`. This uniformity is the SDK's best property — a new subsystem is a fill-in-the-template exercise, and the Client-Side Folding design lives cleanly inside `folds.ts`.
- **Fold functions are pure and well-tested.** Most subsystems ship `folds.test.ts`; total test LOC (~5.5k) is roughly half of source. The hardest-to-reason-about part (reconstructing state from raw events) is the best-covered.
- **Internal graph is acyclic.** (One apparent `identity → conceptspace` edge turned out to be a doc-comment reference, not an import.) The real layering: `displayable-documents` / `identity` / `mutable-refs` / `lazy-giving` are leaves; `content-funding → lazy-giving`; `fundingportals → {lazy-giving, delegation, displayable-documents}`; `conceptspace → {content-funding, identity, displayable-documents, mutable-refs}`.
- **Almost no code debt.** Exactly 3 debt markers in non-test source: one `TODO` (ENS check in `twitter.ts`) and two `@deprecated` alignment-type aliases (the funding-portal→cause-board rename, already tracked). This matches the prior review's "trustworthy self-knowledge" finding.

---

## Issues, ranked

### 1. Dead GraphQL dependency set still shipped — *low effort, do it now* (wait, is this done now?)
`package.json` lists `@apollo/server`, `@graphql-tools/schema`, `graphql`, and `graphql-request` as **runtime dependencies**. A full scan (`grep` for any apollo/graphql/gql usage across `src/` and the rest of the repo) finds **zero** references. The code was removed; the four dependencies and their transitive trees were not. This is the "dead GraphQL layer" from the 2026-06-12 review — the *layer* is gone, the *deps* linger. Every consumer (notably `ui`, 135 import sites) drags these through install/resolution for nothing.
**Fix:** delete the four deps; `npm install`; confirm build + integration-tests. Likely a 10-minute change.
USER'S NOTE: yes, please fix. We shouldn't be doing any graphql stuff anymore.
DONE NOW? (I think we may have fixed this but not marked it done in this file yet)

### 2. `conceptspace` is inverted — the "simple substrate" is the heaviest, most-coupled subsystem — *needs a design call*
The product model is emphatic that Conceptspace is the **base** — "exactly one idea: implication arrows between statements," the thing everything else builds on (see `specs/product/ui-domains.md`). Inside the SDK it's the opposite:
- It's the **largest** subsystem (2,367 LOC) and contains the **single biggest file** in the SDK (`conceptspace/queries.ts`, 1,490 lines). USER'S NOTE: yes, that surprises me. Do a deeper analysis, figure out why it's so big. Is this essential complexity or accidental complexity?
- It depends **upward** into a higher-level vertical: `conceptspace/queries.ts:1472,1482` calls `fetchAndFoldContentFundingState()` and `getOwnerForCanonicalChannelId()` from `content-funding/` to resolve channel ownership for a statement.

So the foundational substrate imports the content-funding vertical that is supposed to be built *on* it. It's not a cycle (content-funding doesn't import back), but it's a layering inversion that contradicts the stated architecture and bloats the "simple" subsystem.
**Fix to consider:** invert the dependency — have the channel-ownership resolution injected by, or moved to, a higher layer, so `conceptspace` stays a leaf. Worth a closer read of that ~20-line region before deciding; it may be one feature that wandered into the wrong file. Also worth asking whether `conceptspace/queries.ts` at 1,490 lines wants splitting (statements vs beliefs vs implications vs resolution).
USER'S NOTE: yes, dig deeper into this and figure out which of those fixes is the right one; it really shouldn't have that dependency going in that direction.

### 3. 540-symbol flat public surface through a single barrel — *medium; mostly an ergonomics/coherence question*
`index.ts` is a barrel that `export *`s everything; the library exposes **~540 exported symbols** in one undifferentiated namespace. There's no per-subsystem namespacing at the package boundary — a consumer doing `import { ... } from '@commonality/sdk'` sees lazy-giving, conceptspace, delegation, chain-reads, IPFS helpers, and event decoders all flat. For a library this central, that's a lot of surface to keep coherent and a lot that can't be changed without a broad blast radius.
**Worth deciding:** is the flat barrel intentional (convenience) or accreted? Subpath exports (`@commonality/sdk/conceptspace`) or namespace objects would make the API legible and shrink each consumer's coupling. Not urgent, but it's the main reason "is the SDK's interface coherent?" is hard to answer yes to today.
USER'S NOTE: not intentional. Please organize into coherent pieces.

### 4. `createSDKMachinery` takes 9 positional, mostly-optional params — *low/medium*
The constructor signature is `createSDKMachinery(ipfsConfig, twitterApiConfig?, testConfig?, publicClient?, eventCacheUrl?, contractAddresses?, defaultChainId?, chainStatusKey?, contractAddressesByChain?)` — nine positional arguments, seven optional. Call sites (18 in the repo) must count commas/`undefined`s. The backing `SDKMachinery` type is also a god-config whose fields carry conditional "Required for Phase 2+/Phase 4+" semantics (5 "Phase N" references remain) — historical build-out phases leaking into the live interface.
**Fix:** switch to a single options object; drop the "Phase N" language for plain "required when using on-chain reads / event-cache queries." Mechanical, but touches 18 call sites.
USER'S NOTE: yes, please fix.

### 5. Stale README — *low effort*
`sdk/README.md` describes an **`actions/` directory** ("The `actions/` directory contains actions that write…") that does not exist — actions are co-located as `actions.ts` inside each subsystem. The README's "thin client" framing also predates the dead-GraphQL cleanup that `package.json` still contradicts. Quick refresh so the entry-point doc matches reality.
USER'S NOTE: yes, please fix.

### 6. Node-flavored helper in the isomorphic barrel — *minor*
`index.ts` re-exports `config-node.ts`, whose helpers (`create…InNodeJSFromTheUsualEnvVars`) read `process.env`. It's not a hard browser breakage (no `fs`/`node:` imports, and bundlers shim `process.env`), but a function explicitly named `InNodeJS` sitting in the universal barrel that the browser UI pulls in is a small wart. Consider a subpath export (`@commonality/sdk/node`) if/when subpaths are introduced (see #3).
USER'S NOTE: yes, please fix.

---

## Subsystem scorecard

| Subsystem | src LOC | test LOC | Role | Note |
|---|---:|---:|---|---|
| conceptspace | 2,367 | 987 | Statements/beliefs/implications — the substrate | Largest + most-coupled; depends up into content-funding (issue #2); `queries.ts` 1,490 lines |
| lazy-giving | 2,175 | 1,110 | Assurance contracts | Leaf; well-tested; the most-reused vertical (content-funding + fundingportals build on it) |
| content-funding | 2,098 | 898 | Creator/content contracts | Builds on lazy-giving — correct direction |
| delegation | 1,717 | 930 | Notes / note-intent / recurring pledges | Coherent; three related write surfaces |
| fundingportals | 1,318 | 229 | Cause boards / alignment attestations | Composes lazy-giving + delegation; carries the 2 `@deprecated` rename aliases; lighter tests |
| identity | 510 | 402 | Proof-of-personhood tiers, unique-human-id | Small, focused leaf |
| mutable-refs | 491 | 115 | On-chain named mutable references | Small leaf; light tests |
| displayable-documents | 410 | 701 | Document publish/fetch primitive | Pure leaf; heavily tested relative to size |
| subjectiv | 327 | 185 | Trust registry / account assertions | Smallest; coherent |

(`utils/` adds ~2.7k LOC: `eventDecoder.ts` 1,325 — ABI decode for all events — and `chain-reads.ts` 834 are the heavyweights; both are legitimately broad-by-nature.)

---

## Suggested next actions

1. **Now (trivia):** delete dead GraphQL deps (#1); refresh README (#5). Both low-risk, both make the package honest.
2. **Soon (one focused session):** read `conceptspace/queries.ts:1450–1490` and decide whether the content-funding coupling can be inverted/relocated to keep the substrate a leaf (#2). This is the one finding that touches the *architecture*, not just hygiene.
3. **Deliberate (needs an opinion from you):** whether to namespace the public surface via subpath exports (#3) and convert `createSDKMachinery` to an options object (#4). Both improve coherence/ergonomics; both have blast radius across consumers, so they're decisions, not chores.

*Verdicts from structure + interface + dependency-graph reads, plus targeted reads of `index.ts`, `machinery.ts`, `config-node.ts`, and the conceptspace coupling. Deeper line-level review of `folds.ts` correctness and `queries.ts` internals was out of scope for this pass.*
