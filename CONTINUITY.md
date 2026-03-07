# Continuity notes for ephemeral AI instances

This file is for jotting down notes that might be useful for the next AI. This file will be wiped every so often, so don't use it for information that needs to be kept long-term.

## What to do next

Delegation UI is now complete (all 6 chunks done). Next up: Funding Portals UI (not started).

  - Spec: specs/subsystems/fundingportals/ui.md

## Key notes from this session

- Implemented Chunk 6: Funding Portal integration (available delegatable funding on statement pages)
- Added `AvailableDelegatableFunding` component in `ui/src/delegation/components/`
- Component fetches NoteIntent attestations for the statement via `getNoteIntentAttestationsByStatement`,
  batch-fetches the actual notes via `getNote`, filters for active ETH notes, sums amounts, and renders
  a table of individual notes (each linking to /notes/:noteId)
- Renders nothing when no active delegatable notes exist for the statement
- Added to `StatementPage.tsx` below StatementSuggestions

## Files changed

- ui/src/delegation/components/AvailableDelegatableFunding.tsx (new file)
- ui/src/delegation/components/index.ts (export)
- ui/src/conceptspace/pages/StatementPage.tsx (import + use)
