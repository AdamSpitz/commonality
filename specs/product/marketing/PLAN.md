# Marketing plan (research altitude)

*Hub: [README.md](./README.md). Do not treat this as a launch plan.*

Tell a fresh LLM: **read the hub, then do the next unchecked item in the current phase.** Do not skip to videos, org pitches, or umbrella ads. After three identical walkthrough confusions, stop and fix copy/seed before more sessions.

This plan is the sequenced work for the second [focus](/focus.md) item. Founder-funnel and Red Cross-scale pitches remain on [founder-first.md](../founder-first.md); they are not this focus.

## Exit for this focus (how we know we can drop it)

We can remove this from `focus.md` when all of these are true:

- At least **five** friend walkthroughs logged as patterns in [notes.md](./notes.md) (no real names required).
- The **demo URL** is one page, narratable in 90 seconds, with several roles visibly occupied and a non-political local public good in the seed.
- The top **repeated confusion** has a copy or seed fix landed (or a written decision that we will not fix it yet).
- Cause URLs at least have a **sane title/description** when pasted (OG or equivalent), or a filed product slice if SPA constraints block it.

Videos, meme generators, and founder funnels are *after* that exit, not the exit.

## Phase 0 — Pick the room (Adam)

Decide, in writing here when decided:

- [ ] **Walkthrough URL.** One of: Commonality testnet, Civility testnet, CSM testnet. Default recommendation: Commonality if the friend is “any cause”; CSM or Civility if that *is* their cause. Never a tour of eight domains.
- [ ] **The 90-second story** on that URL (who pledged, who vouched, what got funded or which bridge exists). If it cannot be told without clicking six tabs, seed is not ready — go to phase 1 before friends.
- [ ] **Guest path.** Adam drives the browser unless sponsored/email login is already boring. Record which.

Until these three boxes are checked, do not schedule strangers. Friends who already know the project can still do a dry run of the [script](./friend-walkthroughs.md).

## Phase 1 — Make the room look like a usage pattern (LLM + seed plan)

Depends on [fake-data PLAN](/fake-data-generation/PLAN.md). Do not invent a parallel seed pipeline.

- [ ] Demo-seed live UI pass (`--seed=demo`); thicken local public-goods if still invisible (already next on the fake-data plan).
- [ ] Confirm tiny/demo seed shows **several roles occupied** on the walkthrough board (pledge, vouch or scout, a project).
- [ ] Visible **testnet / fake money / some names are synthetic** so guests do not think Grey County is a live NGO.
- [ ] Write the 90-second narration as a short paragraph in [notes.md](./notes.md) (the story we will actually tell).

Phase 1 can overlap phase 0. It blocks phase 2 if the board still looks empty.

## Phase 2 — Friend walkthroughs (Adam; LLM prepares)

- [ ] Dry-run the [script](./friend-walkthroughs.md) once (LLM can play the friend locally).
- [ ] Run **5–8** sessions. After **three identical confusions**, stop; fix; then continue.
- [ ] Same night: append anonymized rows to [notes.md](./notes.md).
- [ ] Optional: “tell me when [their cause type] can try this” → a private list of *causes + roles*, not a Commonality newsletter.

**Session success:** they mapped it onto their cause, named at least one job, we captured one confusion. Not “this is cool.”

## Phase 3 — Fix what the room taught us (LLM after notes)

Do only what notes justify. Candidates we already expect:

- [ ] Landing / first screen still maps to petition, Kickstarter, charity, or party — change copy per [how-to-convey-this.md](../how-to-convey-this.md). Inbox already flags umbrella landing recruiting generic end users.
- [ ] Docs: a non-author cannot find the matching story in two minutes — fix the entry path, not another conceptual essay.
- [ ] **Open Graph / unfurl** for cause URLs (title = cause name, description = plank or job ask). Cheapest share artifact.
- [ ] **Role-deep links** for the invites in [activating-a-cause](/docs/founder/activating-a-cause.md) if people would forward a job but not the manifesto.
- [ ] Wallet as confound: keep “Adam drives” or finish guest-safe login; do not treat crypto-bounce as “they hated the idea.”

Do **not** start a meme generator or video pipeline in this phase unless notes say “I would forward an image of this sentence.”

## Phase 4 — Cause-flavored content (only our verticals)

Blocked on phase 2 having at least one person who restated the idea and named a role.

- [ ] One **60–90s** CSM *or* Civility clip: one claim, cause URL on the end card, no architecture tour. Script draft can live next to [memes.md](./memes.md) once written.
- [ ] A handful of CSM/Civility images using the surviving slogans in [memes.md](./memes.md) (`loud vs quiet`, etc.), watermarked with the **vertical** URL.
- [ ] Spec (not necessarily build) the organizer **share kit**: OG, statement card, role-ask card, optional caption stamp. Build when an organizer who is not Adam would use it.

## Explicitly later (not this focus)

- Founder-recruiting funnel landing and more pitch docs (Christian pitch improvement, imaginary-founder breadth check).
- Pitching Red Cross-scale orgs as prospective founders.
- Umbrella “what is Commonality” YouTube series.
- Ads, waitlist product, growth hire, brand meme page.
- Mainnet, real money, public alpha of the substrate.

## How this interacts with the other focus item

The **testnet simulation** (100 synthetic users) is a different job: observability and staging of mass activity. It is **not** the walkthrough seed. Using mass fake activity as the friend demo will look like spam and teach the wrong pattern. Keep job D (stress) away from this plan; use jobs A/B/C from the fake-data plan.

If simulation and walkthroughs contend for the same testnet board, prefer a **known demo story** on a stable URL for friends, and run simulation in a way that does not trash that story (separate batch, labeled synthetic, or local demo seed).
