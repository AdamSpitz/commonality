# Which services need multiple providers, and why

An inventory of every subsystem and service: what each one is *for*, what legal exposure operating it creates, and whether having multiple independent providers actually changes the legal analysis — or is just decentralization theater.

## The framework

"Multiple providers" helps legally for exactly two distinct reasons, and it's worth keeping them separate:

1. **Editorial exposure moves to each provider.** Where a service exercises *judgment or selection* — choosing what to display, rating someone, curating, moderating — the exposure (defamation, sanctions-facilitation, hosted-speech) attaches to whoever exercises that judgment. Multiple providers turn "the platform's judgment" into "a marketplace of opinions the user chose among." This is a real legal transformation, but only if users genuinely choose.
2. **Essential-infrastructure sole operation defeats the protocol claim.** Where a service is load-bearing plumbing (if it goes down, the system stops working), being its sole operator makes us the operator of the system, whatever the architecture diagrams say (see [operator-posture.md](operator-posture.md)). Multiple providers here don't reduce any *specific* exposure; they make the "decentralized protocol" characterization factually true.

Two places multiple providers do **not** help:

- **The [securities](securities.md) story.** That risk attaches to the author of the mechanism and the promotional narrative, not to who hosts what. No amount of provider multiplicity fixes it.
- **Pure facilitation.** Where the legal question is "did you facilitate this transfer" (gas sponsorship, on-ramps), each provider is a principal facilitator; multiplying them distributes exposure without reducing anyone's. The fix there is screening and policy, not multiplicity.

And the standing caveat from [operator-posture.md](operator-posture.md): only *factual* multiplicity counts. "Anyone could run one" is an affordance; regulators look at who actually runs things at the time of the conduct.

## Component-by-component

### Smart contracts (Beliefs, Implications, AlignmentAttestations, FreeERC1155, PremintingERC1155, AssuranceContract, ERC1155PrimaryMarket, ERC1155SecondaryMarket, DelegatableNotes, NoteIntent, mutable refs)

- **Purpose:** the neutral settlement and data layer — funding mechanics, token issuance, attestation records, statement signatures.
- **Exposure from operating:** essentially none, *because there is no operating*. Deployed immutable code with no admin keys isn't a service anyone provides (see [smart-contracts.md](smart-contracts.md); *Van Loon*). The repo's no-upgradeable-proxies stance ([contract-versioning.md](/specs/tech/contract-versioning.md)) is doing quiet legal work here: upgrade keys are what convert published code into an operated service (and feed the "efforts of others" securities prong). Keep it that way.
- **Multiple providers?** Not applicable — the chain itself is the provider, and anyone can deploy another instance. Verdict: **already permissionless; the thing to protect is the absence of admin keys.**

### Indexer (Ponder thin event cache)

- **Purpose:** convenience cache of raw on-chain events so UIs don't need an archive node. Deliberately dumb — client-side folding means all business logic runs in the user's browser.
- **Exposure from operating:** low and non-editorial. It serves raw events without selecting, ranking, or interpreting; there's little speech or judgment to attach liability to. The client-side-folding architecture is itself a legal asset worth preserving: the "platform logic" is not operated by anyone — it executes on the user's machine.
- **Multiple providers?** Needed for reason 2 (essential infrastructure), not reason 1. If we run the only indexer, the system fails the "if I disappeared tomorrow" test. The planned Graph migration is the structural fix (a permissionless indexer network is multiplicity by construction); until then, documenting how to self-host the Ponder indexer and having at least one independent instance is the honest interim. Verdict: **multiple providers valuable for operator-posture credibility; the indexing itself is not where risk lives.**

### Attesters (implication-attester, content-attester, beat-agent)

- **Purpose:** publish signed on-chain judgments — "S1 implies S2," "this content aligns with this statement," civility/noninflammatory scores.
- **Exposure from operating:** this is generated speech with consequences. A civility score that lowers a named creator's earnings is arguably disparagement ([content-and-speech.md](content-and-speech.md)); alignment attestations shape what gets displayed and funded ([sanctions.md](sanctions.md)). If we run the only attester whose scores gate money, we are functionally a central rating agency, and every disputed score is our conduct.
- **Multiple providers?** **Yes — this is one of the two places it matters most (reason 1).** The Subjectiv trust-graph design only works as a legal defense if there actually *are* multiple attesters to trust or distrust: "users chose which raters to believe" is a real answer to a disparagement claim in a way that "our algorithm decided" is not. Independent of multiplicity, frame every attester output as an automated opinion with disclosed methodology. Verdict: **recruit genuinely independent attesters early; until they exist, our attestations are our speech, full stop.**

### Finders (implication-finder, content-finder)

- **Purpose:** mechanical discovery — watch events/queues/feeds, pair up candidates, submit them to attesters. The proactive counterpart to the reactive attesters.
- **Exposure from operating:** mild. They don't judge, but they do decide *what gets evaluated*, which is a weak form of curation (a finder that only ever surfaces one side's content would shape the graph). The judgment still happens at the attester.
- **Multiple providers?** Nice for ecosystem health; not legally load-bearing. Verdict: **low priority.**

### Nudgers and curators (implication-graph-nudger, bridge-creator, explorer-curator)

- **Purpose:** suggest statements to users ("you signed S1, consider S2"), synthesize common-ground statements, maintain curated collections (e.g. Aligning's fundable-project explorer).
- **Exposure from operating:** these are the most openly *editorial* services in the system — they steer users' expressed beliefs and steer money toward curated projects, and bridge-creator generates politically flavored content ([political-funding.md](political-funding.md), [content-and-speech.md](content-and-speech.md)). "The platform nudged users toward viewpoint X" is a bad sentence; "users subscribed to a nudger that openly advertises viewpoint X" is a defensible one.
- **Multiple providers?** **Yes (reason 1).** A nudger is only defensible as a user-chosen opinion service, and that requires real alternatives plus a genuine chooser UI. The explorer-curator matters specifically because it curates *fundable projects* — its selections inherit the sanctions/display concerns. Verdict: **same tier as attesters; the chooser UX is part of the legal design, not just the product design.**

### Platform API service

- **Purpose:** platform-dependent plumbing — resolve creator handles/content URLs to canonical IDs, run channel-claim verification, host the content-submission queue.
- **Exposure from operating:** the resolution/verification parts are neutral plumbing (main risk is external platforms' ToS, a business risk more than a legal one). The **submission queue is different**: a queue an operator can manually clear is a moderation chokepoint — that's editorial control, and it's ours.
- **Multiple providers?** Split verdict. The plumbing: reason 2 only, low priority. The queue: rather than multiplying providers, **move it to the UI layer** — each front-end operator runs their own submission queue and owns their own moderation, consistent with the community-run-UI model. Verdict: **restructure the queue's ownership; don't bother multiplying the plumbing yet.**

### UI domains (the eight sites: Commonality, LazyGiving, Aligning, Tally, Content Funding, Civility, Common Sense Majority, Conceptspace)

- **Purpose:** the front doors — display, curation, framing, and the words users actually read.
- **Exposure from operating:** the highest concentration in the system, and of every kind at once: the securities *story* lives in UI copy ([securities.md](securities.md)); "donate" wording triggers charitable-solicitation rules ([charitable-solicitation.md](charitable-solicitation.md)); displaying and routing contributions to arbitrary projects is the sanctions surface ([sanctions.md](sanctions.md)); choosing what to display is the hosted-speech surface ([content-and-speech.md](content-and-speech.md)).
- **Multiple providers?** **Yes — the other place it matters most (reason 1), with a sequencing constraint.** This is the community-run-UI model analyzed in [operator-posture.md](operator-posture.md): each community front-end owns its own display exposure and moderation. But the securities posture must be resolved *first* — if the tokens are securities, a community UI with trading is an unregistered trading interface, and multiplying providers distributes that liability onto supporters. Verdict: **the end-state paradigm; securities cleanup is the gate.**

### Edge gateways and DNS (cloudflare-service-gateway, cloudflare-ui-gateway, `*.commonality.works`)

- **Purpose:** naming and proxy convenience over IPFS-published UI builds and Render-hosted services.
- **Exposure from operating:** whoever runs the domain users type in operates the site, IPFS backing notwithstanding — "technically we aren't hosting it" doesn't survive owning the DNS. The gateways are where our operation of the front doors is legible.
- **Multiple providers?** Follows the UI verdict: in the community-run-UI end state, each community brings its own domain and gateway. Multiplying gateways in front of *our* sites changes nothing. Verdict: **derivative of the UI decision.**

### IPFS pinning (statements, UI builds)

- **Purpose:** content persistence for statements and published UI builds.
- **Exposure from operating:** if we're the only pinner, we're the host in practice — and Canada's post-notice hosted-speech exposure ([content-and-speech.md](content-and-speech.md)) means "it's on IPFS" is only as true as the number of independent pinners.
- **Multiple providers?** Yes, and it's the *cheapest* multiplicity available — pinning requires no trust, no ops skill, and no legal posture from the volunteer. Publish pin-lists and actively encourage community pinning. Verdict: **do it early; high credibility per dollar.**

### Gas sponsorship / embedded wallets (Privy scaffolding, sponsored-gas path)

- **Purpose:** mainstream UX — let a normal person act on-chain without holding ETH or managing keys.
- **Exposure from operating:** the non-custodial design keeps this out of money transmission ([money-transmission.md](money-transmission.md)), but sponsoring gas is *facilitating the specific transaction being sponsored* — the sanctions and political-funding surfaces (in-kind support for a US political contribution is itself a violation; see [political-funding.md](political-funding.md)).
- **Multiple providers?** **No — this is the pure-facilitation case where multiplicity doesn't help.** Every sponsor is a principal. The fix is wallet screening and a political-funding policy applied by whoever sponsors. In the community-UI end state, sponsorship naturally moves to each front-end operator (they sponsor their community, under their policy) — but that's distributing responsibility, not diluting it. Verdict: **screening + policy, not multiplicity.**

### Fiat on-ramp / bridge operators

- **Purpose:** card → USDC → contract, for normal people.
- **Exposure from operating:** running this ourselves is money transmission; the design already refuses to ([bridges.md](/specs/tech/bridges.md)) — the donor is the principal, a licensed third party (e.g. a plain on-ramp) carries the MSB burden.
- **Multiple providers?** Already structurally third-party, which is the strongest form of "multiple providers": *zero* providers are us. The bridges doc's operator taxonomy (creator-run, charity-run, licensed vendors) is exactly right. Verdict: **solved by design; the discipline is never becoming a provider ourselves.**

### Seed content

- **Purpose:** one-time authored statements/projects to solve the empty-field problem.
- **Exposure:** it's our speech, permanently attributable to us. Not a service, so multiplicity doesn't apply — but seed content should be written to the same standard as UI copy (no profit language, nothing we wouldn't sign our name to, because we did).

## Summary: priority order for real multiplicity

1. **Attesters + nudgers/curators** — editorial speech that gates money and steers beliefs; multiplicity is the difference between "our ratings" and "a market of opinions users chose." Needed early, and the chooser UX is part of the legal design.
2. **UIs (and their gateways/domains/submission queues)** — the biggest exposure surface; community-run front-ends are the end state, gated on securities cleanup.
3. **IPFS pinning** — cheapest real decentralization available; start immediately.
4. **Indexer** — operator-posture credibility, not risk reduction; The Graph is the structural fix.
5. **Not worth multiplying:** finders and platform-api plumbing (low stakes), gas sponsorship (multiplicity doesn't help; screening does), contracts (already permissionless — protect the no-admin-keys property), on-ramp (already fully third-party).

The pattern worth noticing: the priority order tracks *how much judgment the service exercises*, not how technically central it is. The most load-bearing infrastructure (contracts, indexer) needs multiplicity least; the most opinionated services (attesters, curators, UIs) need it most.
