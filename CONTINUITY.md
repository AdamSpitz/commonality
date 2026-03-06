# Continuity notes for ephemeral AI instances

This file is for jotting down notes that might be useful for the next AI. This file will be wiped every so often, so don't use it for information that needs to be kept long-term.

## What to do next

All 6 chunks of the pubstarter UI are now complete. Possible next tasks:

- **Post-implementation checklist** for the pubstarter UI — all 6 chunks are done, this would be a good time.
- **Token image upload** — the user's note on Chunk 6 asked about letting creators upload a picture per token type to IPFS. This is not yet implemented.
- **`VITE_PUBSTARTER_CONTRACT_ADDRESS` env var** — the CreateProjectPage requires this. It needs to be added to the e2e test global setup (currently only `BELIEFS_CONTRACT_ADDRESS` and `MUTABLE_REF_UPDATER_CONTRACT_ADDRESS` are copied). Also needs to be documented for local development.
- Other tasks from TODO.md: get e2e tests working, fix workspace TODO.md issues.

## Key notes from Chunk 6

- `CreateProjectPage` uses `uploadToIPFS` (not `publishDocument`) for project metadata as `{ name, description }` — matching what BrowseProjectsPage/ProjectDetailPage read back.
- `createProject` from SDK wraps the factory's `createERC1155AndMarketplaceAndAssuranceContract` call.
- After success, navigates to `/projects/${assuranceContractAddress}` since that's the project's `id` in the indexer.
- Tests set `import.meta.env.VITE_PUBSTARTER_CONTRACT_ADDRESS` in beforeEach.
