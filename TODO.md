# What we've been working on lately

Main thing I want to work on next:
  - Decoupling and generalizing some pieces of the system. See [specs/decoupling.md](specs/decoupling.md). Maybe try working on displayable-documents? I think we've already got a high-level spec for it.

Displayable documents — next steps:
  - **Renderer component (UI):** A React component that takes a DisplayableDocument and renders it according to the spec rules: render content by format (plain text or restricted markdown via react-markdown), resolve `asset:key` references from the assets object, resolve `ref:N` links from references, display extras in full (collapsible JSON or key-value table), and show any unknown fields as raw JSON. Sanitize aggressively.
  - **Save/load helpers (SDK):** Wire displayable-document creation to the existing IPFS upload/fetch utilities in `sdk/src/actions/common.ts`. Something like `publishDocument(doc) → CID` (canonical-JSON-encode, upload, return CID) and `fetchDocument(cid) → DisplayableDocument` (fetch, parse, validate). The IPFS primitives exist; this is just the typed glue.
  - **Statement creation flow:** Update the UI's statement creation to produce displayable documents (using `createStatement()`) and publish them via the new helpers, replacing the old statement format.
  - **Indexer awareness:** The indexer already fetches and caches IPFS content. It may need updates to parse the new displayable-document format for excerpt generation and search indexing (vs. the legacy statement format). The dual-format detection logic is described in `specs/statements.md`.

Other big things to do soon:
  - Writing the UI. (Maybe the conceptspace MVP is in-theory done? But not really tested, even manually; I don't trust the UI at all yet.)
  - Generative testing. There's an early attempt at fake-data generation in hardhat/fake-data-generation, but I don't know how well it works or how complete it is; it'd be reasonable to blow it away and start over.
    - Once we have this, it'd be cool to generate a bunch of user actions and run them through the sdk (using the same setup we're currently using for the integration-tests), just as a smoke test to see if anything catches fire.
  - Implement the Implication Attester AI service.
  - Set up deployment for testnet and mainnet.

## Miscellaneous TODO.md files

- [ui/todo.md](ui/todo.md)
