# Funding Portal UI — Implementation Chunks

Spec: [specs/subsystems/fundingportals/ui.md](../../specs/subsystems/fundingportals/ui.md)

SDK queries/actions already exist in `sdk/src/subsystems/fundingportals/`.

Follow existing patterns from `ui/src/delegation/` and `ui/src/pubstarter/` (React + MUI + wagmi/viem + SDK).

---

## Chunk 1: Scaffold + Portal Page Header

Set up the fundingportal directory structure and implement the portal page header.

- Create `ui/src/fundingportal/pages/StatementFundingPortalPage.tsx`
- Create `ui/src/fundingportal/pages/index.ts`
- Create `ui/src/fundingportal/components/index.ts`
- Add routes to `App.tsx`: `/portal/:statementCid` and `/portal/:statementCid/leaderboard` (leaderboard can render a placeholder)
- Implement the **Header** section of the portal page:
  - Fetch statement metadata (title/summary) via `getStatementWithContent` from SDK
  - Link back to `/statement/:statementCid`
  - Display **Total Funding Raised** using `getTotalFundingForCause`
  - Display **Available Delegatable Funding** using the delegation SDK's `getNoteIntentAttestationsByStatement` (same pattern as `AvailableDelegatableFunding` component)
  - Display aligned project count

- [x] Done

## Chunk 2: Aligned Projects List

Implement the main body of the portal page — the list of aligned projects with cards.

- Create `ui/src/fundingportal/components/AlignedProjectCard.tsx`
- Create `ui/src/fundingportal/components/AlignedProjectsList.tsx`
- Use `getAllAlignedProjectsForCause` from SDK to fetch both direct and indirect alignments
- Each card shows: project name (fetched from IPFS metadata), funding progress bar (totalReceived/threshold), deadline ("12 days left"), status badge (Funding/Succeeded/Refunding), alignment type (Direct/Indirect), attester address
- Cards link to `/projects/:projectAddress`
- Add sorting controls: newest, deadline, most funded, closest to goal
- Add filtering: by status (all/active/succeeded/refunding), by alignment (all/direct/indirect)

- [x] Done

## Chunk 3: Attest Project Alignment Form + Available Delegatable Notes Section

Two smaller sections on the portal page.

- **Attest Project Alignment form** (`ui/src/fundingportal/components/AttestAlignmentForm.tsx`):
  - Collapsible form behind an "Attest Alignment" button
  - Project address input with autocomplete from known pubstarter projects (use `getProjects` or similar from pubstarter SDK)
  - Submit calls `attestAlignment` from `sdk/src/subsystems/fundingportals/actions.ts`
  - Only shown when wallet is connected (use `useAccount` from wagmi)

- **Available Delegatable Notes section** (`ui/src/fundingportal/components/DelegatableNotesSection.tsx`):
  - Collapsible section showing individual notes intended for this cause
  - Each note: Note ID (links to `/notes/:noteId`), amount, root owner, current leaf owner, delegation depth
  - Uses `getNoteIntentAttestationsByStatement` + `getNote` from SDK (same data as header, but detailed view)

- [ ] Done

## Chunk 4: Cause Leaderboard Page

Implement the full leaderboard page at `/portal/:statementCid/leaderboard`.

- Create `ui/src/fundingportal/pages/CauseLeaderboardPage.tsx`
- Replace the placeholder route added in Chunk 1
- **Leaderboard Table**: use `getTopContributorsForCause` from SDK
  - Columns: Rank, Address, Total contributed (ETH), Number of projects funded, Net contribution
  - Donor vs investor breakdown can be deferred if burn data isn't readily available
  - Delegation chain display (if contribution was via delegatable note)
- **My Rank**: use `getUserContributionRankForCause` from SDK
  - If wallet connected, highlight user's row and show summary card at top
- Link from portal page header to leaderboard

- [ ] Done

## Chunk 5: Statement Page Integration (Concept Space)

Add a "Funding Portal" section to the existing concept space Statement page.

- Create `ui/src/fundingportal/components/FundingPortalSummary.tsx`
- Add to `ui/src/conceptspace/pages/StatementPage.tsx` (after AvailableDelegatableFunding)
- Shows:
  - Total Funding Raised + Available Delegatable Funding (same numbers as portal header)
  - Count of aligned projects (direct + indirect)
  - "View Funding Portal" link/button → `/portal/:statementCid`
  - Top 3 projects by funding progress (preview cards, reuse AlignedProjectCard from Chunk 2)

- [ ] Done

## Chunk 6: Project Detail Page Integration (Pubstarter)

Add alignment attestation info to the existing pubstarter Project Detail page.

- Create `ui/src/fundingportal/components/AlignmentAttestationsSection.tsx`
- Add to `ui/src/pubstarter/pages/ProjectDetailPage.tsx`
- **Alignment Attestations Section**: use `getSubjectStatements` from SDK
  - Each alignment shows: statement title (linked to `/portal/:statementCid`), attester address, direct vs indirect
- **"Attest Alignment" button**: small form/dialog for attesting this project is aligned with a statement
  - Statement autocomplete (searching concept space)
  - Uses `attestAlignment` from SDK
  - Only shown when wallet connected

- [ ] Done
