# Conceptspace developer docs

**The problem it solves:** the same idea gets phrased a dozen different ways. If your app tallies support for the exact text of a statement, that support fragments across near-duplicates. Conceptspace lets you point at the *concept* instead of the words: an attester records an implication arrow from one statement to another, so many phrasings can count toward the same idea. That arrow is the whole primitive.

Everything else is machinery in service of that one idea: immutable statements, belief signatures, implication attestations, nudgers, trust settings, and the client-side folds that turn raw events into usable state.

End users should use **Tally** for statement signing and polling. This page is for developers integrating with the underlying primitives or maintaining the services that publish and consume Conceptspace data.

A worked, politically charged example: "I support universal background checks for gun purchases" clearly implies "gun purchases should be regulated," so an attester records that arrow. But "I want to reduce gun violence" implies no particular policy — it's too ambiguous, so the attester declines. When in doubt, the attester says no.


## 5-minute integration sketch

Here is what using Conceptspace looks like in practice. This is pseudocode — the real SDK is TypeScript and the calls are async — but it shows the shape of the work.

### 1. Publish a statement

A statement is just a JSON document. Its IPFS CID becomes its permanent ID.

```typescript
const statement = {
  text: "Public libraries should stay free.",
  author: "0x...",
  timestamp: Date.now(),
};

const cid = await sdk.ipfs.upload(statement);
// cid is now the statement ID forever
```

### 2. Record a belief

Sign your support on-chain through the Beliefs contract.

```typescript
await sdk.beliefs.sign(cid);   // or .unsign(cid), .noop(cid)
```

The contract emits an event. The shared indexer caches it. Your signature is public and permanent, but your *current* standing is revocable.

### 3. Read and fold events

The indexer stores raw events. The SDK reconstructs state client-side.

```typescript
const events = await sdk.indexer.fetchBeliefEvents({ statementCid: cid });
const state = sdk.fold.beliefs(events);
// state.directSupport === 347
// state.indirectSupport === 1204  // via implications
```

### 4. Filter through attesters

Implications are published by attesters. You choose whose attestations count.

```typescript
const myTrustedAttesters = await sdk.trust.getTrustedAttesters(userAddress);
const implications = await sdk.indexer.fetchImplications(cid);
const valid = implications.filter(i => myTrustedAttesters.includes(i.attester));
const support = sdk.fold.support(cid, valid);
```

### 5. React to the result

Use the folded state in your UI or downstream logic.

```typescript
console.log(`${support.direct} direct, ${support.indirect} indirect`);
```

That is the whole loop: publish → sign → fetch → fold → filter → display. No central database owns the truth; the chain and your chosen attesters do.


## Public developer docs

These docs explain the system for developers who want to understand or build on it.

- **System overview:** `specs/tech/subsystems/conceptspace/README.md` — the statement / belief / implication model and links to the rest of the subsystem specs.
- **Queries and actions:** `specs/tech/subsystems/conceptspace/queries-and-actions.md` — the user-facing operations the SDK and UI need to support.
- **Statement schema:** `specs/tech/subsystems/conceptspace/statements.md` and `displayable-documents.md` — the content-addressed document format used for signable statements.
- **Indexer model:** `specs/tech/subsystems/conceptspace/indexer.md` — how raw chain events are cached and folded client-side.
- **Implication discovery:** `specs/tech/subsystems/conceptspace/implication-discovery.md` and `implication-attester-ai.md` — how implication links are discovered and published.
- **Nudgers:** `specs/tech/subsystems/conceptspace/nudges.md` — signed off-chain suggestions such as "you might also believe this statement."


## API and contract reference

- **SDK API docs:** [sdk/docs/api/](https://github.com/AdamSpitz/commonality/tree/master/sdk/docs/api) — the generated TypeScript SDK reference.
- **Contract docs:** [hardhat/docs/](https://github.com/AdamSpitz/commonality/tree/master/hardhat/docs) — the generated Solidity contract reference.
- **Implementation packages:** `sdk/`, `hardhat/`, `indexer/`, `attester-core/`, `implication-attester/`, `finder-core/`, `implication-finder/`, `nudger-core/`, `implication-graph-nudger/`, `bridge-creator/`, and `explorer-curator/` — code-level READMEs for each layer.

### Reference service repositories

You don't have to trust our services — anyone can run their own. These are the reference implementations:

- **Implication attester:** [`implication-attester/`](https://gitlab.com/AdamSpitz/commonality/-/tree/main/implication-attester) — publishes the implication arrows.
- **Implication finder:** [`implication-finder/`](https://gitlab.com/AdamSpitz/commonality/-/tree/main/implication-finder) — uses AI to surface candidate implications for an attester to confirm.
- **Sample nudger:** [`implication-graph-nudger/`](https://gitlab.com/AdamSpitz/commonality/-/tree/main/implication-graph-nudger) — emits signed "you might also believe this" suggestions.


## What to build on

Use Conceptspace when another product needs durable public claims and transparent support data:

1. Upload a displayable statement document to IPFS. Its CID is the statement ID.
2. Record belief / disbelief / no-opinion changes through the Beliefs contract.
3. Read raw events from the shared event cache.
4. Fold those events in the SDK to compute direct support, indirect support, and per-user belief state.
5. Filter implication and nudge data through user-selected attesters and nudgers instead of treating AI output as centrally authoritative.

The important design constraint: implications are **not transitive**. If `S1 → S2` and `S2 → S3`, clients must not infer `S1 → S3` unless an attester published that direct implication too.
