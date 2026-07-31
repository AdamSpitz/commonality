# Policy lists: content-only implementation plan

Status: **in progress; phase A foundation started** (Jul 2026).

This is the resumable work tracker for implementing the basic content-only portion of policy lists. A fresh LLM should be able to start here, complete one coherent unchecked item, update this file, and leave the next item ready for another instance.

The normative design remains [README.md](./README.md). If this checklist and that document disagree, the README wins. [design-history.md](./design-history.md) explains rejected alternatives; do not reintroduce them casually.

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
  - whether `carriedForward` is bundle content or resolver-only operational state;
  - [x] the initial bundle representation for list bytes versus content-addressed locators: validated local-list documents are embedded inline with source and content hash; separate locators require a later schema version;
  - [x] exact unresolved-layer and cold-start representation: unresolved block layers and configured exceptions use `{ unresolved: true }` instead of a `ref`; omission means no exception was configured.
  Record consequential rulings in the normative README or an ADR; do not leave behavior implicit in code.
- [x] Implement strict UTF-8 JSON parsing, duplicate-key/unknown-field rejection, RFC 8785 canonicalization, sha256 hashing, and shared valid/invalid test vectors. Implemented as browser/Node-portable `@commonality/sdk/policy-lists` primitives; schema parsers continue to own unknown-field rejection.
- [x] Implement canonical subject keys and validation for `cid`, chain-scoped `address`, and `channel`, including duplicate-subject rejection. Implemented in `@commonality/sdk/policy-lists` with focused cross-encoding and invalid-input tests.
- [x] Define the three content-action request shapes and extractors (`suppress`, `exclude-aggregation`, `refuse-serve`) with tests proving that all required subjects are extracted. Implemented in `@commonality/sdk/policy-lists`; render/aggregation requests require CID, publisher, and project-contract identity plus an optional channel, while serving extracts only its requested CID.

**Foundation exit:** browser and Node tests agree on canonical bytes, hashes, accepted documents, rejected documents, and extracted subjects.

### B. Implement local composition, evaluation, and bundles

- [ ] Implement per-layer membership: a block list asserts a subject exactly when its leaf contains it and its attached pinned exception does not.
- [ ] Implement `lookup(subject)` and `evaluate(action, request)` with provenance, decisive subjects/layers, bundle digest, and runtime status; never expose only a bare boolean.
- [ ] Validate exact layer/action correspondence, action/subject compatibility, explicit `onError`, pinned local exceptions, and the other startup-failure rules from the normative spec.
- [ ] Build the first local-file resolver and CLI with file-backed last-known-good state, monotonic bundle sequence, deterministic bundle generation, and atomic activation helpers.
- [ ] Implement local-source error behavior, including closed cold start, last-known-good carry-forward, unresolved layers, whole-bundle activation, rollback rejection, and digest/status reporting.
- [ ] Add operator-facing inspect commands sufficient to show the active digest, layer status, lookup provenance, and a candidate diff. Exact command names and UX can be chosen during implementation.

**Local-core exit:** an operator can compose local block and exception files into one immutable bundle and obtain deterministic, explainable decisions in browser and Node runtimes.

### C. Add safe shared HTTPS subscriptions

- [ ] Implement the bounded untrusted-artifact fetcher: streaming size and entry limits, decompression bounds, timeouts, redirect limits, public-HTTPS-only network checks, DNS-rebinding protection, and explicit operator egress exceptions.
- [ ] Implement optional `contentHash` pinning and unpinned-source `maxAdded` / `maxRemoved` gates against the last operator-accepted subject set.
- [ ] Implement held-candidate persistence and an explicit review/accept flow. A later fetch must not silently clear a hold.
- [ ] Add source-health, stale-resolution, anomalous-diff, and fetch-bound alert hooks. The first implementation may use logs/structured status; production paging integration can be selected later.

**Subscription exit:** an operator can reuse a mutable HTTPS list without silently accepting an oversized change, and can pin exact bytes when automatic following is inappropriate.

### D. Integrate the browser and SDK content surfaces

- [ ] Inventory every render, SDK fold/aggregation, and metadata-fetch path that can expose or count a policy subject. Turn the inventory into focused coverage tests rather than relying on a few representative call sites.
- [ ] Add atomic bundle loading/activation to the SDK and UI runtime. Every evaluation reports the enforced digest and surface status; asynchronous client/server digest mismatch must not disable enforcement.
- [ ] Route display decisions through `evaluate("suppress", request)`.
- [ ] Route client-side folds, totals, supporter counts, leaderboards, and other aggregations through `evaluate("exclude-aggregation", request)` where their request contains governed subjects.
- [ ] Prevent governed metadata fetches and rendering from bypassing the evaluator.
- [ ] Add temporary compatibility for the existing display denylist only if it materially eases rollout, then remove `VITE_DISPLAY_DENYLIST_URL` after bundle enforcement replaces it.

**Browser/SDK exit:** listed subjects are consistently hidden and excluded from governed client-side derivations under one reported bundle digest.

### E. Integrate operator-side serving

- [ ] At the start of this phase, choose the deployment boundary: enforcement in each operator-scoped indexer/API, or a single-tenant vertical gateway over a shared feed. The pure evaluator must support either. Review [operator-scoped deployments](../../indexer/operator-scoped-deployments.md) and the still-unreviewed [shared-feed topology proposal](../../indexer/shared-feed-topology.md); do not accidentally freeze that open topology through library design.
- [ ] Apply `refuse-serve` to PublishedData/content-serving and metadata-serving routes using the activated operator bundle.
- [ ] Close, authenticate, or equivalently filter SQL, GraphQL, raw-event, and alternate API paths that would bypass the operator's serving policy.
- [ ] Report the enforced digest and runtime status through responses, logs, and operator introspection.
- [ ] Verify cold start, stale bundle, failed activation, rollback, and client/server propagation behavior end to end.

**Serving exit:** an operator does not serve governed blocked bytes through any public route while another complete bundle is being fetched or activated.

### F. Production coverage and operator handoff

- [ ] Add cross-surface tests proving representative CID, address, and channel entries have the specified effect on every action they govern, while scoped exceptions and unrelated layers remain independent.
- [ ] Test mandatory-list failure, open-list failure, stale last-known-good data, large additions/removals, granted exceptions, removal of exceptions, malformed documents, and digest divergence.
- [ ] Document the operator workflow: author a local list, subscribe/pin, configure actions, inspect a suppression, review a diff, accept/reject a candidate, roll back safely, and respond to an alert.
- [ ] Provide one narrow vertical example using a shared list, a local editorial list, and a scoped local exception.
- [ ] Add verifier coverage for active-digest agreement, stale/unavailable surfaces, source health, and cross-surface suppression. Define operational thresholds when a real deployment supplies the needed evidence.
- [ ] Remove the old standalone display-denylist path and declare the content-only milestone complete only after the coverage inventory has no unhandled public surface.

## Decision checkpoints that do not block starting

These should be decided at the phase that needs them rather than expanded into speculative design now:

- **Server topology:** per-operator indexer/API versus single-tenant gateway over a shared feed. Decide before phase E.
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
