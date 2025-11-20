# User Queries and Actions for Conceptspace System

AI-generated, but pretty good. The prompt was:

    Please read specs/README.md and anything else relevant, then come up with a simple list of user queries and actions that the conceptspace system needs to support. ("View a list of statements that user U has signed", "view a list of statement suggestions for a statement S1 (i.e. "you might want to sign S2 also")", "sign statement S", etc.)

This document lists all the user queries and actions that the Commonality system needs to support, organized by component.

## Concept Space - Statement Discovery & Browsing
- View a list of all statements (with pagination)
- Browse/search statements by:
  - Most supporters (direct + indirect)
  - Trending (velocity of new signatures)
  - Newest statements
- View a specific statement by its ID
- Search for statements by keyword/content
- View statement suggestions based on what I've signed ("you signed S1, maybe sign S2 which is more popular")
- View statements that reference other statements (coalition/commonality statements)

## Concept Space - Statement Actions
- Create a new statement (upload JSON to IPFS)
- Sign a statement (express belief)
- Unsign a statement (change from belief to no opinion)
- Express disbelief in a statement
- View my current belief state for a statement

## Concept Space - User Profile & History
- View my user profile/page
- View statements I have directly signed
- View statements I indirectly support (through implication graph)
- View another user's profile and their signed statements
- View another user's directly vs indirectly supported statements

## Concept Space - Statement Details
- View a statement's content (rendered based on statementType)
- View number of direct supporters for a statement
- View number of indirect supporters for a statement
- View list of direct supporters for a statement
- View list of indirect supporters for a statement (with breakdown by implying statement)
- View number of direct disbelievers for a statement
- View implication relationships (what statements imply this one)
- View implication relationships (what statements this one implies)
- View high-profile signers (verified Twitter accounts with 10k+ followers)

## Concept Space - Settings & Configuration
- Configure which implication attesters I trust
- Connect social accounts (Twitter, etc.) for verification
- Disconnect social accounts
- View list of available implication attesters

## Funding Portals - Portal Discovery
- View funding portal for a specific statement/cause
- View total funding raised for a cause (across all aligned projects)
- View total available funding for a cause (sum of delegatable notes)
- View all projects aligned with a cause (direct + indirect)
- Filter/sort projects by:
  - Date created
  - Assurance contract deadline
  - Amount needed
  - Funding progress
  - Trending
  - Direct vs indirect alignment

## Funding Portals - Project Details
- View a specific project's details
- View project description and metadata
- View project funding goal and current progress
- View project deadline (if assurance contract)
- View project success/failure status
- View list of contributors to a project
- View top contributors leaderboard for a project
- View full delegation chains for each contribution (transparency)
- Distinguish donors (burned tokens) vs investors (holding tokens)

## Funding Portals - Project Actions
- Create a new crowdfunding project
- Attest that a project aligns with a statement
- Contribute to a project (buy tokens)
- Contribute to a project using delegatable notes
- Burn project tokens (convert from investor to donor)
- View my contributions to projects
- View my token holdings across projects

## Funding Portals - Secondary Market
- View sell listings for project tokens
- View buy orders for project tokens
- Create a sell listing for tokens I hold
- Create a buy order for tokens
- Purchase tokens from a sell listing
- Fulfill a buy order by selling tokens
- Cancel my sell listing
- Cancel my buy order

## Funding Portals - Delegatable Notes
- Create a new delegatable note (deposit funds for a cause)
- View my delegatable notes
- View available notes for a specific cause
- Delegate a note to someone I trust
- Revoke a delegation I made
- View delegation chain for a note (root to leaf)
- Split a note into multiple smaller notes
- Merge notes with identical delegation chains
- Spend a note to fund a project
- Specify commission percentage for delegates
- Mark a note with intended statement/cause

## Funding Portals - Leaderboards & Social Recognition
- View top contributors for a specific cause (across all aligned projects)
- View my contribution rank for a cause
- View delegation chains for transparent attribution
- View contributor statistics:
  - Total amount contributed
  - Number of projects funded
  - Donation vs investment breakdown
  - First/last contribution dates

## Cross-Component Queries
- View funding portal linked from a statement page
- View statement details linked from a project alignment
- View implication graph visualization
- View my complete activity (statements signed + projects funded)
- View relationship between statements I support and projects I've funded

## Admin/Attester Actions
(specialized users)

- Publish implication attestation (S1 → S2)
- Publish project alignment attestation (project P aligns with statement S)
- Evaluate potential implications using AI (attester API)
- Batch process new statements for implications
