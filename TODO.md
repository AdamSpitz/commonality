# What we've been working on lately

Main thing I want to work on next:
  - Decoupling and generalizing some pieces of the system. See [specs/decoupling.md](specs/decoupling.md). Maybe try working on displayable-documents? I think we've already got a high-level spec for it.

Displayable documents — next steps:
  - ~~**Renderer component (UI):**~~ Done. StatementRenderer now handles both DisplayableDocument and legacy StatementContent.
  - ~~**Save/load helpers (SDK):**~~ Done. `publishDocument` and `fetchDocument` in `sdk/src/displayable-document.ts`.
  - ~~**Statement creation flow:**~~ Done. `createAndSignStatement()` now accepts `DisplayableDocument`, CreateStatementForm uses `createStatement()`, and integration tests use the new format.
  - **Indexer awareness:** The indexer already fetches and caches IPFS content. It may need updates to parse the new displayable-document format for excerpt generation and search indexing (vs. the legacy statement format). The dual-format detection logic is described in `specs/statements.md`.

Other big things to do soon:
  - Writing the UI. (Maybe the conceptspace MVP is in-theory done? But not really tested, even manually; I don't trust the UI at all yet.) We just added Vitest + Testing Library, but haven't written any UI tests yet.
  - Generative testing. There's an early attempt at fake-data generation in hardhat/fake-data-generation, but I don't know how well it works or how complete it is; it'd be reasonable to blow it away and start over.
    - Once we have this, it'd be cool to generate a bunch of user actions and run them through the sdk (using the same setup we're currently using for the integration-tests), just as a smoke test to see if anything catches fire.
  - Implement the Implication Attester AI service.
  - Set up deployment for testnet and mainnet.

## Miscellaneous TODO.md files

- [ui/todo.md](ui/todo.md)
