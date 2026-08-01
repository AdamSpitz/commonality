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
count and the friction of the accounts, while they stay in the founder's own name. What
follows is a first pass at that — **progress, not a conclusion.**

#### The test to apply: does it involve selection?

We don't need a new principle here; [ui-operator-posture.md](/specs/product/ui-operator-posture.md)
already separates *protocol / reference software* ("contracts, SDKs, docs, IPFS builds,
source code that anyone can run") from an *operated front door*, which "chooses what to
display, what to link, which defaults to ship" and owns "display, routing, curation, and
subsidy choices."

So, per item: **would we be choosing *what*, or relaying bytes identically regardless of
which vertical?** Selection makes it a front door and it can't be ours. This also
explains the unease in §3.3 above precisely: serving a founder's UI bundle is the one
item of the five that is unambiguously a front door.

#### Item by item

- **CDN / hosting — eliminate rather than reassign.** A founder needs a **GitHub account
  anyway** to have a repo, and the
  [end state](./standing-up-a-vertical.md#the-end-state-a-vertical-is-its-own-repo) is
  that a vertical *is* its own repo. Repo + Actions + Pages is build-and-deploy with
  **zero net-new vendors** — it folds hosting into an account he holds for independent
  reasons rather than moving it to us. Mechanics in
  [§3.4](#34-what-the-github-path-actually-involves).
- **IPFS pinning — optional, post-launch.**
  [eliminating-ipfs.md](/specs/tech/eliminating-ipfs.md) item 7 is explicit that pinning
  the UI build is "censorship resistance for the frontend, not content hosting." Real,
  but it's a choice *we* made for *our* sites; a local-public-goods vertical may not need
  it on day one. Note the current IPNS→CID Worker exists largely to route around
  Cloudflare cross-account restrictions — that complexity is ours and shouldn't be
  inflicted on a founder. Conventional static host at launch; IPFS as an opt-in mirror
  later, on his own pinning account.
- **Chain RPC — public endpoints at launch, but this is the small half.** Base has public
  RPC; an SDK fallback list means launch needs no key. Note this got heavier in Aug 2026:
  with [pointers-only `PublishedData`](/specs/tech/subsystems/published-data/README.md#pointers-only-what-the-indexer-sees),
  RPC is load-bearing for *reads* too — every statement body is recovered from transaction
  calldata — so the "one GitHub account, no credit card" ambition in §3.3 may not survive.
  The heavy dependency is still really the
  **indexer**, which the backlog already plans to make operator-scoped — eliminating an
  RPC signup while handing him an indexer to run is not much of a win. Worth asking
  whether a **shared read-only indexer** is protocol-side: it serves the same protocol
  data to everyone and makes no editorial selection, with his curation applied at his own
  front door via policy lists. Probably the largest clean win available.
- **Privy — defer out of launch entirely.** Connecting an external wallet needs no account
  from anyone, so normie onboarding becomes something he adds when he has normies. When
  he does, there's a real question to decide on its merits rather than on cost: **should
  embedded-wallet identity be shared across verticals?** A user who signed on Tally
  arriving at Civility as the same person is arguably an ecosystem feature, and it's
  non-custodial. Best candidate of the five for a legitimately shared service.
- **Bundler — the hard part is already absorbed.** Opt-in (gasless only), the paymaster is
  *our* contract with creator-funded tanks, and `platform-api-service` already exposes the
  ERC-7677 endpoint. A bundler on top is pure relay. Caveat: the
  [financial-screening](/specs/tech/subsystems/policy-lists/financial-screening.md) notes
  flag that operating the sponsorship-signing endpoint is a **facilitation** question, so
  this is the one row where absorbing more pulls on a live legal thread.

Net effect if all of the above holds: **five plumbing accounts at launch → one (GitHub),
with no credit card.**

#### Two cross-cutting levers

- **Separate cost from control.** Much of the pull toward hosting is just wanting to spare
  a founder the bills — but those are separable. We can underwrite or credit an account
  **in his name** without holding its keys or making its content decisions. Paying
  someone's bill is not operating their site. (Wants a lawyer's read before we rely on it,
  but it is a far softer posture than serving the bytes.)
- **Automate provisioning into his accounts.** A deploy script or template repo that stands
  everything up under *his* credentials gets nearly all the ergonomic win — "one command,
  three OAuth logins" instead of five signups and pasted secrets — with none of the
  liability, and it survives the move to per-vertical repos.

#### Threads still open

- `ui-operator-posture.md` explicitly lists "on-ramp/session/sponsored-gas endpoints"
  among what an *operated front door* chooses, which cuts against treating the bundler as
  neutral relay. Possible reconciliation: *deciding* the subsidy policy stays his (and it's
  onchain, in creator-funded tanks) while *relaying* is shared — but that needs arguing
  explicitly, not assuming.
- A shared indexer still decides what it serves, even if uniformly. "Uniform for everyone"
  is a weaker claim than "makes no choices," and should be stress-tested before we lean
  on it. One way out is for the shared feed to be operated by *neither* of us — see
  [the-graph.md](/specs/tech/indexer/the-graph.md), which is cheap to migrate to but
  removes the one server-side enforcement lever policy-lists defines.
- Every shared pipe is a dependency that fights the own-repo end state. The rule from
  [§3.2](#32-a-boundary-any-answer-has-to-respect) and above still binds: each must be
  **a credential he can replace**, not a service only we can run.
- The question that still hasn't been answered: *how far can the need be reduced before
  any hosting offer is on the table at all* — and if one turns out to be necessary anyway,
  how it stays inside the general-purpose/specific-cause boundary.

### 3.4 What the GitHub path actually involves

Background for the hosting bullet in [§3.3](#33-open-question-how-much-of-this-should-we-absorb),
since it's the most promising of the reduce-the-need options and involves tools this repo
barely uses today.

**The three pieces.**

- **GitHub Actions** — CI/CD built into GitHub. A YAML file under `.github/workflows/`
  fires on a trigger (push, PR, schedule, manual); GitHub boots a fresh VM, checks out the
  repo, runs your steps. Already in use here: [`.github/workflows/review-gate.yml`](/.github/workflows/review-gate.yml).
  Secrets live in repo settings and arrive as env vars. Free and effectively unmetered for
  public repos; private repos get a monthly minute allotment before billing.
- **GitHub Pages** — static hosting attached to a repo. Free, HTTPS included,
  `<user>.github.io/<repo>` by default, or a custom domain via CNAME with a
  GitHub-provisioned cert. The current flow is Actions-native: the workflow builds, uploads
  `dist/` as an artifact, and a deploy step publishes it.
- **Cloudflare Pages** — same idea, more generous free tier (unlimited bandwidth and
  requests, ~500 builds/month, free custom domains and SSL). Two advantages: a `_redirects`
  file gives a proper SPA fallback, and "direct upload" via wrangler deploys from CI without
  granting repo access.

**The founder's loop.** Click *Use this template* → edit manifest, landing page and copy →
`git push`. The shipped workflow runs `npm ci` and `npm run build` with
`VITE_DOMAIN=<his id>`, then deploys. Live on HTTPS in minutes.

**Git push is the deploy** — no deploy CLI, no hosting dashboard, no credentials to manage.
That, not the price, is why this beats reassigning hosting to us. For contrast, our own
chain is `scripts/deploy-ui.sh` → pin to Pinata → IPNS key → a Worker resolving IPNS→CID
with gateway fallbacks; that entire apparatus collapses into one YAML file for a founder
who doesn't need frontend censorship-resistance on day one.

**The SPA-routing caveat, already solved in the substrate.** Static hosts serve files, so a
client-routed request for `/causes/42` 404s on refresh or deep link. Cloudflare Pages fixes
this with `_redirects`; GitHub Pages has no rewrite rules and the usual workaround is
copying `index.html` to `404.html`. But [`ui/src/App.tsx`](/ui/src/App.tsx) already selects
`HashRouter` vs `BrowserRouter` at runtime via `isHashRouting()`, and hash routing sidesteps
the problem entirely — presumably built for the IPFS-gateway case, which has the same
constraint.

**Which to default to.** "Zero net-new vendors" is strictly true only of GitHub Pages;
Cloudflare Pages is a second account (free, no card, but still a signup).

| | GitHub Pages | Cloudflare Pages |
| --- | --- | --- |
| Accounts | None beyond the repo | One more, free |
| Bandwidth | Soft courtesy limit (~100GB/mo) | Unlimited |
| SPA routing | Hash routing or `404.html` | `_redirects`, clean |
| Custom domain | CNAME + auto cert | A click if DNS is already there |

Suggested default: **GitHub Pages in the template**, because it makes "one account, no
credit card" literally true, with Cloudflare Pages documented as the upgrade once a vertical
has real traffic.

**The precondition.** All of this works only because a vertical is **fully static with no
backend of its own**, reading chain data client-side. That holds today — and it is exactly
why the indexer question above is load-bearing. If a founder ends up needing to run an
operator-scoped indexer, he is back to a server, a host and a bill, and the tidy GitHub
story covers only his front end.

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
