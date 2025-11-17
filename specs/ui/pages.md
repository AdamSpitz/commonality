# UI Pages Specification

<!-- AI-generated from specs/README.md -->

This document describes the page layouts and information architecture for the Commonality project's user interfaces (Concept Space UI and Funding Portal UI).

## Core Design Principles

1. **Transparency**: Always be clear about direct vs indirect support, delegation chains, and attestation sources
2. **Discoverability**: Help users find related statements, aligned projects, and potential collaboration opportunities
3. **Minimal Friction**: Reduce coordination overhead through smart defaults and helpful suggestions
4. **Social Recognition**: Prominently display contributors and high-profile signers
5. **Progressive Disclosure**: Show essential info first, with details available on demand

---

## Concept Space UI

### Statement Page

**URL Pattern**: `/statement/{statementId}`

**Primary Purpose**: Display a statement and its support levels, provide signing interface, show related statements

#### Header Section
- **Statement Text**: Large, prominent display of the statement content
  - For `simple-string` type: Display the definition field
  - For future types: Render appropriately based on statement-type
- **Statement Metadata**:
  - Statement ID (IPFS CID) - displayed small, with copy button
  - Statement type badge
  - Creation timestamp (derived from IPFS metadata if available)

#### Support Metrics Section
This section must be **crystal clear** about direct vs indirect support (see transparency requirements).

**Direct Support Display**:
```
✓ 17 accounts directly signed this statement
```

**Indirect Support Display** (if any):
```
≈ 118 accounts indirectly support this
  (signed statements that imply this one)
  [View implying statements ↓]
```

**Total Combined** (optional, secondary emphasis):
```
Total: ~135 accounts (direct + indirect)
```

**Breakdown Details** (expandable/collapsible):
- List of implying statements with their direct support counts
- Show which trusted implication attesters connected them
- Format: "Statement XYZ (42 direct signers) → this statement (via attester: @DefaultAI)"

#### High-Profile Signers Section
Show verified identities of notable supporters:
- **High-Profile Direct Signers**:
  - Display verified Twitter handles with 10k+ followers
  - Format: Avatar, handle, follower count
  - Link to their Twitter profile
  - Max 5-10 displayed, "View all →" if more

- **High-Profile Indirect Supporters** (separate, less prominent):
  - Same format but clearly labeled as indirect
  - Expandable section

#### Action Buttons
Primary actions prominently displayed:
- **"Sign This Statement"** - for users who haven't signed
  - Dropdown for: Believe / Disbelieve / No Opinion
  - Current state shown if user has already signed
- **"Create Related Statement"** - encourage refinement/elaboration
- **"View Funding Portal →"** - navigate to aligned projects

#### Suggestions Section
Help users discover related content:
- **"You might also want to sign"**:
  - Show statements implied by this one that are more popular
  - Format: "Statement XYZ has 523 direct signers (vs your 17) and is implied by this statement"
  - Only show when user has signed current statement

- **"Related Statements"**:
  - Statements that imply this one
  - Statements implied by this one
  - Show support counts for context

#### References Section
If the statement content includes references to other statements (e.g., "I believe either S1 or S2"):
- Parse and display linked statements with their support numbers
- Useful for alliance/coalition statements
- Format: Embedded preview cards for each referenced statement

#### Discussion/Context Section (future)
Placeholder for:
- Comments/discussion (if we add this)
- Links to external resources
- History of related statements

---

### Statement Browse/Search Page

**URL Pattern**: `/statements` or `/browse`

**Primary Purpose**: Discover statements, search, filter

#### Search Bar
- Full-text search across statement content
- Advanced filters:
  - Minimum support threshold
  - Statement type
  - Date range
  - Has high-profile signers

#### Results Display
Sort options:
- Most direct supporters
- Most total support (direct + indirect)
- Newest first
- Trending (velocity of new signatures)

Each result shows:
- Statement text (truncated if long)
- Direct support count
- Indirect support count (if significant)
- High-profile signer avatars (max 3)
- Statement type badge

#### Trending/Featured Sections
- Statements gaining support rapidly
- Statements with recent high-profile signers
- Suggested based on user's existing signatures

---

### User Profile Page

**URL Pattern**: `/user/{address}` or `/user/{ensName}`

**Primary Purpose**: Show what a user supports and their contribution history

#### User Identity Section
- ENS name (if set) or address
- Connected identities (Twitter, etc.) with verification status
- "This is you" indicator if viewing own profile

#### Statements Signed
Tabs:
1. **Directly Signed** - statements user explicitly signed
   - Grouped by belief state: Believes / Disbelieves / No Opinion
   - Sort by recency or support level
2. **Indirectly Supporting** - statements implied by what they signed
   - Less prominent than direct
   - Expandable/filterable

#### Funding Activity
- Total contributed across all projects
- Recent contributions
- Top causes supported (by statement)
- Active delegations (see Funding Portal section)

---

### Settings Page

**URL Pattern**: `/settings`

**Primary Purpose**: Configure trusted attesters, connected accounts, preferences

#### Trusted Implication Attesters
- List of attesters user trusts for implication logic
- Default: Include the official Commonality AI attester
- Add/remove attesters
- Preview: "Trusting this attester would add N indirect supporters to statements you've signed"

#### Connected Accounts
- Link Twitter, other social accounts
- Unique human verification systems (Worldcoin, BrightID) - future
- Privacy settings for each connection

#### Preferences
- Display preferences (show indirect support by default, etc.)
- Notification settings
- Language/localization

---

## Funding Portal UI

### Funding Portal Page (for a specific statement)

**URL Pattern**: `/funding/{statementId}`

**Primary Purpose**: Show all projects aligned with a statement/cause

#### Statement Context Header
- Brief display of the statement this portal is for
- Link back to statement page
- Support metrics (to show size of community)

#### Available Funding Indicator
**Prominently display**:
```
$12,450/month available for projects aligned with this cause
```

Breakdown (expandable):
- Delegatable notes created for this cause
- Amount currently delegated vs undelegated
- "Create a delegatable note" CTA

#### Projects Section
**Sort/Filter Options**:
- Most funded (total raised)
- Most contributors
- Recently launched
- Funding goal progress
- Project type (if we support tagging)

**Each Project Card Shows**:
- Project name and brief description
- Thumbnail/image
- Funding progress bar: "$X raised of $Y goal"
- Number of contributors
- Top contributors (avatars, max 3-5)
- Alignment attestation info: "Attested by @Alice, @Bob"
- "View Project →" button

#### Top Contributors Leaderboard
Recognize major funders for this cause:
- Top 10 contributors by total amount
- Show delegation chains: "Alice → Bob → Charlie: $500"
- Separate sections for:
  - Direct contributions
  - Delegated funding
  - Burned tokens (donors vs investors)

#### Submit New Project CTA
- Prominent button: "Submit a project aligned with this cause"
- Link to project creation flow

---

### Individual Project Page

**URL Pattern**: `/project/{projectAddress}`

**Primary Purpose**: Show project details, enable funding, display contributors

#### Project Header
- Project name
- Creator/team info
- Brief tagline/description

#### Funding Status
**Primary Metrics** (large, prominent):
- Total raised: "$15,420"
- Number of contributors: "87 people"
- Funding goal (if set): Progress bar
- Time remaining (if deadline set)

**Secondary Metrics**:
- Tokens available for purchase
- Current price per token
- Secondary market stats (if trading is happening)

#### Project Description
- Full project details
- Milestones/roadmap
- Success criteria (if defined)
- Updates from project team

#### Alignment Information
Show which causes this project is aligned with:
- Statement(s) it's attested to align with
- Who made the attestation
- Link to each statement's funding portal

#### Contributors Section
**Top Contributors**:
- Leaderboard of top 10-20 funders
- Show amount, address/ENS
- Distinguish:
  - Donors (burned tokens) - special badge/highlighting
  - Investors (holding tokens)
  - Delegation chains (show full chain)

**Recent Contributors**:
- Stream of recent funding activity
- Format: "Alice contributed $50 (via delegation from Bob) - 2 hours ago"

**Transparency for Delegated Contributions**:
```
Alice: $500 contributed
  ↳ Delegated by Bob (manages $2,000 for this cause)
    ↳ Delegated by Charlie ($5,000 total)
```

#### Funding Action Section
**Primary CTA**: "Fund This Project"
- Amount input
- Connect wallet button
- Show: "You will receive X tokens"
- Option to immediately burn tokens (donate vs invest)
- Option to create delegatable note instead

**Delegation Interface** (if user has delegatable notes):
- "Use delegated funds" option
- Select which note(s) to fund from
- Show available balance for each note

#### Token Information
For users who have purchased:
- Your token balance
- Current market value (if secondary market exists)
- "Burn tokens" action (convert to donation)
- "List for sale" action (if we support this)

---

### Project Creation Page

**URL Pattern**: `/create-project`

**Primary Purpose**: Allow users to submit new fundable projects

#### Project Details Form
- Project name
- Description (rich text)
- Funding goal
- Timeline/deadline (optional)
- Team information
- Project category/type

#### Token Configuration
- Total tokens to create
- Initial price per token
- Pricing curve (if variable pricing)
- Commission settings for delegated contributions

#### Alignment Attestation
- "This project is aligned with statement(s):"
- Search for relevant statements
- Select one or more
- Note: "You're attesting that this project aligns with these causes. Other attesters can also vouch for your project."

#### Smart Contract Deployment
- Preview of contract parameters
- Deploy button (creates ERC-1155 contract)
- Gas estimation
- Progress indicator for deployment

#### Success State
- "Project created successfully!"
- Link to project page
- Sharing options
- "Submit attestations to funding portals" checklist

---

### Create Delegatable Note Page

**URL Pattern**: `/create-note`

**Primary Purpose**: Create a delegatable funding note for a cause

#### Note Configuration
1. **Choose Cause**:
   - Search for statement
   - Display statement details
   - Show existing available funding for this cause

2. **Set Amount**:
   - Monthly recurring or one-time
   - Amount input
   - "This adds to the $X/month available for this cause"

3. **Delegation Settings**:
   - Initially delegate to: [address/ENS] or "manage myself"
   - Delegate can take: [N]% commission
   - Subdelegation allowed: Yes/No

4. **Privacy Settings**:
   - Public (show on funding portal)
   - Anonymous (count in total but don't show details)

#### Review and Create
- Summary of settings
- Smart contract interaction
- Created note appears in user profile

---

### User Profile Page (Funding Focus)

**URL Pattern**: `/user/{address}/funding` (or tab on main profile)

#### Funding Overview
- Total contributed across all projects
- Total delegated to others
- Total received via delegation
- Active delegatable notes

#### Active Delegations
**As Delegator**:
- Notes you've delegated to others
- How they've been used
- Revoke options

**As Delegate**:
- Funds delegated to you
- Your decisions on how you've allocated them
- Commission earned
- Who you've sub-delegated to

#### Contribution History
Timeline of all funding activities:
- Direct contributions
- Delegated contributions made on behalf of others
- Notes created
- Delegation changes

#### Causes Supported
Grouped by statement:
- Total contributed to projects aligned with each cause
- Number of projects funded per cause
- Delegation chain summaries

---

## Common UI Components

### Navigation Header
Present on all pages:
- Logo / home link
- Main nav: Statements | Funding | Profile
- Search bar (global, switches between statements/projects)
- Wallet connection status
- User menu (profile, settings, sign out)

### Footer
- About / How it works
- Documentation
- GitHub
- Social links
- Network status (which L2, current gas prices)

### Wallet Connection Flow
- Prominent "Connect Wallet" button when not connected
- Support multiple wallet connectors (MetaMask, WalletConnect, etc.)
- Network switching if on wrong network
- Account display when connected (ENS or truncated address)

### Statement Reference Component
Reusable component for displaying a statement reference:
- Statement text preview
- Support counts
- Click to expand or navigate
- Used throughout the app when referencing statements

### Loading States
- Skeleton loaders for async content
- "Fetching from blockchain..." indicators
- Progress bars for transactions

### Error States
- Clear error messages
- "Try again" actions
- Help/support links for common issues

---

## Responsive Design Considerations

- Mobile-first approach
- Statement pages must be readable on mobile (primary use case might be sharing links on social media)
- Funding actions should work smoothly on mobile wallets
- Leaderboards and tables should collapse gracefully
- Navigation menu: hamburger on mobile

---

## Future Enhancements

These are not immediate priorities but should be considered in the design:

1. **Graph Visualization**: Visual display of statement implication graph
2. **Notifications**: Alert users about new high-profile signers, popular implied statements, etc.
3. **Comments/Discussion**: Threaded discussions on statements and projects
4. **Analytics Dashboard**: For power users, delegates, project creators
5. **Embedded Widgets**: Allow embedding statement support counts on external sites
6. **RSS/Feeds**: Subscribe to updates about specific statements or causes

