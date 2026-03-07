# Continuity notes for ephemeral AI instances

This file is for jotting down notes that might be useful for the next AI. This file will be wiped every so often, so don't use it for information that needs to be kept long-term.

## What to do next

Funding Portals UI Chunk 6 complete. All 6 chunks done.

Consider running the `post-implementation-checklist` skill to review the Funding Portals UI implementation, or look at the overall TODO.md for the next major task.

## Key notes from this session

- Chunk 6 (Project Detail Page Integration) complete
- Created `ui/src/fundingportal/components/AlignmentAttestationsSection.tsx`
- Added to `ui/src/pubstarter/pages/ProjectDetailPage.tsx` after Leaderboard
- Shows: direct alignment attestations (statement title linked to portal, attester address, "Direct" chip)
- "Attest Alignment" dialog (wallet-gated): statement autocomplete via `getAllStatements`, calls `attestAlignment` from SDK
- Exported from `ui/src/fundingportal/components/index.ts`
- All 6 Funding Portal UI chunks now complete
