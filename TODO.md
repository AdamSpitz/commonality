# What we've been working on lately

Main thing I want to work on next:
  - Decoupling and generalizing some pieces of the system. See [specs/decoupling.md](specs/decoupling.md). Displayable-documents is done (see below); next cleanup task is removing the unnecessary legacy backward compatibility.

Displayable documents — next steps:
  - ~~**Renderer component (UI):**~~ Done. StatementRenderer now handles both DisplayableDocument and legacy StatementContent.
  - ~~**Save/load helpers (SDK):**~~ Done. `publishDocument` and `fetchDocument` in `sdk/src/displayable-document.ts`.
  - ~~**Statement creation flow:**~~ Done. `createAndSignStatement()` now accepts `DisplayableDocument`, CreateStatementForm uses `createStatement()`, and integration tests use the new format.
  - ~~**Indexer awareness:**~~ Done. `fetchStatementContent()` now detects both DisplayableDocument (has `format` field) and legacy StatementContent (has `statementType` but no `format`), extracting `statementType` from `extras` for new format and `metadata.title` for legacy. Excerpt generation works for both.
  - **Remove unnecessary legacy StatementContent backward compatibility.** The project hasn't been deployed (see README: "don't worry about backward compatibility"), yet the implementation added backward-compat code in several places. Additionally, many integration tests were never migrated to use `createStatement()` / DisplayableDocument. Cleanup involves (unless these are already done? check, because I'm not sure exactly how far we've gotten in this process):
    1. Migrate remaining integration tests to produce DisplayableDocuments via `createStatement()` instead of legacy `{ statementType: 'text', text: '...' }` objects. (Affects ~15 test files across conceptspace/, fundingportal/, delegation/, mutable-refs/, workflows/.)
    2. Remove the `LegacyStatementRenderer` component from `StatementRenderer.tsx` (and the `isDisplayableDocument` branch that dispatches to it).
    3. Remove the `StatementContent` union from `createAndSignStatement()` parameter type and the legacy `uploadToIPFS` fallback branch in `conceptspace-actions.ts`.
    4. Remove the legacy StatementContent detection branch from the indexer's `fetchStatementContent()` in `indexer/src/conceptspace/utils/ipfs.ts`.
    5. Remove the `StatementContent` interface from `sdk/src/graphql-queries/conceptspace.ts` and update all union types (`StatementContent | DisplayableDocument`) to just `DisplayableDocument`.
    6. Update `StatementPage.tsx` and `workflow-actions-checked.ts` to remove `StatementContent` unions.

Other big things to do soon:
  - Writing the UI. (Maybe the conceptspace MVP is in-theory done? But not really tested, even manually; I don't trust the UI at all yet.) We just added Vitest + Testing Library, but haven't written any UI tests yet.
  - Generative testing. There's an early attempt at fake-data generation in hardhat/fake-data-generation, but I don't know how well it works or how complete it is; it'd be reasonable to blow it away and start over.
    - Once we have this, it'd be cool to generate a bunch of user actions and run them through the sdk (using the same setup we're currently using for the integration-tests), just as a smoke test to see if anything catches fire.
  - Implement the Implication Attester AI service.
  - Set up deployment for testnet and mainnet.

## Miscellaneous TODO.md files

- [ui/todo.md](ui/todo.md)
