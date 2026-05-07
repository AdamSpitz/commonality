# Delegation UI

The delegation UI lives in `ui/src/delegation/`. It uses the same stack as the rest of the app (React, MUI, wagmi/viem, GraphQL queries via the SDK).

There are three pages: My Notes, Note Detail, and Deposit. Plus a section that will appear on other subsystems' pages (the Funding Portal's statement page).


## My Notes Page

**Route:** `/notes`

Shows the connected user's delegatable notes from two perspectives: notes they currently control (as leaf owner) and notes they originally deposited (as root owner). These are two separate sections on the same page.

### Summary Cards

A row of summary cards at the top of the page for a quick overview:
- **Total Funds** — aggregated ETH amount across all notes the user controls
- **Active Notes** — count of active notes where the user is leaf owner
- **Acting as Delegate** — count of notes where the user is leaf owner but not root owner (i.e. someone else's money)
- **Deposited & Delegated** — count of notes the user deposited that are currently controlled by someone else

### "Notes I Control" section

Lists all active notes where the connected user is the current leaf owner. Uses `getNotesByOwner`. Each note shows:
- Note ID
- Amount (formatted as ETH or token amount)
- Token type indicator (ETH vs ERC1155 — if ERC1155, show the token contract and token ID)
- Whether it was delegated to you (i.e. you're not the root) — if so, show "delegated from [root address]"
- Intended statement/cause, if any NoteIntent attestation exists from the root owner (looked up via `getNoteIntentAttestationsByNote`)

Clicking a note goes to the Note Detail page.

An "actions" area on each note card (or via a menu) with quick actions:
- **Delegate** — opens an inline form or dialog: address field + amount field (pre-filled with full note amount, editable for partial delegation)
- **Revoke** — only shown if the note has been delegated further (i.e. the user delegated it to someone else and wants to take it back). Since the user is the leaf owner of these notes, this actually won't apply here — revocation is done from the "Notes I Deposited" section. (See below.)

### "Notes I Deposited" section

Lists all active notes where the connected user is the root owner. Uses `getNotesByRoot`. This may overlap with the first section (for undelegated notes), but it also shows notes that the user deposited and then delegated away — where someone else is now the leaf owner.

Each note shows:
- Note ID
- Amount
- Current leaf owner (with chain depth, e.g. "controlled by [address] (3 levels deep)")
- Intended statement/cause, if any
- Status: "Undelegated" / "Delegated"

For delegated notes, a **Revoke** button is available. This calls `revokeNote` with the full delegation chain (obtained via `getDelegationChain`). Revoking brings control back to the root.

A **Reclaim** button is available on undelegated notes (where root = leaf), calling `reclaimFunds` to withdraw the funds back to the user's wallet.

### Wallet not connected state

If no wallet is connected, show a message prompting the user to connect their wallet.


## Note Detail Page

**Route:** `/notes/:noteId`

A detailed view of a single note. Accessible by anyone (not just the owner), because delegation chains are transparent.

### Header
- Note ID
- Amount and token info
- Active/inactive status
- Root owner (original depositor)
- Current leaf owner
- Created timestamp

### Delegation Chain

The core visualization. Shows the full delegation chain from root to leaf, obtained via `getDelegationChain` (ordered by position, 0 = root). Display as a vertical chain/timeline:

```
[Root] Alice (0x123...)     — deposited 10 ETH
  ↓
[Delegate] Bob (0x456...)   — delegated 7 ETH
  ↓
[Leaf] Charlie (0x789...)   — current controller
```

Each link shows the address (and ENS name if resolvable) with a copy button and "view on explorer" link, plus the timestamp of delegation.

### Intended Purpose

If there are NoteIntent attestations for this note (from `getNoteIntentAttestationsByNote`), show the intended statement/cause. Link to the statement page (`/statement/:statementCid`). Show the attester address so users can see who made the attestation.

### Actions

Only shown to relevant users:

- **Delegate** (shown to the current leaf owner): address + amount fields. Calls `delegateNote`.
- **Revoke** (shown to any chain member who is not the leaf): calls `revokeNote`. The UI should make it clear that revoking will truncate the chain at the revoker's position, removing all delegations below them.
- **Reclaim** (shown only to the root owner, and only when the note is undelegated — root = leaf): calls `reclaimFunds`.
- **Spend on Project** (shown to the current leaf owner): see "Spending" section below.
- **Set Intent** (shown to any user, since NoteIntent allows any address to attest): a form with a statement selector (autocomplete searching the concept space). Calls `attestNoteIntent`.

### Note History

If we have event data from the indexer (via `delegation_note_events` table), show a timeline of all events for this note: created, delegated, split, revoked, purchased, etc. This gives a complete audit trail.


## Deposit Page

**Route:** `/notes/new`

A form for creating a new delegatable note.

### Fields
- **Amount** (ETH input — for the MVP, only ETH deposits are supported since that's what the contract primarily handles)
- **Delegate to** (optional) — an address field. If provided, after depositing, the UI automatically calls `delegateNote` to delegate the new note to this address. This saves the common two-step flow of "deposit then delegate."
- **Intended statement** (optional) — a statement selector (autocomplete from the concept space). If provided, after depositing, the UI automatically calls `attestNoteIntent` on the NoteIntent contract to associate the note with this cause.

### On submit
1. Call `depositETH` with the specified amount.
2. If a delegate address was specified, call `delegateNote` with the returned noteId.
3. If an intended statement was specified, call `attestNoteIntent` on the NoteIntent contract.
4. Show success with a link to the new note's detail page.

### Why deposit?

A brief explainer for new users: "Depositing creates a delegatable note — a pool of funds that you or a trusted delegate can use to fund aligned projects. You can delegate decision-making to someone you trust, or browse projects yourself."


## Spending (on the Note Detail Page)

The leaf owner of a note can spend it to purchase tokens from a pubstarter project's primary market. This is a section on the Note Detail page.

### Purchase Form
- **Project** — a project selector (search/browse from the list of active pubstarter projects)
- **Token type** — which of the project's token types to buy (dropdown, populated after selecting a project)
- **Quantity** — how many tokens to buy
- **Cost** — computed from quantity * price (read-only display)

The cost must not exceed the note's amount. If the cost is less than the note's full amount, this is a partial spend — the original payment note's amount decreases and keeps the same delegation chain.

Calls `purchaseFromPrimaryMarketWithNotes`. Delegated-note purchases buy one ERC1155 token type per transaction. The UI needs to construct `purchaseShares`; for a single selected note, `shares` equals the purchased quantity. The chain array inside each share comes from `getDelegationChain` (but reversed: the SDK expects leaf-first, root-last, while the indexer returns root-first).

After a successful purchase, refresh the page to show the updated note state (the original note's amount will have decreased or the note will be consumed, and new ERC1155-holding notes will exist).


## Integration with Pubstarter (Project Detail Page)

Not a delegation page itself, but the delegation system adds information to pubstarter's Project Detail page:

### Delegation Chains on Contributor Leaderboard

When a contribution was made via a delegatable note, the contributor leaderboard should show the full delegation chain rather than just a single address. For example: "Alice → Bob → Charlie" where Alice is the money provider, Bob delegated to Charlie, and Charlie made the purchase. This implements the transparency requirement from the delegation spec ("the site shows 'Alice has contributed 5% of this project's funds; the full delegation chain was Alice → Bob → Charlie'").

### "Fund with Delegated Note" option

In the "Buy Tokens" section, add an option to pay using a delegatable note instead of paying directly from the wallet. When selected, show a dropdown of the user's active notes (from `getNotesByOwner`) with their balances. This calls `purchaseFromPrimaryMarketWithNotes` instead of the direct buy function, and must restrict each note-funded transaction to one token type.

This is an alternative entry point to the spending flow described in the Note Detail page — it's the same action, just initiated from the project side rather than the note side.


## Integration with Funding Portal (Statement Page)

This isn't a page in the delegation UI itself, but the delegation system surfaces information on the Funding Portal's statement pages. Specifically:

### "Available Funding" section on a Statement Page

For a given statement, show the total amount of delegatable notes that have been attested (via NoteIntent) as intended for that statement. Uses `getNoteIntentAttestationsByStatement` to find all relevant notes, then sums their active amounts.

Display: "X ETH available in delegatable notes for this cause" — with a link to browse the individual notes.

This creates the signaling effect described in the spec: potential project creators can see that money is available for their cause, encouraging them to create aligned projects.


## Navigation

The Delegation domain's AppShell navigation should link to the delegated-fund pages (`/notes`, `/notes/new`). Other domains should link across to Delegation when they need donor-delegate setup, note detail, or delegate track-record views instead of mounting these pages locally.


## What's NOT in the Delegation UI

- **Commission for trustees** — explicitly deferred from MVP per the delegation spec.
- **Merging notes** — mentioned in the spec as a possibility but not implemented in the contract. Don't build UI for it.
- **ERC20 token deposits** — the contract supports it but the MVP focuses on ETH. Can add later.
- **Secondary market purchases via notes** — the contract only supports primary market (assurance contract) purchases for now.
- **Cross-cause leaderboards** — that's the Funding Portal UI's job.
- **Multi-note spending** — the contract supports spending from multiple notes in one transaction, but for the MVP the UI can start with single-note spending. Multi-note spending can be added later as a "use multiple notes" option if needed.


## Contract Addresses

Read from environment variables, following the existing pattern:
- `VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS`
- `VITE_NOTE_INTENT_CONTRACT_ADDRESS`
