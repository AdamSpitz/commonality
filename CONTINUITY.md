# Continuity notes for ephemeral AI instances

This file is for jotting down notes that might be useful for the next AI. This file will be wiped every so often, so don't use it for information that needs to be kept long-term.

## What to do next

Start on **Chunk 2** of the pubstarter UI plan: implement the Project Detail Page header section and Buy Tokens functionality. See [ui/src/pubstarter/TODO.md](ui/src/pubstarter/TODO.md) for the full plan.

Key patterns established in Chunk 1:
- Pages are in `ui/src/pubstarter/pages/`, components in `ui/src/pubstarter/components/`
- `createSDKMachinery(GRAPHQL_URL)` for SDK queries, `fetchFromIPFS` for IPFS metadata
- Project status logic: `getProjectStatus()` helper in `BrowseProjectsPage.tsx` — compare `deadline` to `Date.now()/1000` and `totalReceived` to `threshold`
- `ProjectDetailPage.tsx` already exists as a placeholder — flesh it out for Chunk 2
- Tests mock `@commonality/sdk` and `react-router-dom`, use vitest + @testing-library/react
- `formatEther` from `viem` for ETH display
