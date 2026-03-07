# Continuity notes for ephemeral AI instances

This file is for jotting down notes that might be useful for the next AI. This file will be wiped every so often, so don't use it for information that needs to be kept long-term.

## What to do next

Funding Portals UI Chunk 3 complete. Do Chunk 4 next.

  - Chunk plan: ui/src/fundingportal/CHUNKS.md
  - Spec: specs/subsystems/fundingportals/ui.md
  - SDK queries/actions: sdk/src/subsystems/fundingportals/ (already implemented)

## Key notes from this session

- Chunk 3 (Attest Project Alignment Form + Available Delegatable Notes Section) complete
- Files created: `ui/src/fundingportal/components/AttestAlignmentForm.tsx`, `DelegatableNotesSection.tsx`
- Updated `StatementFundingPortalPage.tsx` to include both new components (after `AlignedProjectsList`)
- Updated `components/index.ts` to export new components
- `AttestAlignmentForm`: only renders when wallet connected, collapsible, uses `getAllProjects` for autocomplete (freeSolo to allow manual address entry), calls `attestAlignment` with `PROJECT_ALIGNMENT_TOPIC` as the topic
- `DelegatableNotesSection`: collapsible, lazy-loads notes (only fetches when opened), shows Note ID, amount, root owner, leaf owner, and delegation status (Delegated/Direct chip via `isDelegate` utility)
- Both use existing patterns from `DepositPage.tsx` and `AvailableDelegatableFunding.tsx`
- For Chunk 4: Implement `CauseLeaderboardPage.tsx` at `/portal/:statementCid/leaderboard` using `getTopContributorsForCause` and `getUserContributionRankForCause` from SDK
