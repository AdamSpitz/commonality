# Operator-scoped indexer deployments

Status: **proposed, not implemented** (Jul 2026).

This document reconciles two decisions that can otherwise sound contradictory:

1. Commonality replaced several subsystem-specific, federated indexers with one deliberately dumb
   event-cache implementation ([redesign](./redesign.md), [federation history](./federation.md)).
2. A production vertical should not depend on a Commonality-operated universal feed that claims to
   be neutral while quietly suppressing material. Each operator should own and disclose the scope
   and policy of its read model ([UI operator posture](/specs/product/ui-operator-posture.md)).

The intended direction is therefore **one reusable indexer package, deployed many times with
operator-specific scope and policy**. Do not revive business logic, subsystem federation, or one
code fork per cause.

## Why the dumb cache does not settle the operator question

The thin event cache is a good trust and maintenance boundary: it stores raw events, while the SDK
folds them into application state. That makes an indexer replaceable and its output verifiable. It
does not make operating a broad production API neutral. The API still determines which events and
published bytes are convenient for the operator's users to discover and retrieve.

A broad development or archival deployment remains useful. It should be described honestly as a
development, archival, or independently-operated broad feed—not as the canonical Commonality view
of the protocol.

## Two independent policy axes

An operator-scoped deployment needs both concepts below. They must not be collapsed into one list
or evaluator because their failure semantics differ.

### Admission: what this deployment follows

Admission answers: **what belongs to this operator's read model?** Examples include:

- contracts created by a recognized factory;
- an explicit set of project contracts;
- statements and projects selected for a particular cause or vertical;
- publishers, channels, and content contracts recognized by an operator.

Failure should generally admit nothing new, not broaden the feed. A stale or unavailable admission
source can therefore cause missing content or an outage. This is the inverse of a blocklist failure,
and is why the policy-list design defers admission as a separate evaluation profile.

### Blocking: what this deployment refuses despite admission

Blocking answers: **what must be suppressed even though it would otherwise be in scope?** It covers
legal, safety, fraud, spam, sanctions, or editorial exclusions. The shared
[policy-list design](../subsystems/policy-lists/README.md) owns subject identity, composition,
operator overrides, failure behavior, and consistent enforcement across API serving, SDK
aggregation, and UI rendering.

A narrow admission set is not a substitute for a blocklist. Material can become prohibited after it
was admitted, and references or shared contracts can introduce subjects the original curator did
not review.

## What is already reusable

The implementation is close to contract/factory scoping:

- all event handlers write the same raw `events` row shape;
- SDK folds do not depend on a particular indexer operator;
- `INDEXER_DEPLOYMENT_MANIFEST` already selects addresses and start blocks by logical contract name;
- Ponder factory sources already discover child project and receipt contracts from selected
  factories;
- vertical UIs can already be configured with an event-cache URL.

Factory address is the cleanest namespace when a vertical controls project creation. For example, a
Civility deployment can follow a Civility-recognized factory without trusting a self-declared
`category = civility` field. Separate factories are useful where operationally natural, but should
not be created solely to simulate a contract-level takedown power.

## What is missing today

The current deployment manifest was built for contract versioning, not as an authoritative operator
scope:

- an omitted logical contract can fall back to legacy address environment variables;
- an absent address must not accidentally become a wildcard Ponder source;
- sources and handlers are declared as one unconditional application-wide set;
- there is no admission manifest for individual projects, statements, CIDs, publishers, channels,
  or content contracts;
- the indexer currently enforces no operator block policy;
- public SQL and GraphQL access can bypass a filter added only to REST routes;
- the by-CID `honoredRetractors` query parameter is caller-selected policy, not operator
  enforcement;
- no endpoint identifies the operator or declares the deployment's scope and active policy.

Consequently, the existing image can be configured for known addresses, but it should not yet be
advertised as a safely narrow operator indexer.

## Proposed deployment contract

The exact manifest schema is not decided, but an operator deployment should have one authoritative
configuration with these properties:

1. **Identity** — operator name, policy/contact URL, reporting address, and a stable deployment ID.
2. **Chain scope** — chain IDs and start blocks.
3. **Source admission** — an explicit enabled set of logical contracts, factories, and versions.
   Omission means disabled; it never means wildcard and never silently falls back.
4. **Subject admission** — optional recognized projects, statements, CIDs, publishers, channels,
   and content contracts, using the shared canonical subject keys from policy lists.
5. **Block policy** — the resolved policy bundle and digest enforced by this operator.
6. **Metadata policy** — which admitted bytes may be fetched, cached, proxied, or rendered.
7. **Introspection** — a public endpoint reports operator identity, declared source/admission scope,
   active policy digest, indexed chain head, and runtime status.

The UI should identify its operator and use that operator's indexer by default. Users and independent
UIs remain free to choose another indexer or query the chain directly.

## Cause-scoped indexing is more than contract selection

Contract/factory scoping is straightforward. “Follow this cause” is semantic and requires defining
its dependency closure. A cause view may need:

- its selected topic statements and their PublishedData;
- implication and belief events relevant to those statements;
- alignment attestations connecting projects to the cause;
- admitted project contracts, contributions, receipts, and retractions;
- future updates to all of the above.

The first admission implementation should prefer explicit, inspectable subject sets. Automatically
following an inferred graph neighborhood can come later, once the product can say exactly which
edges expand scope, who is authorized to add them, and how removals affect already-cached data.

Some shared singleton contracts, especially `PublishedData` and Conceptspace contracts, complicate
true ingestion narrowing. An application handler can decline to copy an event into the public
`events` table, but Ponder may already have fetched or retained it in internal synchronization
storage. Static RPC topic filters also do not naturally express a dynamically changing semantic
allowlist. Before claiming that prohibited bytes are never possessed or cached, inspect and test the
actual Ponder storage path. “Do not serve” and “never ingest” are separate guarantees.

## Public API boundary

Policy enforcement must cover every public read path. Adding checks only to `/api/events` or
`/api/published-data` is insufficient while `/sql/*` or GraphQL can expose the underlying table.
An operator deployment should either disable those routes publicly, put them behind operator
authentication, or apply equivalent policy enforcement there. GraphQL may be retained behind the
service boundary for health checks, but health checks should not require unrestricted data access.

Serving policy is also only one layer. The same resolved block policy must govern metadata fetches,
SDK folds and aggregates, and UI rendering; otherwise the weakest path defines the real policy. See
[policy lists](../subsystems/policy-lists/README.md#where-evaluation-runs).

## Implementation sequence and size

### 1. Authoritative contract/factory scope — small–medium

- add an explicit operator-scoped mode and enabled source set;
- make omission mean disabled and reject accidental wildcards;
- remove legacy fallback in this mode;
- conditionally construct Ponder sources and register matching handlers;
- validate manifests at startup;
- add narrow-deployment tests and operator deployment examples;
- expose identity, scope, chain-head, and status introspection.

This is the cheapest useful milestone and does not require cause semantics.

### 2. Static subject admission — medium

- reuse canonical subject keys and list documents;
- implement a distinct admission evaluator with fail-narrow semantics;
- define explicit dependency rules for selected projects and statements;
- apply admission at query/serving boundaries and, where feasible, before event persistence;
- test additions, removals, stale inputs, rebuilds, and references to non-admitted subjects.

This milestone should be driven by one real vertical configuration rather than a hypothetical fully
generic cause language.

### 3. Shared production block-policy enforcement — large core plus medium–large coverage

Implement the policy-list evaluator and resolved bundle across API serving, metadata fetching, SDK
aggregation, and UI rendering. Close SQL/GraphQL bypasses and prove with cross-surface tests that a
listed subject is suppressed everywhere. This is shared work, not custom work for every indexer.

### 4. Strong no-ingestion guarantees — medium–large, only if required

Determine whether Ponder's synchronization database retains filtered event bytes. If an operator
must guarantee that excluded bytes are never persisted, add source-level static filtering where
possible and consider a narrower ingestion path for shared PublishedData events. Document the exact
guarantee rather than treating refusal to serve as equivalent to absence from storage.

## Non-goals

- No return to five subsystem indexers or indexer-to-indexer federation.
- No business-specific derived tables merely to make deployments appear distinct.
- No contract-level admin takedowns or freezes.
- No self-declared cause/category tag treated as admission authority.
- No requirement that every operator originate every blocklist; operators may subscribe while
  retaining responsibility and override control.
- No claim that alternative indexers remove the legal obligations of an operated UI or API.

## Decision summary

Keep the thin event-cache architecture. Change the deployment model from “one broad Commonality
indexer” to “one reusable package, many operator-scoped read models.” Implement contract/factory
scope first; add admission only against a real vertical; build blocking through the shared
cross-surface policy system rather than an indexer-only filter.
