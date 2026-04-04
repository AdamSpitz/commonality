# Content Funding UI

The content funding UI lives in `ui/src/content-funding/`. Same stack as the rest of the app (React, MUI, wagmi/viem, SDK fold functions).

There are four pages: Browse Creators, Channel Page, Create Contract, and Creator Dashboard. The content funding UI also adds sections to the existing Pubstarter project detail page and Funding Portal.


## Browse Creators Page

**Route:** `/content/:platform`

A list of channels (creators) with active or completed content-funding contracts on a given platform. This is the entry point for discovering funded content.

Each channel shows as a card:
- Creator name / handle (resolved from canonical channel ID via platform API or cached metadata)
- Platform badge (Twitter, YouTube, Substack)
- Channel state badge: "Unclaimed", "Verified", or "Creator-controlled"
- Number of active contracts
- Total funding raised across all contracts
- Total escrowed (if unclaimed or verified with undrawn funds)

**Sorting/filtering controls:**
- Sort by: most funded, newest activity, most contracts
- Filter by status: all / unclaimed / verified / creator-controlled
- Filter by platform (if showing all platforms on one page — alternatively, platform is part of the route)

Clicking a card goes to the channel page.


## Channel Page

**Route:** `/content/:platform/:channelId`

The public-facing page for a creator's funded content on a specific platform. This serves double duty: it's both the browsing page for supporters and the **claim landing page** for creators encountering the system for the first time.

### Header

- Creator name / handle / avatar (fetched from platform or cached)
- Platform badge
- Channel state badge
- **Total funding raised** across all contracts
- **Escrowed balance** (from `foldChannelEscrow`) — shown prominently if > 0, since this is money waiting for the creator
- Verified owner address (if verified)

### Above-the-fold for unclaimed channels

If the channel is unclaimed and has escrowed funds, the hero message is: **"Supporters have pooled $X for [creator name]'s work."** This is the first thing the creator sees when they open their claim link. No jargon, no explanation of smart contracts. See [channel-claiming.md](channel-claiming.md) for the full onboarding rationale.

Below the hero: a "Claim these funds" button (leads to the verification flow — see [Claim Flow](#claim-flow) below).

For non-creators browsing an unclaimed channel, this section still communicates the state clearly: this creator hasn't claimed their funds yet.

### Content Items

A list of all content items across all contracts for this channel. Each item shows:
- Content title or URL (resolved from the canonical ID in the `ContentItemRegistered` event)
- Platform embed or preview (if feasible — e.g., embedded tweet, YouTube thumbnail). Fall back to a plain link.
- The contract it belongs to, with funding status
- Content attestation badges (if any attesters have evaluated this item — pulled from `AlignmentAttestations` where the subject is the content ID hash)
- Token price and availability (how many tokens left in primary market)

Clicking a content item navigates to the Pubstarter project detail page for the contract that contains it, scrolled to or highlighting the relevant token type.

### Contracts List

All contracts for this channel (from `getContractsForChannel`). Each shows:
- Contract status: funding / succeeded / failed / vetoed
- Funding progress bar
- Deadline
- Number of content items
- Third-party badge (if created by a fan, not the creator)
- "Vetoed" badge if applicable

Clicking a contract goes to its Pubstarter project detail page.

### Share / Notify Creator

For unclaimed channels, a prominent share section:
- A copyable claim link for the channel page
- A suggested message template the fan can send to the creator (see [channel-claiming.md](channel-claiming.md#fan-driven-outreach-mvp))
- Platform-native share buttons (tweet @creator, etc.)

This is the primary creator acquisition mechanism. It should be prominent, not buried.


## Claim Flow

**Not a separate page** — a modal or inline flow on the channel page, triggered by "Claim these funds."

### Step 1: Browse (no auth required)

The channel page itself. Creator sees their funded content and escrowed balance. No wallet connection needed.

### Step 2: Verify identity

- If the creator has an existing wallet: connect it
- If not: sign in with Twitter/Google/email — the system provisions an embedded wallet (see [channel-claiming.md](channel-claiming.md#fiat-off-ramp-for-non-crypto-native-creators))
- Generate a verification tweet with a human-readable challenge string and a link back to the channel page
- Creator tweets it
- Creator clicks "I tweeted it" — backend checks the Twitter API, signs the proof, submits the on-chain verification transaction

After verification: channel transitions to Verified, and the creator can withdraw.

### Step 3: Withdraw

- Show escrowed balance
- "Withdraw" button
- For embedded wallet users: integrated off-ramp flow (enter bank details, off-ramp provider handles conversion)
- For self-custody users: standard withdrawal to their connected wallet

### Step 4: Take control (optional, separate action)

- Explained as: "Want to control future contracts for your content? Only you will be able to create new funding rounds."
- "Take control" button — calls `takeChannelControl` on the channel registry
- After taking control: show the [veto interface](#creator-veto-interface) if there are vetoable contracts


## Create Contract Page

**Route:** `/content/:platform/:channelId/new`

A form for creating a new content-funding contract for a specific channel. Available to:
- Anyone (if channel is unclaimed or verified) — subject to third-party creation fee
- Only the verified creator (if channel is creator-controlled)

### Fields

- **Content items** (dynamic list): For each item:
  - Platform URL (e.g., tweet URL, YouTube video URL) — auto-canonicalized per [canonicalization.md](canonicalization.md)
  - Validation indicator: shows whether the URL resolves, whether the content item is already registered in another active contract, and whether the canonical ID matches this channel
  - Token supply (default suggestion, e.g., 100)
  - Token price (in ETH)
- **Funding threshold** (ETH amount) — default suggestion based on total token value
- **Deadline** (date picker)
- **Platform embed previews** — as URLs are entered, show the actual content inline so the creator (or fan) can confirm they're funding the right things

### On submit

1. Canonicalize all URLs
2. Check content registry — reject any items already in active contracts
3. If third-party creation: collect an initial token purchase whose total cost is at least the creation fee
4. Call the platform's `CreatorAssuranceContractFactory` to create the contract and execute that initial purchase in the same transaction
5. Show success with:
   - Link to the new contract's project detail page
   - Shareable claim link (if channel is unclaimed)
   - Suggested notification message for the creator

### Validation

- URLs must belong to the correct platform for this channel's registry
- Content items must belong to this channel (the canonical channel ID extracted from the URL must match)
- Content items must not already be registered in an active contract
- If channel is creator-controlled and the connected wallet is not the verified owner, show an error explaining that only the creator can create contracts


## Creator Dashboard

**Route:** `/content/dashboard`

A management page for verified creators. Only accessible when a wallet is connected that owns one or more verified channels.

### My Channels

List of all channels where the connected wallet is the verified owner. For each:
- Platform + handle
- Channel state (verified / creator-controlled)
- Total escrowed balance (withdrawable)
- Number of active contracts
- Quick actions: "Withdraw from escrow", "Take control" (if not yet creator-controlled)

### My Contracts

All contracts across all of the creator's channels. Same contract card as the channel page, plus:
- Withdraw button (for succeeded contracts where the creator is the recipient)

### Creator Veto Interface

Shown only for creator-controlled channels that have vetoable third-party contracts (from `getVetoableContracts`).

For each vetoable contract:
- Contract details (content items, funding progress, who created it, token price)
- Time remaining in the veto window
- **"Veto this contract"** button with a confirmation dialog explaining: "This will cancel the contract and refund all token holders. The content items will be freed for you to use in your own contracts."

The veto interface should surface *why* a creator might want to veto: underpriced tokens, content items the creator wants to control, etc. But it should not auto-recommend vetoing — the fan put up real money, and the creator should make a deliberate choice.


## Integration with Pubstarter Project Detail Page

The content funding UI adds a section to the Pubstarter project detail page (`/projects/:projectAddress`) when the project is a creator assurance contract (detected by checking if it was created by a known `CreatorAssuranceContractFactory`).

### Content Items Section

Replaces or augments the generic token-type list with a content-aware view:
- Each token type is displayed with its content item: title/URL, platform embed or preview, and any content attestation badges
- The "Buy Tokens" form shows content items by name rather than raw token IDs — "Fund 'That great thread on housing' — $5 per token" instead of "Token #0x3a7f... — 0.003 ETH"

### Channel Info

- Creator name / handle (linked to the channel page)
- Channel state badge
- Whether this was a fan-created or creator-created contract
- If fan-created and the channel is creator-controlled with an active veto window: a notice that the creator may veto this contract

### Content Attestations

For each content item in the contract, show attestation results from known content attesters:
- Attester identity
- Pass/fail badge with confidence score
- Link to the explanation (on IPFS)

This is where the "why is this content worth funding?" story becomes concrete — the attestation results connect the specific content to the evaluation criteria.


## Integration with Funding Portal

The Funding Portal's aligned-projects list should recognize creator assurance contracts and display them with content-funding-specific information:
- Creator name and platform instead of (or in addition to) generic project name
- Number of content items
- "Content funding" type indicator to distinguish from regular Pubstarter projects


## What's NOT in the Content Funding UI

- **General project creation/browsing** — Pubstarter UI handles all assurance contract mechanics
- **Alignment attestation management** — Funding Portal UI
- **Statement/cause browsing** — Concept Space UI
- **Delegation management** — Delegation UI
- **Content attester deployment/configuration** — server-side admin, not end-user UI
- **Off-ramp provider integration details** — handled by the embedded wallet / off-ramp provider SDK, not custom UI beyond the "withdraw" flow
