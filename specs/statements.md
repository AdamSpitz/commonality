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

## Users can keep a list of saved statements

We've got a smart contract called MutableRefUpdater, which we're going to use to let each user store a mutable ref whose value is the IPFS CID of some JSON containing a list of statement CIDs that he wants to hold on to.

The motivation is I'm thinking specifically of the workflow where a user uses the UI to create a statement that he doesn't want to sign himself (which is a perfectly reasonable thing to do - it should be totally fine for a user to create statements that he doesn't personally believe). He creates the statement, and then maybe he wants to do something else with the statement, like reference it somewhere else... except how does he even find the statement again?

I mean, maybe the Create Statement workflow ends with the browser pointing at the statement's page. But if he closes that page and then comes back to the UI later, expecting to be able to find the statement he created... it just won't be there. It won't show up on the Statements I've Signed page.

So the idea is to have some sort of list of "here's the statements this user has created/saved", kept in a mutable ref onchain.
