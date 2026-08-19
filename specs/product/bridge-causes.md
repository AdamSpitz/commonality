# Bridge causes

A way to present — and to author — a mediator’s work as **ordinary causes**, not only as nudge batches from an LLM service.

This does **not** replace the [bridge-creator](./bridge-creator.md) or the [mediator-for-your-cause](./bridge-building-for-founders.md) idea. It is a *kind* of mediation (and a presentation mode) whose parents are already causes. Statement-level triples remain the engine: implication is still plank-to-plank; causes are how a cluster is shown, versioned, funded, and edited by a human.

Status: accepted as product direction (2026-08-17). CauseStarter create/edit is at `/bridge/new`, published cluster at `/bridge/:owner/:slug`. Recorded plank pairs can be wording-checked and submitted to the implication attester (paid); parent→modified nudge batches are an opt-in using the existing nudger publication path. Does not replace CSM / in-cause mediator.

## The shape

A **bridge cluster** is:

- One or more **natural causes** \(C_1, C_2, \ldots\) — human-authored publications (rosters of planks plus title and description). These already exist; the mediator does not own them.
- One **modified cause** \(C_{im}\) per natural parent — authored by the **mediator** (human or service). Each is something the mediator thinks believers of \(C_i\) might also be willing to sign, without feeling misrepresented.
- One **bridge cause** \(C\) — also mediator-authored — whose featured planks are meant to be **implied by** the corresponding planks of each modified cause.

For two parents the public picture is three causes. In general it is **\(n + 1\)**: one modified cause per natural parent, plus one bridge. Do not hard-code “three” in the type.

This is the existing statement-level triple, lifted one level:

| Statement-level ([bridge-creator](./bridge-creator.md)) | Cause-level |
|---|---|
| Human left / right wording | Natural causes \(C_i\) |
| Modified-left / modified-right | Modified causes \(C_{im}\) |
| Common-ground (implied by each modified wording) | Bridge cause \(C\) |

The load-bearing layer is the **modified** causes. Nudging a \(C_1\) signer straight at \(C\) is “please join the compromise.” Nudging them at \(C_{1m}\) is “here is a wording of *your* side that still implies the compromise.” Support then rolls up along attested implications.

## What this is for

A mediator is otherwise a prompt, a nudger address, and a pile of suggestions. A cluster of cause pages is something a person can open, bookmark, fund against, and argue with:

- **\(C_i\)** — what that camp actually published.
- **\(C_{im}\)** — the mediator’s proposed wording for people who already support \(C_i\).
- **\(C\)** — the shared platform.

The same objects work whether an LLM service proposed the text or a human typed it.

## Rules that keep the lift honest

**Implication is plank-to-plank.** “\(C_{1m}\) implies \(C\)” is UI shorthand only after each featured pair is an attested statement implication. Causes do not imply each other in the substrate. See [shaping-your-cause-statements.md](/docs/founder/shaping-your-cause-statements.md).

**Do not require “believers of \(C_i\)” as a conjunction.** A cause is a roster. Union vs “signed every plank” are different [views](/docs/founder/shaping-your-cause-statements.md). A modified cause is extra planks aimed at people who signed *some* of the parent, not a conversion of the whole movement.

**Modified causes are usually thinner than their parents.** A natural cause may have a dozen planks; a live bridge may exist on two topics. \(C_{im}\) is the modified *sliver*, not “Conservatism, mediator edition.” Do not invent concessions for planks that are not in play.

**Authorship must be loud.** \(C_{im}\) and \(C\) are published under the **mediator’s** key (the human operator or the service signer), never the natural-cause founder’s. If a modified cause looks like an official revision of \(C_i\), that is a bug. The natural founder may dislike \(C_{im}\); that is fine if the label is honest.

**Modified planks should still sound like the side.** The [abortion worked example](./bridge-creator.md#the-worked-abortion-example) keeps the original claim and *adds* a settlement. \(C_{im}\) is typically specification-plus-concession, and should often still imply some \(C_i\) planks so signing the modified wording still counts for that camp.

**Nudge path is parent → modified → (implication) → bridge.** Do not nudge \(C_i\) signers straight onto \(C\)’s wording. Implication already gives \(C\) the rollup.

**Staleness is public.** When a natural founder edits \(C_i\), \(C_{im}\) can go stale. Version modified and bridge causes as the mediator’s own publications, loosely coupled — not as live mirrors of the parents.

**Each modified cause independently implies the bridge.** For three parents, each of \(C_{1m}\), \(C_{2m}\), \(C_{3m}\) implies \(C\). The bridge is not the conjunction of the modified causes.

## Human mediators

A person who already has specific ideas about a bridge — “left and right could live with *this*” — must be able to **write the modified causes and the bridge cause themselves**, publish them, wire the implication pairs, and offer opt-in nudges, without handing editorial control to an LLM loop.

LLM help is allowed the same way [cause-assist](/docs/founder/shaping-your-cause-statements.md) helps a founder: sharpen wording so planks have the right shape for the implication attester, suggest missing arrows, refuse mush. The settled assistance approach — exportable brief plus one-shot verbs, no hosted chat — is [bridge-cluster-wording-help.md](/docs/founder/bridge-cluster-wording-help.md). The human remains the publisher. A service that only emits nudge batches is not sufficient.

Concretely, the product needs a **create / edit bridge** flow (CauseStarter is the natural home) that:

1. Points at existing natural causes (or creates topical slivers if the “sides” are not already causes).
2. Lets the human draft \(C_{im}\) and \(C\) as normal causes under their own key.
3. Records which plank pairs are meant to be modified→bridge (and, where true, modified→parent).
4. Submits those pairs to the implication attester; does not silently invent arrows.
5. Optionally publishes nudge batches pointing parent-signers at the modified planks — the same nudger opt-in as today’s mediator, but the payload can be hand-authored.
6. Renders a **bridge cluster page**: the modified causes, the bridge, and links back to the natural parents.

An LLM-powered [bridge-creator](./bridge-creator.md) instance is one *author* of the same objects (subject to today’s operator approval of anchors). It is not the only author.

## What this does not eat

- **CSM** often has no first-class “the Left” and “the Right” causes — only a statement space. Statement-level triples and the existing mediator remain the right default there. A CSM operator *may* promote a topical cluster into causes when they want the pages; they need not invent parent movements to fit the schema.
- **Internal fault lines** of a single founder cause (homeowners vs renters) are sides, not parent publications, unless someone promotes them. [Mediator for your cause](./bridge-building-for-founders.md) still applies.
- **Cause-assist** still authors a cause to mobilize a side. A human writing \(C_{im}\) and \(C\) is founder work with a two-constituency constraint. The nudger is how those planks reach people who already signed the parents. Do not collapse the roles even when they share a wording engine.

## Relation to today’s engine

Featured [anchor clusters](./bridge-creator.md#featured-anchors-the-public-display-set) are already `{ side-a, side-b, common-ground }` triples with a display gate. The target is: each pole of a featured cluster *is* (or points at) a real cause page, and a human can create that cluster without running synthesis.

`POST /propose-bridge` stays an intake channel into an opinionated service. A human mediator does not need that API to publish; they publish causes.

Cross-cause “federation” is no longer only “one service suggests wording to another.” The durable join is the bridge cluster.

## Deliberately later

- Auto-rewriting a natural founder’s roster.
- A marketplace of mediators.
- N-way role models inside a single synthesizer schema (multiple modified causes plus one bridge are enough).
- Treating cause-to-cause implication as a substrate primitive.
