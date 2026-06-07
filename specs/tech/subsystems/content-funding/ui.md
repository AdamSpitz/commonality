# Content Funding UI

The content funding UI lives in `ui/src/content-funding/`. Same stack as the rest of the app (React, MUI, wagmi/viem, SDK fold functions).

There are four pages: Browse Creators, Channel Page, Create Contract, and Creator Dashboard. The content funding UI also adds sections to the existing LazyGiving project detail page and Funding Portal.

Content Funding supports two round types:

1. **Concrete content contracts** — the original flow. The creator or a fan lists already-published content items up front. Each content item is a token type in the assurance contract.
2. **Prospective content rounds** — the creator raises funds for a described future chunk of content before concrete content IDs exist. The assurance contract sells one non-transferable receipt token type. Later, as the creator publishes items, they materialize concrete content IDs and receipt holders claim transferable per-content-item tokens.

UI should present these as user concepts, not contract jargon: **"Fund existing content"** vs **"Fund future content."**


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

Clicking a content item navigates to the LazyGiving project detail page for the contract that contains it, scrolled to or highlighting the relevant token type.

### Contracts List

All contracts for this channel (from `getContractsForChannel`). Each shows:
- Contract status: funding / succeeded / failed / vetoed
- Funding progress bar
- Deadline
- Number of content items
- Third-party badge (if created by a fan, not the creator)
- "Vetoed" badge if applicable

Clicking a contract goes to its LazyGiving project detail page.

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

Start the form with a round-type choice:

- **Fund existing content** — concrete content IDs are known now; use `CreatorAssuranceContractFactory`.
- **Fund future content** — the creator describes a future chunk of work; use a normal one-token-type LazyGiving assurance contract whose ERC-1155 is `ProspectiveContentTokens`.

### Fields for existing content

- **Content items** (dynamic list): For each item:
  - Platform URL (e.g., tweet URL, YouTube video URL) — the UI extracts the content-specific part (tweet ID, video ID) from the URL, then calls the backend to resolve the author's channel prefix (see [canonicalization.md](canonicalization.md#resolving-channel-prefixes)) and construct the full canonical ID
  - Validation indicator: shows whether the URL resolves, whether the resolved author matches this channel, and whether the content item is already registered in another active contract
  - Token supply (default suggestion, e.g., 100)
  - Token price (in ETH)
- **Funding threshold** (ETH amount) — default suggestion based on total token value
- **Deadline** (date picker)
- **Platform embed previews** — as URLs are entered, show the actual content inline so the creator (or fan) can confirm they're funding the right things

### On submit for existing content

1. Resolve all URLs to canonical IDs (extracts content-specific part from URL, calls backend for channel prefix resolution — see [canonicalization.md](canonicalization.md#resolving-channel-prefixes))
2. Check content registry — reject any items already in active contracts
3. If third-party creation: collect an initial token purchase whose total cost is at least the creation fee
4. Call the platform's `CreatorAssuranceContractFactory` to create the contract and execute that initial purchase in the same transaction
5. Show success with:
   - Link to the new contract's project detail page
   - Shareable claim link (if channel is unclaimed)
   - Suggested notification message for the creator

### Validation

- URLs must belong to the correct platform for this channel's registry
- Content items must belong to this channel (the author resolved from the platform API must match this channel's canonical ID)
- Content items must not already be registered in an active contract
- If channel is creator-controlled and the connected wallet is not the verified owner, show an error explaining that only the creator can create contracts

### Fields for future content

Future-content rounds are creator-initiated in the MVP. The UI should not offer fan-created prospective rounds until the product rules for creator consent are explicit.

Fields:

- **Round description** — plain-language promise, e.g. "Five June explainers about housing policy." Stored in the LazyGiving project metadata CID.
- **Receipt token supply** — default to the same standard supply used for content-token rounds.
- **Receipt token price** — one price for the single prospective receipt token type.
- **Funding threshold** — usually `supply * price` if the creator wants full sellout, but the underlying LazyGiving condition is still the source of truth.
- **Deadline**.
- **Receipt token metadata URI / contract URI** — should make clear these are non-transferable prospective receipts, not final content-item tokens.

Creation flow:

1. Deploy `ProspectiveContentTokens` through `ProspectiveContentTokensFactory` or equivalent deployment helper.
2. Deploy a normal `MultiERC1155AssuranceContract` using that ERC-1155 collection and one token ID, with the creator/channel owner as recipient.
3. Call `setPrimaryMarket(assuranceContract)` on the prospective token contract.
4. Mint the full receipt-token supply to the assurance contract.
5. Create/set the normal LazyGiving threshold condition.
6. Set the one token price on the assurance contract.
7. Render it as a prospective content round in project detail pages.

Important UX copy: prospective receipt tokens are **not transferable**. They are receipts that entitle the original backer to claim content-item tokens when the creator materializes actual content. The later materialized content tokens are transferable.


## Materialize Future Content Flow

**Route:** `/content/:platform/:channelId/prospective/:roundAddress/materialize` or an action inside Creator Dashboard.

Shown only to the verified creator/channel owner for a prospective content round.

Purpose: link newly published concrete content to a funded prospective round and let original backers claim transferable content-item tokens.

Fields:

- **Prospective round** — selected round, showing description, funding status, receipt token address, receipt token ID, and number of receipt tokens sold.
- **Content URLs** — one or more newly published content items. Use the same platform URL resolution and channel-ownership validation as existing-content creation.
- **Materialized token metadata URI / contract URI** — if this is the first materialization for the round and the materialized token contract does not exist yet.

Flow:

1. Verify the prospective round succeeded before encouraging materialization. The contract may technically allow materialization independent of success if wired that way, but the UI should treat unfunded rounds as not ready.
2. If no materialized token contract exists for this prospective round, deploy `MaterializedContentTokens` with:
   - `prospectiveToken` = the receipt ERC-1155 address
   - `prospectiveTokenId` = the single receipt token ID
   - `sourceProspectiveContract` = the LazyGiving assurance contract address
   - `contentRegistry` = the platform content registry
3. Authorize the materialized token contract as a ContentRegistry registrar. In deployment this should be handled by the registry owner/admin path; the UI should not assume arbitrary users can do it unless the registry admin model exposes that action.
4. Call `addContent` or `addContentBatch` on the materialized token contract.
5. Show a claim panel for backers: "You backed this future-content round. Claim your tokens for this published item."

Claim behavior:

- A holder can claim once per content ID.
- Claim amount equals `ProspectiveContentTokens.balanceOf(holder, receiptTokenId)`.
- Anyone can call `claimFor(holder, contentId)`, but the normal UI should have connected users call `claim(contentId)` for themselves.
- Claimed materialized content tokens are transferable; prospective receipt tokens remain non-transferable.

Channel page/project detail should show prospective rounds with a timeline:

- funding status and deadline;
- materialized content items so far;
- for connected wallet: unclaimed materialized items and claim buttons;
- explanatory note that future published items may be added by the creator.

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


## Integration with LazyGiving Project Detail Page

The content funding UI adds a section to the LazyGiving project detail page (`/projects/:projectAddress`) when the project is a creator assurance contract (detected by checking if it was created by a known `CreatorAssuranceContractFactory`).

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
- "Content funding" type indicator to distinguish from regular LazyGiving projects


## What's NOT in the Content Funding UI

- **General project creation/browsing** — LazyGiving UI handles all assurance contract mechanics
- **Alignment attestation management** — Funding Portal UI
- **Statement/cause browsing** — Concept Space UI
- **Delegation management** — Delegation UI
- **Content attester deployment/configuration** — server-side admin, not end-user UI
- **Off-ramp provider integration details** — handled by the embedded wallet / off-ramp provider SDK, not custom UI beyond the "withdraw" flow
