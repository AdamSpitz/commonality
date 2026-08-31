# LazyGiving UI

The lazyGiving UI lives in `ui/src/lazy-giving/`. It uses the same stack as the rest of the app (React, MUI, wagmi/viem, queries via the SDK over the event cache + folds).

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

Uses the SDK's `getProjectsFiltered` query (event cache + folds).


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

### Retroactive reimbursement
Shown for successfully funded projects. Displays the amount early contributors originally made recoverable, the amount donated later, the amount withdrawn, and the amount still needed to close the loop.

Later supporters can donate only up to the outstanding reimbursement total. Donations become claimable by eligible early contributors pro rata. The contributor view shows available and outstanding reimbursement with a withdrawal action. No account can receive more than it originally contributed, and recognition receipts cannot be transferred.

### Contributor Leaderboard
Table of contributors sorted by net contribution (totalContributed - totalRefunded). Uses `GetProjectContributions` and `GetProjectRefunds` (aggregated client-side, or via `participantSummaries` if the indexer exposes it).

Columns: address, total contributed, reimbursement preference, amount reimbursed, and amount outstanding.

### Forgo reimbursement
An early contributor may permanently forgo any remaining reimbursement claim while retaining the non-transferable recognition receipt. This burns the separate nontransferable future-claim shares, not the recognition receipt, and does not affect reimbursement already earned. This is the distinction between "Donate normally" and "Fund as a scout"; it is not an investor conversion.

### Reimbursement history
Shows later donations into the reimbursement pool and early-contributor withdrawals. It does not show token trades because LazyGiving receipts are non-transferable.


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
- **Aligning with statements/causes** — that's the Aligning UI's job (it joins lazyGiving projects with concept space statements)
- **Delegation / delegatable notes** — that's the Delegation UI
- **Cross-project leaderboards by cause** — Aligning UI

LazyGiving is just the Kickstarter clone: browse projects, view a project, fund it, trade tokens, create a project. The "why should I care about this project" layer is handled by the Aligning.
