# Commonality

## Getting started

See [here](workflow/local-development.md) for local-development instructions.

## Finding relevant specs

See [ROLES.md](workflow/ROLES.md) for the full guide. Quick version:

  - **Founder (vision/strategy):** [docs/vision-and-strategy/](docs/vision-and-strategy/) + [specs/README.md](specs/README.md)
  - **Product manager (what to build):** [specs/README.md](specs/README.md) + [specs/product/](specs/product/README.md)
  - **Tech lead (how to build it):** [specs/README.md](specs/README.md) + [specs/tech/README.md](specs/tech/README.md)
  - **Dev (implementation):** This README + code-level READMEs in each package (`hardhat/`, `sdk/`, `ui/`, etc.) + [specs/tech/subsystems/](specs/tech/subsystems/) for your subsystem

## Where to find other files

  - [AI continuity notes](CONTINUITY.md)
  - [Build-process documentation](workflow/BUILD.md)
  - [Reviews](workflow/reviews/README.md)
  - [Deployment instructions for testnet/mainnet](workflow/deployment.md) (local dev is above, in this file)
  - [To-do list](TODO.md)

## Feedback loops

- `npm run lint` to run various linters
- `npm run build` to make sure everything builds and type-checks
- `npm run test:fast` to run the fast suite (SDK unit tests, Hardhat tests, integration-test harness unit tests, and UI Vitest; no Docker/indexer/Playwright)
- `npm run test` to run the full suite (takes many minutes!)
- `npm run test` to run the full suite (takes many minutes!)
- `npm run test:seed:implication-regression --workspace=fake-data-generation` after editing curated seed statements or proliferation variants. This checks the saved implication-attester decision corpus against the current statement IDs and text. If it fails because statements changed, run `npm run gen:seed:implications:verify --workspace=fake-data-generation -- --review-output fake-data-generation/output/seed-implication-review.json` to produce the focused packet of only new/changed implication pairs that need human review. See [fake-data-generation/README.md](fake-data-generation/README.md#pre-generated-seed-implication-decisions).

Note that the build and tests are run by the Git pre-commit hook, and the whole thing takes a few minutes to run, so if you're ready to commit and the only thing left to do is run the build and the tests, it's okay to just attempt to commit and make sure it goes through; no need to run the whole test suite only to have it run again when you commit immediately afterward.

## Artifacts

### Core platform

  - [Smart contracts](hardhat/README.md) (`hardhat/`)
  - [SDK](sdk/README.md) — used by integration-tests, ui, and AI services
  - [Indexer](indexer/README.md) — thin Ponder event cache; no business logic
  - [UI](ui/README.md) — multiple branded surfaces from one Vite/React codebase
  - [Integration tests](integration-tests/README.md)
  - [Fake-data generation](fake-data-generation/README.md)

### AI Service Ecosystem

The core pipeline (attesters, finders, nudgers, explorer) is complete. See `specs/product/ai-assistance.md` for the ecosystem overview and `specs/product/` and `specs/tech/subsystems/` for individual specs.

**AI services — attesters** (evaluate claims and publish on-chain attestations):
  - [Attester Core](attester-core/README.md) — shared library for all attester services
  - [Implication Attester](implication-attester/README.md) — evaluates whether S1 implies S2
  - [Content Attester](content-attester/README.md) — evaluates whether a content item aligns with a statement

**AI services — finders** (proactively discover candidates for attestation):
  - [Finder Core](finder-core/README.md) — shared library for all finder services
  - [Implication Finder](implication-finder/README.md) — discovers statement pairs for the implication attester
  - [Content Finder](content-finder/README.md) — processes a submission queue for the content attester

**AI services — nudgers** (suggest statements to users based on what they already believe):
  - [Nudger Core](nudger-core/README.md) — shared library for all nudger services
  - [Implication Graph Nudger](implication-graph-nudger/README.md) — suggests statements implied by ones you already signed
  - [Bridge Creator](bridge-creator/README.md) — synthesizes common-ground statements between opposing views
  - [Explorer Curator](explorer-curator/README.md) — maintains a curated collection for goal-oriented exploration; personalizes per user

**AI service hosting**:
  - [Attester Host](attester-host/README.md) — runs the implication and content attesters under one Express host for service bundling
  - [Worker Host](worker-host/README.md) — runs multiple background AI workers in one supervised host process for service bundling

### Platform API service

  - [Platform API Service](platform-api-service/README.md) — resolves creator handles and content URLs; handles channel verification (Twitter, YouTube)

## Other things worth noting

### Unusual architecture: Client-Side Folding

The indexer is intentionally dumb — it's a thin event cache that stores raw blockchain events and nothing else. All state computation ("folding") happens client-side in the SDK. If you're wondering why the indexer has no business logic, this is why. See [specs/tech/indexer/README.md](specs/tech/indexer/README.md).

### Local dev done using Docker

We have a Docker Compose setup for running Hardhat and the Ponder indexer. This provides a clean, isolated environment for development and testing.

## High-level overview of current status

This project has never been deployed to mainnet yet.

Working towards getting the [MVP](specs/product/mvp.md) ready to deploy to testnet. We're getting close. It'd be a good thing to do, to practice the real deployment workflow to have a shared thing that we can point at and so on. But I'm out of touch with the code and I've never used much of the UI (because so much of this work has been done by LLMs), so I don't yet have confidence that this thing actually works.
