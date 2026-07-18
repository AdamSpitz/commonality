# Eliminating IPFS

Status: **analysis / not yet scheduled** (Jul 2026). Written as a follow-up to the statement-hosting posture work: [statement-hosting.md](/specs/product/legal/statement-hosting.md) (legal side) and [self-published-statements.md](subsystems/conceptspace/self-published-statements.md) (calldata design for statements). Those docs answer "how do statements stop being hosted by us?" This one asks the wider question: **what else do we use IPFS for, could each use be eliminated the same way, and could we drop the IPFS dependency altogether?**

Short answer: yes, essentially all of it, and the calldata design generalizes cleanly. The one genuine cost is images.

## Inventory: everything we currently put on IPFS

1. **Conceptspace statements** (`sdk/src/subsystems/conceptspace/actions.ts`) — the case the self-published-statements design already addresses.
2. **LazyGiving project metadata** (`ui/src/lazy-giving/pages/CreateProjectPage.tsx`) — project descriptions, plus per-token metadata and uploaded **images** (`uploadBlobToIPFS`, `ipfs://` image URIs).
3. **Content-funding contract metadata** (`ui/src/content-funding/pages/CreateContractPage.tsx`) — channel/creator assurance-contract descriptions.
4. **Our own editorial documents** — the fundingportal alignment-topic document (`sdk/src/subsystems/fundingportals/constants.ts`) and the CSM mission statement (`sdk/src/subsystems/conceptspace/constants.ts`).
5. **Mutable-refs lists** (`sdk/src/subsystems/mutable-refs/actions.ts`) — e.g. `created-statements`: an onchain ref points at an IPFS JSON list that is re-uploaded in full on each append.
6. **Nudger publications** (`nudger-core/src/signer.ts`) — nudge batches and curated explorer collections are uploaded to IPFS, with the CID anchored onchain via `publishNudgeBatch`.
7. **The UI builds themselves** — `scripts/deploy-ui.sh` pins each build to Pinata; the [cloudflare-ui-gateway](/cloudflare-ui-gateway/README.md) worker resolves IPNS → CID and proxies gateways. This is censorship resistance for the frontend, not content hosting.

## Case-by-case

### Statements — yes (already designed)

See [self-published-statements.md](subsystems/conceptspace/self-published-statements.md). Author-paid calldata inscription; IPFS demoted to optional retrieval cache.

### LazyGiving / content-funding metadata — mostly yes, same legal logic

These are *recipient/creator self-descriptions*. Having the project creator publish them in the calldata of their own registration transaction gives the same attribution win as for statements: the project, not us, is the publisher of its own pitch. Sizes are comparable to statements (a few KB of text). Two wrinkles:

- **Images are the real blocker.** A few hundred KB of image in calldata costs real money even post-4844. Options: cap/skip images; inline only small images; or accept that images remain a best-effort cache layer (IPFS or plain HTTPS, with a content hash recorded onchain) whose loss degrades display but not the system. This is the one content type where "eliminate IPFS entirely" has a genuine cost.
- **ERC1155 `tokenURI` interop** conventionally expects `ipfs://` or `https://` URIs for marketplace display. `data:` URIs are a known, valid pattern and would work — but whether marketplace display matters to us at all is an open product question (the LazyGiving de-crypto direction suggests maybe not).

### Our own editorial docs — trivially yes

We are the author and publisher anyway, so there's no legal reason for IPFS here. They can ride the same inscription path or simply be bundled/served from our own infra. Eliminating IPFS here is pure ops simplification, not posture.

### Mutable-refs lists — yes, and it's a simplification on its own merits

Instead of "upload new JSON list to IPFS, point the ref at the new CID," have the contract emit an event per appended item and let the indexer reconstruct the list. Cheaper per append (no re-upload of the whole list), and it deletes the fetch/parse/format-migration logic in `appendToUserList`. This is the easiest full elimination and worth doing regardless of the broader question.

### Nudger publications — yes, and arguably already decided

The nudges spec ([nudges.md](subsystems/conceptspace/nudges.md)) says nudges should be fully off-chain signed messages served via API — [mutable-refs/README.md](subsystems/mutable-refs/README.md) records rejecting onchain nudge feeds precisely so nudgers can retract bad suggestions without a permanent record. The `signer.ts` IPFS+anchor path coexists uneasily with that decision. Curated collections are our (or a vertical's) editorial speech; they can be inscribed in the anchoring transaction's calldata or just served from the vertical's API. Either way, IPFS isn't needed.

### UI hosting — separable; needs a deliberate decision

Publishing UI builds to IPFS has none of the hosted-speech downside (it's our own code), but it's the biggest *operational* IPFS dependency: the Pinata JWT (on the credential-scopedown list), w3name for IPNS, gateway flakiness, the Cloudflare worker. We could swap to conventional static hosting and keep IPFS publication as an optional community mirror rather than the serving path. The trade-off is giving up part of the "unstoppable frontend" story in [censorship-resistance.md](/docs/end-user/commonality/vision-and-strategy/hard-to-stop/censorship-resistance.md) — that should be a deliberate choice, not a side effect of a storage migration.

## The generalized posture

The publication mechanism itself is generalized into a single shared subsystem — one immutable `PublishedData` contract (publish-with-CID-verification, keyed by (publisher, cid), with retraction attestations) plus one SDK reader library — so statements, project metadata, contract metadata, and editorial docs all share one contract, one consent UX, one retraction story, and one indexer ingestion path. See [published-data/README.md](subsystems/published-data/README.md).

- **User-authored content** → author-paid calldata inscriptions through PublishedData (the self-published-statements pattern).
- **Our editorial content** → inscribed, or served from our own infra.
- **Mutable lists** → onchain events, reconstructed by the indexer.
- **UI hosting** → conventional hosting, with IPFS as an optional mirror.

CIDs can remain the identity scheme throughout: computed client-side, verifiable onchain, carried in events exactly as today. Nothing downstream changes its notion of content identity; the indexer's IPFS *gateway reads* become chain-history reads.

## What we'd still need / give up

- **An image policy** (no images / small-only inline / hash-anchored external hosting) — the one place pay-once storage is genuinely expensive.
- **Legacy-data migration**: indexers need calldata-first-with-gateway-fallback (self-published-statements.md, "What would need to change" item 3) until old CIDs are re-inscribed or abandoned. Testnet data is ephemeral, so switching before mainnet makes this nearly free.
- **The display/aggregation exposure doesn't move.** The denylist work from [statement-hosting.md](/specs/product/legal/statement-hosting.md) is unchanged regardless of storage layer.
- **Permanence has its own legal caveats, and they generalize.** The "ordered to take down but can't" trap, the GDPR special-category-data problem, and the retraction-not-erasure mitigation are analyzed in [statement-hosting.md](/specs/product/legal/statement-hosting.md#permanence-cuts-back-the-users-side-of-the-bargain) and the caveats section of [self-published-statements.md](subsystems/conceptspace/self-published-statements.md) for statements — but they apply to *any* user-authored content moved to calldata (project descriptions can defame or dox too). Each content type that migrates needs the same trio: blunt consent language, a retraction mechanism honored at the display layer, and display-layer suppression as the practical takedown lever.

One framing caution, echoing statement-hosting.md: for *user* content, vacating the host role is the point, so author-pays calldata is strictly better than IPFS. For *our own* content (editorial docs, collections, UI builds), IPFS was never creating a hosted-speech problem — eliminating it there is purely a question of ops simplification (one less external service, one fewer credential), which happens to point in the same direction.
