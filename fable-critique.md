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

## Summarizing

  - Need more features for normies: fiat onramp, embedded wallets, donation-first UX, no jargon.
  - If we want the Tally numbers to be credible, we need unique-human verification
  - The demand thesis ("people will pay for content that doesn't enrage them") is unfalsified-but-untested, and revealed preference in media markets points the other way
  - Of 218k words, maybe a few hundred are about how anyone *hears about this*. `memes.md` and a line in `future.md` are it.

## Ask

Let's assume that we implement the normie features. (I don't expect it'll be that hard.)

Let's assume that there'll be some kind of viable way to verify unique-humans.

With the stuff in mind from docs/end-user/commonality/vision-and-strategy, what thoughts do you have on how we might go about gaining adoption?

## AI response

Good — with normie UX and unique-human verification assumed solved, the question becomes pure go-to-market. The vision-and-strategy docs already contain most of the right raw material (dial-not-switch, costless-to-try, credible threats, matching funds, the pitches, the localism sequence); what they don't yet have is a *motion* — who exactly, in what order, acquired through what repeatable loop. Here's how I'd think about it.

## The framing principle: the unit of adoption is a trust network, not an individual

Almost everything distinctive about the system — delegation, attestation filtering, assurance thresholds — presupposes a pre-existing web of people who know each other. A thousand isolated signups give you nothing (empty portals, no delegates anyone trusts, thresholds that never clear). One church, one town, one creator-fanbase gives you a working instance of the whole machine.

So the strategy isn't "market to donors" — it's **win whole communities, one at a time, and make each one a public, copyable case study**. This is also what `scales-down.md` and the localism ratchet/contagion mechanisms already imply; I'd just make it the explicit organizing principle of all GTM work.

Each target community should have three properties: (1) an existing trust graph (so delegates exist on day one), (2) recurring funding needs (so there's a second transaction), (3) its own internal communication channels (so distribution is free).

## A sequence, roughly

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

## The loops to instrument

Pick one loop per segment and actually measure it:

- **Creator loop:** fan funds content → creator's claim-tweet announces it → creator's audience sees it → some become funders. (Built-in distribution; this is why content funding is the wedge.)
- **Community loop:** funded project → public "brought to you by" page + local press → neighboring community copies the playbook (the contagion mechanism from `local-government.md`, but you should actively package "fork this town's setup" rather than waiting for it).
- **Org loop:** successful match → matcher's provable-catalysis report → matcher's peer orgs ask how.
- **Statement loop:** "go sign this" share links (the shareable-links idea in `new-user-experience.md`) — cheapest of all, worth wiring early.

And measure **alive communities** (≥N funded projects per quarter, returning delegates), not signups. Ten thousand wallets and zero second transactions is failure; three communities that keep coming back is success.

## Two strategic tensions to decide deliberately

**Political coding of the first flagship.** The game-theory doc correctly predicts the out-of-power / defunded side adopts first — which today likely means your most motivated early communities are right-coded (the docs note this themselves under "right-coded public goods"). But the first famous use case will brand the platform, and CSM's credible neutrality depends on not being coded. Options: lead with genuinely apolitical local goods (parks, rinks, disaster response — the "Helen response" from the transcripts is a great archetype); or deliberately launch flagship causes in pairs, one coded each way. I'd decide this on purpose rather than letting the first inbound opportunity decide it.

**Concierge vs. protocol purity.** The docs lean hard on "permissionless, nobody runs it." True at the protocol layer — but adoption at this stage requires you to be extremely *present*: operating bridges, acting as first delegate, hand-onboarding treasurers. That's fine (every protocol bootstrapped this way), but budget for it honestly: the next year of adoption work looks like community organizing and account management, not engineering. Given the team is essentially you, that's the real constraint — and another argument for the franchise model in #5, which is the only piece of this that recruits *other people's* time.

## The one-sentence version

Win one real community end-to-end and publish the story; use matching funds as the org door, credible-threat moments as the press door, tip-jar migration as the crypto-native door, and vertical-founder kits as the scaling mechanism — and hold CSM in reserve until verified counts and a legitimized platform can carry it.





## My thoughts

Hold on, I want to question that thing about needing "a pre-existing web of people who know each other".

But yes, the idea of a creator-fanbase makes sense to me.

"win whole communities, one at a time, and make each one a public, copyable case study" - yes.

  So the strategy isn't "market to donors" — it's **win whole communities, one at a time, and make each one a public, copyable case study**. This is also what `scales-down.md` and the localism ratchet/contagion mechanisms already imply; I'd just make it the explicit organizing principle of all GTM work.
  Each target community should have three properties: (1) an existing trust graph (so delegates exist on day one), (2) recurring funding needs (so there's a second transaction), (3) its own internal communication channels (so distribution is free).

I like the idea of starting with one local thing.

Yeah, there are a bunch of kinds of use cases, and all of this becomes more compelling as soon as even one of them happens for real:
  - funding a local community thing
  - some org matching donations
  - credible threat to deter defunding
  - tip-jar migration for creators/OSS
  - "movements" that make use of this infrastructure with a particular focus

I like the idea of recruiting founders, not building sites myself. I want to be directly involved in CSM because I care about it and I don't yet trust anyone else to do it better, but I certainly don't need to be in charge of the Christian one or whatever else, and I shouldn't make a habit of just churning it out because the AI lets me.



About how people hear about this:
  - Not quite on point, but kinda related: we can use AI to generate seed content. So while we're starting from zero in terms of funding, the statement landscape can be fleshed out right from the start.
  - Tally has a special place for showing signers with a lot of Twitter followers; if anyone actually cares at all about increasing the signer count, that should help motivate them to forward the link up the influence hierarchy.
  - There's that point about how each action, each project, etc., is useful on its own. This system can be useful for some projects and that'll still be true even if it doesn't grow to become super-popular.
  - To some extent I don’t care whether we get users. I think this system could be used for use cases the normal systems can’t do; there are some of those that I care particularly about; I want to try to ramp some of those up. But I don’t care about this taking market share from legacy system. Sort of.
  - I'm hoping for some grassroots word-of-mouth. This project is genuinely free to use, in the sense that we don't take any fees; you pay for some of the costs (e.g. blockchain transaction fees - not even the IPFS storage fees, that's done as a public good because I wasn't sure how to integrate Arweave or some other pay-for-the-storage system), but I'm not taking a cut in any way (again, I'm asking for contributions for my work on this as a public good). People can spread the word without feeling like they're shilling for some company.
  - 
