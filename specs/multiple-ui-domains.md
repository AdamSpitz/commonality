# Multiple UI domains

When people ask me "what have you been building?", or when trying to structure the [user-facing documentation](./docs/user-docs.md), it kinda seems like the right answer is NOT to describe this whole Commonality system in full generality, but rather to describe particular early use cases that feel compelling (and different ones will be compelling to different people).

So it may be that we're better off treating "Commonality" as backend infrastructure rather than "here's our big website called Commonality!" It can still have its own website, but the main thing we point people to should probably be sites like noninflammatory.xyz (or noninflammatory.eth.link) and common-sense-majority.eth.link, both of which say "built on top of commonality.eth.link".

Can we make sure that our UI code is structured in such a way that it's easy for us to build several entry points like that?

(This fits the existing UI direction in [ui/README.md](/ui/README.md), which already treats the frontend as several logical apps rather than one undifferentiated surface.)

Let's have the UI code build several different artifacts from the same code base. Different branding, different landing page, different routes, etc. (e.g. The noninflammatory-content site can focus just on content contracts, not on arbitrary pubstarter contracts.) But they can still use the same sdk code and dependencies and lower-level UI primitives and so on.

## AI's thoughts

### Naming: "Content Funding" vs "Noninflammatory Content Funding"

I'd lean toward the site being "noninflammatory content funding" (at noninflammatory.xyz or similar), not generic "content funding." Reasons:

The whole point of multiple-ui-domains.md is that you show people a specific compelling use case, not the general infrastructure. "Content funding" is infrastructure-speak. "Noninflammatory content" is a thesis people can get excited about (or argue with — which is also fine).
A generic "content funding" site would need to explain why content gets funded, which immediately leads to "well, it depends on the attester criteria..." — too abstract for a landing page. The noninflammatory framing gives you a concrete story: political content that doesn't antagonize deserves funding; here's how.
If later you want a content-funding site for a different evaluation criterion (e.g. "educational content," "investigative journalism"), that becomes another domain — which is exactly the multiple-UI-domains vision.
That said, the UI should still make it clear this is "content funding for noninflammatory political discourse" — not just "noninflammatory" with no context.

### What the Landing Page Looks Like

The landing page needs to accomplish three things fast: (1) explain the problem, (2) show the mechanism, (3) give a clear call to action. Rough structure:

Hero section:

"Political content that informs instead of inflames — funded by you."

Short paragraph: Inflammatory content gets clicks and ad revenue. Thoughtful content that takes opposing views seriously gets ignored. We fix that with crowdfunding.

Two CTAs: "Browse Content" | "I'm a Creator"

How It Works section (3 steps, visual):

Creators publish. Writers, YouTubers, podcasters publish political content that communicates perspectives without antagonizing disagreers.
AI attesters evaluate. Independent AI services score content on dimensions like steelmanning, contempt, tribal signaling — not on whether the ideas are "correct."
People fund what they value. Buy tokens for specific pieces of content you think deserve support. If the funding threshold is met, the creator gets paid. Your tokens are tradeable.
Featured content / recent activity section:

Show a few recently-funded or recently-attested pieces of content across platforms (Twitter, YouTube, Substack). This makes the site feel alive, not theoretical.
"Why this matters" section (brief):

The insight from seed-statements.md — people across the political spectrum can independently arrive at wanting this. A progressive and a conservative both benefit from content that doesn't demonize.
Footer: "Built on Commonality" — link to the general infrastructure for people who want to understand the plumbing.

### What the Site Contains

Beyond the landing page:

Browse content by platform — the existing /content/:platform routes. Twitter, YouTube, Substack tabs. Show attested content with attestation summaries. Sort by: recently funded, most funded, newest, "most noninflammatory" (highest attestation scores).

Individual content/channel pages — the existing /content/:platform/:channelId routes. Show the creator's attested content, active contracts, funding status.

Create a contract — the existing /content/:platform/:channelId/new flow. But scoped: when creating a contract on this site, the implicit framing is "this content is noninflammatory and worth funding." The creation flow can surface relevant attestation data.

Creator dashboard — the existing /content/dashboard. Verification flow (claim your channel), see your contracts, earnings, etc.

View a contract — Yes, I think the site should include contract viewing, not punt to pubstarter. Reason: if someone shares a link to a content contract on noninflammatory.xyz, it should resolve on that domain with the right branding and context. It would be jarring to redirect to a generic pubstarter site. The content contract view page is just a specialized version of the pubstarter project detail page anyway — show the content items, funding progress, attestation summaries, and the ability to contribute.

"About" / explainer page — What "noninflammatory" means (the evaluation criteria from the spec). Not about correctness or politeness — about whether people who disagree can engage without defensiveness. Explain the attester model (multiple perspectives, disagreement is informative).

Attestation transparency — A way to see which attesters evaluated a piece of content and how they scored it on each dimension (steelmanning, contempt, ad hominem, tribal signaling, emotional manipulation). This is important for credibility. Maybe this is just part of the content/channel pages rather than a separate section.

### What the Site Does NOT Contain

Conceptspace / statements / implication graphs — This is the backbone of the broader Commonality system, but it's too abstract for this site. The noninflammatory site doesn't need to show you "statement S1 implies statement S2." If users want to explore the implication structure, they can go to the Commonality site.

Pubstarter (generic crowdfunding) — No "browse all projects" or "create any project." This site is only about content funding.

Funding portals / causes — The funding portal concept (projects aligned with causes) is a Commonality-level feature. The noninflammatory site is itself essentially one focused funding portal.

Delegation / delegatable notes — Infrastructure-level feature, not relevant to the content-funding UX.

Mutable refs — Internal infrastructure.

Subjectiv trust graph management — The trust graph operates underneath (filtering which attestations you see), but users shouldn't need to manually manage trust declarations on this site. If trust management UI is needed, it can be a lightweight "settings" thing, not a primary section.

Multi-currency selection or crypto wallet management — Keep the crypto as invisible as possible. Ideally the site eventually uses embedded wallets so creators and funders don't need to think about Ethereum at all.

### Open Questions for You

Does the site show all content-funded content, or only content that has received noninflammatory attestations? I'd lean toward showing everything that's been submitted for content funding on the relevant platform deployments, but highlighting/prioritizing attested content. Otherwise you need a separate site for "content funding without the noninflammatory angle."

Who are the primary attesters on this site? The spec describes three personas (neutral, left-leaning, right-leaning). Are these all visible by default, or does the site start with one and expand?

Should the landing page lean into the political angle explicitly, or keep it softer? The spec is very clear that this is about political discourse. But "political" can scare people off. The alternative is leading with "content that bridges divides" and letting the political specifics emerge as people browse.

"Built on Commonality" — how prominent? A small footer link? A visible badge? This affects whether the site feels like its own thing vs. a subsection of a bigger platform.

