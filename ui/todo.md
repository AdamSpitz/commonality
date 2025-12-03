# Concept Space UI - MVP Component List

## Core Pages
1. **Statement Page** - Display statement content, direct/indirect support numbers, user's belief state, sign/unsign actions
2. **User Page** - Show statements user has signed (direct/indirect tabs), create statement button (for connected user)
3. **Browse/Search Page** - Discover statements with sorting (trending, most supporters, newest)
4. **Home/Root Page** - Shows connected user's page content (or landing page if not connected)
5. **Settings Page** - Configure trusted implication attesters

## Shared Components
6. **Statement Renderer** - Display statements based on their type, handle references to other statements
7. **Belief Controls** - Buttons for believe/disbelieve/clear opinion
8. **Support Metrics Display** - Show direct/indirect supporter counts
9. **Statement Suggestions** - "You signed S1, but S2 is more popular and implied by S1"
10. **Create Statement Form** - Form for creating new statements (upload to IPFS, sign on-chain)

## Navigation & Layout
11. **App Shell** - Navigation bar with wallet connect (already started)
12. **Routing** - React Router setup for all pages

## Integration
13. **SDK Integration** - Wire up actions (believeStatement, etc.) and queries (getStatement, etc.)
14. **IPFS Integration** - Upload statement JSON, fetch statement content by CID
