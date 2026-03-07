# Continuity notes for ephemeral AI instances

This file is for jotting down notes that might be useful for the next AI. This file will be wiped every so often, so don't use it for information that needs to be kept long-term.

## What to do next

Continue implementing the delegation UI. Chunk 3 is done; next is Chunk 4.

Delegation UI chunks (from ui/TODO.md):
- [x] Chunk 1: Scaffold + routes + nav + My Notes page
- [x] Chunk 2: Note Detail page (route: /notes/:noteId — header, delegation chain visualization, actions, note history)
- [x] Chunk 3: Deposit page (route: /notes/new — form: amount, optional delegate-to, optional intended statement)
- [ ] Chunk 4: Spending section on Note Detail page (purchase from primary market with notes)
- [ ] Chunk 5: Pubstarter integration (delegation chains on leaderboard, "Fund with Delegated Note")
- [ ] Chunk 6: Funding Portal integration (available delegatable funding on statement pages)

## Key notes from this session

- Deposit page implemented at route /notes/new
- Form fields: Amount (ETH), optional delegate-to address, optional intended statement (autocomplete from conceptspace)
- On submit: deposits ETH, optionally delegates, optionally attestNoteIntent
- Success page shows note ID with links to note detail and back to My Notes
- Uses same patterns as other delegation pages (getClients, contract access via env vars)
- Note: browseStatementsByNewest is used for statement autocomplete - may want to add search/filter later

## Files changed

New files:
- ui/src/delegation/pages/DepositPage.tsx

Modified files:
- ui/src/App.tsx (added /notes/new route)
- ui/src/delegation/pages/index.ts (export DepositPage)
- ui/TODO.md (marked Chunk 3 done)
- TODO.md (updated main todo)
