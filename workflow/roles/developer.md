# Developer documentation

Useful files to read:
  - [Top-level README](/README.md)
  - [Local development instructions](/workflow/local-development.md) (coding, building, deployment, testing)
  - [Deployment instructions for testnet/mainnet](/workflow/deployment.md)
  - [Technical architecture](/docs/dev/architecture.md)
  - code-level READMEs in each package (`hardhat/`, `sdk/`, `ui/`, etc.)
  - [specs/tech/subsystems/](/specs/tech/subsystems/) for your subsystem

## Feedback loops (AKA tests)

- `npm run lint` to run various linters
- `npm run build` to make sure everything builds and type-checks
- `npm run test:fast` to run the fast suite (SDK unit tests, Hardhat tests, integration-test harness unit tests, and UI Vitest; no Docker/indexer/Playwright)
- `npm run test` to run the full suite (takes many minutes!)
- `npm run test:seed:implication-regression --workspace=fake-data-generation` after editing curated seed statements or proliferation variants. This checks the saved implication-attester decision corpus against the current statement IDs and text. If it fails because statements changed, run `npm run gen:seed:implications:verify --workspace=fake-data-generation -- --review-output fake-data-generation/output/seed-implication-review.json` to produce the focused packet of only new/changed implication pairs that need human review. See [fake-data-generation/README.md](/fake-data-generation/README.md#pre-generated-seed-implication-decisions).

Note that the build and tests are run by the Git pre-commit hook, and the whole thing takes a few minutes to run, so if you're ready to commit and the only thing left to do is run the build and the tests, it's okay to just attempt to commit and make sure it goes through; no need to run the whole test suite only to have it run again when you commit immediately afterward.

## Verifier report / operational health checks

The project has a verifier workspace in [`/verifier`](/verifier/README.md). If asked for a **verifier report**, run `npm run verifier:report` to print the latest top-level `root` dashboard result. If asked to **run the verifier** in the idempotent/due-only sense, run `npm run verifier:run` (`verifier-scheduler --workspace verifier`); expensive checks are manual-triggered and will not rerun unless explicitly forced. Cheap liveness/coverage checks are scheduled automatically by that loop. To force a specific check or pass, use `verifier-run --workspace verifier <checkId>` or the npm shortcuts: `npm run verifier:pr`, `npm run verifier:light-confidence`, `npm run verifier:release-candidate`, `npm run verifier:full-launch`, and `npm run verifier:root`. If the scheduler is supervised continuously, install an external cron heartbeat using `npm run verifier:heartbeat`.

**Branch structure:** See [workflow/branching.md](/workflow/branching.md). Briefly: work in `dev`, promote to `master` via merge. Commits to dev are gated by a quicker test suite; merges to master are gated by the full test suite.

## LSP (Language Server Protocol)

This project has LSP infrastructure set up for the pi coding agent (`pi-lsp-extension`):
- **TypeScript** — Root `tsconfig.json` with project references for all 17 workspace packages; each sub-package has `"composite": true`
- **Solidity** — `@nomicfoundation/solidity-language-server` configured in `.pi-lsp.json`; `.sol` extension mapping added to `pi-lsp-extension`'s language map
- `.pi-lsp.json` configures both servers and eager TypeScript startup

When adding new workspace packages, add them to the root `tsconfig.json` references array and ensure their tsconfig has `"composite": true`. When a new language needs LSP support, both the language map (`pi-lsp-extension/src/shared/language-map.ts` in the global npm install) and `.pi-lsp.json` may need updating.
