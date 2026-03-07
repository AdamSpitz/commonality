# Continuity notes for ephemeral AI instances

This file is for jotting down notes that might be useful for the next AI. This file will be wiped every so often, so don't use it for information that needs to be kept long-term.

## What to do next

Continue implementing the delegation UI. Chunk 2 is done; next is Chunk 3.

Delegation UI chunks (from ui/TODO.md):
- [x] Chunk 1: Scaffold + routes + nav + My Notes page
- [x] Chunk 2: Note Detail page (route: /notes/:noteId — header, delegation chain visualization, actions, note history)
- [ ] Chunk 3: Deposit page (route: /notes/new — form: amount, optional delegate-to, optional intended statement)
- [ ] Chunk 4: Spending section on Note Detail page (purchase from primary market with notes)
- [ ] Chunk 5: Pubstarter integration (delegation chains on leaderboard, "Fund with Delegated Note")
- [ ] Chunk 6: Funding Portal integration (available delegatable funding on statement pages)

## Key notes from this session

- Note Detail page now implemented at route /notes/:noteId
- Header shows: Note ID, amount/token info, active/inactive status, root owner, current leaf owner, created timestamp
- Delegation chain visualization: vertical chain with colored nodes (root=blue, leaf=green, intermediate=yellow), shows timestamps
- Intended Purpose section: shows NoteIntent attestations with links to statement pages
- Actions section with conditional buttons:
  - Delegate (leaf owner only)
  - Revoke (chain members who are not leaf)
  - Reclaim (root owner only, when undelegated)
- Note history section placeholder (event data not yet available via SDK)
- Note: "Spend on Project" and "Set Intent" actions mentioned in spec but not implemented in this chunk (deferred to later)
- SDK delegation chain returns root-first (position 0 = root), actions expect leaf-first

## Files changed

New files:
- ui/src/delegation/pages/NoteDetailPage.tsx

Modified files:
- ui/src/App.tsx (added /notes/:noteId route)
- ui/src/delegation/pages/index.ts (export NoteDetailPage)
- ui/TODO.md (marked Chunk 2 done)
