# Eliminating IPFS

Status: **mostly implemented; rollout/ops remain** (Jul 2026). Written as a follow-up to the statement-hosting posture work: [statement-hosting.md](/specs/product/legal/statement-hosting.md) (legal side) and [self-published-statements.md](subsystems/conceptspace/self-published-statements.md) (calldata design for statements). Those docs answer "how do statements stop being hosted by us?" This one asks the wider question: **what else do we use IPFS for, could each use be eliminated the same way, and could we drop the IPFS dependency altogether?** The shared PublishedData contract, SDK reader/store seam, indexer/API ingestion, primary publication/read paths, mutable-ref list append events, and denylist-aware display reads are now in place; remaining work is mainly enabling the deployed PublishedData address in live services and settling the low-stakes UI serving-path choice.

Short answer: yes for the *user-authored* content, where the calldata design generalizes cleanly. Two deliberate exceptions where IPFS stays: **images** (removing the upload endpoint, not the storage, is what defuses the legal hazard) and **nudger publications** (operator-hosted editorial output, where content-addressing earns its keep and the vacate-the-host-role thesis doesn't apply).

## Inventory: everything we currently put on IPFS

1. **Conceptspace statements** (`sdk/src/subsystems/conceptspace/actions.ts`) — the case the self-published-statements design already addresses.
2. **LazyGiving project metadata** (`ui/src/lazy-giving/pages/CreateProjectPage.tsx`) — project descriptions, plus per-token metadata and uploaded **images** (`uploadBlobToIPFS`, `ipfs://` image URIs).
3. **Content-funding contract metadata** (`ui/src/content-funding/pages/CreateContractPage.tsx`) — channel/creator assurance-contract descriptions.
4. **Our own editorial documents** — the fundingportal alignment-topic document (`sdk/src/subsystems/fundingportals/constants.ts`) and the CSM mission statement (`sdk/src/subsystems/conceptspace/constants.ts`).
5. **Mutable-refs lists** (`sdk/src/subsystems/mutable-refs/actions.ts`) — e.g. `created-statements`: an onchain ref points at an IPFS JSON list that is re-uploaded in full on each append.
6. **Nudger publications** (`nudger-core/src/signer.ts`) — nudge batches and curated explorer collections are uploaded to IPFS, with the CID anchored onchain via `publishNudgeBatch`.
7. **The UI builds themselves** — `scripts/deploy-ui.sh` pins each build to Pinata; the [cloudflare-ui-gateway](/cloudflare-ui-gateway/README.md) worker resolves IPNS → CID and proxies gateways. This is censorship resistance for the frontend, not content hosting.

## Case-by-case

### Statements — yes (implemented)

See [self-published-statements.md](subsystems/conceptspace/self-published-statements.md) and [published-data/README.md](subsystems/published-data/README.md). Author-paid calldata inscription through PublishedData is implemented; IPFS is now only a legacy retrieval fallback for pre-migration CIDs.

### LazyGiving / content-funding metadata — mostly yes, same legal logic

These are *recipient/creator self-descriptions*. Having the project creator publish them in the calldata of their own registration transaction gives the same attribution win as for statements: the project, not us, is the publisher of its own pitch. Sizes are comparable to statements (a few KB of text). Two wrinkles:

- **Images are the real blocker, and are handled differently — see [image policy](#image-policy-decided-jul-2026) below.** They are the one place IPFS deliberately *stays*, because the legal hazard of images is not solved by moving them to calldata; it's solved by removing the upload endpoint.
- **ERC1155 `tokenURI` interop — decided (Jul 2026): emit standard, resolvable metadata (so read-only *showcases* work), but keep tokens *non-transferable* (so they can't be *traded*).** These are two separate levers and we want opposite settings on them:
  - **Showcase display is wanted.** We *do* want a contributor's tokens to appear on generic "here's what this address holds" pages (wallet portfolio viewers, holdings galleries, our own per-address gallery — which is trivial since we already have the metadata). That requires standard ERC-1155 `uri(tokenId)` returning JSON with `name`/`image`/`description`. Major indexers resolve `data:`, `ipfs://`, and `https://` alike, so scheme is a convenience choice; since images stay on IPFS (see image policy), the metadata just carries an `ipfs://` `image` inside whatever wrapper is handy.
  - **Marketplace *sellability* is not wanted, and is prevented separately by non-transferability**, not by degrading metadata. Non-transferable ("soulbound") receipts — already the direction in [retroactive-funding-redesign.md](/specs/product/legal/retroactive-funding-redesign.md) for securities reasons — cannot be listed or traded on a marketplace regardless of metadata, yet still have a mint event + metadata and so still appear in holdings/showcase views. So the securities design gives us the showcase-yes/trade-no split for free.
  - Net: this is *not* a reason to avoid conventional `tokenURI`; emit good standard metadata. The de-crypto direction only means we don't chase marketplace *trading* integration — which transferability, not metadata, controls.

#### Image policy (decided, Jul 2026)

The only user-uploaded image surface in the codebase is the per-token image on LazyGiving giving options (`CreateProjectPage.tsx`, `uploadBlobToIPFS` → `tokenMeta.image = ipfs://<cid>`). Everything else is text. So "the image problem" is entirely this one field.

Images are legally different from text because moving user-authored *text* to author-paid calldata vacates our **speaker** role while leaving us a soft, notice-based **distributor** at the display layer — an adequate posture for defamatory text. That is *not* adequate for images: the worst case (CSAM) carries strict criminal liability for mere possession/distribution in both the US and Canada, largely regardless of notice-and-takedown. The decisive move is therefore at the *authoring boundary*, not the storage layer:

- **We operate no image-upload endpoint.** The UI drops the file-picker → `uploadBlobToIPFS` path. Removing the endpoint that ingests arbitrary user image bytes is what defuses the strict-liability hazard; it is the load-bearing decision here.
- **Curated stock image set**, authored/vetted by us (we're the speaker, and we know it's clean), pinned via our own IPFS/Pinata node. Kept on IPFS deliberately: contracts and UI are CID-native, so adding more clean images is just "pin it and reference the CID," and it preserves LazyGiving's everything-is-immutable property (no mutable HTTP image URLs). Users pick from this set.
- **Bring-your-own CID** for users who want their own image: they upload to any third-party IPFS pinning service (web3.storage/Storacha, Pinata, nft.storage, Filebase, Infura, …) and hand us only a CID. We never receive, store, or transmit the bytes at authoring time — the softest possible distributor posture. Presented as an advanced/optional path with explicit copy that the image is hosted by the user/third party, not us.
- **CID-only, no HTTP(S) image URLs.** Keeping the field CID-native everywhere (rather than also accepting `https://`) is both simpler and enforces immutability; wherever the CID resolves from is not the contract's concern.
- **Display-layer suppression still required.** Displaying a user-supplied CID's image still puts us in the distributor role for that image, so the same denylist/blank-at-display lever the migrated text content needs applies here too. This proposal makes us a soft notice-based distributor and removes the upload hazard; it does not remove the display-layer takedown obligation.

Consequence for the broader effort: images are the one content type where IPFS is *not* eliminated — it stays as the (our-own + BYO) image serving path. That's a deliberate exception, not an oversight.

### Our own editorial docs — trivially yes

We are the author and publisher anyway, so there's no legal reason for IPFS here. They can ride the same inscription path or simply be bundled/served from our own infra. Eliminating IPFS here is pure ops simplification, not posture.

### Mutable-refs lists — yes, implemented, and it's a simplification on its own merits

Instead of "upload new JSON list to IPFS, point the ref at the new CID," `appendToUserList` now writes one mutable-ref update event whose value is the appended CID, and `getUserList` reconstructs the list from event history while folding legacy JSON-list values for backward compatibility. This is cheaper per append (no re-upload of the whole list) and removes the old IPFS-list publication path.

### Nudger publications — reconsidered (Jul 2026): keep IPFS; this case doesn't fit the thesis

Earlier framing said nudgers should leave IPFS too. On reflection that's wrong, because the whole elimination thesis is about **vacating the host role for *user-authored* content** — relieving users of paying for their own pinning, and relieving us of being host-of-record for arbitrary stranger-written content. **Neither applies to a nudger.** A nudger is a heavyweight, opinionated operator publishing *its own* editorial output; "pin your own nudges to IPFS" is a reasonable requirement on whoever chooses to run one. No third party is forced to host anything.

And IPFS earns its keep here in ways the statement case didn't value:

- **Read scalability / availability decoupled from the nudger's uptime** — content-addressed batches are served by any gateway/pin and cached immutably, so clients don't depend on (or hammer) the nudger's own API, and nudges survive the nudger going offline.
- **Tamper-evidence** — the CID is the content hash.
- **Authenticity + discoverability without per-message signatures** — the on-chain `publishNudgeBatch` event (signed by the nudger's address) is what lets the indexer find batches from trusted nudgers and prove authorship. A pure-API path would have to reintroduce per-message signing *and* endpoint discovery.

The only thing that ever pointed the other way is the nudges-spec design point about **clean retract-ability** ([nudges.md](subsystems/conceptspace/nudges.md); [mutable-refs/README.md](subsystems/mutable-refs/README.md) rejected on-chain nudge *feeds* so bad suggestions leave no permanent record). But that's a **retraction-semantics** question, not a hosting one — it's already handled functionally by the batch `revocations` array, and any desire for stronger retract-ability is addressed at that layer, not by abandoning content-addressing. **Decision: nudgers stay on IPFS** (or at minimum IPFS remains the expected/available path); the `signer.ts`-vs-spec reconciliation is scoped to retraction semantics only, not IPFS removal.

### UI hosting — separable; structure decided, serving-path choice still open

Publishing UI builds to IPFS has none of the hosted-speech downside (it's our own code), but it's the biggest *operational* IPFS dependency: the Pinata JWT (on the credential-scopedown list), w3name for IPNS, gateway flakiness, the Cloudflare worker. We could swap to conventional static hosting and keep IPFS publication as an optional community mirror rather than the serving path. The trade-off is a part of the "unstoppable frontend" story in [censorship-resistance.md](/docs/end-user/commonality/vision-and-strategy/hard-to-stop/censorship-resistance.md) — but note that today's default serving path is *already* ours-controlled (Cloudflare Worker + our IPNS keys + our Pinata gateway), so the current IPFS setup buys **portability/mirrorability**, not truly unstoppable serving. That reframes the choice as "keep the ops burden for portability" vs. "shed it and preserve portability via a published, mirrorable build."

**Decided (Jul 2026): immutable IPFS build artifact behind a mutable DNS/ENS pointer.** The build is published to IPFS (content-addressed, community-mirrorable); `commonality.works` / `commonality.eth` → `contenthash` (reachable normie-friendly via `eth.limo`, no extension) point at the current build. This is the legally *ideal* shape, not a compromise — the frozen artifact is protected code publication + factual decentralization, and the **mutable pointer is our retained compliance lever** (push a new build / update the denylist / point away). Full analysis of why un-takedownable published code is safe while retained control at the service layer is required: [operator-posture.md § Publishing the UI build to IPFS — helps vs. hurts, by layer](/specs/product/legal/operator-posture.md#publishing-the-ui-build-to-ipfs--helps-vs-hurts-by-layer-jul-2026).

**Hard constraint from that analysis: the display denylist must be runtime-fetched, never baked into the immutable build.** Otherwise an old re-pinned build carries an old, shorter denylist and displays content we're now required to suppress. The live UI fetches the current denylist at load time from an endpoint we control.

**Still open (the remaining product decision):** whether the *default* serving path is conventional static hosting (shedding the Pinata JWT + w3name + Worker) with IPFS as the mirror, or IPFS remains the default serving path. The legal reasoning above makes this low-stakes either way — it's an ops/credential-surface call, not a posture call. Adam leans toward keeping IPFS/Pinata for now (consistent with the CID-native, immutable-everything preference on images).

## The generalized posture

The publication mechanism itself is generalized into a single shared subsystem — one immutable `PublishedData` contract (publish-with-CID-verification, keyed by (publisher, cid), with retraction attestations) plus one SDK reader library — so statements, project metadata, contract metadata, and editorial docs all share one contract, one consent UX, one retraction story, and one indexer ingestion path. See [published-data/README.md](subsystems/published-data/README.md).

- **User-authored content** → author-paid calldata inscriptions through PublishedData (the self-published-statements pattern).
- **Our editorial content** → inscribed, or served from our own infra.
- **Mutable lists** → onchain events, reconstructed by the indexer.
- **Nudger publications** → stay on IPFS (operator-hosted editorial output; content-addressing earns its keep — see above). Not part of the elimination.
- **UI hosting** → immutable IPFS build behind a mutable DNS/ENS pointer (retained compliance lever); runtime-fetched denylist; conventional-vs-IPFS default serving path still open (low-stakes).

CIDs can remain the identity scheme throughout: computed client-side, verifiable onchain, carried in events exactly as today. Nothing downstream changes its notion of content identity; the indexer's IPFS *gateway reads* become chain-history reads.

## What we'd still need / give up

- **An image policy** — decided (Jul 2026): no upload endpoint, curated stock set on our IPFS/Pinata + optional bring-your-own CID, CID-only, display-layer denylist. See [Image policy](#image-policy-decided-jul-2026). This is the one place IPFS deliberately stays.
- **Legacy-data migration**: indexers need calldata-first-with-gateway-fallback (self-published-statements.md, "What would need to change" item 3) until old CIDs are re-inscribed or abandoned. Testnet data is ephemeral, so switching before mainnet makes this nearly free.
- **The display/aggregation exposure doesn't move.** The denylist work from [statement-hosting.md](/specs/product/legal/statement-hosting.md) is unchanged regardless of storage layer.
- **Permanence has its own legal caveats, and they generalize.** The "ordered to take down but can't" trap, the GDPR special-category-data problem, and the retraction-not-erasure mitigation are analyzed in [statement-hosting.md](/specs/product/legal/statement-hosting.md#permanence-cuts-back-the-users-side-of-the-bargain) and the caveats section of [self-published-statements.md](subsystems/conceptspace/self-published-statements.md) for statements — but they apply to *any* user-authored content moved to calldata (project descriptions can defame or dox too). Each content type that migrates needs the same trio: blunt consent language, a retraction mechanism honored at the display layer, and display-layer suppression as the practical takedown lever.

One framing caution, echoing statement-hosting.md: for *user* content, vacating the host role is the point, so author-pays calldata is strictly better than IPFS. For *our own* content (editorial docs, collections, UI builds), IPFS was never creating a hosted-speech problem — eliminating it there is purely a question of ops simplification (one less external service, one fewer credential), which happens to point in the same direction.
