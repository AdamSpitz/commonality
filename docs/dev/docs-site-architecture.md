# End-user docs: site architecture & ownership model

Status: **implemented** (2026-06-05). Captures the model and the decisions behind it; the implementation notes below describe what was built.

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

1. **Per-domain doc bundling** — `ui/endUserDocsPlugin.ts`. `import.meta.glob` requires a *literal* pattern (no `VITE_DOMAIN` interpolation), so bundling is done with a Vite plugin that exposes a `virtual:end-user-docs` module — a `Record<relativePath, markdown>` built by reading the filesystem. Each build embeds `shared/**` + its own product folder, plus top-level loose `.md` files (e.g. `tldr-for-llms.md`, treated as global). The **commonality** build embeds `commonality/**` + `shared/**` (vision + shared only). The plugin takes an `includeAll` option that embeds the whole tree; the test build (`vitest.config.ts`) uses it so DocsPage unit tests can exercise every domain's docs. Dev HMR invalidates the virtual module and full-reloads when any doc changes. `DocsPage.tsx` consumes the virtual module instead of a glob; map keys are paths relative to `docs/end-user/`.
2. **Cross-domain link resolution** — `DocsPage.tsx`. `buildDocHref` looks at a target's top folder (the source of truth for its home domain): `shared/` and same-domain targets resolve to in-site `/docs/...` routes; a target owned by another product resolves to a cross-domain URL via `resolveLinkHref({ domain, path })` (which routes to the `_cross-domain-unavailable` page when that domain isn't configured, e.g. in dev). Absolute (`http(s)`) results render as new-tab `<a>`; in-site results use the router.
3. **Legacy redirects** — `MOVED_KEY_IDEAS` in `DocsPage.tsx` maps old `/docs/key-ideas/<slug>` URLs to the moved concepts' new homes, so external links and bookmarks keep working.
4. **Moved + relinked the docs** per the table above; added `alignment/note-purposes.md` (the purpose-marking add-on) and linked it from the shared `delegation` base. All references updated across `docs/end-user`, `specs/`, and UI landing pages.
5. **Verified.** `scripts/check-docs-links.sh` passes; full `vitest` suite (1623 tests) passes; a `VITE_DOMAIN=lazyGiving` build confirms product docs from other domains are excluded while `shared/` is included.

## Open questions

- Cross-domain hop UX: confirm the intended feel when a user crosses from one product's site to another's (branding changes, etc.).
