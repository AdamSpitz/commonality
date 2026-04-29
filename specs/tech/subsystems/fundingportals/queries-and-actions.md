# User Queries and Actions for Conceptspace System

AI-generated, but pretty good. The prompt was:

    Please read specs/README.md and anything else relevant, then come up with a simple list of user queries and actions that the fundingportals subsystem needs to support. ("View a list of statements that user U has signed", "view a list of statement suggestions for a statement S1 (i.e. "you might want to sign S2 also")", "sign statement S", etc.)

This document lists all the user queries and actions that the fundingportals subsystem needs to support, organized by component.

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

Leaderboards track **direct project purchases only**, not delegated-note deposits. Direct purchases are committed and non-revocable; delegated deposits are revocable pledges that don't warrant individual social recognition. Aggregate delegated funds available for a cause are shown as a summary stat (not per-depositor).

- View top contributors for a specific cause (across all aligned projects, direct purchases only)
- View total delegated funds available for a cause (aggregate, not per-depositor)
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
