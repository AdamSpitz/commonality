# 0012. A mediator is an address; human and LLM are authors

- **Status:** Accepted
- **Date:** 2026-08-20
- **Related specs:** [`specs/product/bridge-cluster-as-nudger.md`](../product/bridge-cluster-as-nudger.md), [`specs/product/bridge-causes.md`](../product/bridge-causes.md), [`specs/product/bridge-creator.md`](../product/bridge-creator.md), [`specs/product/nudge-ux.md`](../product/nudge-ux.md), [0011](./0011-organizer-contact-is-pull.md)

## Context

CauseStarter had two authoring paths that looked like different products. A person could publish a [bridge cluster](../product/bridge-causes.md) of ordinary causes and optionally write parent→modified nudge batches under their wallet. A founder could attach a running `bridge-creator` instance; visitors opted into that *service* (`address` + `serviceUrl`). Cluster pages had no opt-in. The same editorial job — wording of each side that still sounds like that side, shared ground those wordings imply, nudges at the modified wording not the compromise — was split by whether a daemon was running.

The question was whether a human-written cluster should be a nudger people can subscribe to, with republish as the human’s tick.

## Decision

**Users subscribe to a mediator Ethereum address.** Whether that address is driven by a human (edit and republish) or an LLM process (schedule / `GET /anchors`) does not change the listener object.

**The editorial shape is the same for both authors.** There are two presentations of that shape, and both are available to both kinds of author:

- **Triples** — statement-level `{ side-a, side-b, common-ground }` (including when there are no parent causes, as in CSM).
- **Causes** — a [bridge cluster](../product/bridge-causes.md): modified cause per natural parent plus a bridge cause.

Do not couple “triples ↔ LLM service” and “causes ↔ human form.” Do not require a human to stand up `bridge-creator` to be subscribed to. Do not require an LLM to materialize cause pages. Do not auto-subscribe from opening a cluster. Do not collapse authoring runtimes: a human tick is an edit; strategy prompts, beat-agent context, and `GET /anchors` stay properties of the LLM instance.

## Alternatives considered

- **Opt-in only on `serviceUrl` mediators.** Rejected: that defines a nudger as a daemon. Human clusters become one-shot brochures; the LLM path is the only durable mediation path. Contradicts [bridge-causes.md](../product/bridge-causes.md) (a person must offer the same opt-in without handing editorial control to an LLM) and the trust model (users trust addresses, not HTTP processes).
- **Pretend the human is the HTTP service** (`GET /anchors` over cause pages, require `bridge-creator` for a one-off cluster). Rejected: extra ops, fake endpoints, and it stretches cause-assist into a standing mediator.
- **Per-cluster subscribe instead of per-address.** Rejected for v1: the on-chain object is already the publishing address; later mute-by-schema can filter batch kinds. Copy must say you are opting into this mediator, not this page.
- **Opening a cluster auto-trusts the mediator.** Rejected: pull, not push ([0011](./0011-organizer-contact-is-pull.md), [nudge-ux.md](../product/nudge-ux.md)).

## Consequences

Cluster pages get the same opt-in control as `CauseMediatorCard`, keyed on `mediatorAddress`, without requiring `serviceUrl`. Featured-triple fetch stays a service feature. Attach-a-service remains “this identity also runs a synthesizer.” Cause-assist stays a copy editor.

Implementation work lives in [bridge-cluster-as-nudger.md](../product/bridge-cluster-as-nudger.md).

Revisit if listeners cannot tell a one-shot human batch from an always-on synthesizer and that confusion becomes abuse; or if one address mixing cluster batches and service batches needs a mute-by-schema control. Do not revisit “subscribe is to a process” without a new ADR.
