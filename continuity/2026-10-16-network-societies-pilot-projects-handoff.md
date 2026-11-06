# Handoff: cause pages do not list the network-societies pilot projects

Next session: fix the cause-page project list that the four-family pilot exposed. Do not add the other eleven families. Do not publish implication edges.

## Read first

- [`fake-data-generation/campaigns/network-societies-v1-pilot.md`](../fake-data-generation/campaigns/network-societies-v1-pilot.md) — capability table, local-run result, board and project URLs.
- [`fake-data-generation/PLAN.md`](../fake-data-generation/PLAN.md) section F.
- Commits on branch `campaign`: `976eef50` (manifest and planner) and `c7648c02` (run notes). Not pushed.

## What is already true

Local chain was wiped and restarted. Plan: 40 users, 40 statements, 20 projects, 207 writes. After one insufficient-ETH `fund-project` (`action-00157`, `user-031`) was topped up and reset to `planned`, execution and reconciliation were 207/207 at block 295, lag 0. Artifacts are gitignored under `fake-data-generation/output/campaigns/network-societies-v1-pilot/`.

Walked in the browser at `http://commonality.localhost:8088`:

- Cause headings and the fake-data sentence render. The class-host directory statement is on civic life, Christian teaching, and home learning.
- Statement rows show non-zero project counts.
- Fundable Projects, including the "Not yet funded" tab, says "No aligned projects yet" on the boards that were opened (civic life, Christian teaching, home learning). Christian teaching is the cause that owns the projects.
- The project page for the directory works: title, outcome, founder Nadia, "0 of 2 USDZZZ raised." URL is in the pilot note. Route is `/#/projects/:address`, not `/#/project/:address`.

## What to fix

The cause board asks `AlignedProjectsList` for projects on the board's statement CIDs and then renders an empty list. The list lives in `ui/src/fundingportals/components/CauseBoard.tsx` (the embedded list and the "Not yet funded" tab) and `ui/src/fundingportals/components/AlignedProjectsList.tsx` (empty copy when `projects.length === 0`).

Find why those queries return nothing while the statement row still counts a project and the project page loads. Likely places: the statement CID set passed into the list, alignment-attestation trust filtering (campaign personas are not the official attester), or the indexer query the list uses. Confirm on the Christian teaching board and on one board that only includes the shared statement (civic life or home learning). A fix that shows projects only on the owning cause is incomplete if the statement is on the other boards and the row already counts the project.

Do not treat the one-wei note principal or the unpublished implication candidates as part of this fix. The gas miss on `action-00157` is a local provisioning shortfall at about 1 gwei; leave it unless the project-list fix is blocked by a broken chain.

## How to check

The local stack was up at the end of this session (`commonality.localhost:8088`, chain 31337, indexer lag 0). If it is down, start it without wiping, or the campaign state is gone and the run has to be executed again. Instructions are in the pilot note. Do not plan this campaign over `output/campaigns/medium-realistic-v2/`.

Verify in the browser: open the Christian teaching board and the civic-life or home-learning board, confirm the directory project appears, open it, and confirm the other project tabs did not gain a bogus row. Console noise that was already present: `favicon.ico` 404 and `/api/cause-assist/health` 404.

## Suggested skills

- `browser-driving` — the bug is on the rendered cause board. Re-check the boards after the change, not only a unit test.
- `thorough-tester` — when adding the regression, cover the owning board and a board that only includes the statement via `alsoOnCauseIds`.
