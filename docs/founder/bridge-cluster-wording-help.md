# Helping a human write a bridge cluster

How CauseStarter helps an organizer author a [bridge cluster](/specs/product/bridge-causes.md) without Commonality becoming the mediator.

Status: **approach settled (2026-08-19)**; first slice implemented in the cluster editor (`/bridge/new`). This is the writeup a fresh agent should read before changing that UI or adding LLM help. The cluster *shape* is still [bridge-causes.md](/specs/product/bridge-causes.md). The scheduled AI mediator is a different **runtime** ([bridge-creator](/specs/product/bridge-creator.md), [mediator-for-your-cause.md](./mediator-for-your-cause.md)), not a different listener object — subscribers opt into an address ([ADR 0012](/specs/decisions/0012-mediator-is-an-address.md), [bridge-cluster-as-nudger.md](/specs/product/bridge-cluster-as-nudger.md)). Statement-level triples without parent causes: `/bridge/triple`.

## The job

A person already has two camps in mind — e.g. practising Christians and secular conservatives — and wants a public picture of a bridge:

- one **modified** wording per existing parent cause (thinner sliver; still sounds like that camp)
- one **bridge** cause whose planks each modified side independently and obviously implies
- plank-to-plank pairs for the implication attester
- loud authorship under the *mediator’s* key, not the parent founder’s

That work is editorial and iterative. The organizer will not get the wording right on the first try, especially if they do not yet have the mental model. An LLM can help with the back-and-forth. **The human remains the publisher.**

## What we are not building

**Not a hosted mediation chat.** A long-lived “walk me through mediating these two sides” thread would:

- make Commonality the author of bridge *policy* (rejected in [bridge-building-for-founders.md](/specs/product/bridge-building-for-founders.md): we ship the engine; they write the strategy)
- put parent-cause text and organizer complaints in the same unbounded prompt as instructions (prompt injection)
- store the rehearsal — the most sensitive material (“where this camp actually stops”)
- invite jailbreak into a general assistant and an unbounded token bill

Payment does not fix those. `POST /chat` is out of scope.

**Not “go read our docs and ask ChatGPT.”** That is the right *custody* instinct (their subscription, their transcript) and a lame *product*. An unconstrained model writes a mushy middle the implication attester will refuse and neither camp will sign.

**Not the in-cause mediator service.** Attaching name / signer / service URL to a roster is how a *running* `bridge-creator` instance appears to followers. Writing a cluster by hand does not deploy that service, and the service does not replace the cluster editor. Do not collapse the two under one unlabeled “Mediator” wizard.

**Not teaching the mental model via LLM.** “What is a modified cause?” is UI copy and a guided layout (parent planks beside a blank modified column, a labeled format example). Putting that lesson in a chat is how we accidentally become the policy author.

## What we are building

Two assistance layers. The **draft is the conversation memory**. Each turn is “here is the current cluster + what is wrong with it”; there is no server-side thread id.

### 1. Export a brief to the organizer’s own assistant

**Copy brief for your assistant** on `/bridge/new` copies a constrained packet:

- verbatim parent planks and the current modified / bridge drafts
- the attester bar and cluster rules (thinner sliver, keep each side’s reasons, shared plank owns neither *why*, silence is allowed, do not invent arrows, do not write a strategy prompt)
- the Christian / secular family-formation triple labeled as a **format example only**
- a required return schema: `commonality.bridge-cluster-patch.v1`

They paste into Claude / ChatGPT / Grok, paste JSON back, **Apply pasted patch**, then review. We never see the chat. Code: `causestarter/src/lib/bridgeAssistBrief.ts`.

### 2. Hosted one-shot verbs (same class as plank sharpening)

cause-assist endpoints — proposals, never auto-applied, never a standing strategy prompt:

| Verb | Purpose |
|---|---|
| `POST /draft-modified-plank` | One modified plank from parent texts + optional “must not concede” / complaint. Refuses empty parents. |
| `POST /draft-stand-in-sliver` | Thin roster for a camp that has no published cause yet (title, summary, planks). Not a modified-plank call. |
| `POST /draft-bridge-plank` | One shared plank from ≥2 sides (modified wording, or stand-in planks when modified is skipped); strip justifications |
| `POST /critique-triple` | Objections (including implication-vs-nudge routing) and justification-leak warnings only — no rewrite |

UI: `causestarter/src/components/BridgeClusterAssist.tsx`. Implementation: `cause-assist/src/bridgeClusterAssist.ts`.

A later **BYOK in-page chat** (their key, our system prompt, we hold no transcript) is an escape hatch if founders demand it. It is not v1.

## How to tell the two products apart

| | Human-authored cluster | Founder-operated mediator service |
|---|---|---|
| Durable object | Published causes + cluster document | Nudger address + featured anchors |
| Who writes text | Organizer (optionally with one-shot help) | Scheduled synthesizer under *their* strategy prompt |
| CauseStarter entry | `/bridge/new` | Cause Edit → Mediator fields |
| LLM role | Wording proposals / critique | Ongoing synthesis from beat context |

## Still missing in the editor (do not paper over)

These are product gaps, not “add a chat”:

- Discoverability: bridge writing is on a cause’s **Bridges → Create a bridge**. Home does not start a cluster.

Settled in the editor (see [the-other-cause.md](./the-other-cause.md)): paste a cause link; **this side is not a cause yet — start a thin sliver**; skip modified on a stand-in only (not on a published parent); `draft-stand-in-sliver`; near-duplicate suggestions from causes already on the device; local seed includes a secular-conservative cause; parent seed from Create a bridge survives reload; warn when the connected wallet owns a parent cause.

## Checks

- `npm test --workspace=@commonality/cause-assist`
- `npm test --workspace=causestarter -- src/lib/bridgeAssistBrief.test.ts src/lib/bridgeCluster.test.ts src/lib/nearDuplicatePlanks.test.ts src/components/BridgeClusterAssist.test.tsx`

After changing cause-assist HTTP, rebuild the Compose service (`docker compose build cause-assist && docker compose up -d cause-assist`). Vite on `:5174` picks up the SPA without that rebuild; the propose/critique buttons need the new process.
