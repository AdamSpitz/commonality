# Commonality

## Where to find various files

  - The main spec is in [specs/README.md](specs/README.md).
  - To maintain continuity between ephemeral AI instances, use [progress.txt](progress.txt) for jotting down notes that might be useful for the next AI. This file will be wiped every so often, so don't use it for information that needs to be kept long-term.
  - Reviews go in [REVIEWS.md](REVIEWS.md).

## Documentation

For long-term documentation, there are many .md files all over the project. Try to make sure none of them gets "orphaned" - i.e. make sure they're all "reachable" transitively via links from this top-level README.md file.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive deployment instructions covering:
- Local development deployment (Docker Compose)
- Testnet deployment (Sepolia)
- Mainnet deployment (with security checklist)
- AI Attester service deployment (Render)
- UI deployment to IPFS (not yet implemented, but documented)
- Environment configuration and troubleshooting

## Feedback loops

- `npm run build` to make sure everything builds and type-checks
- `npm run test` to run the tests

Note that these are both run by the Git pre-commit hook, and the whole thing takes a few minutes to run, so if you're ready to commit and the only thing left to do is run the build and the tests, it's okay to just attempt to commit and make sure it goes through; no need to run the whole test suite only to have it run again when you commit immediately afterward.

## Artifacts

Main artifacts:
  - Smart contracts
  - Indexer
  - SDK: used by both the integration-tests and the UI code
  - Integration tests
  - UI
  - AI attester

See [ARTIFACTS.md](ARTIFACTS.md) for more detail.

## To-do list

See [TODO.md](TODO.md) for a high-level list of what we've been working on lately and intend to work on soon.

When completing a task, please make sure to keep TODO.md (or whichever subsystem's TODO.md is appropriate) up to date.

If there's a vague high-level to-do item, it may make sense for the project-lead to spend one "task" on simply expanding it out into a list of medium or small to-do items.

## High-level overview of current status

For now, this project hasn't even been deployed yet, so don't worry about backward compatibility.

Current focus: Deployment infrastructure is set up for testnet and mainnet. Next priorities are generative testing (attack scenarios and invariant checking) or deploying the contracts. 
