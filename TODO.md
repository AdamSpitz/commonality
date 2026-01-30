# What we've been working on lately

Main thing I want to work on next:
  - Decoupling and generalizing some pieces of the system. See [specs/decoupling.md](specs/decoupling.md). **Displayable-documents is now complete** (see below).

Displayable documents — ~~next steps~~ COMPLETE (Jan 2026):
  - ~~**Renderer component (UI):**~~ Done. StatementRenderer renders DisplayableDocument format (text/plain and markdown-restricted).
  - ~~**Save/load helpers (SDK):**~~ Done. `publishDocument` and `fetchDocument` in `sdk/src/displayable-document.ts`.
  - ~~**Statement creation flow:**~~ Done. `createAndSignStatement()` accepts `DisplayableDocument`, CreateStatementForm uses `createStatement()`.
  - ~~**Indexer awareness:**~~ Done. `fetchStatementContent()` detects and parses DisplayableDocument format.
  - ~~**Remove legacy StatementContent backward compatibility:**~~ Done. All legacy code removed:
    1. ~~All integration tests migrated to use `createStatement()` / DisplayableDocument.~~
    2. ~~`LegacyStatementRenderer` component removed from `StatementRenderer.tsx`.~~
    3. ~~`StatementContent` union removed from `createAndSignStatement()` parameter type.~~
    4. ~~Legacy StatementContent detection removed from indexer's `fetchStatementContent()`.~~
    5. ~~`StatementContent` interface removed from SDK.~~
    6. ~~`StatementPage.tsx` and `workflow-actions-checked.ts` updated to use only `DisplayableDocument`.~~

The entire codebase now uses DisplayableDocument format exclusively. No backward compatibility code remains.

Other big things to do soon:
  - Writing the UI. (Maybe the conceptspace MVP is in-theory done? But not really tested, even manually; I don't trust the UI at all yet.) We just added Vitest + Testing Library, but haven't written any UI tests yet.
  - Generative testing. There's an early attempt at fake-data generation in hardhat/fake-data-generation, but I don't know how well it works or how complete it is; it'd be reasonable to blow it away and start over.
    - Once we have this, it'd be cool to generate a bunch of user actions and run them through the sdk (using the same setup we're currently using for the integration-tests), just as a smoke test to see if anything catches fire.
  - Implement the Implication Attester AI service.
  - Set up deployment for testnet and mainnet.

## Miscellaneous TODO.md files

- [ui/todo.md](ui/todo.md)
