# Proof of progress (product)

A low-key way for a project to show that it's actually moving — ongoing updates, evidence of work, and a place for backers to discuss. The product-manager view: why this is deliberately *not* a trustless feature, what to build (almost nothing native), and how to give non-tech-savvy creators a sensible default.

## Why this is deliberately low-tech

It's tempting to reach for something sophisticated, decentralized, or trustless here. Don't. **Retroactive funding already absorbs the trust problem**, so proof-of-progress doesn't have to carry it:

- A donor who doesn't trust the project simply doesn't fund it up front — they pledge retroactively: *"Once it's done, if I can see it produced value, I'll pay $6K for it,"* or *"If you show solid evidence of progress by the halfway point, I'll pay $5,500."*
- An early backer who *does* trust the doer provides the up-front $5K.

So progress-reporting is a **convenience and confidence feature, not a verification mechanism**. It exists to help projects show their work, keep backers engaged, and give the trusting-and-skeptical sides something to point at — but the system's integrity does not rest on it. That framing is what keeps the scope small.

## What exists today

Effectively nothing to build on, which is fine given the small scope:

- A project's metadata is just **name + description**, rendered from an IPFS document via `metadataCid` (see [lazyGiving/ui.md](/specs/tech/subsystems/lazyGiving/ui.md)). A link *can* be pasted into the free-form description, but there's no first-class field for it.
- There is **no comments / microblog / messaging / forum subsystem** anywhere in the stack.

## What to build

Two tiers. The first is small; the second is mostly "embed, don't build."

1. **First-class updates/links field — small, native.** Add a structured `updatesUrl` (or a small `links` list) to project metadata, so a creator can point at whatever they want: a blog, a thread, a repo, a Discord. Open-ended by design. This is a schema + UI addition to the existing IPFS metadata document, **not** a new subsystem. This alone satisfies tech-savvy creators completely.

2. **A sensible default for non-tech-savvy creators — point at a channel they already run.** The default is simply that the `updatesUrl` field is **first-class and prominent** in project creation: the creator pastes a link to a channel they already control and moderate (X, Substack, a blog, YouTube, a GitHub repo, a Discord). That's the whole default — no hosted discussion system.

   **Decision (2026-06): do not host an open comment system.** We considered embedding an off-the-shelf, per-project-scoped comment widget (Giscus/Utterances, Cactus/Matrix, Discord/Telegram, Disqus/Hyvor Talk/Cusdis, or a native wallet-identity comment store). All of them were rejected as the default for one decisive reason: **an open "anyone can comment" surface on a civic/political-adjacent platform is a spam-and-abuse magnet that we would own and have to moderate forever.** Pointing at a channel the creator already runs solves the two hard problems for free — **posting permissions** (it's their account; they decide who posts) and **moderation** (the host platform owns spam/abuse, not us) — while staying normie-readable and requiring zero hosting, zero new identity system, and zero moderation liability on our side.

   Notes on the rejected paths, for the record:
   - Wallet/Ethereum-address identity (XMTP, Push, a native store) was rejected because commenters are normies who shouldn't need a wallet just to comment, and because those protocols are *messaging*, not public per-project threads.
   - Self-hosting anything (Discourse, a Matrix/Cactus homeserver) was rejected: we don't want to run it.
   - An **opt-in** hosted comment widget for creators who explicitly want on-page comments (and accept moderating them) is *not pursued for now* — revisit only if creators ask.

   The product requirement remains that the default auto-scopes per project and requires **zero configuration**: a pasted link satisfies that trivially.

## Does this deserve its own entry point?

No. It's a per-project surface (a field plus an embedded widget on the project page), not a new mechanism or domain. It lives inside the existing project page and project-creation flow.

## Sequencing

- **Now / MVP:** the first-class `updatesUrl`/`links` field, surfaced prominently in project creation and on the project page, presented as a plain link. This *is* the default discussion solution — no separate system to wire up.
- **Maybe later:** render the linked channel's latest posts **read-only** inline on the project page (X/RSS/Substack feeds embed fine), so backers see recent progress without leaving — owner-controlled, no moderation surface we own. Deferred; a plain link ships first.
- **Not planned:** any hosted/open comment system, anything trustless, anything natively-built. If demand ever forces a richer native discussion system, reconsider — but retroactive funding means it's rarely the bottleneck.
