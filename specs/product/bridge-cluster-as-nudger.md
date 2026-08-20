# Tentative: a bridge cluster is a nudger (human or LLM)

Status: **tentative** (2026-08-19). Not product direction. Do not implement from this file until Adam rules. Conversation that produced it: human-written CauseStarter clusters vs attached `bridge-creator` services.

Related accepted specs: [bridge-causes.md](./bridge-causes.md), [bridge-creator.md](./bridge-creator.md), [bridge-building-for-founders.md](./bridge-building-for-founders.md), [nudge-ux.md](./nudge-ux.md). Founder-facing attach path: [mediator-for-your-cause.md](/docs/founder/mediator-for-your-cause.md).

## The itch

CauseStarter currently presents two authoring paths that feel like different products:

1. **Write a bridge** (`/bridge/new`) — a person publishes a cluster of ordinary causes (natural parents, modified causes, shared bridge). Optional parent→modified nudge *batches* exist. There is **no visitor opt-in** on the cluster page.
2. **Attach a standalone mediator** (`/cause/…/mediator`) — point the cause at a running `bridge-creator` instance (name, description, signer, `serviceUrl`). Opt-in trusts that address; featured triples come from `GET /anchors`.

The editorial job is the same: write a wording of each side that still sounds like that side, write shared planks those wordings imply, and (if anyone is listening) point parent-signers at the **modified** wording, not at the compromise. The LLM service does that on a schedule from anchors + beat context. A human does it when they publish or edit.

Watching the discourse and updating *is* still the mediator’s ongoing job if they want to keep mediating. Software does not have to daemonize a human; republishing the cluster / a new batch *is* their tick.

## Tentative collapse

Treat **one mediator identity** (an Ethereum address people opt into) as the listener-facing object. The author behind that identity is either:

- a human, publishing cluster pages and nudge batches from CauseStarter, or
- a `bridge-creator` process, synthesizing on a schedule and exposing `GET /anchors`.

Same pull-based nudger contract either way. Signing stays the user’s choice.

What that would add to today’s human path: **opt in to this cluster’s mediator address** the way `CauseMediatorCard` already opts into a service. Then “your nudgers” would surface later batches when the human republishes — which is not implemented.

## Keep separate

Do **not** pretend the human *is* the HTTP service:

- No requirement to stand up `bridge-creator` for a one-off cluster.
- No stretching `GET /anchors` around pages that are already causes.
- Cause-assist wording help stays a copy editor (brief + one-shot verbs), not the mediator.
- CSM-style work with no parent causes can stay statement-level triples in the service; this idea is about clusters whose parents are causes.

Do **not** smash authoring runtimes together: strategy prompt, beat-agent context, and anchor-reflection CLI stay properties of the LLM instance. A human tick is an edit.

## What is already the same in code

- Cluster publish records `mediatorAddress` (the connected wallet).
- `publishParentToModifiedNudges` writes a `schemaVersion` 1 nudge-batch under that address onto `NudgePublications` — same path as the service.
- Nudge path is parent → modified; the UI refuses to invent pairs.

The gap is **subscribe**, not **publish**.

## Decision to make

Is a published bridge cluster a first-class nudger people can opt into, including after a human update — with the LLM service as one author of that same object, not a parallel product?

If yes: add cluster opt-in; keep `/bridge/new` LLM-free; keep attach-a-service as “this identity also runs a synthesizer.”

If no: keep opt-in exclusive to `serviceUrl` mediators, and treat human clusters as pages + one-shot batches that only reach people who already trusted that wallet some other way.
