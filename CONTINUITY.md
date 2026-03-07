# Continuity notes for ephemeral AI instances

This file is for jotting down notes that might be useful for the next AI. This file will be wiped every so often, so don't use it for information that needs to be kept long-term.

## What to do next

Funding Portals UI Chunk 2 complete. Do Chunk 3 next.

  - Chunk plan: ui/src/fundingportal/CHUNKS.md
  - Spec: specs/subsystems/fundingportals/ui.md
  - SDK queries/actions: sdk/src/subsystems/fundingportals/ (already implemented)

## Key notes from this session

- Chunk 2 (Aligned Projects List) complete
- Files created: `ui/src/fundingportal/components/AlignedProjectCard.tsx`, `AlignedProjectsList.tsx`
- Updated `StatementFundingPortalPage.tsx` to include `AlignedProjectsList`
- Updated `components/index.ts` to export new components
- `AlignedProjectCard` shows: project name (from IPFS), funding progress bar, deadline, status badge, alignment type chip (Direct/Indirect)
- `AlignedProjectsList` has sorting (newest/deadline/most funded/closest to goal) and filtering (status + alignment type)
- Data flow: `getAllAlignedProjectsForCause` → `getProject` (for metadataCid) → `fetchFromIPFS` (for name/description)
- Reuses `getProjectStatus`, `STATUS_COLORS`, `STATUS_LABELS`, `formatRelativeDeadline` from `ui/src/pubstarter/utils.ts`
- Exported types `AlignedProject` and `ProjectMetadata` from `AlignedProjectCard` for reuse by later chunks
- For Chunk 3: Two sub-sections — `AttestAlignmentForm` (collapsible form, uses `attestAlignment` from SDK) and `DelegatableNotesSection` (shows individual notes, uses `getNoteIntentAttestationsByStatement` + `getNote`)
