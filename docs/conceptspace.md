# Conceptspace developer docs

Conceptspace is the infrastructure layer shared by the Commonality sites: immutable statements, belief signatures, implication attestations, nudgers, trust settings, and the client-side folds that turn raw events into usable state.

End users should use **Tally** for statement signing and polling. This page is for developers integrating with the underlying primitives or maintaining the services that publish and consume Conceptspace data.

## Start here

- **System overview:** [`specs/tech/subsystems/conceptspace/README.md`](/specs/tech/subsystems/conceptspace/README.md) explains the statement / belief / implication model and links to the rest of the subsystem specs.
- **Queries and actions:** [`specs/tech/subsystems/conceptspace/queries-and-actions.md`](/specs/tech/subsystems/conceptspace/queries-and-actions.md) lists the user-facing operations the SDK and UI need to support.
- **Statement schema:** [`specs/tech/subsystems/conceptspace/statements.md`](/specs/tech/subsystems/conceptspace/statements.md) and [`displayable-documents.md`](/specs/tech/subsystems/conceptspace/displayable-documents.md) define the content-addressed document format used for signable statements.
- **Indexer model:** [`specs/tech/subsystems/conceptspace/indexer.md`](/specs/tech/subsystems/conceptspace/indexer.md) explains how raw chain events are cached and folded client-side.
- **Implication discovery:** [`specs/tech/subsystems/conceptspace/implication-discovery.md`](/specs/tech/subsystems/conceptspace/implication-discovery.md) and [`implication-attester-ai.md`](/specs/tech/subsystems/conceptspace/implication-attester-ai.md) describe how implication links are discovered and published.
- **Nudgers:** [`specs/tech/subsystems/conceptspace/hints.md`](/specs/tech/subsystems/conceptspace/hints.md) covers signed off-chain suggestions such as “you might also believe this statement.”

## API and contract reference

- **SDK API docs:** [`sdk/docs/api/`](/sdk/docs/api/) is the generated TypeScript SDK reference.
- **Contract docs:** [`hardhat/docs/index.md`](/hardhat/docs/index.md) is the generated Solidity contract reference.
- **Implementation packages:** `sdk/`, `hardhat/`, `indexer/`, `attester-core/`, `implication-attester/`, `finder-core/`, `implication-finder/`, `nudger-core/`, `implication-graph-nudger/`, `bridge-creator/`, and `explorer-curator/` contain the code-level READMEs for each layer.

## What to build on

Use Conceptspace when another product needs durable public claims and transparent support data:

1. Upload a displayable statement document to IPFS. Its CID is the statement ID.
2. Record belief / disbelief / no-opinion changes through the Beliefs contract.
3. Read raw events from the shared event cache.
4. Fold those events in the SDK to compute direct support, indirect support, and per-user belief state.
5. Filter implication and nudge data through user-selected attesters and nudgers instead of treating AI output as centrally authoritative.

The important design constraint: implications are **not transitive**. If `S1 → S2` and `S2 → S3`, clients must not infer `S1 → S3` unless an attester published that direct implication too.
