# Displayable Documents

A general-purpose system for immutable, displayable content. Designed for use cases where users sign or attest to documents and need confidence that what they see is exactly what they're signing.

## Core Principles

**Display-first**: The document IS the displayable content, not structured data that gets converted to a display format. This ensures signers see everything they're attesting to.

**Everything visible**: The renderer MUST display every field in the document. Unknown fields are shown as raw JSON. Nothing is hidden.

**Immutable references only**: Documents cannot reference external mutable resources (no `https://` image URLs, etc.). All references must be to content-addressed data (by CID) or embedded inline.

## Document Structure

```json
{
  "format": "markdown-restricted",
  "content": "The actual displayable content...",
  "assets": { ... },
  "references": [ ... ],
  "extras": { ... }
}
```

### Required Fields

- `format`: The display format. MVP supports `text/plain` and `markdown-restricted`.
- `content`: The primary displayable content (string).

### Optional Fields

- `assets`: Named binary assets (images, etc.) referenced from content.
- `references`: Array of CID links to other documents.
- `extras`: Freeform structured data. Always displayed in full by the renderer.

## Display Formats

### `text/plain`

Plain text. Rendered as-is, preserving whitespace.

### `markdown-restricted`

Standard Markdown with restrictions to ensure immutability:

**Allowed:**
- All standard Markdown syntax (headings, lists, emphasis, code blocks, etc.)
- Asset references: `![alt](asset:key)` — references an entry in the `assets` object
- Document references: `[text](ref:N)` — references index N in the `references` array

**Forbidden:**
- External URLs: `![img](https://...)` or `[link](https://...)`
- Raw HTML with `src`, `href`, or similar attributes pointing to external resources

Renderers should sanitize aggressively. When in doubt, strip it out.

## Assets

Assets are binary data (images, etc.) that can be referenced from content.

```json
{
  "assets": {
    "header": {
      "mimeType": "image/png",
      "data": "base64encodeddata..."
    },
    "diagram": {
      "mimeType": "image/svg+xml",
      "cid": "bafyrei..."
    }
  }
}
```

Two embedding options:
- **Inline**: `data` field with base64-encoded content
- **By CID**: `cid` field referencing content-addressed storage

Size guidance: use CID references for assets over ~100KB to keep documents manageable.

## References

Links to other immutable documents:

```json
{
  "references": [
    { "cid": "bafyrei...", "label": "Related proposal" },
    { "cid": "bafyrei..." }
  ]
}
```

Referenced in content as `[link text](ref:0)`, `[other doc](ref:1)`, etc.

## Extras

Structured metadata that indexers or applications can use:

```json
{
  "extras": {
    "topic": "energy-policy",
    "sentiment": "supportive",
    "customField": { "nested": "data" }
  }
}
```

**Critical rule**: The renderer MUST display `extras` in its entirety. This could be a collapsible JSON viewer, a key-value table, or similar—but it cannot be hidden by default. The user must see everything they're signing.

Freeform for MVP. Future option: `extras.schema` field to declare structure for indexers.

## Rendering Rules

1. Render `content` according to `format`
2. Resolve `asset:key` references from `assets`
3. Resolve `ref:N` references from `references`
4. Display `extras` in full (as formatted JSON or similar)
5. Display any unknown top-level fields as raw JSON

If a referenced asset or document can't be loaded, show a placeholder with the CID/key and an error indicator—never silently omit.

## Identification

Documents are identified by their content hash (IPFS CID). Use canonical JSON encoding (sorted keys, no unnecessary whitespace, UTF-8) to ensure identical content produces identical CIDs.

## Relationship to Other Systems

This spec defines the displayable document format. Other systems (like conceptspace statements, attestations, etc.) can use these documents as their content layer.

### Current usage

- **Conceptspace statements**: See [statements.md](statements.md). A statement IS a displayable document; any conceptspace-specific metadata goes in the `extras` field.
- **Implication explanations**: When an AI attester publishes "S1 implies S2", the explanation can be a displayable document.
- **Project descriptions**: Pubstarter project descriptions could use this format.

### Architecture

The documentspace layer is just "immutable JSON identified by CID." This displayable-documents spec is a convention for documents meant to be rendered for humans, with the critical property that everything is visible to signers.

This separation enables:
- Generic tooling (validators, renderers) that works across all applications
- Applications can add domain-specific semantics via `extras` without changing the core format
- Legal separation: the displayable-documents layer has nothing to do with tokens/funding

## Progress

**VERIFIED COMPLETE** (January 2026)

The displayable-documents system has been fully implemented and is now the sole document format throughout the codebase:

✅ **SDK Foundation**
- Types: `DisplayableDocument`, `DisplayFormat`, `Asset`, `DocumentReference` (sdk/src/displayable-document.ts)
- Creation: `createDisplayableDocument()`, `createStatement()` helper
- Validation: `validateDisplayableDocument()` with comprehensive checks
- Canonical JSON: `toCanonicalJson()` for deterministic CID generation
- IPFS integration: `publishDocument()`, `fetchDocument()`
- 72 unit tests covering all functionality

✅ **UI Renderer** (ui/src/conceptspace/components/StatementRenderer.tsx)
- Format support: `text/plain`, `markdown-restricted`
- Asset resolution: inline base64 and CID-based
- Reference resolution: `[text](ref:N)` → router links
- Extras display: full JSON rendering (per spec requirement)
- Unknown fields: displayed as raw JSON (per spec requirement)
- Error handling: placeholders for missing assets/refs (never silent omission)

✅ **Statement Creation Flow**
- UI uses `createStatement()` SDK helper
- Produces DisplayableDocument format exclusively
- `createAndSignStatement()` uses `publishDocument()` for canonical encoding
- Integration tests updated to new format

✅ **Indexer Support** (indexer/src/conceptspace/utils/ipfs.ts)
- Parses DisplayableDocument format
- Extracts text content, statement type from extras
- Generates search excerpts

✅ **Legacy Cleanup**
- `StatementContent` interface removed from SDK
- Legacy rendering code removed from UI
- Legacy detection removed from indexer
- All 102 integration tests migrated to DisplayableDocument
- All feedback loops pass (72 SDK tests, 243 hardhat tests, 102 integration tests)

✅ **Decoupling Achieved**
- Displayable documents are now a standalone, generic layer
- Statements are simply displayable documents (per specs/statements.md)
- Domain-specific metadata lives in `extras` field
- No coupling to token/funding contracts
- Reusable for other use cases (implication explanations, project descriptions, etc.)
