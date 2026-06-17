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

2. **A sensible default for non-tech-savvy creators — embed, don't build.** A per-project forum-with-comments-and-messaging is a genuinely large subsystem, and we should **not** build one natively. Instead, offer a default by embedding an off-the-shelf, per-project-scoped discussion widget so a creator who pastes nothing still gets a working updates-and-comments surface. Candidate systems (decision deferred — see the inbox item):
   - **Giscus / Utterances** (GitHub Discussions / Issues-backed): trivial embed, free, but assumes a GitHub account.
   - **Cactus Comments** (Matrix-backed) or a linked **Matrix / Discord / Telegram** room: friendlier for normie discussion + messaging.
   - **Discourse**: heavier, but a single hosted instance with a category-per-project is the closest match to "micro-blog + comments + messaging" if we ever want it hosted.

   The product requirement is that it auto-scopes per project and requires **zero configuration** from the creator.

## Does this deserve its own entry point?

No. It's a per-project surface (a field plus an embedded widget on the project page), not a new mechanism or domain. It lives inside the existing project page and project-creation flow.

## Sequencing

- **Now / MVP:** the first-class `updatesUrl`/`links` field, surfaced in project creation and on the project page.
- **Soon after:** choose and wire up one default embedded discussion system (see inbox), make it one-click in the project-creation UI.
- **Not planned:** anything trustless or natively-built. If demand ever forces a richer native discussion system, reconsider — but retroactive funding means it's rarely the bottleneck.
