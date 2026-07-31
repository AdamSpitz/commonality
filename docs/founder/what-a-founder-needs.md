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

| Need | What it's for |
| --- | --- |
| Domain registrar + DNS | His hostname |
| Static hosting / CDN edge, and IPFS pinning | The build is a static artifact; today it's published to IPFS with a gateway in front |
| Chain RPC provider | Reads and writes against the target chain (Base) |
| Wallet/login provider (Privy) | Normie-friendly embedded wallets |
| ERC-4337 bundler (Pimlico) | Only if he wants gasless UX. The paymaster itself is *our* contract, not a vendor's — see [sponsored-gas.md](/specs/tech/sponsored-gas.md) |
| A funded wallet | Deployment gas, plus a funded gas tank if he sponsors users' transactions |
| An email address that a human reads | The abuse/reporting address — see below |
| Mailing list / analytics / social, as his plan requires | Distribution |

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
6. Domain, hosting, RPC, wallet/bundler accounts, funded wallet
7. Policy-list subscriptions, content policy, reporting address
8. Distribution

## Known friction, up front

- **No "new vertical" scaffold** — he copies Civility by hand.
- **Criteria live in code, not data** — the "what belongs on my site" rule is bespoke
  pages rather than configuration.

Both are tracked in [standing-up-a-vertical.md](./standing-up-a-vertical.md#remaining-smaller-friction).
Friction *not* listed there is the highest-signal input we have into what to build next
— file it.
