# Commonality

## Specification

The main spec is in [specs/README.md](specs/README.md).

## AI memory notes

We often use ephemeral AI instances to implement particular tasks. To maintain continuity between sessions, use [progress.txt](progress.txt) for jotting down notes that might be useful for the next AI. This file will be wiped every so often, so don't use it for information that needs to be kept long-term.

## Documentation

For long-term documentation, there are many .md files all over the project. Try to make sure none of them gets "orphaned" - i.e. make sure they're all "reachable" transitively via links from this top-level README.md file.

## Feedback loops

- `npm run build` to make sure everything builds and type-checks
- `npm run test` to run the tests

Ideally, Git should be set up so that code can't be committed to the master branch if these don't pass. I'm not sure whether this is set up yet or not; if not, setting it up would be a good task to do.

## Artifacts

Main artifacts:
  - Smart contracts
  - Indexer
  - SDK: used by both the integration-tests and the UI code
  - Integration tests
  - UI
  - AI attester (not written yet)

See [ARTIFACTS.md](ARTIFACTS.md) for more detail.

## To-do list

See [TODO.md](TODO.md) for a high-level list of what we've been working on lately and intend to work on soon.

We can also use gitlab.com's issue tracking system.
