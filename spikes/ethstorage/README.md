# Spike 1b: is EthStorage a credible long-term byte layer?

Status: **Tier A desk checks run 2026-08-01; Tier B/C not started.**
Provisional verdict: **not adoptable as the canonical byte layer today.** See
[Conclusion](#conclusion-2026-08-01).

This tests the second retrieval candidate in
[`specs/tech/indexer/the-graph.md`](../../specs/tech/indexer/the-graph.md): can a user upload
content to EthStorage, pay once, and have a browser retrieve and hash-verify it later — without
Commonality becoming the uploader, payer or host?

The checks are tiered so the cheap ones can kill the candidate before anyone writes code.
Tier A is desk research against published docs and contract source. Tier B needs a testnet.
Tier C is our own design work regardless of what EthStorage does.

## Tier A — desk checks (run 2026-08-01)

Sources are the [docs](https://docs.ethstorage.io/), the
[Information page](https://docs.ethstorage.io/information), the
[Mainnet Alpha announcement](https://blog.ethstorage.io/ethstorage-mainnet-alpha-launch-petabyte-scale-decentralized-storage-on-ethereum/),
and [`storage-contracts-v1`](https://github.com/ethstorage/storage-contracts-v1).

### A1. Is there a production network, and on what chain? — **Yes, but not on Base**

| Network | Chain ID | L1 | Storage contract |
|---|---:|---|---|
| EthStorage Mainnet | 333 | Ethereum Mainnet | `0xf0193d6E8fc186e77b6E63af4151db07524f6a7A` |
| Public Testnet | 3333 | Sepolia | `0xAb3d380A268d088BA21Eb313c1C23F3BEC5cfe93` |
| QuarkChain L2 Beta | 3337 | QuarkChain L2 Beta | `0x64003adbdf3014f7E38FC6BE752EB047b95da89A` |

Mainnet Alpha launched **2025-10-14**. Versions at time of checking: `storage-contracts-v1`
v0.2.1, `es-node` v0.2.10.

**There is no Base deployment.** Commonality publishes on Base, so under this design a user would
upload on one chain and publish the pointer on another. Both are ETH-denominated (no bridge token,
no new asset), which is the good news; the bad news is the user needs a funded balance on two
chains and the UI must sequence two transactions across them, with the upload confirmed and
verifiably readable before the Base pointer is emitted.

`EthStorageContractM2L2` exists specifically to support L2 deployment with bridged randomness, so
a Base deployment is architecturally possible — but it is not ours to schedule, and betting the
byte layer on someone else's deployment roadmap is not a plan.

Note that **this failure is chain-dependent, not a property of EthStorage.** Because EthStorage
Mainnet is deployed on Ethereum L1, A1 disappears entirely if Commonality is on L1, leaving only
A4. That is one input into the open question in
[`specs/tech/l1-vs-l2.md`](../../specs/tech/l1-vs-l2.md); re-run this check against whatever chain
that question settles on.

### A2. What is promised, for how long, and funded by what? — **ETH-only, pay-once, perpetuity is a model**

No token: fees are paid in ETH. Users pay `upfrontPayment()` per new key; updates to an existing
key do not re-charge.

The perpetuity claim rests on a discounted cash flow model in `DecentralizedKV.sol` — a
**0.85 yearly discount factor**, with `_paymentInf()` computing the present value of an infinite
payment stream. Storage providers are then paid out of that pool over time via on-chain fee
distribution, each replica expecting `1/m` of fees for `m` physical replicas.

This is an honest and reasonably elegant design, but it should be described accurately: *perpetual
storage is a present-value argument, not a guarantee.* It assumes storage costs keep falling at
roughly the discount rate and that the provider market stays competitive. If either assumption
breaks, the pool underfunds retention decades out. That is a better answer than "providers keep it
while it's profitable," and a weaker one than Arweave's endowment framing is usually given credit
for — both are the same species of argument.

### A3. Who owns a key, and who can delete it? — **The calling contract owns it; delete exists and refunds**

Keys are namespaced by caller:

```solidity
mstore(0x00, caller())
mstore(0x20, b)
skey := keccak256(0x00, 0x40)
```

Since users reach EthStorage through an application contract, **the app contract's address is the
namespace owner**, and its code decides who may write or overwrite a key. `remove(bytes32 _key)`
exists and delegates to `removeTo(_key, msg.sender)`, refunding prepaid value to a recipient —
so deletion is real, and it ends the provider's retention obligation by withdrawing the money that
funds it.

This is the most interesting finding, because **it is our choice**. An app contract with no
delete path and write-once keys has no removal lever at all. One that exposes `remove` gives
whoever holds that right a working takedown lever over stored content.

Per [statement-hosting.md § Role vs. capability](../../specs/product/legal/statement-hosting.md#role-vs-capability-why-we-built-it-so-we-cant-comply-cuts-both-ways),
holding the lever is what attaches the duty. Writing a contract with no delete function is
therefore the posture-consistent choice — and unlike deleting a capability from an operated
service, it is a property of an immutable contract rather than engineered incapacity inside a role
we keep. This needs a proper read against the legal directory before it is settled; it is flagged
here, not decided.

Integrity must not depend on any of this. Overwrite with different bytes fails hash verification
against `dataId`, so write-once is defence in depth, never the source of immutability.

### A4. Are retrieval endpoints a chokepoint? — **Yes, today**

Every documented read path is project-operated:

- JSON-RPC: `rpc.mainnet.ethstorage.io:9545`, `rpc2.mainnet.ethstorage.io:9548`
- Blob archiver API: `archive.mainnet.ethstorage.io:9645`
- `web3://` HTTP gateway: `<address>.<chainid>.w3link.io/<path>`

Note the non-standard ports, which are routinely blocked on corporate and mobile networks — a
practical browser-reachability problem independent of decentralization. CORS behaviour is
undocumented; es-node requires CORS to be explicitly enabled with a domain set, so whether the
public endpoints permit browser fetches is unverified.

More importantly, **storage provider participation is currently whitelisted.** The Mainnet Alpha
announcement says access expands to investors and ecosystem partners before a permissionless
model, with no date given. Anyone may run an es-node as an operator with mining disabled, so
independent retrieval is not forbidden — but the "many independent providers" property we would be
buying does not exist yet, and A4 cannot really be passed until it does.

## Conclusion (2026-08-01)

Two Tier A checks fail against what this design needs:

1. **No Base deployment (A1)** — publication and storage land on different chains, doubling the
   user's funded-balance and transaction burden at exactly the step where our whole posture
   argument depends on the *user* comfortably doing it themselves.
2. **Whitelisted providers and project-operated read endpoints (A4)** — the durability and
   independence we would be adopting EthStorage *for* are roadmap items, not current properties.

Per the decision rule in `the-graph.md`, EthStorage is worth adopting only if it beats calldata on
explicit long-term retention and on avoiding nested-call decoding. It plausibly wins the second
outright. It does not yet clearly win the first: an archive RPC serving Base transaction history is
today a *more* proven retrieval assumption than a ten-month-old alpha network with a whitelisted
provider set and one project-operated gateway.

**Recommended:** keep calldata as the canonical byte layer, finish the nested-call work in
[spike 1](../the-graph-calldata/README.md), and treat EthStorage as source-agnostic mirror #2
whose `dataId` verification already works for free. Re-run these checks when providers go
permissionless or a Base deployment appears — A2 and A3 both came back **fine**, so the candidate
is blocked on maturity, not on design.

Do not run Tier B until A1 or A4 changes; the measurements would be of a network we could not use.

## Tier B — hands-on spike (blocked on A1/A4)

- [ ] **B1. Cost and size at our real document sizes.** Blob values cap at 131,072 bytes; the SDK
      chunks above that, which splits one `dataId` across several keys and needs a manifest with
      its own content-addressed identity. Establish where our documents actually fall first — if
      everything fits in one blob, this problem disappears. Only mainnet pricing counts; the
      published 52.6 KB ≈ 0.0015 ETH figure is Sepolia.
- [ ] **B2. Upload-to-readable delay.** Docs warn data "may take a few seconds to sync after
      upload." Measure to a *second, independent* endpoint. This delay is the publish latency the
      user feels, because the UI must not emit the pointer until a verified read succeeds.
- [ ] **B3. Cold-page fanout.** A real board and statement-detail page, cold cache — wall-clock and
      request count, directly comparable to spike 1's 0.2–0.3 s calldata numbers.
- [ ] **B4. Both failure directions.** Upload succeeds / pointer fails (confirm the orphan is
      harmless and a retry reuses the key). Pointer succeeds / bytes never readable (confirm anyone
      can re-upload identical bytes under the same key and heal it — this is what makes mirroring
      possible without us hosting).
- [ ] **B5. Browser wallet, user-paid, no relayer.** The SDK requires a private key for upload and
      supports a credential-free download-only instance. A real MetaMask/smart-account upload path
      is unproven; if it needs a held key or a funded relayer, the design does not fit.

## Tier C — our design questions regardless

- [ ] **C1. Delete or no delete in the app contract** (see A3) — needs a legal-directory read.
- [ ] **C2. Fallback ordering on a `dataId` miss** — EthStorage → IPFS mirror → calldata → local
      cache, verifying at each source. Decide whether calldata stays permanently as belt-and-braces
      (it is free if the bytes are in the transaction anyway).
- [ ] **C3. No erasure, and say so explicitly.** EthStorage deliberately replicates Article 9 bytes
      across providers who never consented. Same analysis as the chain, and the posture claim is
      that publication is *user-initiated* — which loops back to A1, because a two-chain flow the
      user cannot realistically complete alone is one we would end up smoothing.

## Comparison benchmark

Whatever the outcome, compare the resulting user flow and durability assumptions against **one
direct, user-paid Arweave upload**. Arweave has the more mature pay-once story; its cost here is a
separate network, wallet and token. A Commonality-operated uploader on either network would
recreate the role this design exists to shed.
