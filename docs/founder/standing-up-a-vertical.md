# Standing up a vertical

This is the guide for someone who wants to build a **vertical** on Commonality — a
focused site, aimed at a specific audience, built out of the shared substrate. It
uses **Civility** and **Common Sense Majority (CSM)** as the worked examples,
because those are the two verticals we run ourselves precisely so that there's a
reference to copy.

If you're orienting as an internal dev, start from
[workflow/roles/founder.md](/workflow/roles/founder.md). This guide is the
"now actually build one" companion.

## The framing this guide assumes

Commonality is a **platform for founders to build verticals on**. We (the people
building the platform) are deliberately *not* trying to drive end-user adoption of
"Commonality" the umbrella. Distribution is inherently vertical-specific — the
people who care about civil political media are not reached the same way as people
who want to fund local public goods — so distribution is the *vertical founder's*
job, not the platform's.

That makes the founder the platform's real customer. Everything below exists to
make a founder's job easier. It also gives a sharp triage rule for platform work:

- **Generic end-user growth for the umbrella** → not the platform's job.
- **Making a founder's job easier** → core platform job.
- **Making Civility/CSM exemplary as reference verticals** → core platform job
  (their purpose is to be the worked example, not only to succeed on their own).

## What a vertical actually is

A vertical is three things stacked:

1. **Positioning + audience.** A specific group of people and a specific reason
   the generic substrate matters to *them*. Civility = "content that communicates
   across political divides, without contempt." CSM = "the quiet common-sense
   majority is real and invisible; let's make it visible."

2. **A selection of substrate.** You don't rebuild funding, signing, or trust.
   You pick which existing feature modules your site exposes, and (for funding
   verticals) what *criteria* distinguish your slice. Civility is the
   Content Funding module + a noninflammatory criterion + bridge-building copy.
   CSM is a movement site that *composes* other verticals (Civility for content,
   Tally for signing, Aligning/LazyGiving for funding) rather than owning a
   product surface of its own.

3. **A domain manifest + landing page.** The concrete artifact that turns the
   above into a deployable site.

The substrate you're choosing from (see
[specs/tech/ui-domains.md](/specs/tech/ui-domains.md)):

| Feature module | What it gives you |
|---|---|
| `conceptspace` | statements, implication graph, signing, trust/attesters |
| `lazyGiving` | individual assurance contracts (Kickstarter-style, onchain) |
| `fundingportal` | cause boards, project/cause alignment attestations |
| `contentFunding` | content contracts (assurance contracts pointed at posts/videos) |
| `delegation` | follow trusted people's funding judgment |
| `docs` | the in-app docs site |

## The build, concretely (Civility as the template)

A vertical lives under [`ui/src/domains/<id>/`](/ui/src/domains/) and is a single
`DomainManifest`. The cleanest existing example to copy is
[`ui/src/domains/civility/`](/ui/src/domains/civility/) — it's a thin
specialization of the Content Funding module.

A manifest is just data ([`ui/src/domains/civility/manifest.tsx`](/ui/src/domains/civility/manifest.tsx)):

```tsx
export const civilityManifest: DomainManifest = {
  id: 'civility',
  branding: { name: 'Civility', tagline: 'Build bridges, not walls.' },
  shell: { primaryNavigation: [...], secondaryNavigation: [...], footerText: '...' },
  features: {                 // which substrate modules this site exposes
    contentFunding: true, docs: true,
    conceptspace: false, lazyGiving: false, fundingportal: false,
    delegation: false, mutablerefs: false,
  },
  basePath: '/',
  routes,                     // a <Route> table, mostly lazyRoute(...) into your pages
  LandingPage: NoninflammatoryLandingPage,
}
```

The full set of touchpoints to add a vertical today:

1. **Create the domain folder.** Copy `ui/src/domains/civility/` to
   `ui/src/domains/<id>/`: a `manifest.tsx`, a `LandingPage.tsx`, and your
   page components (Civility keeps its pages in `ContentPages.tsx`). Rewrite the
   copy and routes for your audience.
2. **Register the manifest.** Add it to `domainManifests` and the env switch in
   [`ui/src/domains/index.ts`](/ui/src/domains/index.ts), and add your id to the
   `DomainId` union in [`ui/src/domains/types.ts`](/ui/src/domains/types.ts).
3. **Wire the build/deploy.** Builds select a domain via the `VITE_DOMAIN`
   env var; `npm run build:domains` builds them all. Deployment adds a one-shot
   IPFS publisher service per domain in docker-compose plus a local-gateway
   hostname (see [specs/tech/ui-domains.md](/specs/tech/ui-domains.md)).
4. **Write the docs.** Founder-facing positioning under
   `docs/founder/<vertical>/` (see [`docs/founder/csm/`](/docs/founder/csm/) for
   the pattern), end-user docs under `docs/end-user/`.
5. **For funding verticals: define the criterion.** What makes something belong
   on *your* site rather than generic Content Funding/LazyGiving? Civility's is
   "noninflammatory / communicates across divides," surfaced through nomination
   and filter pages.

That's the whole job: pick substrate, write a manifest + landing page + pages,
register it, wire the build, write the positioning docs.

## The end state: a vertical is its own repo

Today a vertical lives in this monorepo because the whole system was built at once
and the substrate API was still churning. That's deliberate and temporary. The
intended end state is that **a vertical is its own repository** that depends on the
substrate as published packages (`@commonality/content-funding`, `@commonality/shared`,
the SDK, …) and contributes only its manifest, landing page, pages, and docs. The
same applies to the core sub-projects — there's no reason Tally has to ship in the
same repo as LazyGiving.

This is viable because the dependency *architecture* is already clean: the substrate
never imports from verticals, the feature layer is nearly flat, and a vertical is a
thin consumer of substrate. The layering — the expensive part — is done.

What's *not* done is the **packaging boundary**. The whole UI is currently one npm
package, and modules are bounded by folders rather than declared interfaces:
consumers reach into deep paths like `content-funding/pages/SomePage`, so no module
has a defined public API. Turning each module into a package with an explicit export
surface is the prerequisite for splitting anything into its own repo — and it's the
single lever that unlocks *all* the splits (verticals and core sub-projects alike).

Note what this means for the monorepo bookkeeping (the central `domainManifests`
registry, `DomainId` union, `build:domains`, the per-domain docker-compose
publishers): in the end state these **go away**, not get automated. Each repo is one
standalone app that builds and deploys itself. So don't invest in auto-discovering
the central registry as a destination — it's monorepo scaffolding that the split
removes.

### How to define a module's public API (worked example: `delegation`)

The pattern, demonstrated on the `delegation` module:

1. Add a barrel `index.ts` at the module root that re-exports *only* the intended
   public surface — see [`ui/src/delegation/index.ts`](/ui/src/delegation/index.ts).
   Everything not re-exported is module-internal and free to change.
2. Route external consumers through the barrel (`from '../../delegation'`), never
   deep paths (`from '../../delegation/utils'`).
3. Lazy route targets (pages loaded via dynamic `import()` for code-splitting) stay
   as deep dynamic imports — they're the *subpath* half of the public API and map to
   `@commonality/delegation/pages/*` once the module is its own package. Don't fold
   them into the eager barrel or you collapse the code-split chunks.
4. Defining the surface tends to surface mis-couplings: `delegation` was re-exporting
   `truncateAddress` (really a `shared` util), and consumers were importing it
   *through* delegation. Those got pointed back at `shared` directly.

Do this in-monorepo first (cheap, reversible, immediately useful as documentation,
and enforceable with an ESLint boundary rule). Only convert modules to *published*
packages and extract repos once the substrate API has stabilized — API stability,
not a date, is the trigger.

### Recommended split order

Civility first (thinnest vertical, and it doubles as the founder exemplar), then
CSM (harder — it *composes* Civility/Tally/Aligning via cross-domain links, so it
has more edges to define).

## Remaining smaller friction

- **No "new vertical" scaffold.** Today you copy Civility by hand. A generator would
  remove a class of copy-paste mistakes (interim convenience; the repo split makes a
  template repo the real version of this).
- **Criteria live in code, not data.** A funding vertical's defining criterion is
  currently expressed in bespoke pages. Whether that should become declarative is an
  open platform question.

When you hit friction not listed here, file it — those reports are the highest-signal
input we have into what to build next.
