# Modelling statements

A Statement in Conceptspace is simply a **displayable document** (see [displayable-documents.md](displayable-documents.md)) that someone might want to sign/believe. A statement's ID is its IPFS CID.

## Relationship to Displayable Documents

The displayable-documents spec provides the generic foundation:
- `format`: how to render the content (e.g., `markdown-restricted`)
- `content`: the actual text
- `assets`: embedded images etc.
- `references`: links to other documents
- `extras`: application-specific metadata

For Conceptspace statements, we use the `extras` field for any domain-specific data. For example:

```json
{
  "format": "markdown-restricted",
  "content": "Democracy requires active citizen participation...",
  "references": [
    { "cid": "bafyrei...", "label": "Related proposal" }
  ],
  "extras": {
    "statementType": "statement",
    "topic": "governance",
    "createdDate": "2024-01-15T10:30:00Z"
  }
}
```

## Reference syntax in content

In `markdown-restricted` format, references use `[text](ref:N)` syntax per the displayable-documents spec.

For backward compatibility with old statements using `{ref:0}` placeholders, renderers should treat both syntaxes equivalently during the transition.

## Conceptspace-specific extras

The following `extras` fields are recognized by Conceptspace:
- `statementType`: (string) Always "statement" for now (wait, is this true? I think I see some places in the code base that say statementType: 'text', though those are all just in tests; there's also 'conceptspace' in some tests; also some places that talk about 'simple' | 'disjunction' | 'conjunction'); reserved for future schema variations
- `topic`: (string) Optional topic/category hint for indexers
- `createdDate`: (ISO 8601 string) When the statement was authored

Indexers may extract these for search/filtering, but per the displayable-documents principle, `extras` MUST always be shown in full to users viewing the document.

## Important implementation details

From displayable-documents.md, the key rules that apply to statements:
- Use canonical JSON (sorted keys, no whitespace, UTF-8) so identical content produces identical CIDs
- Maximum content size: 50k characters
- Sanitize markdown to prevent XSS
- All referenced content must be immutable (CIDs only, no http:// URLs)
- If a referenced document can't be fetched, show a placeholder with the CID, not silent omission
- Indexers should pin statement CIDs and cache display metadata (excerpt, believer counts)

## No structured semantic content

We considered adding structured metadata to statements (e.g. `{ "type": "conjunction", "components": ["cid1", "cid2"] }` in `extras`) so the system could machine-read semantic relationships like conjunctions, geographic hierarchies, or "multiple answers to the same question." We rejected this because:

- The implication attester is already an LLM that reads English and decides whether one statement implies another. Conjunction implications ("crypto in Grey County" implies "crypto") are trivially easy for it to evaluate.
- The explorer AI is also an LLM — it can compose conjunction statements as plain English and group related statements by topic without formal tags.
- Structured content creates a mismatch problem: the human-readable `content` and the machine-readable `extras.semantics` could disagree, and then you need validation machinery to keep them in sync.
- It's building a crummy mini-LLM out of JSON metadata when you already have actual LLMs doing the work.

Statements that represent conjunctions, positions on an issue, geographic interests, etc. are just regular statements written in plain English, connected to each other via implication links.

## Users can keep a list of saved statements

See [statements-list.md](statements-list.md).
