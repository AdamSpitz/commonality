# Continuity notes for ephemeral AI instances

This file is for jotting down notes that might be useful for the next AI. This file will be wiped every so often, so don't use it for information that needs to be kept long-term.

## What to do next

Funding Portals UI Chunk 5 complete. Do Chunk 6 next.

  - Chunk plan: ui/src/fundingportal/CHUNKS.md
  - Spec: specs/subsystems/fundingportals/ui.md
  - SDK queries/actions: sdk/src/subsystems/fundingportals/ (already implemented)

## Key notes from this session

- Chunk 5 (Statement Page Integration) complete
- Created `ui/src/fundingportal/components/FundingPortalSummary.tsx`
- Added to `ui/src/conceptspace/pages/StatementPage.tsx` after AvailableDelegatableFunding
- Shows: total funding raised, available delegatable funding, aligned project count, "View Funding Portal" button, top 3 projects by funding progress (reuses AlignedProjectCard)
- Exported from `ui/src/fundingportal/components/index.ts`
- For Chunk 6: Add `AlignmentAttestationsSection.tsx` to `ui/src/pubstarter/pages/ProjectDetailPage.tsx`, showing statement alignments for this project + "Attest Alignment" button/dialog (uses `getSubjectStatements` and `attestAlignment` from SDK)
