# Volunteer discovery (speculative)

**Status:** speculative — consider doing this, not committed.

## The gap

The system currently has two sides of the funding coin: *pledge money toward a cause* and *start a project that asks for money*. It has nothing for the population in between: people who would *work* on something but aren't ready to lead a project and aren't (just) looking to give money. That's a real gap — starting a project is intimidating partly because the would-be leader has nobody lined up to help — and it's also a missing navigational signal. We'd like to be able to show "this cause+location has lots of energy" or "this cause has pledged money but no projects and no apparent workforce."

We don't want to build a volunteer-management subsystem. The world already has a huge pile of tools for this (VolunteerMatch, Idealist, Catchafire, Mobilize, Meetup, Discord/Slack, mutual-aid Signal groups, church/civic networks, AmeriCorps, CrisisCleanup, GitHub for OSS, etc.). Reinventing any of it would be a waste, and the trust/identity those existing systems carry isn't transferable anyway.

What we *can* usefully do is **link out to where the activity already lives** and surface a little metadata about it, so the system becomes a router into the existing ecosystem rather than a competitor to it.

## Design constraint: costless signals attract abuse

The hard part is anti-abuse. "Add a chatroom link" or "tick a box that says I'll volunteer" cost nothing, which means anyone can spam them: link an unrelated Discord, inflate a count, etc. Pledges and projects self-police because they cost real money or real reputation. Volunteer signals don't have that property natively, so we have to either (a) inherit skin-in-the-game from a costly action that's already happening, or (b) verify externally against a source that's hard to fake.

## What to build first

Four mechanisms, in roughly increasing implementation effort:

### 1. Plain link + AI relevance attestation

Any project (or perhaps any sufficiently-specific statement) can have one or more external links attached: chatroom, Meetup group, org website, GitHub repo, mailing list, whatever. An LLM fetches the linked page and judges whether it's plausibly about this cause+location+statement. Stores a relevance score and a short justification.

This doesn't verify activity; it kills the "link to unrelated content" attack. Cheap, day-one coverage, doesn't require the destination to cooperate at all.

UI: show the link with a small "AI-checked: relevant" badge (or warning style if low confidence).

### 2. Public-widget / API readers for the platforms that matter most

Many platforms already expose unauthenticated activity data. We read it server-side and display ground-truth numbers:

- **Discord** — server widget (`/widget.json`) gives member count and online count.
- **Meetup** — public group APIs for members, upcoming events, RSVP counts.
- **GitHub** — stars, contributors, recent commit activity. Very hard to fake at scale.
- **Open Collective** — backers, money raised.
- **Mobilize.us** — open API for shift signups.
- **Eventbrite**, **Patreon**, **Mastodon nodeinfo**, **Substack** (where exposed).

This probably covers a large fraction of where real volunteer activity already lives, with zero cooperation needed from the destination.

UI: display the live count next to the link, with a "last verified" timestamp. Stale data should look visibly stale.

### 3. Bilateral pinning for the "verified linkage" badge

To get an elevated "verified link" badge in the UI, the destination must place a small token in its public metadata — e.g., a string in the Discord server description, a `<meta>` tag on the homepage, or a DNS TXT record. We read it and confirm the linkage is consensual.

This is the Google-Search-Console pattern. It costs the destination almost nothing, but defeats drive-by linking to groups that didn't agree to the association.

### 4. AI-suggested existing groups for new statements

When a user creates a sufficiently-specific statement (or project, or cause+location), an LLM proactively suggests existing orgs/groups that already work on this and offers to attach them as links. "There's already a Portland Watershed Council that seems aligned with this — link to them?"

This is high-leverage: it reduces fragmentation (new energy gets routed into existing real organizations instead of spawning ghost-projects), it helps newcomers find where the action already is, and it gives our system a useful editorial role without building any of the destination infrastructure ourselves.

## Work-pledges and work-requests, filtered by the trust graph

**Status of this section:** the first slice below is what we are building. The rest of this file (external links, widgets, pinning) stays speculative.

Linking out covers energy that already lives elsewhere. It does not cover two in-system signals that would help a cause board gather momentum quickly:

- **Work-pledge (supply):** "I'd help with this cause, and these are my skills." No project idea required. That is a much lower bar than proposing a project.
- **Work-request (demand):** "We could really use someone who can do X." It might come from a project, from a [work request](fundable-work-requests.md) ("roles needed" alongside money offers), or from someone who would do part of the work or give money but needs someone with other skills.

Both are free to post, so both attract fake support, honest or malicious. The defense is the same one Aligning already uses: the [Subjectiv trust graph](../tech/subsystems/subjectiv/README.md).

### Reuse the existing trust graph, not a separate one

Use the same `TrustRegistry` arrows used for alignment attestations.

- Users barely curate one trust list (see [alignment anti-abuse](alignment-anti-abuse.md)). A second graph would stay empty.
- The question is close enough. Alignment trust asks whether you trust this person's judgment and good faith about this cause. Work-pledges and work-requests ask whether this is a real person acting in good faith, which is a subset of that question.
- If finer scoping is needed, use the *domain-scoped trust* idea from alignment anti-abuse (scope by cause), not a per-feature graph.

Trust vouches for the author, not the claim. A trusted person's skill claim is still only a claim. The invite-and-reply history below covers that.

### Two-tier display

Show work-pledges and work-requests in two sections: **from your transitive trust network** and **from others**. Content outside your network is shown separately, not removed. Early on, a little-known cause has a thin trust network but probably little spam, so the second tier is useful. If spam grows, people build out the trust graph and rely on the first tier more. This is the "widen the net" control from alignment anti-abuse (my network → +1 hop → anyone), shown as two sections.

Details:

1. **Default trust seed.** Logged-out and new viewers have no network, and they are most early traffic. A cause board or vertical site uses its operator's or curators' trust as the default seed until the viewer has a network of their own.
2. **Headline numbers count only the first tier.** Show "14 helpers in your network, 30 others", never a combined 44. Spam can grow the second tier without inflating the support claim.
3. **Gate contact more strictly than display.** The real harm from spam is an inbox flood. Matching notifications ("a request on this board needs a skill you listed") and relayed messages go only to and from in-network authors by default. Out-of-network contact is opt-in. Contact goes through a relay; don't publish wallet-to-skill linkage.
4. **Cheap floors for the second tier**, to catch a targeted first wave before a graph exists:
   - posts expire (for example after 90 days) unless reaffirmed with one click;
   - the author must have signed the statement;
   - a per-identity rate limit;
   - the AI relevance check from mechanism 1;
   - a hide button that feeds negative-trust propagation (alignment anti-abuse);
   - operator policy-bundle hiding.
5. **Lean on implicit trust.** Signals like "you signed statements by them" and "you funded via their delegation" (alignment anti-abuse) matter more here, because nobody will curate a graph just to see volunteers.

### Shape of the data

A work-pledge or work-request is its own published record. It *references* a statement. It is not bundled with a signature, a money pledge, a project, or a [request for work](fundable-work-requests.md). Those are different acts and different documents; bolting a skill offer onto a signature would force people to endorse a statement in order to offer help, and would overload a record that means "I believed this."

Naming: keep **work-pledge** and **work-request** here. Do not shorten them to "request" or "offer" — those words already belong to requests for work and funding offers.

- **Work-pledge:** a few skill tags and one free-text line. "I have this skill and I'm vaguely willing to use it toward this statement." Not a profile, not an hours commitment (see Deferred).
- **Work-request:** the same shape, from the other side. "I want someone with this skill, willing to use it toward this statement." No size, no project link, no co-sign. It shows in the first tier only via its author's trust.
- Each record names exactly one statement. A cause board unions the records of its statements.

### How someone finds out, without a notification system

The harm from free posts is an inbox flood, and publishing "this wallet has this skill" is a list we should not build. Do not add email, push, in-app messages, or match digests until there is evidence people post these and want to be reached.

Until then, finding out is a human action on the board:

1. **The board is the index.** Skill tags line pledges up against requests. A person who offered grant writing sees the request for grant writing in the same section, and the other way around. This assumes people come back; it is not a delivery channel.
2. **A copyable announcement, not a message.** Next to a match, copy a short note the viewer can paste into whatever channel they already use. Commonality routes; it does not become the inbox.

Contact details are out of this slice. When they are needed, show an author-chosen handle only to in-network viewers. A relay for strangers comes later, if at all.

### Emphasize matches over counts

A soft labor pledge is mainly routing information, not proof of support. Fake entries hurt counts far more than they hurt matching. Lead with matches ("this request needs grant writing; 4 in your network offered that"). Keep raw pledge counts secondary, and never add the two tiers together.

### First slice (building this)

1. A work-pledge record and a work-request record: skill tags, one free-text line, one statement reference. Author is the publisher. Retract by retracting the publication.
2. A two-tier view on the cause board (in your network / others), seeded by the operator trust root until the viewer has their own network. The viewer counts as in-network for their own posts. Headline numbers count only the first tier.
3. Match lines by shared skill tag, and a button that copies a short announcement.

Not in this slice: hours bands, expiry and reaffirmation, contact fields, notifications, invite/reply history, links to projects or requests for work, the cheap anti-spam floors (rate limits, AI relevance, hide button). Add those when real posts show they are needed.

Later, if the crude version holds up: labor offers that name both sides ("I'll do the permitting if someone does the design"), co-sign backing, and public counts.

## Deferred / explicitly not building

- **Formal volunteer profiles** ("I have skills XYZ, N hours/week available"). Too costly to fill in, decays fast, attracts low-quality data, and the structured fields aren't what makes a person actually show up. The lightweight work-pledge above (a few tags, expiring) is the intended substitute. If a richer need emerges, revisit.
- **A `.well-known/commonality-activity.json` open standard.** Appealing but premature; standards die without adoption. Revisit once enough destinations would plausibly publish it.
- **Bonded activity attestations** (stake money against a claim). Probably too heavyweight for the small signal it would provide.
- **Anything that competes with the destinations themselves** (in-system chat, shift scheduling, RSVPs, etc.).

## Open questions

- **How much does external activity actually correlate with progress?** A Discord with 5,000 idle members is worse signal than a Meetup with 30 people who actually show up every Saturday. The metrics that survive scrutiny are probably *event-RSVP* and *recent-commit-style* signals — things that imply someone *did* something recently — not raw member counts. Display weights should reflect this.
- **Where do volunteer signals attach: project, statement, or cause+location node?** Attaching to projects is simplest but fragments across many projects. Attaching to a cause+location aggregates better but has weaker editorial control. Probably both, with care to avoid double-counting.
- **Should pledgers be able to flag "I'd also help hands-on" on their pledge?** This is the cheapest "real" volunteer signal we could collect — it inherits all the anti-abuse properties of the pledge itself. Probably worth doing in addition to the external-link strategy, not instead of it. (Now folded into the work-pledge design above.)
- **What does a statement signature cost a spammer?** Work-pledges inherit that cost. If signatures are cheap, the trust tiers and invite history carry most of the defense.
- **Proposal vs. real project.** A separate "this is a proposal, not yet asking for money" project state would give would-be leaders a place to gather interest before committing to an assurance contract. Possibly orthogonal to volunteer-discovery, possibly the same feature seen from another angle.

## Why this is worth considering

The headline value isn't volunteer recruitment per se — existing tools do that fine. It's **a navigational signal at the cause+location level**: where is the energy? Where's pledged money sitting with no projects? Where are there active groups with no funding pipeline? That heatmap is something nobody currently provides, and our system is unusually well-positioned to assemble it because we already have the cause-and-location structure that would key it.
