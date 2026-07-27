# Pitch for Christians

Notes toward a Christian-branded [vertical](/docs/founder/standing-up-a-vertical.md).
Not because Commonality is aimed at Christians, but because a lot of Adam's friends
are Christians, they already do serious charitable giving, and they'd be the natural
early audience for one particular vertical — if anyone ever pitched it to them without
leading with the blockchain.

The audience: internet-savvy but not online-brained. They go to church, they give
through the church and to whatever the church collects for. They are not anti-tech,
but they'd be immediately skeptical of "come use this weird computerized protocol
instead," and rightly so.

## The pitch in one breath

> Some good works are too big for one church and too small for an institution. They
> don't happen — not because anyone decided against them, but because "together" has
> always meant *building an organization first*, and that costs more than the work is
> worth. This is a way for a few thousand people who will never meet to fund one
> specific thing together, and then go their separate ways.
>
> For one work, the mechanism is: **"I'll put in $200 if enough others do."** If
> enough do, it all moves at once. If not, nothing moves and you keep yours. You can
> never end up the only one who gave.
>
> Across the whole ecosystem, you don't personally vet every work. You entrust each
> part of your giving to people whose judgment you know, they scout promising work,
> and the wider church later reimburses at cost what demonstrably bore fruit. Good
> judgment becomes visible; early giving capacity gets used again; no central
> foundation has to decide for everyone.

Everything below is either evidence for that (the board), explanation of it (why none
of it exists today), or reasons this audience in particular is a good fit.

**Pitch the board, not the protocol** — but the board needs a frame around it. The
thing that lands with a skeptical friend is a list of concrete works he can picture,
none of which anybody funds today. What the board *can't* do by itself is tell him what
the thing **is**; see [the landing page](#the-landing-page) for how much scaffolding
turned out to be the minimum.

> **Two framings that were tried and abandoned.** Read these before proposing them
> again.
>
> 1. *"Cross-denominational coordination — the hallway, not the rooms."* True, and
>    it's still the structural diagnosis in
>    [Why none of that board exists today](#why-none-of-that-board-exists-today).
>    But as a *lead*, it fails: everyone has already heard some version of
>    "denominations should work together," is soured on it in the abstract, and
>    hears a committee coming. Show the examples; let the reader derive the hallway.
> 2. *A narrow pitch built on [Civility](/docs/end-user/civility/index.md)* — fund
>    winsome apologetics, argue with gentleness and respect. Genuinely resonant with
>    this audience (see [the appendix](#appendix-the-persuade-column-and-civility)),
>    but far too narrow to carry a vertical, and it makes the whole thing look like
>    a culture-war play. It is *one column* of the board, not the spine.

---

## What would actually be on the board

*"Imagine a Christian-branded site with a cause board. Here's what's on it."*

This list was generated with the facets in
[cause-taxonomy.md](/specs/product/cause-taxonomy.md) and gated on the seven blockers
in [what-its-better-for.md](/docs/end-user/commonality/vision-and-strategy/why-its-better/what-its-better-for.md).
Each row is tagged `[scope · deliverable · posture · time shape · blocker]`. **The tags
are internal generator machinery — they never appear in front of a reader**, who gets a
plain-English "why it's stuck today" line instead.

Read it as a menu of *shapes*, not a roadmap. The point of any single row is that you
can picture it, and that when you ask **"who has to say yes today for this to
happen?"**, the answer is nobody in particular — it just never gets organized.

This is the full menu. **The landing page ships ten of these rows plus the historic
building, told as a worked example** — see [The landing page](#the-landing-page) for
which and why. Rows that ship are marked 🟢. Resist growing that number: the earlier
16-row page proved that past about ten near-identical cards the reader stops reading
and starts skimming, and the argument is carried by three good rows anyway.

### Build

- 🟢 **A free, maintained Greek/Hebrew study stack** — interlinears, morphology data,
  lexicon APIs — that every Bible app and seminary quietly depends on and nobody
  funds. `[global · software · build · stream · #3 scale-mismatch + #1 self-financed minority]`
  The textbook underfunded-OSS shape: everyone uses it, no one owns the bill.
- 🟢 **Translation into a language with 40,000 speakers.** Too small for any agency's
  portfolio math; not too small for the people who care. `[global · content · build · one-shot · #1]`
- 🟢 **A shared church-admin stack** — giving, membership, childcare check-in —
  so 500 small congregations stop each paying SaaS rent separately. `[region · software · build · stream · #1 club good]`
  The clearest **club good** on the board: the free-rider problem is *internal*,
  which is precisely why no one has solved it.
- **A Christian classical school in a town that has none** — the founding year,
  before tuition covers anything. `[town · institution · build · one-shot · #4 gatekept]`

### Serve

- 🟢 **Recovery housing that outlives the county grant.** Fund it now, or post a
  standby contract that fires *if* the grant is cut. `[town · service · serve · contingent · #3 + credible threat]`
- 🟢 **Refugee co-sponsorship across nine churches in one city** — including the
  unglamorous coordination so nobody double-covers and nobody drops a family.
  `[region · plumbing + service · serve · one-shot · #3]`
- 🟢 **Regional disaster response as an ephemeral 50-church contract** that dissolves
  when the work is done. No permanent parachurch bureaucracy, no brand to sustain,
  no perpetual overhead. `[region · service · serve · one-shot · #3]`
- **Captioning and live translation of services** so deaf and immigrant congregants
  can participate. `[local → region · software + service · serve · stream · #3]`
- **Re-entry support for someone leaving prison** — first month's rent and a phone.
  `[town · transfer · serve · one-shot · rails only]`
  Honest tag: this is a **pure transfer**, not a public good. It's what people
  actually want to give to, but it demonstrates nothing about the mechanism.
  Kept off the landing page for that reason.

### Persuade

- 🟢 **A standing pool for writing that makes the Christian case to people who
  currently find Christianity false, stupid, and immoral** — and makes it in a way
  they can take in rather than bristle at. `[global · content · persuade · stream · #7 bridging]`
  The Areopagus, crowdfunded. **Secular moderates can co-fund this exact row**,
  because the noninflammatory filter guarantees it won't insult them.
- **A working scientist who is a Christian, paid to write for a general audience
  about faith and science.** `[global · person's time · persuade · stream · #5 + #7]`
- 🟢 **Retroactive support for the apologetics video that actually changed minds.**
  You can't pick these in advance; you can recognize them afterward, reimburse the
  people who funded it early (at cost, not for profit), and refill their capacity to
  scout the next one.
  `[global · content · persuade · retroactive · #5 proven-but-unpredictable]`
- **Local religion journalism** — the boring, accurate, non-outrage version that
  ad-funded and donor-funded media both refuse to produce. `[city · content · persuade · stream · #5 + #7]`
- **Translating the good apologetics into languages whose local church has none.**
  `[global · content · persuade · one-shot · #1]`

This column is where the vertical connects to
[Civility](/docs/end-user/civility/index.md) — see
[the appendix](#appendix-the-persuade-column-and-civility).

### Defend

- 🟢 **A named legal case**: a church zoning fight, a foster agency's licence, a
  nurse's conscience claim. `[national · legal · defend · one-shot/contingent · #6 suppressible]`
- 🟢 **A debanking standby pool**: "if this ministry loses its payment processor, this
  money covers the migration." Cheap to signal, valuable mostly as deterrence.
  `[national · plumbing · defend · contingent · #6]`

Keep this column short on purpose. A board dominated by *defend* rows reads as a
grievance list, and a grievance board attracts people who already agree and repels
everyone else — fatal for anything hoping to be co-funded across a divide. These are
often the most urgent rows; they still shouldn't lead.

### Preserve

- 🟢 **A specific historic building or organ**, where the 60-member congregation
  can't fund it but 4,000 people in the region care whether it survives.
  `[town · physical · preserve · one-shot · #1]`
  A near-perfect illustration of category #1: an intense minority, a
  non-excludable good, and a free-rider problem *inside* that minority, which is
  why it's been decaying for thirty years.
- **Digitizing a denomination's archives and hymnody into the public domain.**
  `[global · content · preserve · one-shot · #1, beneficiary: posterity]`

### Movement plumbing — the rows nobody thinks to put on a board

- **Fund the bridge-finder**: someone whose job is locating the concrete projects
  denominations can fund together without resolving why. `[region/national · plumbing · build · stream · #2-adjacent]`
- **Fund a delegate**: a regional missions veteran, paid to decide where pooled
  money goes, with a public onchain track record. `[region · person's time · build · stream · #3]`
  See D1/D2 in [use-cases.md](/specs/product/use-cases.md).
- **Fund the auditor**: someone who verifies a funded project actually delivered,
  so later donors know which early contributors' at-cost reimbursement loops to close. `[any · plumbing · build · stream · #5 enabler]`

These are the most *interesting* rows and the least *persuasive* ones: they're
meta, and a newcomer can't picture them. They stay in this doc and stay off the
landing page, where delegation instead shows up as a single step in "how it works"
("hand the picking to someone you trust").

### The same board in three cities

Geography isn't just a label swap — **it changes which blocker is active**. Useful
for checking that the generator produces real variation; too abstract to put in
front of a first-time reader.

- **Toronto** (nominally pluralist, institutionally secular): campus chaplaincy at
  a large secular university; a legal clinic for zoning and accreditation fights; a
  winter warming centre. Live blockers: **#6** and **#3**.
- **Paris** (~1% practising): church planting is a genuine *self-financed minority
  good* rather than routine ministry, and heritage buildings are entangled with the
  state. Live blockers: **#1** and **#4**.
- **Lagos** (large, growing, resource-poor): money largely flows *inward* from
  the diaspora, and the binding constraint is **verification** — did the money
  arrive, did the thing get built. Onchain receipts and retroactive funding do the
  load-bearing work here, not assurance contracts.

### What this screens out

Saying what's *not* on the board is half of what makes the board credible:

- **Your own congregation's roof.** The pastor stands up, the plate goes around, it
  works. Use us as [rails](/docs/end-user/commonality/vision-and-strategy/ease-of-adoption/rails.md)
  if the bookkeeping appeals; it isn't the pitch.
- **Anything a competent existing parachurch org already does well, with
  distribution.** Don't compete with a functioning institution to prove a point.
- **Anything that needs a single trusted org to hold the mandate anyway.** If the
  answer to "who has to say yes?" is "one org, and it will," we add overhead, not
  capability.

---

## Why none of that board exists today

The board above is the pitch. This section is the answer to the obvious follow-up:
*if these are such good ideas, why is nobody doing them?*

The general Commonality argument is that government and charity both **aggregate
early**: they assemble a pot of money *and a mandate to spend it* before any specific
thing gets funded — government by winning a majority, charity by being a trusted
central org. That has two costs. Nothing moves without a legitimating majority or a
trusted central org, so anything lacking one can't be funded no matter how much real
willingness exists; and individual signal is destroyed at the aggregation step, so the
system can't see fine-grained or cross-cutting wants. Commonality **aggregates late** —
it keeps individual signal intact all the way to the specific project, and lets the pot
and the mandate form per-project, on demand, out of exactly the people who want that
thing.

Run the Christian case through that lens:

**Inside one congregation, the chokepoint works beautifully.** The pastor stands up,
names the need, the plate goes around. Dense trust, small scale; exactly where a
chokepoint belongs. That's why "your congregation's roof" is screened out — we'd be
rails there at best.

**Across congregations and denominations, the chokepoint can't form.** To coordinate
funding at scale, denominations would historically have to do the early-aggregation
move: agree on doctrine, agree on governance, agree on who holds the treasury. That
cost is so high that pan-Christian action only happens through a few big parachurch
orgs — which then become brands and gatekeepers with their own mandates. Thousands of
denominations that share the Apostles' Creed and differ on baptism cannot fund a thing
together, because the only tool they have for "together" is *institutional union*, and
union founders on the 20% they don't share.

That's why the board is so heavy at the **region tier** — many peer bodies, no shared
authority. It's the tier with no mechanism at all, and it's where nearly every
interesting row lands.

The fix is the [organic-coalitions / hidden-majority](/docs/end-user/commonality/vision-and-strategy/why-its-better/organic-coalitions.md)
thesis, and here the bridge is far easier than CSM's left-right one: the implication
graph surfaces the concrete shared *what* — fund this translation, fund this disaster
response, fund this shared admin stack — without anyone resolving the *why*. It's
C.S. Lewis's hall and rooms made operational: **you don't have to merge the rooms to
act together in the hall.**

Two notes on how to *use* that argument:

- It's a better frame than "Christianity vs. the secular world" — positive, true
  today, zero culture-war energy required.
- **It is an explanation, not an opener.** Say it once, briefly, *after* the reader
  has seen the examples and asked "why hasn't anyone done this?" Leading with it
  triggers the committee reflex.

One more structural note worth making to this audience: the organizational principles
of the church as described in the New Testament are strikingly **bottom-up**, and
decentralized coordination tech is a natural modern implementation of that — for a
world where a single city holds millions and the whole thing holds billions.
Coordinating bottom-up giving at *that* scale is a different problem than it was in
Acts, and it needs different tools.

---

## Why Christians are unusually well-suited

- **The trust graph already exists.** Most verticals bootstrap a delegation network
  from nothing. Every congregation ships one fully formed — pastor, elders, deacons are
  *already* trusted delegates with real local knowledge. The
  [delegation](/docs/end-user/shared/key-ideas/delegation.md) subsystem ("let someone
  you trust make the picks, never think about it again") maps onto church life with
  almost no friction. That's what makes the "fund a delegate" row plausible here and
  hard almost everywhere else.
- **Retroactive funding is already in the theology.** *"By their fruits you shall know
  them"* **is** retroactive funding: don't fund the slickest grant proposal, fund the
  ministry that demonstrably bore fruit. The parable of the talents (deploy capital,
  don't bury it) and the widow's mite (intent over size) make
  [retroactive funding](/docs/end-user/commonality/vision-and-strategy/why-its-better/retroactive-funding.md)
  intuitive to this audience where it's a hard sell to most.
- **Debanking is current pain, not theory.** The
  [censorship-resistance](/docs/end-user/commonality/vision-and-strategy/hard-to-stop/censorship-resistance.md)
  case is live for some Christian orgs right now — dropped by payment processors or
  platforms. For them the alternative isn't a better-functioning system; it's nothing.
- **Keep doing what you're doing.** Christians already give generously, mostly through
  the church. The vertical is *rails* for that, not a replacement — LazyGiving does the
  bookkeeping, Alignment is a dashboard for the church's projects, and nobody is asked
  to stop tithing and start trading tokens.

---

## What the vertical actually *is*

Concretely: the same machinery as [Civility](/docs/end-user/civility/index.md) and
[Common Sense Majority](/docs/end-user/common-sense-majority/index.md), with a Christian
front door — its own framing, its own defaults, its own scripture, and a community that
already understands *why* in its bones.

- **It's an entry point, not a new system.** Under the hood it's the same
  [Content Funding](/docs/end-user/content-funding/index.md) pledge-and-refund
  contracts, the same assurance contracts, and the same open, swappable
  [AI evaluators](/docs/end-user/alignment/ai-evaluators.md). What's different is the
  *door*: someone shows up because their church or a Christian friend pointed them
  there, sees language and examples that fit how they already think, and finds the
  on-ramp framed as discipleship rather than as DeFi.
- **A natural alliance with the CSM "sane majority."** A Christian vertical and CSM
  point at overlapping ground — *"argue without contempt," "assume the other side is a
  person," "make your case so they can hear it."* That's an
  [organic coalition](/docs/end-user/commonality/vision-and-strategy/why-its-better/organic-coalitions.md)
  waiting to happen, and an easy bridge compared to CSM's left-right one, because the
  two already share the disposition.
- **The board is the product surface.** Everything in
  [What would actually be on the board](#what-would-actually-be-on-the-board) is what a
  visitor should see on arrival — not a manifesto, not an explainer, a list of things to
  fund.

## Honest caveats

- **The UX has to actually be non-scary.** This pitch describes what the on-ramp *will*
  feel like once the wallet/onboarding work is done. Today it isn't there yet; don't
  show this to a skeptical friend as if the smooth version already ships.
- **It needs a Christian to build it.** Adam isn't a Christian and shouldn't be the
  author of the actual vertical or its voice — a real builder from inside the community
  has to own the framing, or it'll read as an outsider ventriloquizing the faith.
- **Don't over-promise the culture war.** The persuasion angle is real, but it's *one*
  column of the board, not the spine. Local relief, missions, and noninflammatory
  apologetics clearly clear the bar. Whether this scales to reshaping the wider secular
  culture is a genuine open question. Lead with the part that's true today.
- **The ceiling depends on how big the "hall" projects are.** The cross-denominational
  thesis is the strongest structural idea here, but its ceiling depends on whether the
  projects the denominations *do* agree on are big enough to matter. The board above is
  the evidence; judge it on that.

## The landing page

There's a throwaway standalone landing page, in the recognition voice (open
`christian-commonality/index.html` in a browser). It is **not** wired into the
multi-domain UI — it's a self-contained HTML file meant to be shown to a Christian
friend to see whether he goes "huh, I bet I could shape this into something cool."

**The page is deliberately much smaller than this document.** Its structure:

1. **Hero — state the gap and the mechanism, in that order, above the fold.** "Too big
   for one church and too small for an institution," then the conditional pledge in the
   reader's own voice: *"I'll put in $200 — if enough others do."*
2. **One worked example**: the 1889 church, sixty members, a $180,000 organ, and four
   thousand people in the region who'd be sorry to lose it and have no way to find each
   other. Lands on *"Nobody said no. There was just never a way to say yes together."*
3. **How one work gets funded** — three steps (name a work + number, pledge
   conditionally, it funds or releases, publicly), plus the point that nobody agrees
   to anything but the work.
4. **From one work to a whole ecosystem** — one concrete recurring giver, then three
   roles: the giver delegates different budgets to trusted specialists; scouts fund
   uncertain work early; later donors reimburse successful work at cost so the scouts'
   giving capacity can go out again. This is the answer to "why not Kickstarter?" and
   must remain prominent rather than becoming a feature aside.
5. **The board: ten rows in four groups**, one sentence each plus a plain-English "why
   it's stuck." Closes with a one-line callback to the organ.
6. **The honest block**: what's *not* on the list, the crypto/AI question, the three
   caveats.
7. Close on 2 Cor 8:14 and Paul's collection — churches that never met, pooling for one
   specific need in one specific city, then going home.

> **The earlier version of this page, and why it changed.** The previous draft ran the
> board at 16 rows and put the mechanism fourth. Three things broke:
>
> - **It never said what the thing was.** The hero opened with four examples and the
>   rhetorical question "who has to say yes today?" — which is the *founder's* framing
>   device, not a question a first-time reader arrives with. He wants to know what this
>   is and what's being asked of him.
> - **Sixteen near-identical cards is a wall.** Attention is gone by row five, and the
>   sixteen "why it's stuck" lines were sixteen restatements of two ideas, which reads
>   as padding. One example told *properly* does what sixteen skimmed ones can't.
> - **The best asset was buried.** The conditional pledge is the simplest, most
>   graspable, most obviously-different-from-every-giving-app thing here, and it
>   directly answers the objection every reader already feels ("why should I be the only
>   one?"). It was step 2 of 5, in section 4. It now sits in the hero.
>
> Also cut: "read it as a menu of shapes, not a plan" (founder-speak leaking onto the
> page), "the Areopagus, crowdfunded" (a wink to the author), and the three-point "what
> they have in common" section, whose content is now carried by the worked example.

**What is deliberately kept off the page, and why** — resist re-adding these:

- **The facet tags.** Internal generator machinery.
- **The scripture wall** (six verse cards) and the *"listen and engage" vs. "love
  them"* seam essay. Good material, preserved in
  [the appendix](#appendix-the-persuade-column-and-civility) — but on the page it
  swamped the board and made a broad giving pitch look like a Civility pitch. The page
  keeps exactly two verses, as framing, top and bottom.
- **The three-cities section.** Founder-facing evidence that the generator works;
  reads as filler to a first-time reader.
- **The old "why it fits the church" feature grid.** A generic feature matrix is still
  cut. Delegation and retroactive funding now survive instead as a single worked
  ecosystem loop, because they explain how this coordinates more than one project;
  the open ledger remains in "how one work gets funded."
- **Everything not marked 🟢 in [the board](#what-would-actually-be-on-the-board).**
  Cut for one of four reasons: too meta to picture (the plumbing rows — bridge-finder,
  delegate, auditor), a pure transfer that demonstrates nothing about the mechanism
  (re-entry support), a near-duplicate of a stronger row that's already on the page
  (apologetics translation vs. Scripture translation; the Christian scientist and local
  religion journalism vs. the writing pool), or simply the weakest row in an
  already-full group (the classical school, captioning, archive digitization).
  Each is a fine row; the page just isn't a catalogue.

Working name: **Koinonia** (κοινωνία — the New Testament word for the believers'
fellowship *and* their sharing of material goods; Acts 2:42, 2 Cor 8–9, Rom 15:26). It
shares the root *koinos* ("common") with *Commonality*. The name is a placeholder; a
real builder should rename it.

If it earns a real home, the path to make it a true vertical is a new domain under
`ui/src/domains/` (mirror `common-sense-majority/`: a `manifest.tsx` +
`LandingPage.tsx`, registered in `ui/src/domains/index.ts`, `types.ts`, and
`domainUrls.ts`).

---

## Appendix: the Persuade column and Civility

This section is the round-2 pitch, demoted. It is *not* the spine of the vertical and
should not lead — but the material is good, it's the strongest single connection
between this vertical and what Commonality has already built, and it's what a Christian
friend will react to hardest in both directions. Use it in conversation, once he's
already interested in the board.

The organizing line: **Commonality's ask is "listen and engage"; Christianity's ask is
"love them."**

### The behavior, in Scripture

Much of the New Testament is instruction for *getting along with people you disagree
with* — not agreeing with them; getting along with them while you still disagree:

- **"Blessed are the peacemakers, for they shall be called sons of God."** (Matt 5:9)
  Not peace-*keepers* — peace-*makers*, the people who go into a conflict and build
  something across it.
- **"Let everyone be quick to listen, slow to speak, slow to anger."** (James 1:19)
  This is *listen and engage*, almost verbatim, written two thousand years early.
- **"As far as it depends on you, live at peace with everyone."** (Rom 12:18) — and
  four verses earlier, *"Bless those who persecute you"*; later, *"overcome evil with
  good"* (12:21). Relentless goodwill toward the people who are hardest to bear.
- **"Always be prepared to give a reason for the hope that is in you — but do this
  with gentleness and respect."** (1 Pet 3:15) The entire Civility standard in one
  verse: make your case, *and the manner is part of the obedience.*
- **"Let your speech always be gracious, seasoned with salt, so that you may know
  how to answer each person."** (Col 4:6) Tailor the delivery to the listener — which
  is exactly what a point-of-view-specific noninflammatory filter does.
- **"Speaking the truth in love."** (Eph 4:15) Not truth *instead of* love (cruelty),
  not love *instead of* truth (flattery), but both at once.
- **Paul at the Areopagus** (Acts 17:22–28): he stands in the most hostile-to-him forum
  in the ancient world, opens by crediting what the Athenians got right, quotes *their
  own poets* back to them, and only then makes his case. The noninflammatory move,
  modeled by the apostle himself.
- Underneath all of it, the **Good Samaritan** (Luke 10): the neighbor you're commanded
  to love is drawn specifically from the tribe you're supposed to despise.

The point isn't to proof-text a product. It's that **the disposition Civility tries to
fund is one this audience is already under orders to cultivate, mostly *wants* to, and
currently has no rails for.** Everyone else has to be talked into "engage the other side
charitably." Christians arrive pre-convinced; they just watch the loudest, angriest
version of their faith dominate every feed, because outrage is what the feeds pay for.

### The honest seam: "listen and engage" is *less* than "love them"

Commonality's ask is modest and secular: *listen to the other side, and engage them in
a way they can actually hear.*

Christianity asks for **more**. "Love them" is bigger than "listen and engage," and it
is **not** the same as "be nice." Loving someone includes telling them hard truths they
don't want to hear (Eph 4:15 again; *"faithful are the wounds of a friend,"* Prov 27:6).
So a Christian shouldn't hear Civility as "tone it down, never say anything
uncomfortable." That would be a misread, and a fair objection to bland-centrism
pressure.

The fit: **Civility doesn't replace the gospel; it's the rails for the part where you
have to be *heard* in order to say the hard thing at all.** A message delivered as an
insult never lands — the listener takes it as confirmation that you think they're stupid
and evil, and tunes out. 1 Peter 3:15 already knew this: the *reason for the hope in
you* is the hard content; *gentleness and respect* is the delivery that gets it through
the door. Civility funds the delivery. The Christian still supplies the truth.

### The strategic version

Christianity has a PR problem. Much of the wider culture considers it not merely false
(a fictional story about this Jesus guy) but also stupid (how could anyone believe that)
and immoral (bad takes, from a secular perspective, on LGBT and abortion). If you care
about more people being saved, simply preaching the gospel at those people is poor
strategy: they'll read it as confirmation of their suspicions and tune out. They are not
going to take the Bible as evidence that their moral beliefs are wrong; they'll take
their moral beliefs as evidence that the Bible is wrong.

Said in the recognition register rather than the scolding one: **there's a large
audience that would engage with thoughtfully-framed Christian ideas, and nobody funds
the people who can produce that**, because existing channels' donor bases reward
preaching to the choir. Commonality can fund the cross-cutting content directly — and
secular moderates can co-fund it, precisely because the noninflammatory content filter
guarantees it won't insult them. That co-funding is itself a small act of
bridge-building across the exact divide CSM exists to close.
