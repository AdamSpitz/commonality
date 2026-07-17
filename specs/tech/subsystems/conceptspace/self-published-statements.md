# Self-published statements (calldata in the signing transaction)

Status: **proposed / not yet scheduled** (Jul 2026). This is a design direction, not a commitment. The legal motivation lives in [specs/product/legal/statement-hosting.md](/specs/product/legal/statement-hosting.md); this file is the technical side.

## The idea

Today, statement content lives on IPFS and *we* pin it. The proposal: the statement's bytes ride in the **calldata of the author's own first signing transaction** — the same transaction that emits `DirectSupport`. The user's single act, signed with their key and paid with their funds, simultaneously authors, publishes, and attests belief in the statement. No intermediary occupies the publish path: no pinning node we run, no upload service, no storage account we fund.

This is the well-proven "inscription" pattern (Ethscriptions, Ordinals). Statements are a few KB of markdown; on an L2 that costs cents or less.

## Why the transaction, and not a storage network

The legal analysis (see [statement-hosting.md](/specs/product/legal/statement-hosting.md)) wants the *author* — not us, not the vertical — to be the publisher and host of each statement. The storage options divide on one axis that turns out to be decisive: **pay-once vs. rent.**

- **Rent-based storage recreates the role we're trying to vacate.** IPFS pinning, Swarm postage stamps, and Filecoin deals all require an *ongoing payer*. Someone must keep paying for each statement, and "the operator tops it up for convenience" puts us right back in the hosting seat. Swarm is alive but niche (active Bee development, thin adoption); Filecoin deals expire and need renewal. Neither changes the legal shape.
- **Pay-once storage lets the user's single act complete everything.** Arweave has the right semantics but is outside the Ethereum ecosystem and — critically — if *we* did the uploading, permanence at a layer we operate is actively bad (see the "engineered incapacity" analysis in statement-hosting.md). Calldata has pay-once semantics natively, inside the same transaction that signals belief.
- **Blobs (EIP-4844) directly: no.** They expire after ~18 days by design.
- **EthStorage: the watch-list upgrade path.** A storage L2 where data is posted via blob transactions and then permanently replicated by incentivized storage providers (~0.1% of L1 cost; Optimism grant to serve as long-term DA backstop for OP Stack chains). It reached Mainnet Alpha in 2026 — the closest Ethereum-native Arweave analog, but too young to make load-bearing yet. Natural future home if statements outgrow calldata.

## Design sketch

- **Identity stays CID-shaped.** The client computes the IPFS-style CID of the content locally, the contract event carries the CID (as today), and the bytes are recoverable from the transaction by anyone. Nothing downstream of the event schema needs to change its notion of statement identity.
- **Publish and sign are one act.** [statement-discovery.md](statement-discovery.md) already discovers statements via `DirectSupport` events rather than a `StatementCreated` event, so this just makes the storage follow the shape the discovery design already has. The first `DirectSupport` for a statement carries the content; later signers reference the CID only.
- **IPFS is demoted from canonical storage to optional retrieval cache.** Verticals pin the statements they curate (their core statement S, their seed cluster, their explorer's curated-collection entries); authors and communities pin whatever they care about; published pin-lists invite re-pinning. Nobody's pin is load-bearing for availability, and each pinner's pins match their editorial exposure.
- **Indexers cache content from history.** Each operator's indexer (already intended to be operator-scoped — see [ui-operator-posture.md](/specs/product/ui-operator-posture.md)) fetches statement bytes from chain history for the statements it recognizes, and serves them to its UI. Re-serving is that operator's curated display act, subject to its denylist.

## Honest caveats

- **Chain history is socially, not cryptographically, permanent — and getting more prunable.** Partial history expiry (EIP-4444) went live for pre-merge data in 2025, with rolling-window expiry planned in a 2026 hardfork; long-term retrieval shifts to archive nodes and the Portal Network. On an L2 it's a notch weaker still: the L1 blobs the L2 posts expire after ~18 days, so durability rests on L2 nodes retaining their own history. In practice, many independent parties (including every vertical's indexer and pinner) retain the statements anyone cares about. Note that the *legal* story doesn't depend on permanence at all — it depends on who published.
- **Informed consent is required UX.** Permanence becomes the user's choice, but the composer flow must actually inform it: "this cannot be deleted — by us, by you, by anyone." That converts the privacy downside of permanence from our design decision into the user's disclosed choice.
- **Gas sponsorship would undo the point.** If an operator sponsors the publish transaction, it's back on the facilitation surface ([political-funding.md](/specs/product/legal/political-funding.md) in-kind angle). Users paying their own gas to publish their own beliefs is both the cleanest legal fact and decent spam resistance.
- **The composer tool is a residual role.** Someone still runs the UI where users write statements. Providing a tool is far better than publishing — the user signs and pays — but an LLM that *drafts* statement text has a co-authorship flavor. The existing principle from [explorer.md](explorer.md) ("the LLM never generates statement text directly — it references existing statements by CID, or creates a new statement and then references it" — and statement creation surfaces the text for the *user* to sign) is doing quiet legal work; keep it.

## What would need to change

1. The statement-creation flow: build content into the signing transaction's calldata instead of (or alongside) uploading to IPFS; compute the CID client-side.
2. Contract surface: the `Beliefs` signing path needs a variant that accepts the content bytes (or they ride as extra calldata the contract ignores — Ethscriptions-style — with the event still carrying the CID). Decide whether the contract should verify content-hash-matches-CID on-chain or leave verification to indexers.
3. Indexers: learn to extract statement bytes from transaction calldata for the statements they index, falling back to IPFS gateways for legacy statements.
4. Pinning posture: publish pin-lists; verticals pin what they curate; drop the assumption that "we pin everything."
