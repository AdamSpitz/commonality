# Statements

A statement is the basic Conceptspace object: a short, content-addressed claim that users can sign, inspect, and connect to other statements.

Statements intentionally avoid structured metadata in the core protocol. Meaning comes from the text itself plus attestations, implications, nudges, and the surrounding UI context.

Statement content is identified by its CID. New statement publication routes through the shared [PublishedData subsystem](../published-data/README.md): authors self-publish the statement bytes in calldata, and readers use the CID-first document seam with legacy IPFS fallback only for pre-migration data. The legal motivation is in [statement-hosting.md](/specs/product/legal/statement-hosting.md).
