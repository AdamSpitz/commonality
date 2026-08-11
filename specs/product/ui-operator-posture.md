# UI operator posture: protocol software vs operated front doors

This is a product/legal design note, not legal advice. It records a possible direction for the UI-domain split if Commonality wants to avoid becoming the universal platform operator for every project, statement, and funding flow that the underlying contracts make possible.

## The core distinction

The smart contracts should remain censorship-resistant: no contract-level takedown, freeze, or custody lever. But a hosted UI is not the protocol. A hosted UI chooses what to display, what to link, which defaults to ship, which on-ramp/session/sponsored-gas endpoints to use, and which projects to make easy to fund.

So the useful distinction is:

- **Protocol / reference software:** publish contracts, SDKs, docs, IPFS builds, and source code that anyone can run or fork.
- **Operated front door:** a domain/gateway/app that a real operator runs for users. The operator owns its display, routing, curation, and subsidy choices.

UI-level screening does not make the protocol censorship-resistant or censorship-prone; it only answers the question: **what is this UI operator willing to facilitate?** If someone forks the UI and removes screening, that proves the protocol is open, but it does not remove responsibility for the UI we operate.

## Design goal

Avoid running a single canonical, neutral, universal front end that displays arbitrary projects and routes arbitrary contributions.

Instead:

1. Keep the protocol layer open and neutral.
2. Publish reference/operator software for others to run.
3. Operate only sites where Commonality/Adam is clearly speaking editorially, curating a view, or providing infrastructure documentation.
4. Let project creators, causes, charities, communities, and vertical founders run their own funding front ends with their own policies.

This makes screening/moderation less philosophically weird. A curated site excluding something is not “censoring the protocol”; it is one front end applying its own editorial/legal policy.

## The lens posture: generic in subject, non-universal in admission

Frozen as [ADR 0008](/specs/decisions/0008-operated-surfaces-are-lenses.md) (Aug 2026). The design goal above admits a third option that the original framing missed, and CauseStarter is built on it.

The goal says to avoid a “canonical, neutral, universal front end.” Those four adjectives were treated as one property because in the original eight-sites design they arrived together. They are separable, and only one of them is load-bearing. What [ADR 0005](/specs/decisions/0005-founder-first-verticals.md) actually identified as untenable was being *the* platform for everything **with no editorial principle to point at when declining something** — a property of **universal admission**, not of genericness. A front end can therefore be generic in subject matter while listing nothing at all.

A **lens** is such a surface:

- **It authors no discovery.** No search, no browse, no ranking, no featured items, no leaderboards. Content is reached by its own URL, via links its author circulates. The operator drives no traffic and selects no winners, so amplification and endorsement exposure largely vanish.
- **It reviews nothing.** No admission criteria, no queue, no rejections, no listing appeals — because nothing is listed. The apparatus a listing standard needs exists only to gate discovery.
- **Its trust claim is recomputability, not endorsement.** Every derived number exposes its inputs and can be checked independently against chain data. It never claims the things it renders are good.
- **Editorial judgments become attestations, not site properties.** Anything the operator wants to assert (for CauseStarter: that a cause's roster matches its own summary and hides no riders) is published as a positive-only, narrowly-scoped, viewer-trust-configurable attestation bound to an exact artifact hash. That makes the judgment *portable* — a founder-run site can display it and cannot forge it — instead of making the operated site the only trustworthy place to look.

**What the lens posture does not do is discharge any compliance duty.** It addresses curation and promotion exposure and leaves distribution exposure untouched: rendering an arbitrary CID on demand is a display act however the visitor arrived, and [statement-hosting.md](legal/statement-hosting.md) already names shareable links among those arrivals. Post-notice, “we curate nothing” is not a defense — distributor liability attaches *on* notice. Sanctions exposure is unaffected, being about whom you serve rather than what you rank. So [policy-list](/specs/tech/subsystems/policy-lists/README.md) suppression stays mandatory on a lens, and must cover **aggregation as well as rendering** — a suppressed statement has to drop out of believer sets and therefore out of any supporter count, or it is still being published with extra steps.

One cost worth recording, because it is easy to miss when adopting this: removing authored discovery removes the *soft* lever. A directory can feature, list, list quietly, or decline to list. A lens has two states, render and suppress. Every remaining decision is maximally blunt, and the blocklist goes from one tool among several to the only one.

## Domain-by-domain posture

### Commonality — run it

**Recommended posture:** Commonality-run movement and ecosystem site.

Commonality is mostly Adam/Commonality’s own speech: the public-goods thesis, explanation of the mechanisms, ecosystem map, founder/operator pitch, and links to concrete tools or independent operators.

Keep it from becoming the canonical browser for all projects. It should explain the ecosystem, not operate the universal marketplace.

### Conceptspace — probably run it, but keep it infrastructure-shaped

**Recommended posture:** developer/infrastructure docs plus minimal inspectors.

Conceptspace is the statement/implication/trust substrate. It is reasonable to run a site that explains the primitive, documents integrations, and lets advanced users inspect public objects.

Caution: if Conceptspace becomes a global social feed for arbitrary user-authored statements, it picks up hosted-speech risks: defamation, harassment, illegal content, privacy, and post-notice takedown duties. Keep the operated site closer to docs/tools than “the canonical place to browse everything anyone wrote.”

### Tally — maybe run a narrow version

**Recommended posture:** optional; lower money risk, but real speech/privacy risk.

Tally has no direct money flow, which removes the worst sanctions/AML/funding-facilitation concerns. But it still displays user-authored statements, signatures, supporter counts, implication-derived support, and political/social associations. That creates defamation, privacy, misattribution, and hosted-speech concerns.

Two viable shapes:

1. **Run a curated/narrow Tally:** a public statement-signing site with ToS/takedown procedures and careful defaults.
2. **Make Tally mostly a module:** movement and community sites embed statement signing for their own curated statement sets, rather than Adam running the global anything-goes statement network.

If run, avoid presenting it as a universal uncensored speech platform unless Commonality is willing to accept platform duties for that surface.

**Update (Jul 2026): the use-case audit tips this to shape 2 (Tally as a module).** A pass over the main use cases found that no human flow needs a general-purpose "browse all statements" surface — humans arrive at particular statements (movement seed clusters, cause boards, shareable links, curated explorer maps), and the machine consumers (explorer curators, attesters, bridge creator) read from the indexer + content storage, not from any UI. So the global Tally browser can be dropped at near-zero product cost. See [statement-hosting.md](legal/statement-hosting.md) for the full posture (including the caveat that any surface rendering an arbitrary CID on demand is still a display act, so the denylist — including exclusion-from-aggregation — stays necessary).

### LazyGiving — do not run as the universal UI

**Recommended posture:** protocol/reference software/operator kit; maybe demo/testnet.

A generic LazyGiving front end that lets anyone create, browse, and fund arbitrary projects looks like a Kickstarter-like platform operator even though the contracts are neutral. It displays project claims, routes contributions, may initiate on-ramp flows, and may sponsor or smooth transactions.

Better split:

- LazyGiving contracts and SDK remain open infrastructure.
- LazyGiving UI code is reference/operator software.
- Actual project front ends are run by creators, communities, charities/fiscal hosts, cause operators, or other independent front-end operators.
- If Commonality runs any LazyGiving instance, make it explicitly curated: “projects this operator chooses to list,” not “all projects in the protocol.”

### Aligning — do not run as the universal cause-board UI

**Recommended posture:** cause-board module/operator kit; Commonality-run examples only if explicitly curated.

Aligning displays projects through statement/cause boards and trust/attestation defaults. That is funding discovery and curation. It should naturally belong to cause operators: each cause/community runs its own front end, chooses attesters/trust defaults, and owns its moderation/screening policy.

Avoid “the Aligning site” as the canonical universal cause-board platform. Prefer “Aligning software for cause-board operators,” with any Commonality-operated boards clearly labeled as Commonality’s own curated view.

**Update (Aug 2026): [ADR 0008](/specs/decisions/0008-operated-surfaces-are-lenses.md) adds a third option this section did not consider — the lens.** Commonality *does* operate a generic cause surface (CauseStarter), but it authors no discovery: no search, browse, ranking, or featuring. That turns out to separate the two things this section bundled. What made a universal front door untenable was **universal admission** — being the surface where everything is listed and therefore where every demand about anything lands — not being generic in subject matter. A surface that ranks nothing is neither “the canonical platform” nor a “curated view”; it renders what it is pointed at and offers recomputability rather than endorsement. See [§ The lens posture](#the-lens-posture-generic-in-subject-non-universal-in-admission).

### Content Funding — do not run generic

**Recommended posture:** infrastructure/operator kit, not a generic hosted product.

Generic Content Funding has especially high operator exposure: money flows, named creators who may not have consented, channel identity verification, content amplification, creator impersonation/false affiliation, submission queues, and potentially controversial content.

Better split:

- Content Funding is reusable infrastructure on top of LazyGiving.
- The generic UI is reference/operator software.
- Vertical-specific operators run curated content-funding instances.
- Civility can be one such vertical.

### Civility — run it if explicitly editorial

**Recommended posture:** Commonality/Adam-run editorial vertical using Content Funding infrastructure.

Civility is not neutral content funding. It is a specific funding vertical for noninflammatory, bridge-building, cross-divide content. Its criteria are opinionated by design. That makes front-end curation coherent: the site includes content because it fits Civility’s mission, not because the protocol forces universal display.

Safer framing:

- “Civility is an editorial funding vertical using open content-funding infrastructure.”
- Prefer positive-only qualification/display: included because it meets the criteria, rather than publishing negative scores for excluded creators/content.
- Be careful around campaign-finance-adjacent content and sponsored gas; funding political media can still raise distinct issues.

### Common Sense Majority — run it

**Recommended posture:** Commonality/Adam-run movement/editorial site.

CSM is clearly a civic/political movement site: hidden-majority thesis, bridge positions, organizer material, and links to statement signing or civility-oriented content. It is Adam/Commonality’s speech and should own that rather than pretending neutrality.

Caution: keep generic funding marketplace behavior out of CSM. If CSM routes money, it should route to carefully curated CSM/Civility workflows with an explicit policy, not arbitrary projects.

## Proposed operated vs reference split

### Commonality/Adam-operated sites

- **Commonality** — movement thesis, ecosystem map, operator/founder documentation.
- **Conceptspace** — infrastructure docs and minimal inspectors.
- **Common Sense Majority** — movement/editorial site.
- **Civility** — curated editorial funding vertical.
- **Maybe Tally** — narrow statement-signing surface, or statement-signing embedded in the movement sites.

### Not operated by Commonality/Adam as universal front doors

- **LazyGiving** — reference UI/operator kit for assurance-contract project operators.
- **Aligning** — reference UI/operator kit for cause-board operators.
- **Content Funding** — reference UI/operator kit for content-funding verticals.

## Indexer posture: shared pointer feed, operator-owned view

[ADR 0006](/specs/decisions/0006-shared-pointer-index.md) supersedes the earlier assumption that every vertical runs a read model. `PublishedData` is now pointers-only, so one broad index can expose protocol facts without storing or serving user-authored bytes. A vertical founder normally uses that shared feed and applies scope plus display/aggregation policy in static client configuration.

The chain remains the neutral source of truth. The shared index is a replaceable convenience cache, not the canonical Commonality view. Each vertical still answers the important question: **what does this operator choose to discover, fetch, render, aggregate, and route?**

### Why this matters

A Commonality-operated broad index remains an operated metadata service and an availability/source-onboarding chokepoint. Do not call it neutral or canonical. But after pointers-only it is not a user-content host, and duplicating Ponder/Postgres for every founder is disproportionate. The legal and editorial exposure remains concentrated in the front door that chooses scope, retrieves bytes, renders, aggregates, and routes contributions.

An independent vertical/operator indexer remains available when the distinction matters:

- Civility indexes the projects/content/contracts Civility chooses to recognize.
- CSM indexes the statements, projects, and contracts relevant to CSM.
- A local community indexes its own project factory or allowlisted project set.
- A charity/fiscal host indexes the projects it hosts or endorses.
- Someone else can run an uncensored/full indexer if they want; that is their operated service.

Preserve the thin event cache and client-side folding. The default topology is [one shared feed with per-vertical client configuration](/specs/tech/indexer/shared-feed-topology.md); [operator-scoped deployments](/specs/tech/indexer/operator-scoped-deployments.md) are an optional independence path.

### Recommended indexer layers

1. **Reusable indexer package.** Publish the indexer as software anyone can run, with clear deployment docs.
2. **Operator manifest.** Each deployment declares the chain, contract/factory addresses, start blocks, trusted deployment manifests, allowlists/denylists, metadata-fetching policy, and operator identity.
3. **Contract/factory namespace filtering.** Prefer indexing projects from factories or contract sets the operator recognizes, rather than trying to index the whole protocol by default.
4. **Project/event policy filtering.** Operators can hide or exclude projects, addresses, CIDs, channels, statements, or events under their own sanctions/fraud/spam/editorial policy. So that this does not require every vertical operator to originate all of that work themselves, [policy-lists](/specs/tech/subsystems/policy-lists/README.md) proposes making those lists subscribable — the operator picks which lists to honor and can always override them. Note what that does and does not give you: it reduces integration burden, not the operational obligation. The operator still needs a reporting address, an on-call rotation, an appeals process, and a relationship with whoever maintains a usable dataset. That spec's v1 covers **display, aggregation, and serving only** — gating claims or gas sponsorship on a subscribed list is deferred to [financial-screening.md](/specs/tech/subsystems/policy-lists/financial-screening.md), so today no policy list can affect anyone's money.
5. **Metadata/IPFS fetching policy.** The riskiest material is often not the event itself but the project/statement/content metadata. Operators should choose which CIDs to fetch, cache, pin, proxy, or render.
6. **UI owns its view.** A vertical may query the shared index, but its own inspectable configuration decides scope, retrieval, display, aggregation, and policy.

### Smart-contract support for operator indexing

Changing smart contracts is acceptable if it makes operator-scoped indexing easier, but avoid treating self-declared tags as authority.

Useful additions may include:

- **Separate factory deployments per operator/vertical** where appropriate. Factory address is the cleanest namespace.
- **Operator or source references emitted by factories** when a project is created, e.g. an `operatorRef`, `sourceRef`, or deployment namespace. This is useful when set by the factory/operator path, not when arbitrary project creators can simply claim “civility.”
- **Indexed filter fields** on events: creator, recipient, statement/topic CID, channel ID, project address, token/market/assurance-contract addresses, and factory/deployment namespace. These make vertical indexing cheap.
- **Deployment manifests** that can be pinned and signed by operators, so a UI/indexer can say “I follow this operator’s contract set.”

Risky pattern: an arbitrary self-declared `category = civility` field. That can be a tag, but it cannot replace Civility’s own decision to index/display the project.

### What Adam/Commonality should avoid

A production `api.commonality.works/events` may be a broad convenience feed, but must not be described as the canonical all-project/all-statement/all-content view. Publish enough configuration and deployment documentation that it is replaceable.

A future Graph migration would normally use one broad pointer-only subgraph. Per-vertical subgraphs remain optional where an operator needs genuine independence or custom source admission.

## Practical implications for product/architecture

If this posture is adopted, the product should shift from “eight Commonality-operated websites” to “a few operated editorial/infrastructure sites plus several operator kits.”

Concrete implications:

1. **Rename/reframe neutral funding sites in docs.** LazyGiving, Aligning, and Content Funding should be described as protocols/modules/operator software unless a specific curated operator is named.
2. **Make operator boundaries visible in the UI.** Each operated front end should say who runs it and what policy/curation stance it applies.
3. **Move contribution-routing services to the operator layer.** On-ramp session endpoints, sponsored-gas defaults, submission queues, and deny/report flows should belong to the front-end operator, not to a supposedly neutral global UI.
4. **Keep the shared index replaceable.** Each vertical/operator chooses its scope, content sources, policy, and filters; it need not run stateful indexing infrastructure. Independent indexers remain supported.
5. **Package modules for independent operators.** The planned per-vertical repo/package split supports this: publish explicit module APIs and deployment docs so other operators can run real front ends and indexers.
6. **Avoid authored discovery, not genericness.** No global “all projects” or “all content contracts” browser, and — sharpened by [ADR 0008](/specs/decisions/0008-operated-surfaces-are-lenses.md) — no search, ranking, or featuring on an operated surface either, since every ordering is an editorial act. Supporter-count ranking is the worst of them: it rewards bundling a rider onto a popular plank, which is precisely what the plank model exists to expose. What this rules out is the *directory*; a generic surface that ranks nothing and is reached only by link is the [lens](#the-lens-posture-generic-in-subject-non-universal-in-admission), and is allowed.
7. **Keep contract-layer neutrality.** Do not add contract-level admin takedowns or custody levers to compensate for UI/indexer moderation.

## Suggested public framing

> Commonality publishes open protocols and reference software for funding public goods. Commonality/Adam operates a few opinionated sites — such as Commonality, Common Sense Majority, and Civility — that use those protocols according to their own editorial policies. Generic funding, cause-board, and content-funding front ends are meant to be operated by communities, creators, charities, and other independent organizations.

This preserves the protocol’s openness while making the operated sites honest about their editorial and legal responsibilities.
