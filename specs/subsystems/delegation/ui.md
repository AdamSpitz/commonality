# Delegation System UI

The delegation UI lives in `ui/src/delegation/`. It provides standalone pages for managing delegatable notes and their chains, plus features integrated into the pubstarter UI.

The standalone pages let users create notes, manage delegations, and track their funding. The pubstarter integration shows delegation chains on contributions and allows funding via delegated notes.


## Standalone Delegation UI Pages

All pages use the same stack as the rest of the app (React, MUI, wagmi/viem, GraphQL queries via the SDK).


### Dashboard / My Notes

**Route:** `/delegation`

The main landing page for delegation users. Shows an overview of the connected wallet's notes and delegation activity.

**Sections:**

**Summary Cards** — Top of page showing:
- Total funds in notes (aggregated amount across all notes)
- Number of active notes
- Number of notes where the user is a delegate (not root owner)
- Pending delegation chains (awaiting action)

**My Notes List** — Cards or table of notes owned by the connected wallet:
- Note ID (truncated, copyable)
- Amount and token type (ETH or ERC-1155)
- Delegation chain summary (e.g., "You → bob.eth → charlie.eth" or "You are root owner")
- Intended statement (if attested)
- Quick actions: View Details, Delegate, Split

Uses `GetNotesByOwner` and `GetNotesByRoot` GraphQL queries (combining results to show notes you own AND notes delegated to you).


### Note Detail Page

**Route:** `/delegation/notes/:noteId`

Detailed view of a single note.

**Header:**
- Note ID
- Amount and token type
- Status badge: "Active" or "Consumed"
- Created date

**Delegation Chain Section:**
- Visual chain display: Alice (root) → Bob → Charlie (current owner)
- Each address shown with copy button
- "View on explorer" link for each
- Expandable to show when each delegation occurred (from chain history)

Uses `GetNote` and `GetDelegationChain`.

**Note History / Events:**
- Timeline of all actions on this note
- Event types: Created, Delegated, Revoked, Split, Purchased, Reclaimed
- Each event shows: date, actor address, details (amount, new chain if applicable)

Uses `GetNoteEvents` (note: verify this query exists or implement via SDK).

**Actions (context-dependent):**

- **Delegate** — Form to delegate to a new address. Fields: delegatee address. Creates a new note with extended chain.

- **Revoke** — Button to revoke the current delegation. Can only be done by root owner or the immediate delegator. Revokes the entire sub-chain.

- **Split** — Form to split note into multiple notes with same chain. Fields: amounts (array). Creates multiple new notes with identical delegation chains.

- **Merge** — Select multiple notes with identical chains to merge. Only shown if multiple notes exist with same chain.

- **Attest Intent** — Form to declare the note's intended statement alignment. Fields: statement ID (from concept space). Calls NoteIntent contract.

- **Trade** — For notes holding ERC-1155 tokens, show ability to trade on secondary markets (links to relevant pubstarter project if applicable).


### Create Note / Deposit Page

**Route:** `/delegation/new`

Form to create a new delegatable note by depositing funds.

**Fields:**

- **Token type:** Toggle between ETH and ERC-1155
- **Amount** (for ETH): ETH amount input
- **ERC-1155 selector** (for ERC-1155): Token contract address, token ID, quantity
- **Delegate to** (optional): Address to delegate to immediately. If provided, creates note with extended chain.
- **Intended statement** (optional): Statement ID to attest intent

**On submit:**
1. If ETH: call `depositETH` on DelegatableNotes contract
2. If ERC-1155: first `setApprovalForAll`, then call `depositERC1155`
3. If delegation provided: call `delegateNote` in same transaction or after
4. If intent attested: call `attestIntent` on NoteIntent contract
5. Redirect to new note detail page


### Delegation Management Page

**Route:** `/delegation/delegate`

Page for managing outgoing delegations and viewing incoming delegation requests.

**Outgoing Tab:**
- List of notes where you are the root owner
- Shows current delegation chain for each
- Quick actions: extend delegation further, revoke

**Incoming Tab:**
- List of notes where you are a delegate (not root owner)
- Shows root owner and full chain
- Shows note balance
- Action: Accept (continue chain) or Decline/Revoke (if you have that permission)


### Note History Page

**Route:** `/delegation/history`

Audit log of all delegation-related actions for the connected wallet.

- Table of all note events involving this wallet (as owner, delegate, or root)
- Columns: Date, Event Type, Note ID, Amount, Counterparty, Details
- Filter by event type
- Export to CSV

Uses aggregated event queries (verify SDK support or implement).


---

## Pubstarter UI Integration

These are additions to the existing pubstarter UI pages.


### Project Detail Page — Delegation Display

On the Project Detail page (`/projects/:projectAddress`), add delegation chain display to:

**Contributor Leaderboard:**
- For each contributor, show delegation chain if present
- Format: "0x123...abc → 0x456...def → 0x789...ghi"
- Tooltip on hover shows full chain with timestamps
- Root owners highlighted differently from delegates

This requires joining contribution data with `GetDelegationChain` for each note used in contributions.

**Refunds:**
- Show delegation chain for refundable notes
- Only the root owner can trigger refund (or their authorized delegate)


### Funding Flow — Use Delegated Notes

In the "Buy Tokens" section of Project Detail, add:

**"Fund with delegated note" toggle:**

When toggled on:
- Dropdown to select from notes where connected wallet is the current owner (from `GetNotesByOwner`)
- Shows note balance, chain summary, token type compatibility
- If no compatible notes, shows message "No suitable notes found"

When funding via note:
- Uses note's tokens to pay for purchase
- Purchased tokens go into new note with same delegation chain
- Shows confirmation with new note ID

This allows delegates to make purchases on behalf of root owners without the root owner needing to be involved in each transaction.


### Browse Projects — Delegation Filters (Optional Enhancement)

Add optional filter on Browse Projects page (`/projects`):

- "Show projects with active delegation funding"
- Shows count of notes intended for statements aligned with each project

This is a more advanced feature that requires funding portal integration.


---

## Queries Used

The delegation UI uses these GraphQL queries (from SDK):

- `GetNote` — fetch single note by ID
- `GetNotesByOwner` — notes where address is current owner
- `GetNotesByRoot` — notes where address is root owner
- `GetDelegationChain` — full chain for a note
- `GetNoteEvents` — event history for a note (verify exists)
- `GetNoteIntents` — intent attestations for notes (verify exists)

Additional queries may be needed:
- Aggregated event queries for history page
- Queries for incoming delegation requests


## What's NOT in This Spec

These belong to other subsystems or future phases:

- **Cross-project delegation analytics** — Funding Portal UI
- **Commission/trustee fees** — Not in MVP
- **Delegation marketplace** — Future: discover trusted delegates
- **Notification system** — When delegations change or require action
- **Social/graph features** — See who delegates to whom (privacy considerations)
