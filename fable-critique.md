# Asking Fable's opinion

## Original prompt

> Read all the docs and specs (seriously, please just read all of it) and give me your opinion of the project as a whole. Is this viable? What suggestions would you make?

## Fable's response

Done — I've read the whole corpus: every file under `specs/` and `docs/` (~218k words), including the chat transcripts, plus the status/TODO/continuity files to ground where the project actually stands (testnet up, MVP subsystems implemented, never mainnet). Here's my cofounder-level take.

---

### The short version

**The thinking is excellent. The building is real. The viability question is almost entirely about distribution and cold-start — which is the least-developed 5% of this 218k-word corpus.**

As a piece of mechanism design and writing, this is unusually good. The "aggregate late" thesis genuinely unifies everything (statements → implication graph → portals → delegation → retroactive funding), every obvious objection has an honest pre-written answer, and several mechanisms are real innovations, not recombinations:

- **Indirect supporter counts** ("50K direct, 2M implied") — a number no existing system can produce, and it's the kind of number that *is* the news.
- **Funding an adjective** ("noninflammatory") instead of a person — legacy systems truly can't do this.
- **Standby assurance contracts as credible threats** — the strike-fund framing is the single most pitchable idea in the whole project, because it's valuable *even if never used* and costless to set up.
- **Bilateral-assurance statement design** — the conditional-support insight ("I'll concede Y as long as you're conceding X," with the other side's signer count as the assurance) is quietly the cleverest piece of CSM.

The tech architecture matches the ambition without gold-plating: dumb event cache + client-side folds, conservative attester prompts, the nudger ephemerality/trust taxonomy, "don't build combinators speculatively." The engineering discipline in these specs is better than most funded startups'.

### Is it viable?

Three different answers for three different claims:

**As infrastructure for crypto-native public-goods funding: yes, plausibly.** The contracts are simple and done, the niche exists (Gitcoin/Optimism RetroPGF have proven there's both money and culture here), and your retroactive-funding + delegation combo is genuinely differentiated from quadratic funding. This is the audience that doesn't need fiat bridges or embedded wallets.

**As "rails for normal people / churches": not yet, and the docs know it.** The `ux.md` church audit is the most important document in the repo and it contradicts `mvp.md`'s "fully implemented": a church treasurer literally *cannot* express "collect donations for the roof" — the form requires token mechanics, hex addresses, a wallet wall, and a mandatory deadline. Everything a normie needs — fiat onramp, embedded wallets, donation-first UX, no jargon — is on the deferred list. That's not an MVP for that audience; it's an MVP for a different audience.

**As CSM / civilizational depolarization: a long shot, with one structural problem.** The thesis is plausible and the design is honest, but the headline product is *the number* — and the number is only powerful if it's credible. Today the counts are unverified accounts on the honor system. The moment a "2 million indirect supporters" figure matters politically, it will be attacked as bot-inflated, and the attackers will be right that it's unprovable. For CSM specifically, I don't think unique-human verification is deferrable — the tiered display ("X verified humans, Y unverified accounts") needs to exist before the numbers are ever cited anywhere. Also: the demand thesis ("people will pay for content that doesn't enrage them") is unfalsified-but-untested, and revealed preference in media markets points the other way. It deserves a cheap real-money test before more machinery is built on it.

The meta-risk across all three: **this project's failure mode is not technical.** Of 218k words, maybe a few hundred are about how anyone *hears about this*. `memes.md` and a line in `future.md` are it. Sam said it in the very first transcript — "you'd better be ready to scale" — but the inverse problem is the real one.

### What I'd suggest

1. **Pick one wedge and get 10 real strangers using it.** My pick: **Content Funding's "someone funded your tweet" loop**, scoped to a crypto/public-goods commentary niche. It's the only part of the system with built-in distribution (the claim tweet *is* marketing), it works with crypto-native users (no fiat bridge needed), and each success creates a public artifact. CSM needs masses; LazyGiving-for-normies needs the UX/fiat work. Content funding needs neither.

2. **Fund the project through the project — via the crypto public-goods ecosystem.** `fees.md` says you have no income. This project is *exactly* the shape that Gitcoin rounds, Optimism RetroPGF, and the EF ecosystem fund — and applying makes them your first users, not just your funders. "Commonality's development is funded on Commonality" is also your best demo. This is the highest-leverage single action available right now.

3. **Re-scope "MVP" around a user outcome, not a subsystem checklist.** "All seven subsystems implemented" is an engineer's done. Pick the cofounder's done: *"A stranger funded another stranger's thing and both came back."* The donation-first create flow from the `ux.md` audit (name, dollar goal, give-any-amount, confirmed recipient, token machinery behind an "advanced" toggle) is the highest-value engineering item in the repo if churches/normies are ever the target — or explicitly declare crypto-natives the launch audience and stop feeling behind on fiat.

4. **Do the legal consult before mainnet, not after.** `legal.md` has already spotted the issue: resellable donation receipts that appreciate, with UI copy about "investors" and "scouts profiting," is securities-flavored. The mitigation plan (call them donation receipts, lead with donation, decouple the pieces) is right — but it's worth a few thousand dollars of an actual crypto-savvy lawyer's time before deployment makes the framing permanent. The retroactive-funding *mechanism* can stay; the *vocabulary* in the UI is what matters.

5. **Protect the headline metric early.** Two cheap things: ship the uniqueness-tier display on Tally counts (even if tier 3 is empty), and assume the implication attester becomes an adversarial target the moment counts matter — statements engineered to be attested into popular ones is the obvious attack on your flagship number. The conservative prompt helps; an explicit red-team pass on it would help more.

6. **Consider launching fewer than eight sites.** I know the builds are cheap and the separation logic is sound (`ui-domains.md` argues it well). But eight empty marketplaces look worse than two alive ones, and every domain is a surface to keep coherent. Launch the wedge (Content Funding + Tally, say), keep the rest behind "coming" pages or quiet URLs. The domains can reappear as they earn users.

7. **Keep the discipline you already have.** The repeated "don't build speculatively" calls (combinators, MatchingPool, bridge-finder, localism site, volunteer discovery) are exactly right, and rare. Same for the honest status flags on weak walkthroughs. One caution: the docs corpus is now large enough that it's drifting (`mvp.md`'s own TODOs say "some of this is wrong"). For a project staffed by ephemeral LLMs, stale docs are actively dangerous — a periodic prune is real work worth scheduling.

### The honest cofounder summary

If I strip away the vision, what exists today is: a clean set of crowdfunding/delegation/attestation primitives on Base, a genuinely novel statements-and-implications layer, an impressive amount of working AI-service scaffolding, and the best-argued spec corpus I've seen — pointed at an adoption problem that hasn't been started. The thing most likely to kill this isn't a flaw in the mechanism design (there isn't an obvious one); it's that the building keeps being more fun than the distributing, and the runway question (`fees.md`) resolves itself the bad way before any flywheel turns.

So: viable as a niche-first protocol with a real shot at the crypto public-goods ecosystem, *if* the next quarter is spent on users and funding rather than subsystems. The transformative version — CSM, localism, civilizational competence — is a lottery ticket, but it's a lottery ticket you get to keep holding for free as long as the niche version is alive. That's a good trade. The priority is keeping the niche version alive.

## Me summarizing what the AI said

  - Need more features for normies: fiat onramp, embedded wallets, donation-first UX, no jargon.
  - If we want the Tally numbers to be credible, we need unique-human verification
  - The demand thesis ("people will pay for content that doesn't enrage them") is unfalsified-but-untested, and revealed preference in media markets points the other way
  - Of 218k words, maybe a few hundred are about how anyone *hears about this*. `memes.md` and a line in `future.md` are it.

## My next question

Let's assume that we implement the normie features. (I don't expect it'll be that hard.)

Let's assume that there'll be some kind of viable way to verify unique-humans.

With the stuff in mind from docs/end-user/commonality/vision-and-strategy, what thoughts do you have on how we might go about gaining adoption?

## AI response

Good — with normie UX and unique-human verification assumed solved, the question becomes pure go-to-market. The vision-and-strategy docs already contain most of the right raw material (dial-not-switch, costless-to-try, credible threats, matching funds, the pitches, the localism sequence); what they don't yet have is a *motion* — who exactly, in what order, acquired through what repeatable loop. Here's how I'd think about it.

### The framing principle: the unit of adoption is a trust network, not an individual

Almost everything distinctive about the system — delegation, attestation filtering, assurance thresholds — presupposes a pre-existing web of people who know each other. A thousand isolated signups give you nothing (empty portals, no delegates anyone trusts, thresholds that never clear). One church, one town, one creator-fanbase gives you a working instance of the whole machine.

So the strategy isn't "market to donors" — it's **win whole communities, one at a time, and make each one a public, copyable case study**. This is also what `scales-down.md` and the localism ratchet/contagion mechanisms already imply; I'd just make it the explicit organizing principle of all GTM work.

Each target community should have three properties: (1) an existing trust graph (so delegates exist on day one), (2) recurring funding needs (so there's a second transaction), (3) its own internal communication channels (so distribution is free).

### A sequence, roughly

**1. One real community, concierge-style — and it should probably be local to you.**
The intersections doc literally uses Grey County, Ontario as its worked example. Do it for real: one park project, one rink, one local-journalism or youth-program fund. Do everything that doesn't scale — you act as bridge operator, you set up the contracts, you recruit the Maria-and-James archetypes from the defunding walkthrough by hand. The goal isn't revenue; it's converting the Millbrook *fiction* into a true story with names and numbers. Every later pitch in the corpus gets 10x stronger the day one walkthrough is real.

**2. Matching funds as the org on-ramp — the friendliest door in the building.**
`matching-funds.md` already identifies this: every development director on earth understands "we'll cover half," and your version is provably catalytic and refund-safe. The motion: find one local business or small foundation per target community and get them to run one match through the rails. The match markets *itself* ("every dollar doubled, verifiably") and it recruits both sides of the marketplace at once — the org and the crowd. I'd make "run your next challenge grant on this" the lead institutional pitch, ahead of anything about blockchains, delegation, or movements.

**3. Event-driven credible-threat adoption — your asymmetric weapon.**
The strongest pitch in the whole corpus is "your funding just got threatened; set up a standby contract this week, it costs nothing unless it's needed." That's *event-driven*, which means the motion is monitoring, not broadcasting: watch for defunding news — grant cuts, debanked orgs, programs held hostage to conditions — and show up within days with a concrete playbook and hands-on help. You only need to land **one** publicized "the pledges went up and the funder backed down" story; that story is national-press-shaped in a way nothing else here is. Until an opportunity appears, this costs you a saved-search and a prewritten playbook page.

**4. Tip-jar migration for creators/OSS — the retroactive flywheel's first turn.**
The tip-jar-upgrade-path argument is airtight on paper but needs a demonstration that the scout→deliver→retro-buyout loop pays real money. Cheapest version: run one genuine retroactive round yourself in a niche you're native to (crypto public-goods tooling, OSS infrastructure), with real payouts to real early backers. Simultaneously pitch a handful of OSS maintainers / niche creators on migrating their tip jar — with tooling that lets historical donors claim their receipts, which the docs already sketch. Crypto-native, no fiat dependency, and it produces the "scouts got repaid" proof that every retro pitch thereafter cites.

**5. Verticals as franchises: recruit founders, don't build sites.**
The Christian-pitch doc has exactly the right instinct — "I'm not the right guy to build it." Generalize that into the actual growth strategy for the movement layer: your marketing target for verticals is *founder-type people with an existing community and an axe to grind*, and your product for them is a white-label kit (domain manifest + seed statements + attester config + playbook + the Koinonia-style landing page as a template). The Commonality founders page already gestures at this. Every vertical founder brings their own distribution; you bring rails. This is the "protocol, not platform" advantage converted into a channel — and it's the only way eight-plus domains ever get filled, because you cannot personally evangelize eight audiences.

**6. CSM last — but warm up its muscles in low-stakes domains first.**
CSM needs mass, credibility, and verified counts before its numbers mean anything, and its first flagship statement will be attacked. But the *mechanism demo* — "17 differently-worded statements, one honest combined count" — can be proven where nobody's angry: programming-language debates, diet wars, parenting discourse, or even hyper-local issues ("fix the potholes"). The civility docs already note these domains. Let the indirect-count feature become familiar and trusted as a fun/useful thing before it's asked to carry political weight.

### The loops to instrument

Pick one loop per segment and actually measure it:

- **Creator loop:** fan funds content → creator's claim-tweet announces it → creator's audience sees it → some become funders. (Built-in distribution; this is why content funding is the wedge.)
- **Community loop:** funded project → public "brought to you by" page + local press → neighboring community copies the playbook (the contagion mechanism from `local-government.md`, but you should actively package "fork this town's setup" rather than waiting for it).
- **Org loop:** successful match → matcher's provable-catalysis report → matcher's peer orgs ask how.
- **Statement loop:** "go sign this" share links (the shareable-links idea in `new-user-experience.md`) — cheapest of all, worth wiring early.

And measure **alive communities** (≥N funded projects per quarter, returning delegates), not signups. Ten thousand wallets and zero second transactions is failure; three communities that keep coming back is success.

### Two strategic tensions to decide deliberately

**Political coding of the first flagship.** The game-theory doc correctly predicts the out-of-power / defunded side adopts first — which today likely means your most motivated early communities are right-coded (the docs note this themselves under "right-coded public goods"). But the first famous use case will brand the platform, and CSM's credible neutrality depends on not being coded. Options: lead with genuinely apolitical local goods (parks, rinks, disaster response — the "Helen response" from the transcripts is a great archetype); or deliberately launch flagship causes in pairs, one coded each way. I'd decide this on purpose rather than letting the first inbound opportunity decide it.

**Concierge vs. protocol purity.** The docs lean hard on "permissionless, nobody runs it." True at the protocol layer — but adoption at this stage requires you to be extremely *present*: operating bridges, acting as first delegate, hand-onboarding treasurers. That's fine (every protocol bootstrapped this way), but budget for it honestly: the next year of adoption work looks like community organizing and account management, not engineering. Given the team is essentially you, that's the real constraint — and another argument for the franchise model in #5, which is the only piece of this that recruits *other people's* time.

### The one-sentence version

Win one real community end-to-end and publish the story; use matching funds as the org door, credible-threat moments as the press door, tip-jar migration as the crypto-native door, and vertical-founder kits as the scaling mechanism — and hold CSM in reserve until verified counts and a legitimized platform can carry it.


## My thoughts

I like the point about franchises. Come at it from that perspective.

That is, part of the point of this is that I'm trying to build it as a completely transparent and free public good: we don't take any fees, and everything is either onchain or (in the case of the AI services) at least open-source and self-hostable if people don't trust us. One of the benefits of that, I hope, is that "people who see the value of the system and will be willing to help promote it" won't be a bottleneck. I'm not in any sort of special position in that respect; other people who see the value proposition will be on a level playing field with me in terms of financial-incentives (none) and trust-needed (none).

To put it another way: think of me personally as some combination of "the tech guy who's building the system" and "the founder of the Civility and CSM movements"; I built Tally and LazyGiving and Aligning and Content Funding partially because they were prerequisites for those two. (And partially because they're steps on the path to something along the lines of Balaji Srinivasan's "network state" ideas except less like "giant Discord server with a treasury". Tally plus Aligning ought to give us the ability to gradually build up numbers and crowdfund the network society's projects, without needing to all become part of a single organization.) My main goal isn't exactly to get as many people as possible to use the funding system; my main goal is to get Civility and CSM off the ground (and maybe some other kind of network-society too), though I'd be glad if other people with good causes used the funding system. And my secondary goal is kinda just to build something useful for our civilization, make us more competent at funding public goods, because (not really getting into the question of whether any *particular* cause is a good one or not) I think it'd probably be a good thing overall if we were more competent at this kind of thing. But I'm not really looking to be in the role of promoting all possible use cases, and I doubt I'd be particularly good in that role, and I hope I don't have to be.

What I'm looking to do here, as the tech guy, is make it as easy as possible for other people to step into those roles and start using the system (or building variants of the system) for whichever "vertical" use cases *they* care about. I'm very interested in looking at the "how do we gain adoption?" problem through a lens of "which features could I implement that would make the path smoother for them?".

## AI response

This is the right lens, and it changes what "adoption work" means for you specifically: your customer isn't the donor or the church treasurer — it's the **vertical founder**. Your KPI isn't signups; it's *time-from-"I have a cause"-to-"my movement site is live with seeded statements and a working portal"*, and the number of external founders who ship. So let me go through what that founder's journey looks like today, where it's rough, and which features smooth it.

### What a vertical actually consists of

Decomposing Civility/CSM (the two existing franchises, both founded by you):

1. A thesis and narrative (landing page, docs)
2. A seed statement cluster (with expected implication links)
3. A cause anchor (mission statement on Tally + portal on Aligning)
4. Optionally: an attester persona (prompt + key + hosting)
5. Optionally: a nudger/mediator (anchors, strategy prompt, curation)
6. A brand/domain
7. Their own distribution (this is what *they* bring)

Today, items 1–6 require: PRing a TypeScript monorepo (`ui/src/domains/`), running scripts in `fake-data-generation/`, provisioning Ethereum keys and OpenRouter accounts, and deploying service-host somewhere. The christian-pitch doc says it honestly: the path to a real vertical is "a `manifest.tsx` + `LandingPage.tsx`, registered in four files." That's a software-engineering project. **The core franchise feature is converting vertical-founding from a code problem into a content-and-config problem.**

### The feature ladder, in priority order

**1. A "start a movement" flow that requires no code at all (the tier-0 vertical).**
The minimal viable vertical isn't a site — it's: mission statement + seed cluster + portal + default delegate + share link. All of that already exists as primitives; what's missing is a guided flow on Tally/Aligning that composes them and spits out a shareable movement page ("Here's our cause, N supporters, $X pledged, sign here, pledge here"). This is your own dial-not-switch principle applied to founders: the floor case should take an afternoon, with a visible upgrade path to a full branded vertical. Most would-be founders should start here and never need you. I'd build this before any kit for the higher tiers.

**2. Verticals as data, not code.**
For founders who want a branded site: extract the domain manifest into a declarative format — branding, copy, featured causes, seed statement CIDs, default trusted attesters/nudgers — loadable without touching the monorepo. Two implementation shapes, both fine: a generic "vertical host" build that renders any manifest, or a static-site-generator kit (the Koinonia landing page, productized into a template). Bonus points if the manifest lives on IPFS behind a mutable ref, because then the vertical itself inherits the system's trust story: inspectable, forkable, not dependent on your repo accepting a PR.

**3. Trust packs — a one-click "adopt this configuration" primitive.**
This might be the single highest-leverage missing primitive. Every vertical needs its followers to configure trusted attesters, nudgers, and suggested delegates — and no normal user will hand-enter Ethereum addresses in Settings. A *trust pack* is a signed document: "The Civility movement recommends trusting these attesters, this mediator, these starter delegates — here's why," adoptable in one click, swappable, revocable. It's the `alignment-anti-abuse.md` "seeded defaults per cause area" idea generalized into the franchise distribution mechanism: *joining a movement = adopting its pack*. And it's the honest answer to the soft-power problem (more below), because it makes defaults visibly chosen and trivially replaceable.

**4. Attester/nudger personas as config + one-command deploy.**
`content-attester` is already "same code, different prompt + key" — formalize that into a persona spec (prompt files, thresholds, topic CID, display metadata) plus a CLI that generates the key, writes the env file, emits the `/.well-known/nudger.json`, and a Render-blueprint/docker-compose template for service-host with just that persona enabled. The service-bundling cleanup items in TODO.md (per-service env parsing, lazy env, multi-instance env mode) are *exactly* the prerequisites for this — they're not janitorial work, they're franchise features. Worth deciding deliberately: do you also offer **hosted personas** (you run their attester on your service-host, multi-tenant)? I'd say yes as a convenience tier with a documented exit to self-hosting — it mirrors the nudger three-layer trust model you already wrote, and it removes the worst onboarding cliff (keys + hosting + LLM billing) for non-technical founders.

**5. Seed-content tooling as a product, with an AI assistant.**
You already have the pipeline (`fake-data-generation/seed-content/` JSON → markdown → IPFS → signed → attested). Wrap it: founder writes a statement cluster in a simple format (or a form), tool uploads, requests implication attestations, publishes a curated collection. And ship the **vertical-founder AI skill** — the `hidden-majority-patterns` doc is already written as "working instructions for the mediator"; the same material works as instructions for an LLM helping a founder draft pole/normal/commonality clusters for *their* domain. Founders will be using LLMs anyway; packaged expertise is your cheapest scaling mechanism, and `ai-assistance.md` already anticipates skills as a layer.

**6. Embeds and deep links — the founder's distribution surface.**
Founders promote on their own channels, so give them artifacts that travel: shareable sign-this-statement links (already flagged in `new-user-experience.md`), and embeddable widgets — a live supporter-count badge, a portal progress bar, a pledge button — that work in a Substack post or any website. Every embed is the franchise's marketing *and* yours.

**7. A permissionless vertical directory.**
Somewhere (the Commonality site is the natural home) a "movements built on this" listing — itself just a curated collection, filterable by trust, not gatekept by you. Social proof for the franchise model, discovery for new founders, and proof that you're not the bottleneck.

**8. The forkability/ops kit for tier-3 founders.**
For the rare founder who wants their own full deployment: the run-your-own-instance guide, `render.yaml.template`, and — this is a genuinely distinctive asset — **the verifier harness as the franchise health-check**. "Fork it and `npm run verifier:go` tells you what's broken" is an ops story most protocols can't offer.

### Two strategic notes from this lens

**Don't build the kit speculatively — extract it from two real franchisees.** This is your own composability discipline applied to GTM. You have one candidate in the docs already (the Christian friend / Koinonia) and the localism kernel is another natural one. Concierge those one or two founders through the current rough path, and let every friction point they hit become the kit's backlog. A kit built in the abstract will smooth the wrong steps.

**The level-playing-field claim is *almost* true — defaults are the residual power, so make them legible.** No fees and self-hostability genuinely flatten the financial and trust asymmetries. But whoever ships the default trust lists, the default attesters, the seed content, and the hosted conveniences holds soft power, and sophisticated founders (especially politically-coded ones) will notice. The trust-pack primitive is your answer: it converts invisible defaults into visible, swappable, founder-ownable choices. That's not just a feature — it's what makes the "I'm not in a special position" pitch checkably true, which is the whole credibility basis of the franchise offer.

One last reframe: under this lens, you *do* still have one flagship promotional job, but it's bounded and it's one you're well-suited for — **Civility and CSM are the reference franchises.** Their job isn't just to succeed on their own terms; it's to be the existence proof and the worked example that every founder kit, doc, and template points at. "Here's the movement I built on these rails; here's the manifest, the seed cluster, the mediator config, the trust pack — fork the pattern" is a much more natural role for the tech-guy-plus-founder you're describing than evangelist-for-all-use-cases ever would be.


## Me summarizing that

If I step back and squint, the overall suggestion there was to abstract this system into a framework (in the sense of "libraries vs frameworks" - "don't call us, we'll call you" - or think of Joel Spolsky's "leaky abstraction" ideas) where various aspects of the vertical are formalized enough that I can just let the vertical founder specify them and then my generic framework uses them.

Fair enough, except I'm skeptical in general of frameworks like that; my suspicion is that I won't be able to make a sufficiently non-leaky abstraction. I'd be happier with something more like a "library" - "I'm providing some building blocks, you use them as you see fit."

I'm not too worried about this being too difficult for potential vertical founders; we can always say "tell your AI to clone this Git repo and follow the readme, it'll know what that means." Doesn't reduce friction quite as much, but constrains them a lot less.

Does that make any sense? Feel free to push back.


## AI response

Yes, it makes sense — and in the LLM era it's *more* right than it used to be, because the economics of "leaky abstraction" have changed. Spolsky's argument assumed the person beneath the abstraction is a human for whom every leak is a cliff. An AI agent reading your source can see through the leak: for an LLM-mediated founder, the abstraction doesn't need to be airtight, just *honest* — clear invariants, good docs, working examples. The best "framework" for an AI is two complete worked verticals and a README that tells the truth. You already have both verticals; that's most of the kit.

But let me push back on one thing, because I think "library vs framework" is slightly the wrong axis. The axis that actually matters here is **what must be shared vs what can be forked** — and your system has a hard core where framework-like rigidity isn't optional, because the value lives in shared state, not shared code.

### The layer that must not fork

The entire thesis — organic coalitions, indirect counts, cross-vertical discovery — depends on all verticals writing into **one statement space, one implication graph, one attestation/trust namespace, one event history**. A Christian vertical and a localism vertical only discover their overlapping causes if they're pointing at the same Beliefs contract and the same CID space. If founders fork freely and deploy their own contract instances, you don't get a federation of movements; you get disconnected islands, and Commonality loses the property it's named for.

So the discipline goes exactly here: **be loose with code, strict with data.** A leaky UI kit is fine — the founder's AI edits the code, no harm done. A leaky or unstable *format* — event schemas, publication kinds (`nudge-batch`, `curated-collection`), canonical content IDs, statement documents, trust-pack format if you build it — fragments the ecosystem in a way no AI assistant can patch over, because the damage is in everyone else's clients. Those formats are the genuinely framework-ish part ("don't call us, we'll call you" — clients fold whatever conforming documents anyone publishes), and conveniently, they already exist and are already designed in that inversion-of-control style. Keep them versioned, conservative, and documented as *protocol*, and you can afford to be completely laissez-faire about everything above them.

### What the library story changes from my earlier list

Rerunning my suggestions through your lens, most survive intact — they were never really framework features:

- **Trust packs, persona specs, seed-content tooling** — these are document formats plus CLI scripts plus examples. Pure library. Arguably trust packs become *more* important under the fork-friendly model, because they're how a vertical's configuration travels without shared code.
- **The thing I'd genuinely drop** is the "generic vertical host that renders manifests" idea. You're right that it's the leakiest abstraction on the list — landing pages and product flows are exactly where founders will want to deviate, and a manifest schema would fight them. Replace it with: a template repo (or "fork the monorepo, here's the four files to touch" — the christian-pitch doc already documents this path), plus the Koinonia page as the worked static example.
- **The tier-0 "start a movement" flow** survives, but reframe it: it's not framework-for-founders, it's product UI on *your* deployment. A pastor doesn't clone a repo; they fill in a form on Aligning. The repo-cloning path is for founders who want a *brand*, and that's the right split.

### Three caveats worth taking seriously

**1. Fork drift is a real cost — decide the supported relationship to upstream.** With a framework you upgrade once; with forks, contract fixes and UI improvements don't propagate unless founders re-sync. The mitigation is the same point again: as long as the shared-data layer is canonical, even a stale fork interoperates — its statements still land in the same graph, its attestations still fold in everyone's clients. So drift degrades the *founder's own UX*, not the commons. That's an acceptable failure mode; just make it explicit. (You've already published the SDK and verifier to NPM — continuing that incremental extract-what's-stable-into-packages motion is the practical middle path between "PR into my monorepo" and "fork everything.")

**2. The trust burden of forked UIs is bigger than for nudgers.** Your trust taxonomy correctly says nudgers are ephemeral and self-hostable, so trust is cheap. But a vertical founder's forked *UI* is the thing users sign transactions in — a malicious or sloppy fork can mislead people about where money goes. Under the fork model, each founder carries that trust burden personally, which is philosophically consistent (they're a trusted party like any attester), but it should be said out loud in the founder guide, and the canonical contracts + IPFS-pinned builds give honest founders the tools to be verifiable.

**3. "Tell your AI to clone the repo" raises the floor for who can found a vertical — and that's fine, but know it.** The founders this filters *in* are exactly the high-agency, opinionated people you want as franchisees, and the AI assist makes the pool much bigger than "TypeScript developers." But it does mean the bottleneck shifts to the README — which makes the docs the actual product surface for founders. Concretely: the highest-leverage "feature" under your lens might literally be a `workflow/roles/vertical-founder.md` + a top-level "found a vertical" guide written *for an AI agent to execute* — prerequisites, the four files, the seed-content scripts, the persona deploy, the verifier checks to run at the end. You already write docs for ephemeral LLMs everywhere else in this repo; this is the same move pointed outward.

### The one-line version

Your instinct is right: ship building blocks, examples, and an AI-executable guide rather than a manifest-driven framework — but treat the on-chain data layer and the document formats as the one place where you *do* owe the world a rigid, boring, non-leaky abstraction, because that's where the network effect lives and no amount of founder-side AI can compensate for fragmentation there.


## Summary so far?

So where did we end up? What am I adding to my to-do list, or to my mindset going forward, as a result of this conversation?

Trying to make a list, but please fill it out:
  - Gotta implement normie features.
  - Look harder for a way to get unique-human-verification to work earlier on, don't just wait for that to eventually become available.
  - I like the idea of my role being "run these two verticals and use them as an example for recruiting founders".
  - Let's have a separate session where we try to figure out how to offer a really smooth path for various kinds of use cases:
    - funding a local community thing
    - some org matching donations
    - credible threat to deter defunding
    - tip-jar migration for creators/OSS
    - "movements" that make use of this infrastructure with a particular focus

## AI response

Good list. Here's what I'd fill in — your items plus what's missing from the conversation:

### Your items, with refinements

- **Normie features** — with the specific definition of done from the `ux.md` audit: a church treasurer can set up "collect donations for the roof" in 10 minutes — donation-first create flow (dollar goal, give-any-amount, confirmed recipient, optional deadline), token machinery behind an advanced toggle, embedded wallets, fiat bridge, no jargon, "Buy Tokens" → "Give."
- **Unique-human verification, earlier** — the cheap near-term slice is the **tiered-counts display** (asserted vs. verified) on Tally, shipped before any count is ever publicly cited. The credibility of the number is the CSM product; an attackable number is worse than a small one. The `unique-human-id.md` account-as-anchor design means you can ship the convention + display now and slot a provider (World ID or whatever wins) in later.
- **Role: run Civility + CSM as the reference franchises** — with the corollary that their job is partly to be the worked example: every founder-facing doc points at their manifests, seed clusters, mediator config as "fork this pattern."
- **Smooth-path session for the five use cases** — agreed. Suggested framing for that session: for each use case, walk the actual end-to-end journey of a named persona and list every point of friction; the output is a per-use-case backlog, not abstractions.

### What I'd add

**Strategy / mindset:**
- **The unit of adoption is a trust network, not an individual.** Win whole communities; measure "alive communities" (returning delegates, repeat funded projects), not signups.
- **Loose with code, strict with data.** Library-not-framework for everything founder-facing; but treat the on-chain contracts, event schemas, publication kinds, document formats as versioned protocol — that's where the network effect lives and the one abstraction you owe the world rigidity on.
- **Don't build the founder kit speculatively** — concierge the first one or two external vertical founders (the Christian friend / Koinonia is candidate #1) and extract the kit from their friction points.
- **Defaults are the residual soft power** in a no-fee, self-hostable system — keep them legible and swappable (trust packs are the mechanism).
- **Decide the political coding of the first flagship deliberately** — lead with apolitical local goods, or pair coded causes — rather than letting the first inbound opportunity brand the platform.

**Concrete to-do candidates:**
- **Legal consult before mainnet** — execute the `legal.md` plan (vocabulary: "donation receipts," not investing/VC language in UI) and get a real crypto-savvy lawyer's read on the resellable-receipt + bridge-operator questions.
- **Apply to crypto public-goods funders** (Gitcoin rounds, Optimism RetroPGF, EF) — they're simultaneously your funding, your first users, and your best demo ("Commonality's development is funded on Commonality"). Also addresses the `fees.md` runway problem.
- **Tier-0 "start a movement" flow** — mission statement + seed cluster + portal + delegate + share link as a guided no-code flow on your deployment. The floor case of vertical-founding.
- **Trust packs** — one-click adoptable, signed bundles of recommended attesters/nudgers/delegates. The franchise distribution primitive and the honest answer to the defaults problem.
- **Shareable sign-links + embeddable widgets** (supporter-count badge, pledge button, portal progress bar) — the founder's distribution surface; already flagged in `new-user-experience.md`.
- **`workflow/roles/vertical-founder.md` + an AI-executable "found a vertical" guide** — since "tell your AI to clone the repo" is the official path, the README *is* the founder product. Persona-as-config CLI (keygen, env, `.well-known`) and the service-bundling TODO cleanups are prerequisites here, not janitorial work.
- **One real local community, concierge-style** (Grey County is sitting right there in your own docs) — convert the Millbrook fiction into a true story with names and numbers; it's the case study every other pitch cites.
- **Prewritten credible-threat playbook + a watch** for defunding events — event-driven adoption; one publicized "the pledges went up and the funder backed down" story is the press moment.
- **One real retroactive-funding round** in a crypto/OSS niche with actual payouts — the existence proof that scouts get repaid, which every retro pitch needs.
- **Demand test for Civility** — a cheap real-money test of "people will pay for noninflammatory content" before more machinery rests on that thesis.
- **CSM sequencing:** hold it until counts are verifiable and the platform is legitimized by boring use; meanwhile warm up the indirect-count mechanism in low-stakes domains (programming languages, diet wars, potholes).
- **Docs prune pass** — `mvp.md`'s own TODOs say parts are wrong; for a project staffed by ephemeral LLMs, stale docs are actively dangerous. Worth a scheduled periodic pass.

If you want, I can write the durable parts of this into the repo — e.g. add the concrete items to `TODO.md` and/or drop a strategy note under `specs/product/` capturing the franchise/library framing — so it survives this session.







