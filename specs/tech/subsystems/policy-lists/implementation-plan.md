# Policy lists: content-only implementation plan

Status: **in progress; local foundation substantially complete, starter-profile vertical slice next** (Aug 2026).

This is the resumable work tracker for implementing the basic content-only portion of policy lists. A fresh LLM should be able to start here, complete one coherent unchecked item, update this file, and leave the next item ready for another instance.

The normative design remains [README.md](./README.md). If this checklist and that document disagree, the README wins. [design-history.md](./design-history.md) explains rejected alternatives; do not reintroduce them casually.

## Near-term stopping point

The next goal is not to finish every feature in this plan. It is to make one narrow, honest product story work end to end:

> A Civility-style cause vertical can start with an operator-selected standard content-policy profile backed by a content-hash-pinned HTTPS blocklist maintained by someone else, optionally add a pinned local exception list, and enforce the resulting policy consistently without maintaining its own moderation dataset.

The implementation boundary is **generic shared machinery plus one complete Civility reference integration**. Schemas, fetching, resolution, activation, evaluation, inspection, and reusable surface adapters belong in shared SDK/operator code. Civility supplies the first real call sites and coverage inventory; it must not introduce Civility-specific list semantics or a second evaluator. CSM and other verticals adopt the same path later, and their rollout does not block this stopping point.

For this first vertical slice:

1. fetch one pinned HTTPS list through the bounded untrusted-artifact path;
2. provide one concrete example profile and list;
3. activate one resolved bundle in Civility as the reference vertical;
4. enforce it across Civility's rendering, client-side aggregation, metadata retrieval, and every operator-controlled content-serving route;
5. add focused tests showing representative entries cannot bypass those surfaces; and
6. document the small operator workflow for selecting the profile, pinning an update, inspecting a decision, and adding a scoped exception.

This is the **starter-profile stopping gate**. Once it passes, the basic milestone may stop even though automatic following of mutable unpinned lists, held-candidate review, richer alerting, broader multi-vertical rollout, and registry publication remain future work. A pinned subscription requires an operator to approve a new hash when its maintainer publishes an update; that is acceptable for the starter story and is materially less burdensome than originating and maintaining the dataset.

Do not spend more time generalizing schemas, canonicalization, evaluation, or local bundle machinery unless the vertical slice exposes a concrete gap. Those foundations are already substantial. Do not claim the stopping gate has passed while a public render, aggregation, metadata-fetch, or serving bypass remains in Civility. Do not expand the gate to CSM or every vertical before stopping.

This infrastructure reduces dataset and integration burden; it does not provide compliance for free. The vertical operator still chooses the profile and needs reporting, appeals, and incident ownership.

## Goal

Let a vertical operator reuse shared exact-identifier blocklists while retaining ultimate control over its own surfaces:

- the operator chooses every subscribed list;
- the operator maps each list to explicit content actions;
- the operator may add its own lists and scoped exceptions;
- the same resolved policy is enforced for rendering, aggregation, metadata fetching, and serving;
- no policy list changes the neutral contracts or affects claims, payouts, or gas sponsorship.

A list only asserts that a CID, chain-scoped address, or channel is listed. The operator decides whether that assertion suppresses display, excludes aggregation, or refuses serving. There is no global `allow`, category language, implicit propagation, recursion, admission allowlisting, or money action in v1.

## How to continue this work

1. Read [README.md](./README.md), then this plan. Read only the relevant parts of [design-history.md](./design-history.md) when a rejected alternative or non-obvious rule is involved.
2. Check the repository and this checklist for work already in progress. Take **one coherent unchecked slice**, not the whole roadmap.
3. Keep pure policy logic portable between browser and Node. Do not put business folding into the indexer.
4. Add focused fixtures/tests with each slice. Strict parsing, canonical hashes, error direction, provenance, and cross-surface agreement are security properties, not cleanup work.
5. Update this checklist and append a concise entry to `/CONTINUITY.md` before stopping. If a decision is deliberately deferred, record the checkpoint below rather than guessing silently.
6. Do not describe policy lists as production-enforced until the final cross-surface coverage gate passes. A UI-only blocklist is an implementation step, not a completed policy system.

## Working implementation shape

These are defaults for getting started, not an interop contract beyond the normative v1 spec:

- Put shared types, canonicalization, validation, bundle activation, and pure evaluation under a new `@commonality/sdk/policy-lists` export.
- Keep source fetching, resolver state, alert hooks, and operator commands outside the pure evaluator. Start with a Node resolver/CLI and file-backed state; improve the runtime only when operations require it.
- Start with local files and embedded list data in generated bundles. Preserve room for immutable content-addressed artifacts, but do not build speculative storage machinery first.
- Make server enforcement a stateless use of `(activated bundle, request CID)` so it can later live in an operator indexer/API or a vertical-specific gateway without changing policy semantics.
- Treat `ui/src/shared/config/displayDenylist.ts` and `VITE_DISPLAY_DENYLIST_URL` as temporary compatibility, not a second permanent policy system.

If implementing one of these defaults exposes a real conflict with the codebase or normative spec, stop and record the narrower decision needed.

## Work breakdown

### A. Freeze the executable v1 foundation

- [ ] Define exact TypeScript types and strict schemas for local list documents, operator roots, subjects, action maps, evaluator requests/results, and resolved bundles.
  - [x] Local list documents and entries: strict schema discriminator/field sets, canonical subjects, duplicate rejection, and the 512-byte advisory-reason limit.
  - [ ] Operator roots, action maps, evaluator results, and resolved bundles.
    - [x] Operator roots and action maps: strict local refs, pinned exceptions, layer/action correspondence, extractor compatibility, canonical long-form actions, honored-retractor normalization, and diff-threshold shorthand.
    - [x] Evaluator results and resolved bundles: typed provenance-bearing lookup/evaluation results, runtime status, strict inline-artifact bundle schema, and explicit unresolved layer/exception states.
- [ ] Resolve the small representation gaps encountered while doing that work, especially:
  - [x] exact `maxAdded` / `maxRemoved` input representation and bounds: canonical decimal-string uint64; `maxDiff` expands to both and cannot be mixed with either explicit field;
  - [x] whether `carriedForward` is bundle content or resolver-only operational state: resolver-only state; surfaces receive immutable bundle content and their own runtime status;
  - [x] the initial bundle representation for list bytes versus content-addressed locators: validated local-list documents are embedded inline with source and content hash; separate locators require a later schema version;
  - [x] exact unresolved-layer and cold-start representation: unresolved block layers and configured exceptions use `{ unresolved: true }` instead of a `ref`; omission means no exception was configured.
  Record consequential rulings in the normative README or an ADR; do not leave behavior implicit in code.
- [x] Implement strict UTF-8 JSON parsing, duplicate-key/unknown-field rejection, RFC 8785 canonicalization, sha256 hashing, and shared valid/invalid test vectors. Implemented as browser/Node-portable `@commonality/sdk/policy-lists` primitives; schema parsers continue to own unknown-field rejection.
- [x] Implement canonical subject keys and validation for `cid`, chain-scoped `address`, and `channel`, including duplicate-subject rejection. Implemented in `@commonality/sdk/policy-lists` with focused cross-encoding and invalid-input tests.
- [x] Define the three content-action request shapes and extractors (`suppress`, `exclude-aggregation`, `refuse-serve`) with tests proving that all required subjects are extracted. Implemented in `@commonality/sdk/policy-lists`; render/aggregation requests require CID, publisher, and project-contract identity plus an optional channel, while serving extracts only its requested CID.

**Foundation exit:** browser and Node tests agree on canonical bytes, hashes, accepted documents, rejected documents, and extracted subjects.

### B. Implement local composition, evaluation, and bundles

- [x] Implement per-layer membership: a block list asserts a subject exactly when its leaf contains it and its attached pinned exception does not. Implemented as an indexed, pure bundle lookup that preserves layer order/provenance, scopes exceptions to their attached layer, and does not invent membership for unresolved artifacts.
- [x] Implement `lookup(subject)` and `evaluate(action, request)` with provenance, decisive subjects/layers, bundle digest, and runtime status; never expose only a bare boolean. Implemented as a reusable indexed evaluator that applies action/subject mappings, preserves stable layer provenance, and fails closed for governed unresolved `closed` layers without inventing lookup membership.
- [x] Validate exact layer/action correspondence, action/subject compatibility, explicit `onError`, pinned local exceptions, and the other startup-failure rules from the normative spec. Root and bundle parsing reject invalid correspondence/configuration; bundle activation also verifies every inline document's canonical content hash and the canonical bundle digest rather than trusting self-declared hashes.
- [x] Build the first local-file resolver and CLI with file-backed last-known-good state, monotonic bundle sequence, deterministic bundle generation, and atomic activation helpers. Implemented in the SDK's Node-only policy-list subpath; unchanged inputs retain the active digest/sequence, failed resolution leaves the active bundle untouched, and activation rejects rollback.
- [x] Implement local-source error behavior: closed layers carry their last-known-good artifact, closed cold starts and failed open layers are explicit unresolved layers, pinned exceptions carry forward independently, and one failed source does not prevent healthy layers from advancing in the next whole bundle. Atomic activation and rollback rejection remain enforced.
- [ ] Add resolver-side source-health/freshness tracking and digest/status reporting; freshness alerts without changing evaluation decisions.
- [ ] Add operator-facing inspect commands sufficient to show the active digest, layer status, lookup provenance, and a candidate diff. Exact command names and UX can be chosen during implementation.
  - [x] `npm run policy-lists:inspect --workspace=@commonality/sdk -- <bundle> [subject-json]` reports the active digest/sequence, resolved or unresolved layer and exception status, and optional exact-subject lookup provenance.
  - [ ] Add candidate diff inspection after held-candidate persistence defines the accepted-versus-candidate boundary.

**Local-core exit:** an operator can compose local block and exception files into one immutable bundle and obtain deterministic, explainable decisions in browser and Node runtimes.

### C. Add the starter pinned HTTPS subscription

- [x] Implement the bounded untrusted-artifact fetcher needed by the starter profile: streaming size and entry limits, decompression bounds, connection/first-byte/total-transfer timeouts, redirect limits, public-HTTPS-only network checks, DNS-pinned connections against rebinding, and explicit operator egress exceptions. Implemented in the SDK's Node-only policy-list subpath with focused bound/network tests.
- [x] Resolve and verify an HTTPS ref with a required `contentHash` through the existing bundle resolver. A mismatch is an ordinary per-layer resolution failure and preserves last-known-good behavior; unpinned HTTPS following remains deferred.
- [x] Provide one concrete shared-list fixture or operator-controlled example endpoint and a root/profile that subscribes to it. The repository-hosted Civility starter fixture is deliberately test-only, not a claimed moderation dataset.

**Starter subscription exit:** an operator can reuse exact bytes published over HTTPS by another maintainer and deliberately adopt an update by changing its pinned hash.

#### Deferred subscription automation

These remain valuable, but are not required for the starter-profile stopping gate:

- [ ] Implement unpinned-source `maxAdded` / `maxRemoved` gates against the last operator-accepted subject set.
- [ ] Implement held-candidate persistence and an explicit review/accept flow. A later fetch must not silently clear a hold.
- [ ] Add candidate diff inspection to the operator CLI.
- [ ] Add source-health, stale-resolution, anomalous-diff, and fetch-bound alert hooks beyond the minimum status needed to operate the pinned slice.

**Automatic-subscription exit:** an operator can safely follow a mutable HTTPS list without silently accepting an oversized change.

### D. Integrate the browser and SDK content surfaces

- [ ] Inventory every render, SDK fold/aggregation, and metadata-fetch path that can expose or count a policy subject. Turn the inventory into focused coverage tests rather than relying on a few representative call sites.
- [ ] Add atomic bundle loading/activation to the SDK and UI runtime. Every evaluation reports the enforced digest and surface status; asynchronous client/server digest mismatch must not disable enforcement.
  - [x] Added a shared browser/Node runtime with strict bundle validation, atomic latest-refresh activation, last-known-good stale fallback, cold-start unavailable status, and Civility-only UI startup loading through `VITE_POLICY_BUNDLE_URL`.
  - [x] Deployed Civility startup now refuses to render without an activated bundle; local development may remain unavailable while integration work is in progress.
  - [ ] Thread the activated evaluator/digest through each governed Civility surface and add client/server digest-mismatch coverage.
- [ ] Route display decisions through `evaluate("suppress", request)`.
  - [x] Civility's shared content-funding channel loader now removes suppressed contracts, their derived content items, and channels left with no visible contracts; browse and channel-detail rendering consume that filtered topology instead of refolding raw state.
  - [x] Civility's creator dashboard consumes the same render-filtered topology instead of independently refolding raw state.
- [ ] Route client-side folds, totals, supporter counts, leaderboards, and other aggregations through `evaluate("exclude-aggregation", request)` where their request contains governed subjects.
  - [x] Civility browse/channel totals, active-contract counts, activity ranking, and funding currency selection use a separately filtered aggregation topology, without treating aggregation-only exclusions as render suppression.
- [ ] Prevent governed metadata fetches and rendering from bypassing the evaluator.
  - [x] Added a reusable pre-fetch metadata policy context and wired Civility's content-funding channel metadata path to evaluate the complete CID/publisher/project/channel identity before either the platform API or IPFS/PublishedData retrieval. Rendering and non-metadata content paths remain to be inventoried and enforced.
  - [x] Channel metadata and content-attestation retrieval now enumerate only the render-filtered topology, so suppressed contracts cannot trigger auxiliary fetches after their cards are removed.
- [ ] Add temporary compatibility for the existing display denylist only if it materially eases rollout, then remove `VITE_DISPLAY_DENYLIST_URL` after bundle enforcement replaces it.

**Browser/SDK exit:** listed subjects are consistently hidden and excluded from governed client-side derivations under one reported bundle digest.

### E. Integrate operator-side serving

- [ ] Use the [adopted shared pointer-only feed](../../indexer/shared-feed-topology.md) as the default boundary. Because the indexer carries no `PublishedData` bytes, content serving policy belongs to the vertical's retrieval/display/aggregation paths rather than a per-vertical Ponder deployment. Keep the pure evaluator portable to the optional [independent deployment](../../indexer/operator-scoped-deployments.md).
- [ ] Apply `refuse-serve` to PublishedData/content-serving and metadata-serving routes using the activated operator bundle.
  - [x] Added a reusable SDK serving adapter that evaluates one atomic runtime snapshot, fails closed on an unavailable cold start, continues enforcing stale last-known-good bundles, and returns standard digest/status response headers.
  - [ ] Wire the adapter into the Civility operator-controlled serving route(s); do not apply Civility's policy to the neutral shared pointer index.
- [ ] Close, authenticate, or equivalently filter SQL, GraphQL, raw-event, and alternate API paths that would bypass the operator's serving policy.
- [ ] Report the enforced digest and runtime status through responses, logs, and operator introspection.
  - [x] The shared serving adapter provides `x-commonality-policy-status` on every outcome and `x-commonality-policy-digest` whenever a bundle is active. Route logging and deployed introspection remain.
- [ ] Verify cold start, stale bundle, failed activation, rollback, and client/server propagation behavior end to end.

**Serving exit:** an operator does not serve governed blocked bytes through any public route while another complete bundle is being fetched or activated.

### F. Starter-profile coverage and operator handoff

- [ ] Add cross-surface Civility tests proving representative CID, address, and channel entries have the specified effect on every action they govern, while scoped exceptions and unrelated layers remain independent.
- [ ] Test pinned-list failure, stale last-known-good data, granted and removed exceptions, malformed documents, failed activation/rollback, and digest divergence. Large-diff hold behavior belongs to deferred automatic subscriptions.
- [x] Document the starter operator workflow: select the profile, subscribe/pin, inspect a suppression, adopt a new pinned hash, add or remove a scoped exception, and roll back safely. Diff acceptance and anomalous-change response belong to deferred automatic subscriptions.
- [x] Provide one narrow vertical example using a pinned shared HTTPS list and a scoped pinned local exception. A separate local editorial list is optional for the starter profile.
- [x] Document the starter-profile boundary clearly: maintainers supply the dataset; operators still choose the profile, pin updates, receive reports, support appeals, and own incidents.
- [ ] Add verifier coverage for active-digest agreement and cross-surface suppression in Civility. Broader source-health thresholds, CSM integration, and other vertical coverage may follow operational experience.
- [ ] Remove or route around the old standalone display-denylist path in Civility, and declare the starter-profile stopping gate complete only after its coverage inventory has no unhandled public surface.
  - [x] Civility now routes around `VITE_DISPLAY_DENYLIST_URL`, leaving its activated bundle as the only content-policy decision source; other domains retain the compatibility path.

**Starter-profile exit:** Civility can adopt the example shared profile with small configuration, reports one enforced digest, and has no known public bypass across its governed content surfaces. The underlying implementation remains generic and reusable; CSM integration is explicitly not part of this exit gate. This is a good near-term stopping point; completion of every deferred subscription and rollout feature is not required.

## Decision checkpoints that do not block starting

These should be decided at the phase that needs them rather than expanded into speculative design now:

- **Server topology:** shared pointer-only Ponder is the default; decide during phase E whether any remaining byte-serving endpoint needs a single-tenant gateway. Per-operator Ponder is optional, not the baseline.
- **Resolver hosting and durable storage:** the file-backed CLI is enough to begin; choose scheduling/storage before relying on automatic remote updates in production.
- **Bundle artifact storage:** embed initial local documents; add separate content-addressed artifacts only when bundle size or deployment constraints justify them.
- **Alert transport and reviewer UI:** structured status and explicit CLI review are enough initially; choose paging and a graphical diff viewer from operational experience.
- **Initial real keeper/list:** fixtures and an operator-controlled HTTPS list can prove the mechanism. A production third-party dataset and keeper relationship are operational/product work, not a reason to invent one in code.
- **Admission ordering:** admission allowlisting may eventually precede the registry if a real vertical needs it. It is a separate evaluator with inverted failure rules and is not part of this checklist.

## Explicitly deferred beyond this milestone

Do not pull these into content-only implementation incidentally:

- claim or gas-sponsorship screening ([financial-screening.md](./financial-screening.md));
- on-chain registry, checkpointed publication, keeper manifests, and head-following ([registry.md](./registry.md));
- admission allowlisting;
- hashed subjects or perceptual-fingerprint providers;
- recursive published compositions;
- implicit subject propagation;
- contract-level takedowns.

Compliance operations—reporting address, responsible owner/on-call, published policy, appeals, and usable data-provider relationships—remain necessary and proceed independently of this engineering plan.
