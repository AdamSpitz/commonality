# Pubstarter UI Implementation Plan

Spec: [specs/subsystems/pubstarter/ui.md](../../../specs/subsystems/pubstarter/ui.md)

Follow the same patterns as the conceptspace UI (`ui/src/conceptspace/`):
- React + MUI + react-router-dom
- SDK queries via `createSDKMachinery` + `@commonality/sdk`
- wagmi for wallet connection and contract writes
- `VITE_GRAPHQL_URL` env var for the indexer
- IPFS via SDK's `fetchFromIPFS` / `uploadToIPFS` / `publishDocument`

## Chunks

Each chunk should build, pass lint, and get committed.

### Chunk 1: Scaffold + Browse Projects Page ✅
- [x] Create `ui/src/pubstarter/` directory structure (pages/, components/)
- [x] Create `ui/src/pubstarter/pages/index.ts` barrel export
- [x] Implement `BrowseProjectsPage.tsx`: list all projects as cards with name (from IPFS metadata via `metadataCid`), funding progress bar, deadline (relative time), status badge (Funding/Succeeded/Refunding). Sort controls (newest, deadline, most funded, closest to goal) and filter by status (all/active/succeeded/refunding). Uses `getProjectsFiltered` / `getAllProjects` from SDK. Clicking a card navigates to `/projects/:projectAddress`.
- [x] Add routes to `App.tsx`: `/projects` → BrowseProjectsPage, `/projects/new` → CreateProjectPage (placeholder), `/projects/:projectAddress` → ProjectDetailPage (placeholder)
- [x] Write tests for BrowseProjectsPage

### Chunk 2: Project Detail Page — Header + Buy Tokens ✅
- [x] Implement `ProjectDetailPage.tsx` with header section: project name/description (fetched from IPFS via `metadataCid` using `fetchFromIPFS`), recipient address, status badge, funding progress bar, "X of Y ETH raised", deadline countdown. Uses `getProject` from SDK.
- [x] Implement Buy Tokens section: list token types from `getProjectTokens`, quantity inputs, Buy button that calls `buyProjectTokens` via wagmi. Only shown when wallet connected.
- [x] Write tests

### Chunk 3: Project Detail Page — Refund + Withdraw + Leaderboard ✅
- [x] Refund section: shown when deadline passed AND threshold not met. Shows user's refundable tokens, Refund button calling `refundERC1155`.
- [x] Withdraw section: shown only to project recipient when threshold met. "Withdraw Funds" button calling `withdraw`.
- [x] Contributor Leaderboard: table of contributors sorted by net contribution (totalContributed - totalRefunded). Uses `getProjectContributions` + `getProjectRefunds`. Columns: address, total contributed, tokens held vs burned.
- [x] Write tests

### Chunk 4: Project Detail Page — Secondary Market ✅
- [x] Sale Listings table: active listings from `getActiveSaleListings` — seller, token ID, quantity, price per token, Buy button (calls `fulfillSaleListing`).
- [x] Buy Orders table: active buy orders from `getActiveBuyOrders` — buyer, token ID, quantity, price per token, Sell button (calls `fulfillBuyOrder`, needs `setApprovalForAll` first).
- [x] Create Order form: toggle between sale listing and buy order. Fields: token ID, quantity, price per token. Sale listing requires ERC-1155 approval step.
- [x] Write tests

### Chunk 5: Project Detail Page — Token Burns + Trade History ✅
- [x] Token Burns section: "Burn Tokens" button for token holders. Shows burnable tokens with quantity inputs. Calls `burnBatch`.
- [x] Trade History: collapsible section with recent secondary market trades from `getMarketplaceTrades`. Table: date, buyer, seller, token ID, quantity, price.
- [x] Write tests

### Chunk 6: Create Project Page ✅
- [x] Implement `CreateProjectPage.tsx`: form with project name, description (textarea/markdown), recipient address (defaults to connected wallet), funding threshold (ETH), deadline (date picker), token types (dynamic list with add/remove — token ID, supply, price). On submit: upload metadata to IPFS via `uploadToIPFS`, call `createProject` (which calls `createERC1155AndMarketplaceAndAssuranceContract`) via wagmi, show success with link to new project page. Requires `VITE_PUBSTARTER_CONTRACT_ADDRESS` env var.
- [x] Write tests (19 tests covering form rendering, validation, token type management, submission, error handling)
