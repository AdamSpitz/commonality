# Modelling statements

A Statement should be represented as a JSON document that we upload to IPFS.

Let's put a "statementType" field on it, so that in the future we can support different schemas. A statement's ID is the IPFS CID of this JSON document.

Statement schema (there's just one type for now):
```json
{
  "statementType": "statement",
  "content": "...",           // Markdown content
  "references": [...],        // Optional array of references to other statements
  "metadata": {...}           // Optional metadata (title, version, createdDate)
}
```

The `references` array (if present) contains objects like:
```json
{
  "statementId": "QmXyz...",           // IPFS CID of referenced statement
  "label": "...",                      // Optional human-readable label
  "relationship": "..."                // Optional: "supports", "opposes", "alternative", "related"
}
```

The content can use placeholders like `{ref:0}`, `{ref:1}` etc. to reference items in the references array. This is useful for coalition-building (e.g., "I support either {ref:0} or {ref:1}") and finding common ground.

Important details:
  - Use canonical JSON formatting (sorted keys, no whitespace, UTF-8) so identical statements produce identical CIDs
  - Maximum content size: 50k characters
  - When rendering Markdown, sanitize to prevent XSS. Maybe use react-markdown and rehype-sanitize with strict schema? (I'm going on AI recommendation for that; I've never used those and don't know what they are.)
  - Handle circular references gracefully (limit expansion depth when expanding references)
  - If a statement CID can't be retrieved from IPFS or is invalid, still show the ID and support counts but display a warning
  - Indexers should pin any statement CIDs they encounter (to ensure availability) and optionally cache metadata (title, excerpt?) in the indexer's DB for search/display.
  - Let's use Pinata for IPFS storage and pinning, at least to start with. (We'll just pay for it ourselves for now.)
