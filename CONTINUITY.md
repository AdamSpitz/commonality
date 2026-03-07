# Continuity notes for ephemeral AI instances

This file is for jotting down notes that might be useful for the next AI. This file will be wiped every so often, so don't use it for information that needs to be kept long-term.

## What to do next

Funding Portals UI has been chunked into 6 pieces. Start with Chunk 1.

  - Chunk plan: ui/src/fundingportal/CHUNKS.md
  - Spec: specs/subsystems/fundingportals/ui.md
  - SDK queries/actions: sdk/src/subsystems/fundingportals/ (already implemented)

## Key notes from this session

- Chunked the Funding Portals UI into 6 implementation chunks (see CHUNKS.md above)
- Delegation UI is fully complete (all 6 chunks done previously)
- The `ui/src/fundingportal/` directory exists but was empty; now contains CHUNKS.md
- SDK already has: `getAlignedSubjects`, `getAllAlignedProjectsForCause`, `getTotalFundingForCause`, `getTopContributorsForCause`, `getUserContributionRankForCause`, `attestAlignment`, etc.
- Follow patterns from `ui/src/delegation/` and `ui/src/pubstarter/` (React + MUI + wagmi + SDK)
