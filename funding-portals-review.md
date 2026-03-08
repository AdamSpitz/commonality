# Funding Portals UI Code Review

**Date**: 2026-03-08
**Scope**: `ui/src/fundingportal/` — all pages and components

## Files Reviewed

- `pages/StatementFundingPortalPage.tsx`
- `pages/CauseLeaderboardPage.tsx`
- `components/AlignedProjectCard.tsx`
- `components/AlignedProjectsList.tsx`
- `components/AttestAlignmentForm.tsx`
- `components/DelegatableNotesSection.tsx`
- `components/FundingPortalSummary.tsx`
- `components/AlignmentAttestationsSection.tsx`

## Verdict

**Overall**: Functionally complete. All funding portal flows are implemented. Four bugs found (two behavioral, two UX/consistency). One DRY violation. Test coverage is zero.

---

## Bugs Found

### [x] Bug 1 — `DelegatableNotesSection`: errors silently swallowed (FIXED)

**File**: `components/DelegatableNotesSection.tsx`, line 52
**Severity**: Medium — if loading fails, user sees "No delegatable notes" with no indication of the error.
**Problem**: `catch` block only does `console.warn`, no error state is set or displayed.
**Fix**: Add an `error` state and display an `<Alert>` if loading fails.

### [x] Bug 2 — `DelegatableNotesSection`: non-ETH notes shown in table (FIXED)

**File**: `components/DelegatableNotesSection.tsx`, line 50
**Severity**: Medium — inconsistency between what's displayed and what's counted in the metric.
**Problem**: `StatementFundingPortalPage` and `FundingPortalSummary` both compute available delegatable funding using `n.active && isEthNote(n)`. But `DelegatableNotesSection` only filters by `n.active`, so it can display non-ETH notes in the table even though those notes aren't included in the metric.
**Fix**: Also filter by `isEthNote(n)` in `DelegatableNotesSection`.

### [x] Bug 3 — `AlignmentAttestationsSection`: list not refreshed after successful attestation (FIXED)

**File**: `components/AlignmentAttestationsSection.tsx`, line ~121
**Severity**: Medium — after successfully attesting, the user sees a success message but the new attestation doesn't appear in the list without a page reload.
**Fix**: After a successful attestation, re-fetch the alignments list.

### [x] DRY — `getAlignmentContract` duplicated (FIXED)

**Files**: `components/AttestAlignmentForm.tsx`, `components/AlignmentAttestationsSection.tsx`
**Severity**: Low — both files contain identical `getAlignmentContract` functions. Any change to one needs to be mirrored in the other.
**Fix**: Extract to `components/index.ts` or a shared utility.

---

## Issues Noted (not fixed)

### DRY — Available delegatable funding calculation duplicated

**Files**: `pages/StatementFundingPortalPage.tsx` (lines 71–84), `components/FundingPortalSummary.tsx` (lines 89–103)
**Severity**: Medium — identical async logic to fetch note intent attestations and sum active ETH notes is copy-pasted.
**Recommendation**: Extract into a `computeAvailableDelegatableFunding(machinery, statementCid)` helper in a shared utility file, reusable by both components.

### Naming — `'newest'` sort in `AlignedProjectsList` sorts by deadline descending

**File**: `components/AlignedProjectsList.tsx`, line 103
**Severity**: Low — "Newest" button sorts by latest deadline, which is not intuitive. There's no creation timestamp available on `AlignedProject`, so this may be the best available approximation. Could relabel to "Latest" to be less confusing.

---

## General Observations

- **Cancellation tokens**: Used consistently in all effects. Good.
- **Error handling**: Loading and error states present on all components except `DelegatableNotesSection` (fixed above).
- **`useMachinery` stable**: Correctly omitted from `useEffect` deps since `useMachinery` uses `useMemo([])`.
- **`as any` casts for wagmi clients**: `walletClient as any` and `publicClient as any` appear in `AttestAlignmentForm` and `AlignmentAttestationsSection`. These are wagmi-type-vs-viem-type mismatches that are common workarounds. Not ideal but acceptable.
- **Parallel fetching**: All N+1 patterns use `Promise.all`, so actual network calls are concurrent. Good.
- **`AlignmentAttestationsSection` "Direct" chip**: All alignments in this component are displayed with a hardcoded "Direct" chip. The `AlignmentAttestation` type doesn't expose a direct/indirect field in this context, so this appears correct for attestations viewed from the project side.

---

## Test Coverage

No test files exist for any funding portal component or page.

**Recommended test targets** (in priority order):
1. `AlignedProjectsList` — filter/sort logic is pure computation on loaded data; testable without much blockchain mocking
2. `AlignedProjectCard` — pure presentational; trivial to snapshot/render test
3. `StatementFundingPortalPage` — integration-style test covering loading, error, and happy path
4. `CauseLeaderboardPage` — rendering with mock leaderboard data, user-row highlighting
5. `AttestAlignmentForm` / `AlignmentAttestationsSection` — form submission flows

---

## Action Items

- [x] Fix `DelegatableNotesSection` error state (show error to user)
- [x] Fix `DelegatableNotesSection` to filter by `isEthNote`
- [x] Fix `AlignmentAttestationsSection` to refresh list after successful attestation
- [x] Extract `getAlignmentContract` to shared location
- [ ] Extract `computeAvailableDelegatableFunding` helper (DRY refactor)
- [ ] Add unit tests for funding portal components
- [ ] Consider renaming `'newest'` sort to `'latest'` in `AlignedProjectsList`
