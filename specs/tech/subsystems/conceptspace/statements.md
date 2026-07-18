# Statements

A statement is the basic Conceptspace object: a short, content-addressed claim that users can sign, inspect, and connect to other statements.

Statements intentionally avoid structured metadata in the core protocol. Meaning comes from the text itself plus attestations, implications, nudges, and the surrounding UI context.

Statement content currently lives on IPFS, pinned by us. There is a proposal ([self-published-statements.md](self-published-statements.md)) to have authors self-publish statement bytes in the calldata of their own signing transaction, demoting IPFS to an optional retrieval cache; the legal motivation is in [statement-hosting.md](/specs/product/legal/statement-hosting.md).
