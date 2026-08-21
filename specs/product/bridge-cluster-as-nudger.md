# Mediator identity: one address, two presentations, two authors

Status: **accepted (2026-08-20)**. Frozen why: [ADR 0012](../decisions/0012-mediator-is-an-address.md).

Related: [bridge-causes.md](./bridge-causes.md), [bridge-creator.md](./bridge-creator.md), [bridge-building-for-founders.md](./bridge-building-for-founders.md), [nudge-ux.md](./nudge-ux.md), [mediator-for-your-cause.md](/docs/founder/mediator-for-your-cause.md).

This file is the living “what” plus the implementation list. A fresh agent should implement from the list below, not reverse the ADR.

## Decision (short)

Users **subscribe to a mediator Ethereum address**. Human or LLM is how that address authors; listeners do not care.

The **job** is the same either way: a wording of each side that still sounds like that side, plus shared ground those wordings imply, and nudges at the **modified** wording, not the compromise.

Two **presentations** of that job, both available to both authors:

| Presentation | When | Objects |
|---|---|---|
| **Triples** | Sides may not be causes (CSM, in-cause fault lines) | Statement-level `{ side-a, side-b, common-ground }` |
| **Causes** | Parents are (or can be) causes | [Bridge cluster](./bridge-causes.md): modified cause per natural parent + bridge cause |

A human tick is **republish**. An LLM tick is the existing synthesizer schedule. Do not smash those runtimes.

## Rules that keep the collapse honest

1. **Opt into the address**, labeled as this mediator — not into “this page.” Later batches from the same key show up even if they are a different cluster or a service tick. Say that in the copy.
2. **No auto-trust.** Opening a cluster or a cause is not subscribe.
3. **No `serviceUrl` required** to opt in. Featured triples (`GET /anchors`) stay a service feature. Human clusters must not fake a service.
4. **Nudge path stays parent → modified**, never parent → bridge.
5. **Staleness is the mediator’s problem.** Subscribers see new batches only when the address publishes again. Do not claim a human cluster “watches the discourse.”
6. **Cause-assist stays a copy editor** (brief + one-shot verbs), not the mediator.
7. **Attach-a-service** means “this identity also runs a synthesizer.” It is not a second listener object.
8. **Do not couple form to author.** A human can publish triples without standing up `bridge-creator`. An LLM can publish a cluster without pretending the human path does not exist.

## What is already true in code

- Cluster publish records `mediatorAddress` (the connected wallet). See `causestarter/src/lib/bridgeCluster.ts`.
- `publishParentToModifiedNudges` (`causestarter/src/lib/bridgeNudges.ts`) writes a `schemaVersion` 1 `nudge-batch` under that address onto `NudgePublications` — same path as the service.
- The UI refuses to invent parent→modified pairs.
- `CauseMediatorCard` / `mediatorNudgerFromCause` (`ui/src/shared/nudges/mediatorNudger.ts`) **refuse opt-in without `serviceUrl`**. That is the gap this spec closes for humans.
- `TrustedNudgerEntry.serviceUrl` is already optional in the store (`ui/src/shared/hooks/useTrustedNudgers.ts`). `getMediatorOptInPath` already omits `nudgerServiceUrl` when absent. Tally Settings `?addNudger=` already keys on address.
- Suggestion folding is by trusted **address**, not by HTTP (`specs/tech/subsystems/nudger/README.md`).

The remaining work is **subscribe on the cluster**, **address-only opt-in construction**, and **making both presentations reachable from both authors** — not a new contract.

## Implementation list

Do these in order. After each slice, tests should fail if opt-in still requires a service URL, or if a cluster page has no way to trust `mediatorAddress`.

When a slice is done, delete its bullet here (this spec’s list is the living backlog for this decision). Also delete the pointer in [`TODO.md`](/TODO.md) once the whole list is empty.

### Slice 1 — Cluster opt-in (the original gap)

- [x] On `/bridge/:owner/:slug` (`causestarter/src/pages/BridgeClusterPage.tsx`), add an opt-in control for `mediatorAddress` equivalent to `CauseMediatorCard`: toggle `addTrustedNudger` / `removeTrustedNudger` in the shared store. Do **not** require `serviceUrl`. Use a name/description from the cluster document (mediator label, title, or a short default). Copy: you are listening to **this mediator**, not bookmarking the page; later suggestions appear if they publish again. (`ClusterMediatorOptIn`)
- [x] Reuse or extend `mediatorNudgerFromCause` so an address + name is enough (`serviceUrl` optional). `serviceMediatorFromCause` still requires a URL for attached-service cards. `CauseMediatorCard` uses the latter.
- [x] Deep link: `clusterMediatorOptInPath` / `getMediatorOptInPath` omit `nudgerServiceUrl` when there is no service. `NudgerSettingsSection` already keys on `addNudger` and treats `nudgerServiceUrl` as optional.
- [x] Tests: `mediatorNudger.test.ts`, `ClusterMediatorOptIn.test.tsx`, `CauseMediatorCard.test.tsx` (still disabled without URL).

### Slice 2 — Honest labels and later batches

- [x] Suggestion folding is by address (`StatementSuggestions` maps `trustedNudgers` to addresses only). Covered by a test that a trusted entry with no `serviceUrl` is still passed to `getStatementNudges`.
- [x] Human-only cluster entries omit `sourceType` rather than forcing `bridge-creator`. CSM still sets `sourceType: 'bridge-creator'` on its configured mediator.

### Slice 3 — Both presentations, both authors

These are product completeness, not required to close slice 1.

- [x] **Human triples, no HTTP.** `/bridge/triple` publishes side-A / side-B / common-ground statements, parent→modified nudge batches, and modified→common-ground attester pairs under the connected wallet. Opt-in is the same address card. No `GET /anchors`.
- [x] **LLM clusters.** Optional `parent_causes` + `cluster_slug` on the mediator artifact. A tick plans n+1 rosters + a `causestarter.bridge-cluster` document and, when `PUBLISHED_DATA` + `MUTABLE_REF_UPDATER` are set, publishes them under the signer. CSM with no parent causes is unchanged.
- [x] Founder docs: attached-service cards still need address + URL; cluster opt-in is by address alone. [bridge-cluster-wording-help.md](/docs/founder/bridge-cluster-wording-help.md) treats the LLM service as a different **runtime**, same **address**.

### Out of scope (do not do from this spec)

- Hosted mediation chat; stretching cause-assist into a standing strategy prompt.
- Auto-subscribe; notifications; message hub ([ADR 0011](../decisions/0011-organizer-contact-is-pull.md)).
- Per-cluster mute (later, if one address mixing batch kinds becomes noisy).
- Requiring `/.well-known/nudger.json` for human publishers.
- Nudging parent-signers straight onto the bridge cause.

## Decision footer

Accepted 2026-08-20. [ADR 0012](../decisions/0012-mediator-is-an-address.md).
