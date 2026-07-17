# Statement hosting and display posture

Who hosts and who displays conceptspace statements, and how to shrink our role in both. Written Jul 2026, out of a conversation that started from a product observation and ended at an architecture proposal. Companion tech spec: [self-published-statements.md](/specs/tech/subsystems/conceptspace/self-published-statements.md).

## The product fact that unlocks this

An audit of the main use cases found that **no human flow needs a general-purpose "browse all statements" surface.** Humans arrive at *particular* statements: a movement's core statement S and its seed cluster, cause boards (`/portal/${statementCid}`), shareable links, and curated explorer maps. The specs already deliberately avoid open browsing (no generic Tally `/explore`; goal-oriented explorers with small curated collections instead). The parties that *do* sweep the whole statement space are machines — explorer curators, the implication attester, the bridge creator — and they read from the indexer plus content storage directly, not from any UI.

So the general-purpose Tally browser can be dropped at approximately zero product cost. [ui-operator-posture.md](/specs/product/ui-operator-posture.md) already listed "make Tally mostly a module" as an option; the use-case audit removes the last reason to prefer the other option. Each remaining statement surface is then explicitly a curated view — never "the canonical place to browse everything anyone wrote," the hosted-speech trap that file warns about.

Two honest caveats on how much dropping the browser buys:

1. **Display exposure shrinks but doesn't disappear.** Any operated UI that renders an arbitrary statement CID on demand — statement detail pages, `/portal/${cid}`, shareable links, nudge cards, implication-neighbor lists — is still displaying user content. The planned denylist ([operator-posture.md](operator-posture.md), takedown-by-layer) stays necessary, and it must cover **exclusion from aggregation** (folding a defamatory Sn into "118 indirect supporters" is a display act), not just "don't render."
2. **Takedown-request exposure was never the argument for the browser's removal.** Being askable to take things down is fine — at the service layer, takedown *inability* is what hurts. What the browser's removal fixes is being the universal neutral surface where every demand about anything lands.

## Role vs. capability: why "we built it so we can't comply" cuts both ways

This came up because "switch to permanent storage (Arweave) so takedown demands are moot" superficially resembles the immutable-contracts posture that *helps* us. The resolution: **duties attach to roles, not capabilities.**

- **Immutable contracts get away with incapacity because there's no actor left.** The deployer's conduct completes at deployment; afterward there is no operator, no ongoing acts, nothing to enjoin (*Van Loon*). "No lever, no compulsion target" works because there's no one for a duty to land on — incapacity plus absence-of-role means there was never a duty to breach.
- **An operated service can't shed the duty by deleting the capability.** If we run the upload pipeline and pay to push each user's statement to permanent storage, we keep performing new acts daily (ingesting, publishing, funding storage) — the intermediary role hosted-speech regimes attach duties to. Engineering incapacity in advance, with a specs directory proving we foresaw the demands, reads as willful blindness: an operator who booby-trapped their own controls. Each upload also stamps every eventual harm with "the operator chose to make it irremediable" — and forecloses honoring privacy-deletion requests and legitimate user regret.
- **Tornado Cash demonstrates both halves:** the immutable contracts were protected and delisted, while Roman Storm was prosecuted over the ancillary services the developers *kept operating*.
- **Timing and intent color even the contract layer.** Immutability as a from-the-start design value (our no-admin-keys, no-upgradeable-proxies stance) reads as good faith; the same immutability adopted in response to legal pressure looks like structuring.
- **The escape hatch is shedding the role, not the capability.** Same move as the on-ramp ("zero providers are us") and sponsored-gas Decision 3: don't dilute the role, *vacate* it.

## The posture, layer by layer

**Publication/hosting: the author self-publishes.** The strongest version — see [self-published-statements.md](/specs/tech/subsystems/conceptspace/self-published-statements.md) — puts the statement bytes in the calldata of the author's own `createStatement` transaction (bundleable with their first support, so the typical author's single act authors, publishes, and attests belief); the "host" is the chain's replicated history, which nobody operates and nobody can be ordered to purge; and every statement is *cryptographically attributed to its author's address* — the system proves the user is the speaker, so a defamation plaintiff's natural target is the actual speaker. Key discriminator among storage options: **pay-once vs. rent** — rent-based storage (IPFS pinning, Swarm stamps, Filecoin deals) requires an ongoing payer, quietly recreating the operator role; pay-once (calldata; EthStorage later) lets the user's act complete everything. Do **not** do the we-upload-to-Arweave variant: that keeps the role while deleting the compliance capability (see above).

**Pinning: per-vertical and per-author, never "we pin everything."** Until (and alongside) self-publication: each vertical pins exactly what it curates — its core statement S, seed cluster, curated-collection entries, statements on its boards — so pins match editorial exposure. Authors pin their own statements via a pinning service they choose in the creation flow. Publish pin-lists so communities can re-pin. This is also [multiple-providers.md](multiple-providers.md) priority #3 (cheapest real multiplicity), extended from "recruit more pinners" to "make the pin boundaries follow the vertical seams." Keep the documented notice-and-unpin process for anything we do pin: no UI makes notices *less frequent* (less salience), but the duty on receiving one is unchanged.

**Display: curated verticals, each owning its view.** Tally becomes a module (statement signing embedded in movement/vertical sites for their curated statement sets) rather than a global browser. The vertical's relationship to the wider graph is: it *points* ("look how many people published statements implying S"), it *re-serves what it curates* through its operator-scoped indexer, and it can decline to display or aggregate any CID under its policy. Its core statement S is its own explicit editorial speech, owned the way Civility owns its criteria.

**The Sn→S link: still our speech until attester multiplicity is real.** The statements Sn belong to their authors, but the implication attestation connecting Sn to a vertical's S is editorial — and today the sole attester is ours, default-trusted in every build ([what-we-host-and-control.md](what-we-host-and-control.md) finding #4). The attester's conservatism (require context; don't attest vague statements) is genuine "reasonable procedures / disclosed methodology" evidence, but it changes how *defensible* the speech is, not *whose* it is. Independent attesters remain the fix ([multiple-providers.md](multiple-providers.md) ranks it first).

## Residual roles that don't disappear

- **The composer tool** — providing a statement-writing UI is far better than publishing (the user signs and pays), but LLM drafting assistance has a co-authorship flavor; keep the "LLM never generates statement text directly" principle.
- **Gas sponsorship** — sponsoring a publish transaction is facilitation ([political-funding.md](political-funding.md)); users pay their own gas to publish their own beliefs.
- **Re-serving** — each vertical's indexer/UI serving statement bytes is re-publication: scoped, curated, denylistable. That's the display lever we keep on purpose.
- **Informed consent** — permanence must be the user's *disclosed* choice: "this cannot be deleted — by us, by you, by anyone."

## The standing caveat

While Adam operates all the verticals, "that's the vertical's problem" is the solo-founder-two-orgs trap from [operator-posture.md](operator-posture.md) — cosmetic until different people run them. The reason to restructure *now* anyway: exposure boundaries come to follow the vertical seams (own pins, own indexer scope, own denylist, own statement set), so when an independent operator takes over a vertical — or a new movement stands one up — the separation is factual from their day one. Each real independent operator converts the story from affordance to fact.

## Concrete changes this implies, in priority order

1. Demote Tally to a module/embedded signing surface; drop the global browser (near-zero product cost, real posture win).
2. Restructure pinning: author-pins-own + vertical-pins-what-it-curates + published pin-lists.
3. Make sure the denylist design covers exclusion-from-aggregation, not just exclusion-from-rendering.
4. Adopt the self-published-statements design ([tech spec](/specs/tech/subsystems/conceptspace/self-published-statements.md)) when scheduled; until then, don't switch storage networks — permanence at a layer we operate hurts, and rent-based alternatives (Swarm, Filecoin) change nothing.
