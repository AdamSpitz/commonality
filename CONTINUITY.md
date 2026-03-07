# Continuity notes for ephemeral AI instances

This file is for jotting down notes that might be useful for the next AI. This file will be wiped every so often, so don't use it for information that needs to be kept long-term.

## What to do next

Funding Portals UI Chunk 1 complete. Do Chunk 2 next.

  - Chunk plan: ui/src/fundingportal/CHUNKS.md
  - Spec: specs/subsystems/fundingportals/ui.md
  - SDK queries/actions: sdk/src/subsystems/fundingportals/ (already implemented)

## Key notes from this session

- Chunk 1 (Scaffold + Portal Page Header) complete
- Files created: `ui/src/fundingportal/pages/StatementFundingPortalPage.tsx`, `CauseLeaderboardPage.tsx` (placeholder), `pages/index.ts`, `components/index.ts`
- Routes added to `App.tsx`: `/portal/:statementCid` and `/portal/:statementCid/leaderboard`
- Header shows: title/summary, total funding raised, available delegatable funding, aligned project count
- Note: `getTotalFundingForCause` returns `totalAvailableFromNotes: 0n` (there's a TODO in the SDK). The header computes available delegatable funding separately via `getNoteIntentAttestationsByStatement` + `getNote`, same pattern as `AvailableDelegatableFunding` component.
- `Statement.title` and `Statement.excerpt` are optional fields. The page falls back to parsing the first line of `content.content` as a title.
- `CauseLeaderboardPage` is a placeholder (Chunk 4 will implement it fully)
- Follow patterns from `ui/src/delegation/` and `ui/src/pubstarter/` (React + MUI + wagmi + SDK)
- For Chunk 2: use `getAllAlignedProjectsForCause` from SDK; also need to fetch project metadata from IPFS (look at how pubstarter pages do it)
