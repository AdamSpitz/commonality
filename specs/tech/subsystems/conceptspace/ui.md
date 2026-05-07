# Conceptspace UI

## Pages

**Root page:** If there's a connected user, show the stuff from his user page (see below).

**Statement page:** For each statement, shows:
  - The statement itself (displayed in whatever way makes sense given its `statementType`)
    - If the statement content includes references to other statements (e.g., "I believe either S1 or S2"), parse and display linked statements with their support numbers
  - The connected user's (if any) belief state for this statement
  - Numbers of direct and indirect signers
  - Suggestions for other statements you might want to sign also/instead ("you signed S1, and there's a statement S2 that is implied by S1 and is more popular than S1; maybe you'd like to sign S2 as well")

**Browse/search page:** For discovering statements, with sorting options including by trending (velocity of new signatures), most supporters, and newest.

**User page:** Shows statements that user has signed (with tabs for directly signed vs. indirectly supporting). If it's the connected user, also show buttons for sign/unsign/etc., as well as a "create statement" button.

**Settings page:** Where users can configure which implication attesters they trust, connect social accounts, etc.

(These aren't meant to be exhaustive. Include whatever else makes sense.)

## Explorer

See [explorer.md](explorer.md) for the AI-assisted explorer pattern. The implemented seeded explorer is the Fundable Project Explorer on Alignment `/explore` (`fundable-project-explorer` stream). Tally intentionally does not have `/explore` yet; Tally owns statement browsing, statement detail pages, profile pages, and signing flows.
