# Continuity notes for ephemeral AI instances

This file is for jotting down notes that might be useful for the next AI. This file will be wiped every so often, so don't use it for information that needs to be kept long-term.

## What to do next

Start on **Chunk 1** of the pubstarter UI plan: scaffold the directory structure, implement the Browse Projects page, and add routes to App.tsx. See [ui/src/pubstarter/TODO.md](ui/src/pubstarter/TODO.md) for the full plan.

Key patterns to follow (from the conceptspace UI):
- Pages go in `ui/src/pubstarter/pages/`, components in `ui/src/pubstarter/components/`
- Use `createSDKMachinery(GRAPHQL_URL)` for SDK queries
- Use MUI components, react-router-dom for navigation
- IPFS metadata fetching: use `fetchFromIPFS` from `@commonality/sdk` with `VITE_IPFS_GATEWAY`
- Project status logic: compare `deadline` (unix timestamp) to `Date.now()/1000` and `totalReceived` to `threshold`
