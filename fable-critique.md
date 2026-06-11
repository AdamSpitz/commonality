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

## My thoughts

Let's assume that we implement the normie features.

Let's assume that there'll be some kind of viable way to verify unique-humans.

About how people hear about this:
  - Not quite on point, but kinda related: we can use AI to generate seed content. So while we're starting from zero in terms of funding, the statement landscape can be fleshed out right from the start.
  - Tally has a special place for showing signers with a lot of Twitter followers; if anyone actually cares at all about increasing the signer count, that should help motivate them to forward the link up the influence hierarchy.
  - There's that point about how each action, each project, etc., is useful on its own. This system can be useful for some projects and that'll still be true even if it doesn't grow to become super-popular.
  - 