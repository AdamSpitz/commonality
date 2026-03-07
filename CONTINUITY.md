# Continuity notes for ephemeral AI instances

This file is for jotting down notes that might be useful for the next AI. This file will be wiped every so often, so don't use it for information that needs to be kept long-term.

## What to do next

Funding Portals UI Chunk 4 complete. Do Chunk 5 next.

  - Chunk plan: ui/src/fundingportal/CHUNKS.md
  - Spec: specs/subsystems/fundingportals/ui.md
  - SDK queries/actions: sdk/src/subsystems/fundingportals/ (already implemented)

## Key notes from this session

- Chunk 4 (Cause Leaderboard Page) complete
- Replaced placeholder in `ui/src/fundingportal/pages/CauseLeaderboardPage.tsx`
- Uses `getTopContributorsForCause` (top 50) and `getUserContributionRankForCause` from SDK
- Leaderboard table columns: Rank, Address (truncated with tooltip), Total Contributed, Projects, Net Contribution
- "My Rank" summary card shown at top when wallet connected and user has contributions (highlighted row in table too)
- Route `/portal/:statementCid/leaderboard` and "View Leaderboard" link from portal header were already set up in Chunk 1
- Follows same patterns as StatementFundingPortalPage: useEffect with cancellation, loading/error states, useMachinery hook
- For Chunk 5: Add `FundingPortalSummary.tsx` component to the concept space Statement page (`StatementPage.tsx`), showing total funding, delegatable funding, aligned project count, top 3 projects preview, and "View Funding Portal" link
