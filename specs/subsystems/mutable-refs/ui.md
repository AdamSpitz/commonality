# Mutable Refs UI

A generic admin/debug UI for viewing and editing a user's mutable refs. Lives in `ui/src/mutable-refs/`. Uses the same stack as the rest of the app (React, MUI, wagmi/viem, GraphQL queries via the SDK).

This is not a polished end-user feature — it's a low-level tool for visibility, debugging, and hotfixes. Think of it as a key-value editor for your onchain refs.


## My Refs Page

**Route:** `/refs`

Shows all mutable refs owned by the connected wallet. The primary view is a table.

### Refs Table

Columns:
- **Name** — the ref name (e.g. `created-statements`)
- **Value** — the current ref value, truncated with ellipsis if long (full value shown on hover/click or in detail view)
- **Updated** — relative timestamp (e.g. "2 hours ago"), with absolute timestamp on hover
- **Actions** — Edit, Delete, and History buttons

The table is sorted by most-recently-updated first.

If the user has no refs, show an empty state: "No refs found. Use the form below to create one."

### Create/Update Ref Form

Below the table, a simple form:
- **Name** — text input
- **Value** — text input (or textarea for longer values)
- **Submit** button ("Update Ref")

Submitting calls `updateRef` on the MutableRefUpdater contract. On success, the table refreshes (via indexer re-query after a short delay, or optimistic update).

If the user types a name that already exists in the table, the form should indicate that this will overwrite the existing value.

### Wallet Not Connected State

If no wallet is connected, show a message prompting the user to connect their wallet.


## Ref Detail Dialog

Clicking a ref's name or an "expand" icon in the table opens a dialog (not a separate page) with:

### Current Value

The full ref value displayed in a monospace read-only text area, with a copy button.

### Value Inspector (if value looks like a CID)

If the value matches the pattern of an IPFS CID (starts with `bafy` or `Qm`), show an expandable "Inspect IPFS Content" section that:
1. Fetches the content from the IPFS gateway
2. If the content is valid JSON, displays it in a formatted JSON viewer (syntax-highlighted, collapsible)
3. If the content is not JSON, displays it as plain text

This is the "nice extra" — it makes it easy to see what a CID actually points to without leaving the UI.

### Edit

An inline edit mode: clicking "Edit" replaces the read-only display with an editable textarea, plus Save and Cancel buttons. Save calls `updateRef`.

### Delete

A "Delete" button that sets the ref's value to the empty string (via `updateRef(name, "")`). This is the only form of deletion the contract supports — there's no way to truly remove a key from the mapping. The UI should present this as "Delete" with a confirmation dialog, since it's the closest thing to deletion that exists. After deletion, the ref will disappear from the table (since the indexer filters out empty-value refs, or the UI filters them client-side).

### History

A table/list of past values for this ref, from `getUserRefHistory`. Each entry shows:
- **Value** (truncated, expandable)
- **Block number**
- **Timestamp**
- **Transaction hash** (linked to block explorer)

Sorted newest-first. Limited to the most recent 20 entries by default, with a "Load more" option.


## Ref Lookup (Other Users)

A secondary section on the page (collapsed by default, or a separate tab) for looking up another user's refs. Useful for debugging.

- **Address** — text input for an Ethereum address
- **Name** (optional) — if provided, look up a single ref via `getUserRef`. If blank, fetch all refs via `getUserRefs`.

Results displayed in the same table format as the main view, but read-only (no edit/create actions — you can only edit your own refs).


## Navigation

Add a "Refs" link to the AppShell navigation. This is a developer/debug tool, so it can be placed in a secondary position (e.g. a settings/tools area) rather than primary navigation. Alternatively, it can just be a route that isn't prominently linked — accessible by URL for people who know it's there.


## Contract Addresses

Read from environment variables, following the existing pattern:
- `VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS`


## What's NOT in This UI

- **List-aware editing** — this UI treats ref values as opaque strings. It doesn't understand the `{ statements: [...], version: 1 }` list format or provide list-specific operations (append, remove item, reorder). That belongs in domain-specific UIs (e.g. a statements-list manager).
- **True ref deletion** — the contract's mapping can't distinguish "never set" from "set to empty string", so deletion is implemented as setting the value to `""`. The UI presents this as deletion (hides empty-string refs from the table), but there's no way to truly remove the key from the mapping. This is fine.
- **Batch operations** — updating multiple refs in one action. Not needed for a debug tool.
- **Access control or sharing** — refs are owned by the caller's address, full stop. No delegation or permissions.
