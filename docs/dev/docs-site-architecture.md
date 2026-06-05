# End-user docs: site architecture & ownership model

Status: **agreed design, not yet implemented** (2026-06-05). Captures decisions from a design discussion; the build changes in "Implementation" are still to do.

## The problem

End-user docs live once under `docs/end-user/`, but the UI bundles the **entire** tree into **every** branded site. From `ui/src/docs/DocsPage.tsx`:

```js
import.meta.glob('../../../docs/end-user/**/*.md', { query: '?raw', import: 'default', eager: true })
```

There's one `ui` app, built once per product via `VITE_DOMAIN` (lazyGiving, content-funding, civility, alignment, tally, common-sense-majority, conceptspace, commonality). Because the glob is eager and unfiltered, each deployed site ships **all** products' docs, not just its own. Costs: every site leaks other audiences' material (including drafts); the mental model is muddied; any doc change invalidates every site. (Bundle size is a minor concern — it's just markdown text.)

## The model we're moving to

**Split by audience, not by hiding connections.** Each product serves its own audience and can stand on its own; honest cross-links between products are fine and expected (Content Funding is openly built on LazyGiving, so a Content Funding doc linking to a LazyGiving doc is correct, not a leak).

Three tiers:

1. **Product docs — `<product>/`** (lazyGiving, content-funding, civility, alignment, tally, …). Owned by one product/audience. Bundled **only** into that product's site. References from other products become **cross-domain links** (via the existing `getDomainUrl(...)` helper).
2. **Shared connective tissue — `shared/`.** Genuinely ownerless material that several distinct audiences need *in context*. Bundled into every site, rendered in the current site's chrome, served at neutral URLs (the router strips the `shared/` prefix). **`shared/` is not a site** — a page here does not "live on" any product; it renders natively inside whichever product you're viewing.
3. **Commonality — `commonality/`.** The big-picture / vision site, for people who want to see how it all fits together (e.g. founders who want to build another vertical like Civility on top of the platform). It is **not** an umbrella that owns the core concepts. It already *is* this: `commonality/` is almost entirely `vision-and-strategy/`, and it already carries its own founder-pitched treatments of the core concepts (e.g. `vision-and-strategy/credible-solution/assurance-contracts.md`), separate from the plain-language user primers in `shared/key-ideas/`.

### The ownership rule

A concept lives in its **owning product**, *unless* a **distant product depends on it heavily enough that bouncing that audience to the owner's site would hurt** — in which case it stays in `shared/` and renders in-context. Cross-domain hops are acceptable for closely-related products (content-funding → lazyGiving) and jarring for distant ones (civility → lazyGiving).

## Decisions (key-ideas)

| key-idea | home | notes |
|---|---|---|
| assurance-contracts | **lazyGiving** | *the* funding mechanism; others cross-link |
| retroactive-funding | **lazyGiving** | funding mechanism |
| credible-threats | **lazyGiving** | about pledges |
| content-funding | **content-funding** | already moved `why-not-ads.md` there |
| statements-and-implication-graph | **tally** | expressing what you care about — not LazyGiving |
| delegation | **shared (base) + alignment (add-on)** | see below |
| trust-networks | **shared** | anti-abuse; cross-cutting, no clean owner |
| how-actions-compound | **commonality** | network-effects / vision flavored |

The `shared/use-case-walkthroughs/` pages (noninflammatory-content, research-funding, defunding, block-party, local-funding-shift, common-sense-majority) each deliberately span multiple products, so none has a single owner. **They stay in `shared/`.**

### Delegation: both, with different emphasis

Delegation is the most widely-linked concept, including from distant products (civility, common-sense-majority). So the base stays shared:

- **`shared/key-ideas/delegation.md`** — the base idea ("you can delegate, and the UI respects it"). Funding actions themselves happen on LazyGiving. Rendered in-context everywhere.
- **Alignment add-on** (new page under `alignment/`) — the Alignment-specific feature: the creator of a note can mark it as explicitly meant for a particular purpose. Links back to the shared base rather than re-explaining it.

## Implementation (to do)

1. **Per-domain doc bundling.** `import.meta.glob` requires a *literal* pattern — you cannot interpolate `VITE_DOMAIN`. So a one-line glob change won't work. Add a small build-time mechanism (Vite virtual module / plugin, or a prebuild codegen step) that emits a doc map containing only `shared/**` + `${VITE_DOMAIN}/**`. Decide what the **commonality** build includes — likely the whole tree, since it's the "see how it all fits together" site.
   The **commonality** build bundles **vision + shared only** (`commonality/**` + `shared/**`) — not the other products' docs. From the big-picture site you cross-link into the individual product sites like any other cross-domain reference.
2. **Cross-domain link resolution.** Update `resolveHref` so that a `/docs/...` target whose top folder is a *product ≠ current domain and ≠ shared* resolves to a cross-domain absolute URL via `getDomainUrl(...)`. The doc's top folder is the source of truth for its home domain. Same-domain and `shared/` targets stay same-site.
3. **Move + relink the docs** per the table above; add the new Alignment delegation page.
4. **Verify links.** Run `scripts/check-docs-links.sh` and the verifier `docs-broken-refs` check after the moves.

## Open questions

- Cross-domain hop UX: confirm the intended feel when a user crosses from one product's site to another's (branding changes, etc.).
