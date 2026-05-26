# LazyGiving UI

The lazyGiving UI lives in `ui/src/lazyGiving/`. It uses the same stack as the rest of the app (React, MUI, wagmi/viem, GraphQL queries via the SDK).

There are three pages: Browse Projects, Project Detail, and Create Project. That's it.


## Browse Projects Page

**Route:** `/projects`

A list of all lazyGiving projects. Each project shows up as a card with:
- Project name (from IPFS metadata)
- Funding progress bar (totalReceived / threshold)
- Deadline (human-readable, e.g. "12 days left" or "Ended 3 days ago")
- Status badge: "Funding", "Succeeded", or "Refunding" (deadline passed + below threshold)

**Sorting/filtering controls** at the top:
- Sort by: newest, deadline (soonest first), most funded, closest to goal (% funded)
- Filter by status: all / active / succeeded / refunding

Clicking a card goes to the project detail page.

Uses `GetProjectsFiltered` and `GetAllProjects` GraphQL queries.


## Project Detail Page

**Route:** `/projects/:projectAddress`

This is the main page. It has a few sections:

### Header
- Project name and description (rendered from IPFS metadata via `metadataCid`)
- Recipient address
- Status badge (same as browse page)
- Funding progress: big progress bar, "X of Y ETH raised" text, deadline countdown

### Buy Tokens (Primary Market)
A simple form for buying tokens from the assurance contract.
- Lists each token type the project offers (from `GetProjectTokens`): token ID, price, and a quantity input
- "Buy" button that calls `buyERC1155` via wagmi
- Only shown if the connected wallet exists

### Refund
- Shown only when deadline has passed AND threshold not met
- Shows the user's refundable tokens
- "Refund" button that calls `refundERC1155`

### Withdraw (Recipient Only)
- Shown only to the project recipient, only when threshold is met
- "Withdraw Funds" button

### Secondary Market
Shows the orderbook for this project's tokens. Two tabs (or side-by-side):

**Sale Listings (asks):** Table of active listings — seller, token ID, quantity, price per token, "Buy" button. Uses `GetActiveSaleListings`.

**Buy Orders (bids):** Table of active buy orders — buyer, token ID, quantity, price per token, "Sell" button (if you hold tokens). Uses `GetActiveBuyOrders`.

**Create Order form:** A small form at the bottom to create a new sale listing or buy order (toggle between the two). Fields: token ID, quantity, price per token.

Creating a sale listing requires an ERC-1155 approval step first (`setApprovalForAll`).

### Contributor Leaderboard
Table of contributors sorted by net contribution (totalContributed - totalRefunded). Uses `GetProjectContributions` and `GetProjectRefunds` (aggregated client-side, or via `participantSummaries` if the indexer exposes it).

Columns: address, total contributed, tokens held vs burned (to distinguish investors from donors).

### Token Burns
A "Burn Tokens" button for token holders who want to convert from investor to donor. Shows which of your tokens you can burn with quantity inputs.

### Trade History
Collapsible section showing recent secondary market trades for this project. Uses `GetMarketplaceTrades`. Table: date, buyer, seller, token ID, quantity, price.


## Create Project Page

**Route:** `/projects/new`

A form for creating a new crowdfunding project. Fields:

- **Project name** (text input)
- **Description** (textarea / markdown)
- **Recipient address** (defaults to connected wallet)
- **Funding threshold** (ETH amount)
- **Deadline** (date picker)
- **Token types** (dynamic list — for each token: ID, supply, price in ETH). Start with one row, "Add token type" button for more.

On submit:
1. Upload metadata to IPFS (name + description as a displayable document)
2. Call `createERC1155AndMarketplaceAndAssuranceContract` via the LazyGiving factory contract
3. Show success with link to the new project page

Most projects will probably just have one token type. The multi-token UI should be there but not in-your-face.


## What's NOT in the LazyGiving UI

These belong to other subsystems:
- **Alignment with statements/causes** — that's the Funding Portal UI's job (it joins lazyGiving projects with concept space statements)
- **Delegation / delegatable notes** — that's the Delegation UI
- **Cross-project leaderboards by cause** — Funding Portal UI

LazyGiving is just the Kickstarter clone: browse projects, view a project, fund it, trade tokens, create a project. The "why should I care about this project" layer is handled by the Funding Portal.
