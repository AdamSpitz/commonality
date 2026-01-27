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

## Migration from old format

The old statement format looked like:
```json
{
  "statementType": "statement",
  "content": "...",
  "references": [{ "statementId": "...", "label": "...", "relationship": "..." }],
  "metadata": { "title": "...", "createdDate": "..." }
}
```

The indexer should support both formats during the transition period:
- If a document has a `format` field → treat as displayable document (new format)
- If a document has a `statementType` field but no `format` → treat as legacy statement

## Reference syntax in content

In `markdown-restricted` format, references use `[text](ref:N)` syntax per the displayable-documents spec.

For backward compatibility with old statements using `{ref:0}` placeholders, renderers should treat both syntaxes equivalently during the transition.

## Conceptspace-specific extras

The following `extras` fields are recognized by Conceptspace:
- `statementType`: (string) Always "statement" for now; reserved for future schema variations
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

## Users can keep a list of saved statements

We've got a smart contract called MutableRefUpdater, which we're going to use to let each user store a mutable ref whose value is the IPFS CID of some JSON containing a list of statement CIDs that he wants to hold on to.

The motivation is I'm thinking specifically of the workflow where a user uses the UI to create a statement that he doesn't want to sign himself (which is a perfectly reasonable thing to do - it should be totally fine for a user to create statements that he doesn't personally believe). He creates the statement, and then maybe he wants to do something else with the statement, like reference it somewhere else... except how does he even find the statement again?

I mean, maybe the Create Statement workflow ends with the browser pointing at the statement's page. But if he closes that page and then comes back to the UI later, expecting to be able to find the statement he created... it just won't be there. It won't show up on the Statements I've Signed page.

So the idea is to have some sort of list of "here's the statements this user has created/saved", kept in a mutable ref onchain.
