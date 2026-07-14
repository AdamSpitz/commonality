# Operator posture — "decentralized protocol" vs. "platform"

## Why the characterization matters at all

Hosting a platform isn't itself illegal. "Protocol vs. platform" isn't a legal category with its own rule — it's a characterization that determines **whether the conduct elements of the other risks attach to us**. Almost every risk in this directory has the structure "it's illegal to *do X*," and platform status decides whether we're the one doing X:

- **[Securities](securities.md):** beyond the promoter problem (which attaches to us either way), if the tokens are securities then whoever *operates a facility for trading them* is an unregistered exchange/dealer (CSA SN 21-329). A protocol isn't an exchange; a platform running the trading UI is. This prong isn't fixable with procedures — we can't realistically register as an exchange — so it's the one place platform status is nearly fatal rather than merely costly.
- **[Sanctions](sanctions.md):** the offense is *facilitating* value transfer. Publishing a protocol isn't facilitation; displaying projects and routing donations is.
- **[Content/speech](content-and-speech.md):** exposure attaches to whoever *chooses what to display*, especially after notice. A protocol makes no display choices.
- **[Political funding](political-funding.md):** the violation is providing money or in-kind support (sponsored gas, display/routing) — platform-side conduct.

Three further reasons, even though platforms are legal:

1. **Platforms have affirmative duties protocols don't** — charitable-fundraising-platform registration (CA AB 488), PIPEDA obligations, ToS/consumer-protection, online-harms regimes. These don't ban platforms; they impose paperwork, and *failing the paperwork* is the violation.
2. **Control creates duty.** A platform *can* take things down, block wallets, clear a queue — so it can be ordered to, and once on notice, not acting becomes culpable. The mitigations in the sanctions/content files are really "the cost of being a platform, paid openly."
3. **Platforms are legible defendants.** Regulators and plaintiffs need someone with control and assets to proceed against.

The failure mode is not "being a platform" — it's *operating* a platform while *claiming* protocol: all the platform exposure (we're doing the conduct) with none of the platform protections (no entity, no ToS, no documented procedures), plus a credibility hit when the claim doesn't survive scrutiny. Hence the recommended posture below: be a platform on purpose for the manageable risks, and treat securities as the one gate that must be resolved rather than complied around.

## The current reality

We'd like to be able to say "this is a decentralized protocol; we don't endorse projects." But the reality described in the MVP doc is: we run eight branded websites, the indexer, the platform-api-service, AI attesters and nudgers, seed content, the sponsored-gas *infrastructure* (though the intended posture is that we fund no tanks ourselves — creators fund their own; see [sponsored-gas.md](/specs/tech/sponsored-gas.md) Decision 3), and a content-submission queue an operator can manually clear. That's operational control, and regulators and plaintiffs will see a platform, not a protocol. The decoupling strategy (separate repos, IPFS-hosted UI, The Graph) helps at the margins but doesn't change who operates the front doors people actually use.

**What to do:** stop leaning on "we're just a protocol" as the primary defense — it won't hold while we're the sole operator. Instead: form a corporation *now* (an unincorporated Canadian individual personally operating this is the worst possible liability posture), get real Terms of Service written, and treat the protocol/platform separation as a long-term direction rather than a current shield.

## Does the open/decentralized architecture help? (Jul 2026)

Adam asked whether the openness of the architecture changes this analysis: no services are hard-coded (users can repoint to anyone's attester/indexer), the UI lives on IPFS, and the UI paradigm could shift from "we run one site displaying all projects" to "we run no UI; any community runs a UI displaying projects aligned with its cause, moderated per its own values."

Assessment: **it helps, but unevenly across the risks, and only to the extent the decentralization is factually true at the time of scrutiny — affordances don't count, only facts on the ground.**

- **Helps a lot on [sanctions](sanctions.md) and [content/hosted-speech](content-and-speech.md) risks (bad projects, moderation).** Display/takedown/defamation exposure attaches to whoever chooses what to display. Community-run UIs that moderate per their own values own that exposure and have the tools to manage it. This is the pattern that survived real scrutiny: Uniswap Labs runs *a* moderated front-end (token blocklist) while treating the protocol as neutral; the SEC closed its investigation without enforcement (2025). The Tornado Cash saga supports the same split from the other side: *Van Loon* (5th Cir. 2024) protected the immutable contracts themselves and OFAC delisted, but Roman Storm was still prosecuted over the *ancillary services the developers operated*. Publishing code: well protected. Operating services: where liability lives.

- **Helps only modestly on the platform-vs-protocol problem (this file).** Regulators look at conduct, not capabilities. "Users *can* repoint to another attester" is irrelevant while we run the only attester, indexer, gas sponsorship, and default front door (cf. Ooki DAO — the people actually operating the thing were treated as operators). Two traps: (a) a "separate org for generic infrastructure" is cosmetic while the same solo founder controls both orgs — it becomes real only when different people run them; (b) the timing problem: "we run the defaults to get things started" means at launch — when scrutiny is likeliest — we are unambiguously the operator, and decentralization achieved later doesn't recharacterize earlier conduct. Honest test per component: "if I disappeared tomorrow, would users' experience continue unchanged?" Yes → the decentralization argument is real (contracts, IPFS statements). No → we operate that piece and should own it rather than argue "technically we aren't hosting it."

- **Helps almost none on [securities](securities.md) risk.** Securities risk attaches to the author of the mechanism and the promotional narrative, not the host; CSA jurisdiction follows Adam as a Canadian resident, not the servers. Worse, the community-UI model has a flip side here: if the tokens are securities, every community running a UI with secondary-market trading is potentially operating an unregistered trading interface — decentralizing the UI *distributes* that liability onto our most enthusiastic supporters rather than dissolving it. So the securities posture must be resolved *before* encouraging community front-ends, not after.

**Recommended framing:** adopt the community-run-UI paradigm as the end state (it genuinely addresses the moderation/content risks and matches the project's values), but launch honestly:

1. An incorporated entity operates one explicitly-editorial, moderated UI — "our view of the ecosystem" — the Uniswap Labs pattern, without claiming protocol-neutrality for the parts we run.
2. Make the decentralization factual, not rhetorical — publish the pinnable IPFS UI build, document how to run every service, recruit a genuine independent second operator (each real one converts the story from affordance to fact).
3. Sequence securities-story cleanup before community UIs.

For a component-by-component breakdown of which services actually need multiple independent providers (and which don't), see [multiple-providers.md](multiple-providers.md).

## Takedown ability, by layer (Jul 2026)

Adam asked: how much does it help or hurt to *not* have the ability to do takedowns — and does the architecture need rework so that the takedown/delisting procedures in [sanctions.md](sanctions.md) are even possible? Answer: no rearchitecting. "Takedown" never meant on-chain takedown, and the layer where the ability is needed is a layer where we already structurally have it. The line runs between layers:

**At the contract layer, inability helps — keep it.** No one (including us) can freeze a project, seize escrow, or delist anything from the chain, and that's a feature of the legal posture, on three grounds already in this directory: (1) the *Van Loon*/Tornado Cash split — immutable contracts are the protected category; liability attached to the ancillary services the developers operated; (2) control creates duty — a contract-level kill switch is something we could be ordered to use and blamed for not using after notice; no lever, no compulsion target; (3) an admin key with power over user funds would cut against the non-custodial story [money-transmission.md](money-transmission.md) depends on ([what-we-host-and-control.md](what-we-host-and-control.md) already flags the ChannelVerifier key as bad for exactly this reason). **Do not add takedown powers to the contracts** — that would convert the best-protected layer into an operated service.

**At the service layer, inability hurts — and is also fictional.** The UI is our code, the indexer is our Ponder instance, the submission queue is a file on our server, the IPFS pins are ours. "We can't take it down" here would just mean "we never wrote the filter," and a regulator won't read that as decentralization — the honest test above ("if I disappeared, would users' experience continue?") fails for all of these. For sanctions specifically (strict-liability-ish, attaches to *facilitation*), knowingly continuing to display and route donations to a listed person because we declined to build a filter is close to the worst possible fact pattern. Moderating the front-end does not contaminate the contracts' protocol status — that's precisely the Uniswap Labs pattern (moderated front-end + neutral protocol) that survived scrutiny.

**What the ability actually requires** — feature work plus documented process, not architecture:

1. **A denylist** (project IDs, wallet addresses, statement/metadata CIDs) consulted by the UI before display and before offering the contribute flow. Folding is client-side, so this is a config file the UI fetches — the same shape as the existing `VITE_*` defaults and known-contract-set lists. UI-level is the right primary home (it matches the end state where each community UI owns its own display exposure); indexer-level filtering is optional on top.
2. **Unpinning** anything we pin on IPFS, on notice. Others may re-pin; irrelevant — our conduct is what's at issue.
3. **Submission-queue rejection** — already operator-clearable; document it as a process.
4. **Refusing sponsored gas** to flagged addresses (the [political-funding](political-funding.md) in-kind-support angle).
5. **The one real design gap: the unclaimed-channel escrow.** Funds accumulate *on-chain* for a named person, so a UI-level takedown doesn't stop the eventual release — and note the irony that today's centralized verifier is the sanctions choke point, and shipping the trustless verifier *removes* it. Screening must therefore move to channel-creation/display time (refuse to display or route contributions to contracts referencing a flagged identity) — a UI/service-layer control, not a contract change. This is the "unspecced design requirement" in the [README re-rank](README.md#re-rank-after-the-control-audit-jul-2026), and the only takedown-adjacent item needing actual design work.
