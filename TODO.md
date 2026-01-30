# What we've been working on lately

Main thing I want to work on next:
  - Decoupling and generalizing some pieces of the system. See [specs/decoupling.md](specs/decoupling.md).
    - ✅ **Displayable-documents refactoring/decoupling is COMPLETE** (verified Jan 2026). We now have a fully-decoupled displayable-documents system, and a statement is simply one of those. See [specs/displayable-documents.md](specs/displayable-documents.md) for details.

Other big things to do soon:
  - Writing the UI. (Maybe the conceptspace MVP is in-theory done? But not really tested, even manually; I don't trust the UI at all yet.) We just added Vitest + Testing Library, but haven't written any UI tests yet.
  - Generative testing. There's an early attempt at fake-data generation in hardhat/fake-data-generation, but I don't know how well it works or how complete it is; it'd be reasonable to blow it away and start over.
    - Once we have this, it'd be cool to generate a bunch of user actions and run them through the sdk (using the same setup we're currently using for the integration-tests), just as a smoke test to see if anything catches fire.
  - Implement the Implication Attester AI service.
  - Set up deployment for testnet and mainnet.

## Miscellaneous TODO.md files

- [ui/todo.md](ui/todo.md)
