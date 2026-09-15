# Marketing

## Summary

*Downstream of the founder-first posture — [founder-first.md](../founder-first.md) and [ADR 0005](/specs/decisions/0005-founder-first-verticals.md).*

This directory is the home for **research, positioning, education, and share tooling for causes**. It is not a plan to get strangers to adopt the Commonality umbrella. Current work is the [plan](./PLAN.md); current repo [focus](/focus.md) includes this as a second item.

## Files in this directory

| File | What it is |
| --- | --- |
| This page | Orientation: why “marketing” is the wrong single word, and how the pieces split |
| [PLAN.md](./PLAN.md) | Sequenced work: demo room → friend walkthroughs → share artifacts → vertical content |
| [posture.md](./posture.md) | Who we market to, what we refuse, founder recruiting vs Civility/CSM GTM |
| [friend-walkthroughs.md](./friend-walkthroughs.md) | Script for showing testnet to real people before we want users |
| [memes.md](./memes.md) | Slogans, tone, cause-flavored share artifacts (not umbrella virality) |
| [notes.md](./notes.md) | Anonymized patterns from walkthroughs (fill as sessions happen) |

Related, still elsewhere because they are product/docs not GTM:

- [how-to-convey-this.md](../how-to-convey-this.md) — landing: people map us onto petitions / Kickstarter / parties
- [new-user-experience.md](../new-user-experience.md) — in-product first session
- [activating-a-cause](/docs/founder/activating-a-cause.md) — organizer playbook: recruit jobs, not members
- [CSM elevator pitch](/docs/end-user/common-sense-majority/elevator-pitch.md)
- [fake-data PLAN](/fake-data-generation/PLAN.md) — seed/demo as *teaching*, not just tests
- [user-docs](/specs/user-docs.md) — stories first, no crypto jargon

Old path `specs/product/marketing.md` is a stub that points here.

---

## The word “marketing” is doing too many jobs

What we actually mean is four different crafts. Using their names keeps the work from collapsing into “make it viral” or “we have no users so we failed.”

| What we mean | The usual name | Do it now? |
| --- | --- | --- |
| Do friends get it? See a role? Map it onto *their* interest? | **Qualitative research** (comprehension + desirability) | **Yes** — that’s the next real move |
| Can they finish a task in the UI? | **Usability testing** | Only after wallets aren’t the whole session |
| Who is this for, vs Kickstarter / petition / party? | **Positioning** | Already started in [how-to-convey-this.md](../how-to-convey-this.md) |
| How does a *cause* reach people who already care? | **Go-to-market (GTM)** | Per vertical / organizer, not for the umbrella |
| Catchy images and clips | **Share artifacts / social objects** | Product work for organizers; not a Commonality meme page |

**ICP** (ideal customer profile) for the platform = someone who would otherwise have to found an org (a vertical founder, or a cause organizer who might become one). For Civility/CSM: people already in those movements. Not “everyone who might fund a public good.”

**JTBD** (job to be done) = the useful job they already wanted: “pledge $20/month without running a grant program,” “scout work,” “vouch that it delivered,” “share with people I trust.” “Adopt Commonality” is not a job.

**Acquisition vs activation:** acquisition = they heard of you; activation = they did one useful thing. We are nowhere near optimizing acquisition. Testnet + no real users is the right altitude for research, not ads. We are not failing at growth; we have **no offering a stranger should acquire**.

**Social object / share artifact:** the thing people actually forward is a *cause page*, a statement, or a one-job ask about *their* issue — not a brand anthem. The product should mint those for organizers.

**Growth loop:** organizer shares cause → believer shares a role-link → new person does a job → board looks more real → easier next share. Distinct from a one-shot campaign.

**Empty-room problem:** a board with no activity looks fake. Seed data and the first three real contributions exist to make the next pitch concrete.

If you remember only one split: **research now, GTM later, and GTM is always for a cause, never for the substrate.** Full posture: [posture.md](./posture.md).

---

## What we already decided (do not reopen casually)

- Umbrella end-user marketing is **out**. Founder-first is frozen in ADR 0005.
- Civility and Common Sense Majority **do** get end-user GTM, because we run those verticals as reference implementations whose job is also to recruit other founders.
- People do not care about Commonality; they care about their causes. Share tooling must be **cause-flavored**. Commonality branding on a believer’s meme is a mistake.
- Legal: no profit-expectation copy. Reimbursement and refunds, not “get in early.” See [legal/securities](../legal/securities.md).

---

## Mapping the original questions

**Showing friends the testnet** is problem + comprehension research, not a launch. Goal: can a smart non-insider map the idea onto something they already care about, name a role they would play, and not bounce on wallets or empty boards? Do not optimize for “they created an account.” Protocol: [friend-walkthroughs.md](./friend-walkthroughs.md).

**Documentation comprehensible?** Doctrine already exists ([user-docs](/specs/user-docs.md)). The research question is whether a friend who did *not* write those docs can find the matching story in under two minutes. Comprehension check: they retell the idea without “it’s like Kickstarter but blockchain.”

**YouTube:** do not lead with “how Commonality works.” Lead with a cause they already have a take on, then one mechanism as the punchline. 60–90s, cause-branded end card. Umbrella explainers are founder collateral and wait until walkthroughs show the idea survives contact with a non-author.

**Seed data:** for showing people, only tiny world + real statements + demo seed matter. Mass fake activity looks like spam. A walkthrough needs a 90-second narratable story, several roles occupied, a non-political local public good, and labels that scream testnet / fake money.

**Memes:** forwardable object = their plank, their board, their $20/month ask. Watermark `commonality.works` on that teaches the wrong thing. Details: [memes.md](./memes.md).

---

## What is usually missing (and is missing here)

Standard GTM pieces we have not named. Most stay **unbuilt** until research says the idea lands. Naming them so we don’t confuse “no users” with “forgot Facebook ads.”

1. Landing that matches the ICP (inbox: umbrella landing still recruits generic end users).
2. Open Graph / link unfurls so a pasted cause URL *looks like the cause*.
3. Role-deep links (activating-a-cause invites as URLs).
4. Testnet hygiene for guests (you drive if wallets fail).
5. Consent to keep anonymized quotes.
6. Legal copy on anything that looks like a return.
7. Measurement that is not vanity: restatement, own cause, picked a role — not unique visitors.
8. Optional waitlist of *causes + roles* if people ask unprompted.
9. We do **not** need a growth team, ads, or a meme page for the brand.

Sequenced work is in [PLAN.md](./PLAN.md).
