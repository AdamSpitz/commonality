# What a founder needs to stand up a vertical

A high-level inventory of the pieces a vertical founder has to put in place: the
decisions he has to make, the artifacts he has to author, the third-party accounts he
has to open, and the operator obligations he can't hand off.

This is the *checklist* companion to
[standing-up-a-vertical.md](./standing-up-a-vertical.md), which is the concrete
build guide. Read this one first for the shape of the job; read that one when you're
actually creating the domain folder.

It assumes the intended end state, not today's repo — in particular that
[policy lists](/specs/tech/subsystems/policy-lists/README.md) and
[sponsored gas](/specs/tech/sponsored-gas.md) are implemented and operating. Where
today's reality differs, the build guide is authoritative.

Sections 1, 2 and 4 are reasonably settled. **[Section 3](#3-third-party-accounts-and-infrastructure)
— the infrastructure a founder has to bring — is not**, and is flagged as an open
question rather than guidance.

## 1. Decide what the vertical is

No accounts, no code — this is the part that actually determines whether the vertical
works.

- **Positioning + audience.** One sentence naming a specific group and why the generic
  substrate matters to *them*. Civility: "content that communicates across political
  divides, without contempt." CSM: "the quiet common-sense majority is real and
  invisible; let's make it visible."
- **Which substrate modules the site exposes.** `conceptspace` (statements, implication
  graph, signing, trust), `lazyGiving` (individual assurance contracts),
  `fundingportal` (cause boards, alignment attestations), `contentFunding`,
  `delegation`, `docs`. He is picking, not building.
- **The defining criterion**, for a funding vertical: what makes something belong on
  *his* board rather than generic LazyGiving/Content Funding. (Civility's is
  "noninflammatory / communicates across divides.")
- **The statement(s)**, for a signing vertical: the actual text people sign, and how it
  sits relative to neighbouring statements in the implication graph.
- **A populated cause board.** The piece founders underestimate. A working site with an
  empty or repetitive board communicates nothing.
  [cause-taxonomy.md](/specs/product/cause-taxonomy.md) is the generator for that list;
  the board in [christian-pitch.md](./christian-pitch.md#what-would-actually-be-on-the-board)
  is a worked example of the shape.

## 2. Artifacts he has to author

- **A domain manifest** — branding, shell/nav, which feature modules are on, base path,
  route table, landing page. Today produced by copying `ui/src/domains/civility/`; in
  the [intended end state](./standing-up-a-vertical.md#the-end-state-a-vertical-is-its-own-repo)
  it's his own repo depending on published substrate packages.
- **A landing page and a handful of page components** — the pages that express his
  criterion (nomination, filtering, curation views) rather than the generic ones.
- **Copy**: landing page, nav labels, footer, about/FAQ.
- **Docs**: founder-facing positioning under `docs/founder/<vertical>/`, end-user docs
  under `docs/end-user/`.
- **A distribution plan.** Explicitly his job, not the platform's — that's the whole
  premise of [ADR 0005](/specs/decisions/0005-founder-first-verticals.md). It is also
  the only item here that no doc or tool in this repo does for him.

## 3. Third-party accounts and infrastructure

> **Unsettled.** This section is the least resolved part of the guide. The list below is
> accurate about *what* a founder needs, but **how much of it we should absorb is an open
> question Adam wants to think through further** — see
> [§3.3](#33-open-question-how-much-of-this-should-we-absorb) before treating anything
> here as settled.

### 3.1 The needs themselves

| Need | What it's for |
| --- | --- |
| Domain registrar + DNS | His hostname |
| Static hosting / CDN edge, and IPFS pinning | The build is a static artifact, published to IPFS with a gateway in front |
| Chain RPC provider | Reads and writes against the target chain (Base) |
| Wallet/login provider (Privy) | Normie-friendly embedded wallets |
| ERC-4337 bundler (Pimlico) | Only if he wants gasless UX. The paymaster itself is *our* contract, not a vendor's — see [sponsored-gas.md](/specs/tech/sponsored-gas.md) |
| A funded wallet | Deployment gas, plus a funded gas tank if he sponsors users' transactions. The tank design lets *anyone* fund a creator's tank, so he needn't prefund out of pocket |
| An email address a human reads | The abuse/reporting address — see [§4](#4-operator-obligations-where-policy-lists-land) |
| Mailing list / analytics / social, as his plan requires | Distribution |

Three of these are genuinely his, because they carry his identity or his legal position:
the **domain**, the **abuse mailbox**, and his **distribution tooling**. Nobody proposes
taking those over.

The rest is plumbing — a founder gains no differentiation from an RPC dashboard — and
the problem with plumbing is *when* it comes due: all at once, at launch, before he
knows whether the vertical works at all.

### 3.2 A boundary any answer has to respect

Whatever we do here, **general-purpose substrate sites and specific-cause sites are not
the same case, and must not be run as if they were.**

- **General-purpose** — Tally, LazyGiving, Aligning, Conceptspace, Content Funding.
  These are substrate front doors. Nobody expects a third party to run Tally; us
  operating them is the natural arrangement and raises no identity confusion.
- **Specific causes** — Civility, CSM, and other people's causes. Here the operator's
  identity *is* the point. A cause site is somebody's stance, and who serves the bytes
  is much harder to keep separate from whose stance it is.

Any hosting proposal has to keep these visibly distinct — in naming, in infrastructure,
and in who is publicly answerable — rather than sliding cause sites into the same tier
as the substrate front doors because it happens to be operationally convenient.

### 3.3 Open question: how much of this should we absorb?

**The tempting answer, which Adam is not comfortable with.** We already run
[`cloudflare-ui-gateway`](/cloudflare-ui-gateway/README.md) (domains served off IPNS
keys in Worker env vars) and [`cloudflare-service-gateway`](/cloudflare-service-gateway/README.md).
Adding another vertical is nearly a subdomain plus an env var, so we *could* offer
`<vertical>.commonality.works` hosting plus proxied RPC and bundler, and cut the
founder's launch list to a mailbox.

Why that's unattractive despite being easy:

- **It re-centralizes exactly what [ADR 0005](/specs/decisions/0005-founder-first-verticals.md)
  decentralized.** If we serve his bytes, we are an obvious address for a takedown
  notice again, and "the operator is the founder" becomes a claim we're making rather
  than a fact of the arrangement.
- **It blurs the [§3.2](#32-a-boundary-any-answer-has-to-respect) boundary** by putting
  other people's causes on the same infrastructure and in the same namespace as our
  general-purpose sites.
- **It's an open-ended operating cost and liability** for sites whose content we don't
  control.
- **It fights the [own-repo end state](./standing-up-a-vertical.md#the-end-state-a-vertical-is-its-own-repo)**,
  where a vertical builds and deploys itself.

**The direction worth exploring instead: reduce the need, don't absorb it.** Lower the
count and the friction of the accounts, while they stay in the founder's own name:

- The build is a **static, content-addressed artifact** — it runs on any commodity
  static host, several with free tiers and no card. Hosting is genuinely fungible here;
  that's an argument for making it easy to point anywhere, not for pointing it at us.
- **Automate provisioning into his accounts.** We can author a deploy script or template
  repo that stands the whole thing up under *his* credentials. Automating provisioning
  is not the same as operating infrastructure, and it gets most of the ergonomic win
  with none of the liability.
- **Cut the count.** Which of these are actually required to launch, versus required to
  launch *well*? The bundler is only needed if he opts into sponsored gas; public RPC
  and public IPFS gateways are degraded but real starting points that need no account at
  all.
- **Interrogate each remaining row** for whether it can be deferred past launch rather
  than reassigned.

None of this is decided. The open question to resolve is: *how far can the need be
reduced before any hosting offer is on the table at all* — and if some offer turns out
to be necessary anyway, how it stays inside the [§3.2](#32-a-boundary-any-answer-has-to-respect)
boundary.

## 4. Operator obligations (where policy lists land)

Each vertical operator is legally responsible for what his site displays; the protocol
stays neutral. See [ui-operator-posture.md](/specs/product/ui-operator-posture.md) and
[legal/operator-posture.md](/specs/product/legal/operator-posture.md).

[Policy lists](/specs/tech/subsystems/policy-lists/README.md) reduce the *integration*
burden: he subscribes to lists maintained by others instead of originating every
takedown himself, filtered and overridden by his own policy. What that does **not**
give him:

- a published content policy and terms of use,
- a reporting address with someone actually on call,
- an appeals process,
- the judgment calls about which lists he trusts and what he overrides.

Net: policy lists turn "build a moderation department before launch" into "choose your
subscriptions and staff a mailbox." Real leverage, but not compliance for free.

## Rough sequence

1. Positioning and audience
2. Module selection + criterion / statements
3. Seed the cause board
4. Manifest, landing page, pages
5. Register + wire the build and deploy
6. Domain, hosting, RPC, wallet/bundler accounts, funded wallet — how many of these are
   really his to open is [unsettled](#33-open-question-how-much-of-this-should-we-absorb)
7. Policy-list subscriptions, content policy, reporting address
8. Distribution

## Known friction, up front

- **No "new vertical" scaffold** — he copies Civility by hand.
- **Criteria live in code, not data** — the "what belongs on my site" rule is bespoke
  pages rather than configuration.

Both are tracked in [standing-up-a-vertical.md](./standing-up-a-vertical.md#remaining-smaller-friction).
Friction *not* listed there is the highest-signal input we have into what to build next
— file it.
