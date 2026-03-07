# Continuity notes for ephemeral AI instances

This file is for jotting down notes that might be useful for the next AI. This file will be wiped every so often, so don't use it for information that needs to be kept long-term.

## What to do next

Continue with Chunk 5 of the delegation UI: Pubstarter integration (delegation chains on contributor leaderboard, "Fund with Delegated Note" option on project page).

Delegation UI chunks (from ui/TODO.md):
- [x] Chunk 1: Scaffold + routes + nav + My Notes page
- [x] Chunk 2: Note Detail page (route: /notes/:noteId — header, delegation chain visualization, actions, note history)
- [x] Chunk 3: Deposit page (route: /notes/new — form: amount, optional delegate-to, optional intended statement)
- [x] Chunk 4: Spending section on Note Detail page (purchase from primary market with notes, project selector)
- [ ] Chunk 5: Pubstarter integration (delegation chains on leaderboard, "Fund with Delegated Note")
- [ ] Chunk 6: Funding Portal integration (available delegatable funding on statement pages)

## Key notes from this session

- Added spending functionality to Note Detail page
- Users can now spend their ETH notes to purchase tokens from active pubstarter projects
- Project selector shows only active projects (deadline not passed and not yet funded)
- Token selector shows available tokens for the selected project
- Partial spending is supported - note will be split if cost is less than full amount
- After purchase, page refreshes to show updated note state

## Files changed

Modified files:
- ui/src/delegation/pages/NoteDetailPage.tsx (added spending section with SpendDialog)
