# Trust networks

## TL;DR for AI assistants

**What it is:** Each user chooses who they trust. The system computes transitive trust (if you trust A and A trusts B, you see B's attestations). This is how the system filters noise and surfaces relevant information without central gatekeepers.

**When a user encounters it:** When choosing who to trust in settings; when seeing attestations in their funding portal; when understanding why certain projects or content appear (or don't appear) in their feed.

**What they might want help with:** Setting up their trust network; understanding why they're seeing (or not seeing) certain attestations; understanding transitive trust.

---

There's no central authority deciding what's legitimate. Instead, you choose who you trust.

You might trust a few friends, a few public figures in fields you care about, and maybe an organization or two. That's your starting point. Trust is transitive: if you trust Alice, and Alice trusts Bob, then you see Bob's attestations too. This means your trust network grows naturally without you having to evaluate everyone individually.

## Why this matters

The system has a lot of attestations flowing through it — alignment attestations ("project P serves cause C"), implication attestations ("statement S1 implies statement S2"), content quality attestations. Without filtering, it would be noise. Trust networks are the filter.

You only see attestations from people in your trust network. That means the projects in your funding portal, the statement connections in your implication graph, and the content evaluations you see are all filtered through the judgment of people you (directly or transitively) trust.

## No central gatekeepers

This is the alternative to having a platform decide what's legitimate. Different people trust different attesters, and that's fine. Two users with different trust networks will see different views of the system — different projects highlighted, different implication connections, different content evaluations. That's a feature: it means the system doesn't force a single perspective on anyone.

## How this shows up in practice

- You set up your trust network by marking a few people or organizations as trusted. The system computes the transitive closure automatically.
- Everything you see — funding portals, statement pages, project recommendations — is filtered through your trust network.
- You can adjust your trust network at any time. Add or remove someone, and your view of the system updates accordingly.
