# Delegation UI Review — 2026-03-07

## Scope

Review of all delegation-related UI code: the `ui/src/delegation/` module, plus delegation integrations in `pubstarter/`, `fundingportal/`, and `conceptspace/`.

## Overall Verdict

**The delegation UI is functionally complete.** All major user flows are implemented: depositing, delegating, revoking, reclaiming, spending notes on projects, and viewing delegation chains. The system is well-integrated across four different UI modules. However, test coverage has significant gaps, and there is one bug worth fixing.

---

## Feature Completeness

### Core delegation module (`ui/src/delegation/`)

| Feature | Status | File |
|---|---|---|
| Deposit ETH as delegatable note | Done | `delegation/pages/DepositPage.tsx` |
| Optional delegate-on-deposit | Done | `delegation/pages/DepositPage.tsx` |
| Optional NoteIntent attestation on deposit | Done | `delegation/pages/DepositPage.tsx` |
| List notes I control | Done | `delegation/pages/MyNotesPage.tsx` |
| List notes I deposited | Done | `delegation/pages/MyNotesPage.tsx` |
| Summary cards (total funds, active notes, delegate count) | Done | `delegation/pages/MyNotesPage.tsx` |
| Delegate a note to another address | Done | Both pages |
| Revoke a delegation | Done | Both pages |
| Reclaim funds from undelegated note | Done | Both pages |
| Note detail with delegation chain visualization | Done | `delegation/pages/NoteDetailPage.tsx` |
| Spend note on a pubstarter project | Done | `delegation/pages/NoteDetailPage.tsx` |
| Intended purpose display (NoteIntent attestations) | Done | `delegation/pages/NoteDetailPage.tsx` |
| Shared utils (isEthNote, formatNoteAmount, etc.) | Done | `delegation/utils.ts` |

### Cross-module integrations

| Integration | Status | File |
|---|---|---|
| Navigation: "My Notes" in AppShell | Done | `shared/components/AppShell.tsx` |
| Routes: `/notes`, `/notes/new`, `/notes/:noteId` | Done | `App.tsx` |
| Statement page: Available Delegatable Funding table | Done | `conceptspace/pages/StatementPage.tsx` via `delegation/components/AvailableDelegatableFunding.tsx` |
| Funding portal: delegatable notes summary stat | Done | `fundingportal/pages/StatementFundingPortalPage.tsx` |
| Funding portal: collapsible notes table | Done | `fundingportal/components/DelegatableNotesSection.tsx` |
| Pubstarter buy: "Fund with delegatable note" toggle | Done | `pubstarter/components/BuyTokensSection.tsx` |
| Pubstarter leaderboard: delegation chain display | Done | `pubstarter/components/Leaderboard.tsx` |
| Pubstarter project detail: fetch chains for leaderboard | Done | `pubstarter/pages/ProjectDetailPage.tsx` |

**No missing features detected.** The full lifecycle (deposit → delegate → spend/revoke/reclaim) is covered, and delegation context is surfaced in all the right places.

---

## Bug

### NoteDetailPage: null dereference before guard

In `delegation/pages/NoteDetailPage.tsx`, lines 567-574 compute permission flags using `note!` (non-null assertion):

```ts
const isCurrentLeafOwner = note?.owner.toLowerCase() === address?.toLowerCase()
const isRootOwner = note?.rootOwner.toLowerCase() === address?.toLowerCase()
const isChainMember = chain.some(link => link.address.toLowerCase() === address?.toLowerCase())
const isUndelegated = !isDelegate(note!)    // <-- crashes if note is null
const canDelegate = isCurrentLeafOwner
const canRevoke = isChainMember && !isCurrentLeafOwner
const canReclaim = isRootOwner && isUndelegated
const canSpend = isCurrentLeafOwner && isEthNote(note!)  // <-- crashes if note is null
```

These lines execute *before* the `if (loading) return ...` and `if (error || !note) return ...` guards at lines 576-592. If `getNote` returns null (e.g. invalid note ID) and loading completes, `isDelegate(note!)` and `isEthNote(note!)` will crash because `note` is null.

**Fix**: Move these computations after the null guard, or use optional chaining with defaults.

---

## Test Coverage

### What's tested

- **MyNotesPage**: 13 unit tests covering wallet-not-connected, loading, error, empty state, note display with chips, action buttons, navigation links, inactive note filtering, and delegate counting. Good coverage.

### What's NOT tested

| Component | Test file | Gap severity |
|---|---|---|
| `NoteDetailPage` | None | **High** — complex page with chain visualization, 4 action types, spend dialog |
| `DepositPage` | None | **High** — multi-step form with deposit + optional delegation + optional attestation |
| `AvailableDelegatableFunding` | None | Medium — simple display component |
| `DelegatableNotesSection` | None | Medium — similar to above |
| `BuyTokensSection` (note toggle) | None | **High** — the "Fund with delegatable note" flow in pubstarter has no test coverage at all |
| `Leaderboard` (chain display) | None | Low — presentational, delegation chain display is a nice-to-have |
| `delegation/utils.ts` | None | Low — four simple pure functions, but easy to test |
| `ProjectDetailPage` delegation chain enrichment | Not mocked | Low — graceful degradation (logs warning, doesn't break) |

The ProjectDetailPage test file (1822 lines, very thorough) does not mock or test the delegation chain enrichment (`getPurchasedNoteEventsByTxHashes`, `getDelegationChainsForNotes`). Since that code is wrapped in a try/catch with graceful fallback, this is low-risk but still a gap.

**No E2E tests** cover delegation flows. The existing 6 Playwright specs cover belief expression, browsing, statement creation, user profile, and wallet connection.

### Test summary

- 1 of 3 delegation pages has unit tests
- 0 of 2 delegation components have unit tests
- 0 of 2 pubstarter delegation integrations have delegation-specific tests
- 0 of 2 fundingportal delegation integrations have tests
- 0 E2E tests for delegation

---

## Code Quality Notes

- Clean separation of concerns: delegation module is self-contained with clear exports
- Utils are shared properly via `delegation/utils.ts` (used by fundingportal components)
- Consistent patterns: loading/error/empty states, wallet connection checks, SDK usage
- The `DelegatableNotesSection` in fundingportal properly uses a cancellation flag for async cleanup
- The `BuyTokensSection` in pubstarter cleanly toggles between direct purchase and note-funded purchase
- Leaderboard chain deduplication logic is correct

---

## Recommendations

1. (DONE) **Fix the NoteDetailPage null dereference bug** — move permission flag computation after the null guard
2. (DONE) **Add unit tests for NoteDetailPage** — highest priority; complex component with many interaction paths
3. **Add unit tests for DepositPage** — multi-step form with validation and sequential transactions
4. **Add tests for BuyTokensSection note flow** — the "Fund with delegatable note" toggle has no coverage
5. (DONE) **Add tests for delegation/utils.ts** — quick win, four pure functions
6. **Consider an E2E test for the deposit → delegate → spend flow** — would catch integration issues across modules
