# Continuity notes for ephemeral AI instances

This file is for jotting down notes that might be useful for the next AI. This file will be wiped every so often, so don't use it for information that needs to be kept long-term.

## What to do next

Start on **Chunk 5** of the pubstarter UI plan: implement the Token Burns + Trade History section on the Project Detail Page. See [ui/src/pubstarter/TODO.md](ui/src/pubstarter/TODO.md) for the full plan.

Key patterns established in Chunks 1-4:
- Pages are in `ui/src/pubstarter/pages/`, components in `ui/src/pubstarter/components/`
- `createSDKMachinery(GRAPHQL_URL)` for SDK queries, `fetchFromIPFS` for IPFS metadata
- Project status logic: `getProjectStatus()` helper — compare `deadline` to `Date.now()/1000` and `totalReceived` to `threshold`
- Contract writes use SDK action functions (`buyProjectTokens`, `refundProjectTokens`, `withdrawProjectFunds`) with `AssuranceContract` = `{ address, abi: AssuranceContractAbi }` and `TestClients` from wagmi hooks
- Tests mock `@commonality/sdk`, `react-router-dom`, and `wagmi`; use vitest + @testing-library/react
- Tests must be run from `ui/` directory (root vitest config lacks JSX setup)
- `formatEther` from `viem` for ETH display
- Contribution/Refund data: `getProjectContributions` + `getProjectRefunds`, tokenIds/tokenCounts stored as JSON string arrays
- Leaderboard: aggregate contributions minus refunds per address, sort by net descending
- Secondary Market: `getActiveSaleListings` + `getActiveBuyOrders` from SDK, `fulfillSaleListing`/`fulfillBuyOrder`/`createSaleListing`/`createBuyOrder` for contract writes, `approveERC1155ForMarketplace` before selling/creating sale listings
