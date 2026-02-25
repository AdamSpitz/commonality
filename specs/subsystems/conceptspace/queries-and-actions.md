# User Queries and Actions for Conceptspace System

AI-generated, but pretty good. The prompt was:

    Please read specs/README.md and anything else relevant, then come up with a simple list of user queries and actions that the conceptspace system needs to support. ("View a list of statements that user U has signed", "view a list of statement suggestions for a statement S1 (i.e. "you might want to sign S2 also")", "sign statement S", etc.)

This document lists all the user queries and actions that the conceptspace subsystem needs to support, organized by component.

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

## Admin/Attester Actions
(specialized users)

- Publish implication attestation (S1 → S2)
- Publish alignment attestation (e.g. project P aligns with statement S)
- Evaluate potential implications using AI (attester API)
- Batch process new statements for implications
