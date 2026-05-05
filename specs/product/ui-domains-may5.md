# Multiple UI Domains

Rather than presenting the whole system as one big website, we present several focused sites, each compelling to a different audience. When someone asks "what have you been building?", the right answer isn't the general-purpose infrastructure — it's whichever specific use case will resonate with that person.

For the technical implementation, see [specs/tech/ui-domains.md](../tech/ui-domains.md).

## Status (May 5, 2026): not quite right, need to tweak it

Yesterday we [reorganized the UI domains](specs/product/ui-domains-may4.md), but it's not quite right; I'm keeping that file for reference because we'll need to reshuffle further.

We did a [review of the new-user experience](workflow/reviews/new-user-experience-assessment-2026-05-04.md) after doing that reorganization, and it came out pretty bad.

## Trying to talk this out with AI

> Help me think it through: am I *right* in thinking that Commonality should (only) be infrastructure for a movement of founders who'll spin up vertical sites? Or can it still work as a user-facing site? I'm not actually sure whether that idea is right or not.

Honest answer: I think you're **mostly right, but it's a sequencing question, not an either/or.**

**The case that you're right (now):**

- You said it yourself — you don't have a compelling general consumer story. Block-party is just Kickstarter; defunding is niche; research-funding is narrow. The compelling stories already *have* their own sites (CSM, Noninflammatory). That's not an accident — it's evidence that the vertical is the natural unit of consumer pitch.
- "Fund public goods" as a consumer pitch competes head-on with charities, GoFundMe, Patreon. The differentiators (assurance contracts, delegation, retroactive funding) are mechanism-level, not visceral. Mechanism-level differentiators land with founders, not casual donors.
- Realistic cold traffic to commonality.org today is crypto-curious / builder-type / movement-curious people who heard about it on Twitter. That's already closer to founder-flavored than to ordinary-donor. You don't have ordinary-donor traffic to lose by repositioning.
- Horizontal-platform-with-vertical-apps is a well-trodden shape (Stripe, Shopify, Substack). Those platforms generally don't try to also be a consumer brand and they're stronger for it.
- Trying to be both right now is exactly what produced the schizophrenia the reviewer flagged.

**The case against pure infrastructure:**

- Long-tail use cases will never justify their own vertical. A neighborhood block party isn't getting a SaaS site. Someone has to host the long tail, and that's naturally Commonality. So the consumer surface can't be *zero* forever — it just shouldn't be the front door yet.
- The vision-and-strategy doc isn't written as a developer pitch. "Civilizational competence at producing public goods" is a believer/citizen argument. If you go pure infra-for-devs, you risk filtering out the believer-citizens whose enthusiasm bootstraps the movement in the first place. (Founders are downstream of believers — they need to think there's a there-there.)
- "Movement" and "infrastructure" aren't incompatible. Stripe pitched itself as infrastructure but had a movement-flavored frame ("increase the GDP of the internet"). The right framing for Commonality is probably similar: a *movement* to upgrade public-goods funding, whose primary call to action today is "build a vertical / join the founders building verticals," with citizen-facing use coming through those verticals (and eventually through a long-tail surface on Commonality itself).

**My recommendation:**

Phase 1 (now): Commonality positions as **the movement + the substrate**, with the primary CTA aimed at founders/organizers. The sibling sites become *case studies / proof the substrate works*, not competing front doors. The vision-and-strategy narrative still belongs on the site — it's what convinces a would-be founder that the movement is worth joining — but the action it asks for is "start something" not "donate to something."

Phase 2 (after one or two verticals get traction): re-introduce a consumer surface for the long tail, anchored on real success stories from the verticals. By then you'll have stories worth leading with.

The thing I'd warn against: framing it as a *devtool* (API, SDK, integration). That'll filter out the movement-curious. The right register is closer to *"here's a substrate and a movement — pick a public good you care about and use this to fund it, or start a vertical site organized around a specific quality you want to promote."* That keeps citizen-believers in the tent without pretending you have a polished consumer funnel you don't have.

So: yes, infrastructure-for-founders is the right primary framing today. But hold the door open — don't paint the site as developer-only, because the believer-citizen audience is what makes founders show up.


> To what extent is this a "shallow" problem that mostly just affects the landing pages? Like... we've already got Tally as the "here's where people sign statements and you can see how many people support a statement"; that core functionality lives there and doesn't need to live on the other sites (because I think it's fine if the other sites just link to Tally's "show this statement" page rather than the other sites needing to have their own rebranded "show a statement" page). Similarly, it would be easy to also have the core functionality for assurance contracts live on its own dedicated site (what I was previously calling "Pubstarter" - in my head it was "public goods kickstarter" - but it's a lousy name; maybe it *should* be the one we call "Commonality", I dunno). Same with the funding portals, or maybe those are part of pubstarter, whatever. My point is that this question of "who do we position it for?" feels to me like it's a bit silly because honestly the problem doesn't sound that deep - the core functionality can live wherever it lives, and then we can have lots of thin landing pages: the landing page for founders who want to start a vertical, and the landing page for long-tail users (which might not be that compelling at the moment but it's better than not having that landing page at all). It's not that much extra work to make a second landing page, and the "how do I use it?" docs for normal users need to exist anyway.

Yeah, you're largely right and I was over-thinking it. Two nuances worth keeping in mind, but they're nuances, not refutations:

**1. The only genuinely scarce resource is the bare URL.** Multiple landing pages are cheap; `commonality.org/` is not — it has to do *one* job. The current page is bad because it's trying to do three. Once you've split into `/for-founders` and `/for-donors` (or whatever), the question becomes "what does the bare URL show?" That's still a real choice, but it's a much smaller choice than "what is Commonality positioned as?" — it's basically "which audience is the largest fraction of cold traffic, send them there, give the others a clear nav link."

**2. The Pubstarter rename actually resolves a lot.** If "Commonality" becomes the assurance-contract / funding product (your old Pubstarter), it stops trying to be the umbrella and gets a clear job: people funding and seeking funding for public goods. Then:
   - The "movement" framing becomes manifesto/docs material, not landing copy.
   - The sibling sites become genuine siblings, not children that need to be disambiguated from the parent.
   - The founder pitch ("start a vertical on this substrate") becomes one secondary page, not a competing identity for the whole site.
   - The umbrella, if it needs to exist at all, can just be a `/docs` or footer link — it doesn't need its own polished landing.
   
   That's structurally cleaner than what's there now, and it might be the highest-leverage move on the table — bigger than any landing-page rewrite.

**One small caveat on the "long-tail donor landing is fine even if uncompelling":** agreed it's better than nothing, but be honest with yourself that until there are real projects with real activity to browse, it'll feel empty in a way that hurts more than helps. So either make sure there's *something* live to point at before that page gets traffic, or keep it deliberately minimal ("early — here's what's coming") rather than trying to make it look like a working marketplace.

But the core of your instinct — "this is shallow, just make more thin landings, the architecture is fine" — I think is right. The reviewer (me) treated a copy/IA problem as a strategy problem.


> Okay, let's try this: we'll add a new top-level domain called Pubstarter (for the individual assurance contracts - I'm having trouble coming up with a better name), and another called Alignment (that's the funding portals site), and then let's have Commonality be the site for the movement, with the founder pitch ("start a vertical on this substrate") as a secondary page on Commonality. Write up this reshuffling plan in specs/product/ui-domains-may5.md, and put a description of the final result that we're aiming for in specs/product/ui-domains.md (so that future fresh LLMs who don't care about the history of the reshufflings can just read that file to understand what domains we have).

---

## The plan

Split the old "Commonality" site into three: two new product sites (Pubstarter, Alignment), and a narrowed-down Commonality that's pure movement + founder pitch.

### New: Pubstarter — individual assurance contracts

The product surface for creating, browsing, pledging to, and tracking individual assurance contracts. "Public-goods Kickstarter" is the mental model. (Name is provisional.)

Audience: project creators and one-off pledgers.

Contains:
- Contract creation flow.
- Browsing/searching contracts (less important, but if we have it implemented then this is where it lives).
- Individual contract pages (pledge, view progress, refund logic).
- Retroactive funding (i.e. these are assurance contracts where you can resell your donation receipts).

Needs to contain some "how do I use this?" docs, but doesn't necessarily need a super-compelling landing page; this is a user-facing site but the motivation for it is coming from other sites like Commonality or CSM. The main pitch on the landing page is "crowdfunding but also you can sell your shares (retroactive funding) and also each project's leaderboards show the delegation chain" (obviously rephrase that to be punchier). It's a better Kickstarter, not a whole movement.

### New: Alignment — funding portals + delegation + (maybe) scouts

The product surface for ongoing funding flows: portals organized around statements/causes, delegation, and scout activity that surfaces and evaluates projects.

Audience: donors who want continuous giving rather than one-off pledges, delegates, scouts, and the orgs/causes that operate portals.

Contains:
- Funding portals (browsing, creating, contributing).
- Delegation UI. (Or does that need its own site? Sigh...)
- Scout-facing tooling and scout-activity views. (Wait, I'm not sure what this means. Might be using the term "scouts" to mean something different from what we meant in the retroactive-funding ecosystem.)
- Statement-anchored "alignment" attestation flows (since portals route money based on alignment with the portal's anchoring statement).

(Content Funding contracts are still a specialized kind of assurance contract — "built on Pubstarter" rather than "built on Alignment," because they're contract-shaped, not portal-shaped.)

Just like Pubstarter, needs to contain some "how do I use this?" docs, but doesn't necessarily need a super-compelling landing page. The idea is "aggregator for projects aligned with a cause".

### Commonality — narrowed to: the movement, plus the founder pitch

Pure movement site for internet-age coordination on public-goods funding. The `docs/vision-and-strategy/` narrative and `pitches.md` live here. The funding *tools* are no longer on this site — they're on Pubstarter and Alignment, which Commonality links to as concrete instances of what the movement is for.

A secondary page carries the **founder pitch**: "you can build a vertical on this substrate — here are the verticals already built (CSM, Noninflammatory Content, Content Funding), here's how to start one."

Movement-first homepage; founder pitch as a clearly-linked secondary page; long-tail consumer use happens on Pubstarter / Alignment directly, not via Commonality.

### Migration of pieces from old Commonality

| Was on Commonality | Goes to |
|---|---|
| Assurance contracts (creation, browsing, pledging) | **Pubstarter** |
| Retroactive funding | **Pubstarter** |
| Funding portals | **Alignment** |
| Delegation UI | **Alignment** |
| Scouts | **Alignment**? actually I'm not even sure what this means, "scouts" just means "someone who buys tokens early and hopes to resell them for a profit later" |
| Vision-and-strategy narrative, pitches | **Commonality** (unchanged) |
| Founder/"start a vertical" pitch | **Commonality** (new secondary page) |
| "Related product sites" grid on the landing | Removed from prominent placement; lives in nav/footer or on the founder-pitch page as case studies |

### Downstream effects on other sites

- **Content Funding** was "built on Commonality" → now "built on Pubstarter".
- **CSM** used Commonality for funding movement projects → now uses Alignment (portals for ongoing funding) and/or Pubstarter (one-off projects).
- **Noninflammatory Content** still built on Content Funding; unchanged.
- **Tally** unchanged; still built on Conceptspace.
- The "ecosystem directory" job that Commonality's landing was awkwardly carrying is gone. Cross-site disambiguation, if needed, lives on the founder-pitch page or in nav/footer — not as a grid on every landing.

### Open question: the name "Pubstarter"

Working name, not final. Options:
- Keep "Pubstarter" — descriptive, slightly silly, sticky.
- Rename Pubstarter to "Commonality" and rename the movement site to something else. (Argued against: "Commonality" reads more naturally as a movement brand than as an assurance-contract product brand, and the assurance-contract product is the thing that most needs a sharp descriptive name.)
- Something new entirely.

Deferred — doesn't block the structural reshuffle.
