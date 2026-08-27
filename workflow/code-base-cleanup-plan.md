# Code-base cleanup plan

A 2026-08-27 pass over the repo for low-hanging simplification, duplication, dead
surface, and module-boundary issues. **Do not try to do everything in one session.**
Pick a slice, implement it, run the relevant tests, delete or check off the slice
here (and remove the root [TODO.md](../TODO.md) item when the whole plan is done
or no longer useful).

This is not a mandate to make everything squeaky clean. Skip items that have
turned into product/design work. Do not re-file work already on
[TODO.md](../TODO.md), [inbox.md](../inbox.md), or
[causestarter/TODO.md](../causestarter/TODO.md) — those are listed under
[Already filed](#already-filed-do-not-duplicate).

Autonomy: treat each slice as **Ask** unless Adam tags the TODO item higher.
Dead-code deletes and ABI-list additions are the safest starting point; public
SDK export splits and CauseStarter runtime fold need a careful test pass
(CauseStarter config.json overlay is a real bug, not just style).

## How to work a slice

1. Read this file and the package README for the area you are touching.
2. Confirm the finding still exists (paths and unused-exports drift).
3. Keep the change scoped to one slice. Do not “while I’m here” the mega-file
   splits unless that is the slice.
4. Feedback: `npm run lint` / package tests for the touched workspace; for
   SDK/UI/indexer ABI work, also the matching `check-abis` script if present.
   Feature-branch commits already run the quick suite via hooks.
5. After a CauseStarter or UI routing change, verify in the browser (CauseStarter
   local UI, at least home + a page that uses machinery/config).
6. When a slice is done, delete its subsection from this plan (same rule as
   TODO.md: no completed clutter). If you used **Tell**, note it in inbox.md.

## Suggested first slice

Dead deletes + ABI sync lists + belief/ERC-20/env helper dedup + CauseStarter
`runtimeConfig` / `useMachinery` / `useWriteClients` fold + `@ui` lint. Mostly
deletions and one-file consolidations, plus the CS `config.json` bug.

---

## Slice D — CauseStarter still forks the shared UI (highest product impact)

CauseStarter is the SPA in `ui/src/causestarter/`. `main.tsx` loads
`shared/config/runtimeConfig.ts` (`loadRuntimeConfig('./config.json')`). CS
pages/hooks still read a **second singleton that is never loaded from
`config.json`**, so IPFS overlays (RPC, contracts, `VITE_EVENT_CACHE_URL`, …)
do not apply to CS. That is a bug, not style.

### Fold onto shared (do this first in the slice)

Replace ~40 CS imports of `../lib/useMachinery|useWriteClients|runtimeConfig|domainUrls`:

| CS copy | Shared original | Notes |
| --- | --- | --- |
| `ui/src/causestarter/lib/runtimeConfig.ts` | `ui/src/shared/config/runtimeConfig.ts` | CS missing `VITE_CAUSESTARTER_URL`, denylist, policy, fiat, extra contracts |
| `ui/src/causestarter/lib/useMachinery.ts` | `ui/src/shared/hooks/useMachinery.ts` | CS skips `civilityPolicyGatewayConfig` |
| `ui/src/causestarter/lib/useWriteClients.ts` | `ui/src/shared/hooks/useWriteClients.ts` | Byte-identical |
| `ui/src/causestarter/lib/domainUrls.ts` | `ui/src/shared/routing/domainUrls.ts` | CS `DomainId` omits `causestarter`; used by CS `DocsPage.tsx` |

Invert wagmi ↔ CauseStarter:

- `ui/src/wagmi.ts` imports Hardhat helpers from
  `ui/src/causestarter/lib/hardhatAccounts.ts` and `hardhatLocalConnector.ts`.
  Move those under `shared/` (or `ui/src/`). Delete
  `ui/src/causestarter/wagmi.ts` if still a re-export.

One `WalletButton`: fold CS Hardhat account menu + ConnectKit (no Privy) into
`ui/src/shared/components/WalletButton.tsx` so `CauseShell` does not need a
CS-only button. CS also has no theme toggle (`useThemeMode`); AppShell already
does.

### Module boundaries

- ESLint `no-restricted-imports` in `ui/eslint.config.js` only matches relative
  `../module/` paths. `@ui/*` aliases let CauseStarter deep-import internals.
  Forbid `@ui/<module>/…` except barrels and `pages/*`.
- Promote symbols CS already consumes onto barrels, then import barrels only:
  - Settings: `DirectTrustSettingsSection`, `NudgerSettingsSection` —
    `conceptspace/index.ts` currently only exports `StatementRenderer`.
  - `lazy-giving/index.ts` does not export `metadata` (CS `userProjects.ts` and
    `content-funding/hooks/useContentFundingState.ts` deep-import it).
  - `alignedContent.ts` deep-imports `@ui/content-funding/statementCidMatch`
    even though that is already on the content-funding barrel.
- Stop hardcoding CauseStarter in `ui/src/App.tsx` (`CauseShell`,
  `domain.useCauseShell`). Put `Shell` on `domains/types.ts` /
  `domains/causestarter/manifest.tsx` so App only knows manifests.

### Accidental complexity / hosting

- Fake code-splitting: `lazyRoute(() => import('…/DelegationPages'), …)` and
  `ContentFundingPages` hit one module. Point CS routes at
  `delegation/pages/*` and `domains/content-funding/ContentPages` the way
  `domains/lazy-giving/manifest.tsx` does. Then delete the host barrels.
- Delete no-op `ui/src/causestarter/pages/CreateProjectPage.tsx` (only
  re-renders LazyGiving’s page). Keep `ProjectDetailPage.tsx` (bookmark +
  `listPath`).
- Parameterize DocsPage instead of forking CS vs `ui/src/docs/DocsPage.tsx`.
  Shared DocsPage also omits `causestarter` from `DOMAIN_FOLDERS`.
- One StatementPicker: shared vs CS (`components/StatementPicker.tsx` +
  `lib/statementPicker.ts`). Same retrieve/rank/copy; CS adds cause-assist
  drafts and analytics. Lift drafts behind an optional prop on the shared picker.
  (Scale of the picker window is already in inbox — do not rebuild ranking here.)
- Unify mediator opt-in: `shared/nudges/MediatorOptInBlock.tsx`,
  `CauseMediatorCard.tsx`, `ClusterMediatorOptIn.tsx`. Keep CS compact layout;
  share the store/toggle helper.
- Dedup aligned-content selection: CS `lib/alignedContent.ts` copies
  `content-funding/selectAlignedContent.ts` nested loops. Add item-level
  selection (plus `contentItemPublicUrl` / `contentChannelPath`) to the
  content-funding barrel.
- Dedup Content Funding copy: CS `ContentFundingPages.tsx` reimplements
  `ContentFundingCreatorsPage` with the same strings as
  `domains/content-funding/ContentPages.tsx`, only changing `learnMorePath`.
- Dead `features` flags: every `domains/*/manifest.tsx` fills `DomainFeatures`;
  nothing reads `domain.features`. Delete the field or drive route inclusion.
- Duplicate branding types: `AppShell.tsx` redeclares `DomainBranding` /
  `DomainShellConfig` already in `domains/types.ts`.
- `getDomainIdFromEnv` in `domains/index.ts` special-cases `civility` then lists
  it again in the union. Collapse to `domainId in domainManifests`.
- Bookmark stores `causeBookmarks.ts` vs `projectBookmarks.ts` share MutableRef
  + localStorage shape with different schemas — tiny `refDocumentStore` helper.
- `HeaderInfoTip` vs shared `InfoChip`/`InfoLabel`.
- Do **not** merge CS `StatementPage` with conceptspace `StatementPage` (cause
  board vs belief UI). Sharing `documentText` / combinator loading is optional
  if you already touch those files.
- Combinator operand loading / unguarded StatementPage writes are **already on
  TODO.md** — do not re-file; the CS path in that item still says
  `causestarter/src/pages/StatementPage.tsx` (should be `ui/src/causestarter/`).

### Leftover package glue (already on TODO.md)

Do not duplicate; when you are in this area you may also hit:

- `causestarter/vite.config.ts` unused; Compose/Docker `:8090` vs Vite `:5174`.
- `scripts/setup-env.sh` and `scripts/seed-causestarter-vite-env.py` still write
  `causestarter/.env`; Vite reads `ui/.env`.
- `scripts/docker-build-plan.mjs` still hashes `causestarter` for
  `ui-ipfs-publisher-causestarter`.
- `scripts/deploy-ui.sh` domain allow-list and
  `cloudflare-ui-gateway/ui-gateway.mjs` `IPNS_BY_SUBDOMAIN` still omit
  `causestarter` while `scripts/ui-domains.mjs` has it.

---

## Slice E — SDK public API and compile hygiene

- Narrow `@commonality/sdk/utils`: `sdk/src/utils/index.ts` exports production
  plus test-only APIs (`TEST_PRIVATE_KEYS`, `fakeIpfsCidV1`, mock IPFS). Split
  `./utils/test` (or `./testing`) so UI bundles do not see Hardhat keys.
- `createWriteClients` in `sdk/src/utils/ethereum.ts` always uses
  `viem/chains.hardhat`. Rename to `createHardhatWriteClients` or take a chain
  argument.
- Do not compile scripts/tests into the library program: `sdk/tsconfig.json`
  has `"strict": false`, includes `scripts/**/*`, ships `dist/scripts/sync-abis.js`.
  Point library tsconfig at `src/` + `abis/` only; run scripts with `tsx`.
- Stale header on `sdk/src/abis.ts`: “Centralized Contract ABIs for Integration
  Tests” — this is the public ABI entry.
- SDK README says there is no flat barrel, then the indexer-sync example still
  imports from `@commonality/sdk`. Use `@commonality/sdk/indexer-sync`. Drop
  leftover GraphQL language in `chain-reads.ts`. Add TypeDoc entry points for
  `published-data` and `policy-lists` in `sdk/typedoc.json`.
- Retire `sdk/schema.graphql` (unused). `integration-tests/codegen.ts` still
  points at it and comments “same source as sdk/codegen.ts”; there is no
  `sdk/codegen.ts`.
- Filename convention: most of `src/` is kebab-case; three public utils are
  camelCase (`eventCacheClient.ts`, `eventDecoder.ts`, `chainIds.ts`).
- Quote/semicolon: `machinery.ts` / `config-node.ts` use double quotes;
  `conceptspace/statement-picker.ts` has no semicolons. Rest is single-quote +
  semicolons.
- ~50 copies of `account: clients.walletClient.account!` +
  `waitForTransactionReceipt` across `actions.ts` files — a small
  `writeAndWait` in `ethereum.ts` would remove most of it.
- CID stack: hand-rolled codec in `sdk/src/utils/cid-types.ts`; policy-lists use
  `multiformats`; indexer had a near-copy (delete in slice A). Longer-term,
  one codec.

---

## Slice F — Oversized files (one PR per god-module)

Repo guardrail: `eslint.metrics.mjs` `max-lines` 600. Split along natural
seams; do not rewrite behavior.

SDK:

- `sdk/src/utils/eventDecoder.ts` (~1377): ~30 copy-paste `decodeRawEventLog`
  functions; linear scan by event **name** is fragile if two contracts share a
  name. Split per subsystem; return `events.ts` types. `PublishedDataAbi` is
  not on the shared decoder today.
- `sdk/src/utils/chain-reads.ts` (~770): hand-rolled view ABI fragments + ~20
  `@ts-expect-error`s. Use generated ABIs from `src/abis.ts`.
- `sdk/src/subsystems/conceptspace/queries.ts` (~1240)
- `sdk/src/subsystems/content-funding/queries.ts` (~1029)
- `sdk/src/subsystems/displayable-documents/displayable-document.ts` (~700)
- `sdk/src/subsystems/lazy-giving/actions.ts` (~612)

UI:

- `ui/src/causestarter/pages/BridgeClusterPage.tsx` (~1341)
- `ui/src/causestarter/pages/CauseDetailPage.tsx` (~1276)
- `ui/src/mutable-refs/MyRefsPage.tsx` (~993)
- `ui/src/causestarter/lib/causeRoster.ts` (~779)
- `ui/src/content-funding/pages/ChannelPage.tsx` (~743)
- `ui/src/fundingportals/components/CauseBoard.tsx` (~676)
- `ui/src/lazy-giving/components/BuyTokensSection.tsx` (~615)
- `ui/src/causestarter/lib/causeStore.ts` (~607)
- Nearby: `delegation/pages/NoteDetailPage.tsx` (~826),
  `ContentAttestationSummary.tsx` (~573), `CreateProjectPage.tsx` (~567)

Event-fetch completeness: `fetchEventsComplete` exists and is used for
delegation/note-intent, but many queries still `limit: 10000`. Conceptspace
throws when it *hits* 10000, which is a trap. Pick one complete-fetch helper.
**Do not** build a server-side DirectSupport fold (inbox/TODO already own
believer-set scale and the 10⁵-signer measurement).

Stale secondary-market comments in `eventCacheClient.ts`
(`fetchAllBoughtEvents` / `fetchAllSoldEvents`) and special-case
`createERC1155AndMarketplaceAndAssuranceContract` in `lazy-giving/actions.ts`.

---

## Slice G — Docs / TODO path drift (meta)

Not product work; fix when you touch the files.

- After the SPA fold, real code is `ui/src/causestarter/`. Stale
  `causestarter/src/...` still appears in root TODO (StatementPage combinator
  item), inbox (`causeStore.ts`, `concurrency.ts`, `believerSetsCache.ts`,
  `StatementPicker.tsx`), and some founder/spec docs.
- `causestarter/TODO.md` keeps `[x]` shipped items as local history; do not
  treat those as open work.
- `testnet-prep.md` still says Privy “unblocks the embedded-wallet cluster in
  TODO.md”; that cluster is gone from TODO (remainder is inbox).
- `workflow/testing-inventory.md` dated 2026-06-22 does not mention the current
  3× `0n` funding-portal tests or `InvalidVerifierSignature` (those bugs are
  already on TODO.md).
- `workflow/project-status.md` still frames MVP as eight branded UIs; README /
  local-dev already treat CauseStarter as primary and default-publish only that
  domain.
- Duplicate `loadDisplayDenylist` / leftover “cause page” identifiers: inbox +
  causestarter TODO already own the product copy; this plan only cares about
  identifier/path leftovers in code.

---

## Already filed (do not duplicate)

| Topic | Where |
| --- | --- |
| Nested-place geo rollup | TODO.md, inbox.md |
| Statement-generation exercise 2 | TODO.md |
| CauseStarter leftover glue (`vite.config.ts`, `:8090` vs `:5174`, verifier prompts) | TODO.md |
| Alignment-trust bootstrap integration test | TODO.md |
| Glossary leftovers (earmark, marketplaceAddress, contract dir names) | TODO.md |
| Funding-portal `0n` aggregation tests | TODO.md |
| Playwright `InvalidVerifierSignature` | TODO.md |
| Client-side DirectSupport fold at ~10⁵ signers | TODO.md (Tell: measure, do not build server fold) |
| Demo seed / A5 / E2 coverage | TODO.md |
| Combinator operand fetches blocking StatementPage; unguarded loader writes | TODO.md |
| Believer-set fan-out / silent `limit: 10000` on CS picker | inbox.md, causestarter/TODO.md |
| localStorage drafts, unused statement bookmarks, Privy parity | causestarter/TODO.md, inbox.md |
| `normalizeSlug` vs 64-char hyphen cut | causestarter/TODO.md |
| Disjunctive `any` mint | causestarter/TODO.md (Ask) |
| Hardhat 2→3, GitHub Issues, chain-docs consolidation | inbox.md |

`CONTINUITY.md` is an append-only log, not a backlog.

---

## Out of scope for this plan

- Rewriting `ContentFunding.test.js` wholesale.
- Indexing Ownable / `Transfer` / admin events.
- Merging CS StatementPage with conceptspace StatementPage.
- Building a server-side believer-set / DirectSupport fold.
- Obsessive style nits beyond files you already have to touch.
