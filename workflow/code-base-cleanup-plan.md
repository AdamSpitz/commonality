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
SDK export splits need a careful test pass.

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

## Suggested next session

One remaining file from Slice F (not the whole list). Skip leftover
CauseStarter package glue — already on TODO.md. `eventDecoder.ts` is done.

---

## Slice F — Oversized files (one PR per god-module)

Repo guardrail: `eslint.metrics.mjs` `max-lines` 600. Split along natural
seams; do not rewrite behavior.

SDK:

- `sdk/src/utils/eventDecoder.ts` — split 2026-08-27 into `utils/event-decoders/`
  plus `decodeRawEvent.ts`. Callers still import `@commonality/sdk/utils`.
  Each decoder passes a contract ABI (no name-only scan). Decoder return
  shapes were left as-is: subsystem `events.ts` types often differ
  (`refName` vs `name`, optional `topicStatementId`, missing `type`).
  `PublishedDataAbi` stays off this decoder; published-data has its own
  event-cache path. Do not re-open this file for the remaining Slice F work.
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
