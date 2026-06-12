# Aligning UI

The cause board UI lives in `ui/src/aligning/`. It uses the same stack as the rest of the app (React, MUI, wagmi/viem, queries via the SDK over the event cache + folds).

There are two pages: Statement Alignment and Cause Leaderboard. Aligning also adds an "Aligned Projects" link/section to the concept space's statement page, and an "Alignment Attestations" section to the lazyGiving's project detail page.

The Aligning is the layer that connects concept space statements to lazyGiving projects. LazyGiving is the Kickstarter clone; the concept space is where causes live; the Aligning joins them together.


## Statement Alignment Page

**Route:** `/portal/:statementCid`

This is the main page — the cause board for a specific statement/cause. It's linked from the concept space's statement page. It answers: "What projects exist that are aligned with this cause, and how much funding is flowing?"

### Header

- Statement title and summary (fetched from IPFS metadata via the statement's `metadataCid`)
- Link back to the statement page (`/statement/:statementCid`)
- **Total Funding Raised** — aggregate ETH raised across all aligned projects (direct + indirect alignment)
- **Available Delegatable Funding** — total ETH in delegatable notes intended for this cause (from `getNoteIntentAttestationsByStatement`, summing active note amounts). This is the "money waiting to be spent" signal. Links to a filtered view of those notes.

### Aligned Projects List

All projects that have been attested as aligned with this statement — both directly and indirectly (via implication attestations). The SDK folds alignment attestations from the event cache and joins them client-side with the concept space's implication data and lazyGiving's project data.

Each project shows as a card:
- Project name (from IPFS metadata)
- Funding progress bar (totalReceived / threshold)
- Deadline (human-readable, e.g. "12 days left")
- Status badge: "Funding", "Succeeded", or "Refunding"
- Alignment type indicator: "Direct" or "Indirect (via [statement name])" — so users can see whether the project was attested as directly aligned with this statement, or aligned with an implying statement
- Attester address (who made the alignment attestation)

Clicking a project card goes to the lazyGiving project detail page (`/projects/:projectAddress`).

**Sorting/filtering controls:**
- Sort by: newest, deadline (soonest first), most funded, closest to goal (% funded), trending
- Filter by status: all / active / succeeded / refunding
- Filter by alignment: all / direct only / indirect only

### Attest Project Alignment

A form (collapsible, or behind an "Attest Alignment" button) for attesting that a project is aligned with this statement. Fields:
- **Project address** — input field with autocomplete from known lazyGiving projects
- Submit calls the alignment attestation contract (an `AlignmentAttestation` event: "subject [projectAddress] is aligned with statement [statementCid]")

Only shown when a wallet is connected.

### Available Delegatable Notes

A collapsible section showing individual delegatable notes that have been marked (via NoteIntent) as intended for this cause. Each note shows:
- Note ID (links to the Delegation domain's `/notes/:noteId` route)
- Amount
- Root owner (depositor)
- Current leaf owner (who controls it)
- Delegation depth

This makes the available funding concrete — potential project creators can see real committed money, not just an aggregate number.


## Cause Leaderboard Page

**Route:** `/portal/:statementCid/leaderboard`

The cross-project contributor leaderboard for a specific cause. This is the "social recognition" feature: top contributors to projects aligned with this statement.

### Design rationale: what counts as a "contribution"

The leaderboard tracks only **direct project purchases** (ERC-1155 token buys), not delegated-note deposits. Rationale: direct purchases are committed and non-revocable — the contributor has actually funded a project. Delegated-note deposits are revocable pledges that the depositor can withdraw at any time, so they don't warrant individual social recognition on a leaderboard.

However, the aggregate amount of delegated funds available for a cause is still important — it signals ecosystem interest and available capital. So the page shows a **summary stat** for total delegated funds available (not broken down per depositor), sourced from `getTotalFundingForCause().totalAvailableFromNotes`. When the leaderboard is empty but delegated funds exist, the empty state should reflect this (e.g. "No direct project purchases yet" alongside the delegated-funds stat) rather than a bare "No contributions yet."

### Leaderboard Table

Contributors ranked by total net contribution (totalContributed - totalRefunded) across all projects aligned with this statement. Only includes direct project purchases. Uses the Aligning indexer's aggregated contributor data.

Columns:
- Rank
- Address (with ENS name if resolvable)
- Total contributed (ETH)
- Number of projects funded
- Donor vs investor breakdown (tokens burned vs held)
- Full delegation chain (if the contribution was made via a delegatable note, show "Alice → Bob → Charlie" rather than just the leaf)

### My Rank

If a wallet is connected, highlight the current user's row and show a summary card at the top: "You are #N contributor to this cause — X ETH across Y projects."


## Integration with Concept Space (Statement Page)

Not a cause board page itself, but the cause board adds a section to the concept space's statement page (`/statement/:statementCid`).

### "Cause Board" Section

- **Total Funding Raised** and **Available Delegatable Funding** (same numbers as the portal header)
- Count of aligned projects (direct + indirect)
- A "View Cause Board" link/button going to `/portal/:statementCid`
- Top 3 projects by funding progress (as a preview)

This is the primary entry point from the concept space into the cause board.


## Integration with LazyGiving (Project Detail Page)

The cause board adds a section to the lazyGiving's project detail page (`/projects/:projectAddress`).

### Alignment Attestations Section

Shows which statements/causes this project has been attested as aligned with. Uses alignment attestation data from the Aligning indexer.

Each alignment shows:
- Statement title (linked to `/portal/:statementCid`)
- Attester address
- Whether it's a direct attestation or indirect (via implication)

This answers the question "why should I care about this project?" by connecting it to the causes it serves.

### "Attest Alignment" Button

A small form (or dialog) for attesting that this project is aligned with a statement. Fields:
- **Statement** — autocomplete searching the concept space

Only shown when a wallet is connected. This is the same action as the "Attest Project Alignment" form on the portal page, just initiated from the project side.


## What's NOT in the Aligning UI

- **Project creation** — that's the LazyGiving UI's job.
- **Token buying/selling/burning** — LazyGiving UI.
- **Delegation management** — Delegation UI. (But the cause board does display delegation chains in leaderboards, and shows available delegatable notes.)
- **Statement creation/signing** — Concept Space UI.
- **Implication attestation management** — Concept Space / Attester AI.
- **Commission for trustees** — deferred from MVP per delegation spec.
- **More-objective success/alignment verification** — described as a "vague future idea" in the spec, not a concrete feature yet.
- **Implication graph visualization** — listed in queries-and-actions.md as a cross-component query, but deferring from the initial UI. Could add later as an advanced feature on the portal page.
