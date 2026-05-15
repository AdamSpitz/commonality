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

## Deferred / explicitly not building

- **Formal volunteer profiles** ("I have skills XYZ, N hours/week available"). Too costly to fill in, decays fast, attracts low-quality data, and the structured fields aren't what makes a person actually show up. If a need emerges, revisit.
- **A `.well-known/commonality-activity.json` open standard.** Appealing but premature; standards die without adoption. Revisit once enough destinations would plausibly publish it.
- **Bonded activity attestations** (stake money against a claim). Probably too heavyweight for the small signal it would provide.
- **Anything that competes with the destinations themselves** (in-system chat, shift scheduling, RSVPs, etc.).

## Open questions

- **How much does external activity actually correlate with progress?** A Discord with 5,000 idle members is worse signal than a Meetup with 30 people who actually show up every Saturday. The metrics that survive scrutiny are probably *event-RSVP* and *recent-commit-style* signals — things that imply someone *did* something recently — not raw member counts. Display weights should reflect this.
- **Where do volunteer signals attach: project, statement, or cause+location node?** Attaching to projects is simplest but fragments across many projects. Attaching to a cause+location aggregates better but has weaker editorial control. Probably both, with care to avoid double-counting.
- **Should pledgers be able to flag "I'd also help hands-on" on their pledge?** This is the cheapest "real" volunteer signal we could collect — it inherits all the anti-abuse properties of the pledge itself. Probably worth doing in addition to the external-link strategy, not instead of it.
- **Proposal vs. real project.** A separate "this is a proposal, not yet asking for money" project state would give would-be leaders a place to gather interest before committing to an assurance contract. Possibly orthogonal to volunteer-discovery, possibly the same feature seen from another angle.

## Why this is worth considering

The headline value isn't volunteer recruitment per se — existing tools do that fine. It's **a navigational signal at the cause+location level**: where is the energy? Where's pledged money sitting with no projects? Where are there active groups with no funding pipeline? That heatmap is something nobody currently provides, and our system is unusually well-positioned to assemble it because we already have the cause-and-location structure that would key it.
