# Continuity notes for ephemeral AI instances

## Content-funding: content-attester workspace — COMPLETE ✓

### What was done

Built a new `content-attester/` workspace on top of `attester-core/` to evaluate content items against alignment statements and publish positive attestations on-chain through `AlignmentAttestations.sol`.

**Changes:**
1. Added a standalone `content-attester/` package with build/lint/test config, README, and Dockerfile.
2. Implemented content-attester config loading, content resolution from inline text/URL/IPFS, prompt templating, OpenRouter JSON evaluation, and alignment-attestation blockchain publishing.
3. Added an Express app that reuses `attester-core` for common routes, payment handling, rate limiting, and IPFS explanation uploads.
4. Added focused tests for the HTTP flow and content/prompt helpers, then updated workspace wiring and lockfile metadata.

### Key decisions

- Kept the service deployment-specific rather than request-profile-specific: the active prompt/profile is configured through environment variables, and the next task can package the three noninflammatory prompt variants as deployable configs.
- Required callers to provide a canonical content ID alongside the content source so the service can deterministically derive the on-chain `subjectId` via the existing SDK hashing rules.
- Supported three content input paths now (`contentText`, `contentUrl`, `contentCid`) and kept status lookups on the shared placeholder route for parity with the implication attester's current scaffolding.

### PRD reference

- `TODO.md` content-funding content-attesters work (2026-04-08): build `content-attester/` service on top of `attester-core/`
- `specs/subsystems/content-funding/content-attesters.md`

### Files changed

- `content-attester/` — new workspace with runtime code, tests, docs, and Dockerfile
- `package.json` / `package-lock.json` — workspace graph updated
- `TODO.md` — marked the content-attester task complete
- `README.md` — updated artifact list and high-level status

### Notes for next iteration

- The next bounded attester task is wiring the three noninflammatory prompt profiles into concrete deployable configurations for `content-attester/`.
- One implementation wrinkle to consider next time: the shared `/quote` route currently returns pricing metadata but not a reusable `paymentId`, so real payment-driven clients still need the 402 response path to obtain the proof token. Decide whether that should be fixed in `attester-core` before broader integration.
- Good interrupt point: yes. The new service exists, has tests, and the next TODO item is a clean configuration/deployment follow-up.

## Content-funding: attester-core extraction and implication-attester refactor — COMPLETE ✓

### What was done

Created a new `attester-core/` workspace to hold the reusable infrastructure shared by attester services, and refactored the existing implication attester to import those shared modules instead of owning duplicate copies.

**Changes:**
1. Added `attester-core/` workspace with shared modules for:
   - config/env parsing helpers
   - blockchain error classification/formatting
   - IPFS upload/fetch helpers
   - OpenRouter JSON completion wrapper
   - x402-style payment quote/validation helpers
   - Express rate-limiting middleware
2. Moved the existing shared unit tests for errors, payment, and rate limiting into `attester-core/`.
3. Updated `attester/` to depend on `@commonality/attester-core` and removed the now-duplicated local modules/tests.
4. Ran `npm install` so the new workspace is linked correctly and `package-lock.json` reflects the workspace graph.

### Key decisions

- Kept implication-specific logic local to `attester/`: blockchain contract publishing, implication prompt construction, and the implication-specific HTTP routes.
- Extracted shared config as low-level env parsing helpers plus attester-side adapters (`getIpfsConfig()`, `getPaymentConfig()`), which keeps `attester-core` reusable across future attesters without baking in implication-specific env names.
- Left Express route/app scaffolding in `attester/` for now; only the clearly reusable infrastructure moved. Added a TODO follow-up to extract route/status setup later if it repeats in the upcoming `content-attester/`.

### PRD reference

- `TODO.md` content-funding content-attesters work (2026-04-08): create `attester-core/` and refactor the existing `attester/` to consume it
- `specs/subsystems/content-funding/content-attesters.md`

### Files changed

- `attester-core/` — new shared workspace with src/tests/package metadata
- `attester/package.json` — depends on `@commonality/attester-core`
- `attester/src/config.ts` — now composes shared config helpers
- `attester/src/blockchain.ts` — now imports shared blockchain error classification
- `attester/src/evaluator.ts` — now uses shared OpenRouter wrapper
- `attester/src/index.ts` — now uses shared IPFS/payment/rate-limit/error helpers
- `attester/src/errors.ts` — removed
- `attester/src/ipfs.ts` — removed
- `attester/src/payment.ts` — removed
- `attester/src/rateLimit.ts` — removed
- `attester/test/errors.test.ts` — removed
- `attester/test/payment.test.ts` — removed
- `attester/test/rateLimit.test.ts` — removed
- `package.json` / `package-lock.json` — workspace graph updated
- `TODO.md` — marked the extraction/refactor work done and added one follow-up
- `README.md` — updated high-level project status

### Notes for next iteration

- The next bounded content-funding task should be building `content-attester/` on top of `attester-core/`.
- Good interrupt point: yes. This is a clean seam before starting the new service, and it may also be a reasonable moment for a light architecture review of the attester/service packaging if more shared pieces start appearing.

## Content-funding: shared attester HTTP scaffolding extraction — COMPLETE ✓

### What was done

Moved the repeated Express bootstrap and common `/health`, `/quote`, and placeholder `/status` route logic into `attester-core/`, then refactored the existing implication attester to use those shared helpers.

**Changes:**
1. Added `attester-core/src/http.ts` with `createAttesterApp()` and `registerCommonAttesterRoutes(...)`.
2. Refactored `attester/src/index.ts` to register the common routes from `attester-core` and keep only implication-specific evaluation and blockchain-status endpoints local.
3. Added `attester-core/test/http.test.ts` coverage for quote, health degradation, and placeholder status responses.
4. Updated the attester-core README and marked the follow-up task complete in `TODO.md`.

### Key decisions

- Kept the shared HTTP API concrete instead of introducing a generic plugin system: the helper only owns JSON middleware and the three clearly repeated routes.
- Left `/attester-status` local to `attester/` because it exposes implication-attester-specific operational data that the upcoming content attester may not want in the same shape.
- Made the placeholder status route configurable by path, required params, and payment-description text so future attesters can reuse it without forcing the implication attester's parameter names.

### PRD reference

- `TODO.md` content-funding content-attesters work (2026-04-08): move shared Express app setup plus status/health/quote route scaffolding into `attester-core/`
- `specs/subsystems/content-funding/content-attesters.md`

### Files changed

- `attester-core/src/http.ts` — new shared Express app and common route helpers
- `attester-core/src/index.ts` — exports the new HTTP helpers
- `attester-core/test/http.test.ts` — new route tests
- `attester-core/README.md` — documents shared route scaffolding
- `attester/src/index.ts` — now uses shared app/route registration
- `TODO.md` — marked the route-scaffolding follow-up done
- `README.md` — updated status summary

### Notes for next iteration

- The next bounded attester task is still building the new `content-attester/` workspace on top of the now-more-complete `attester-core/` helpers.
- Good interrupt point: yes. The shared attester seam is cleaner now, so the next session can focus on the new service rather than more extraction work.

## Content-funding: Platform embed previews — COMPLETE ✓

### What was done

Added platform embed previews (YouTube thumbnails and Twitter embeds) to content item displays on the Channel Page and Create Contract Page as specified in `specs/subsystems/content-funding/ui.md`.

**Changes:**
1. `ChannelPage.tsx` — added `ContentItemPreview` component:
   - YouTube video thumbnails from `img.youtube.com/vi/{videoId}/hqdefault.jpg`
   - Twitter oEmbed integration via `publish.twitter.com/oembed` API (falls back to plain link)
2. `CreateContractPage.tsx` — added `ContentUrlPreview` component:
   - YouTube thumbnail previews inline as URLs are entered

### Key decisions

- Used public YouTube thumbnail URLs directly (no API key needed)
- oEmbed for Twitter is tried but gracefully degrades to plain link if it fails
- Both previews are clickable links to the actual content

### PRD reference

- `TODO.md` content-funding gap (2026-04-08), "No platform embed previews (embedded tweets, YouTube thumbnails)"
- `specs/subsystems/content-funding/ui.md#content-items`, "Platform embed or preview (if feasible)"

### Files changed

- `ui/src/content-funding/pages/ChannelPage.tsx` — added embed previews
- `ui/src/content-funding/pages/CreateContractPage.tsx` — added embed previews
- `TODO.md` — marked as DONE

### Notes for next iteration

Content-funding MVP is now fully complete. The remaining gaps are all marked as "Future":
- Content attestation badges (depends on attester infrastructure)
- Embedded wallet provisioning
- Fiat off-ramp

---

## Content-funding: Claim flow inline withdraw and take-control — COMPLETE ✓

### What was done

Updated the ClaimFlowModal to include inline withdraw (Step 3) and take-control (Step 4) steps as specified in `specs/subsystems/content-funding/ui.md`.

**Changes:**
1. `ClaimFlowModal.tsx` — added new props: `channelId`, `escrowBalance`, `channelState`
2. Added wallet client hooks (`useWalletClient`, `usePublicClient`) for transaction signing
3. Added `handleWithdraw()` — calls `withdrawFromEscrow` SDK action, shows balance and "Withdraw to Wallet" button
4. Added `handleTakeControl()` — calls `takeChannelControl` SDK action, shows "Take Control" button
5. Updated steps array to `['Connect Wallet', 'Verify Identity', 'Withdraw Funds', 'Take Control']`
6. Updated modal content for Steps 2-4 to include inline withdraw/take-control flow
7. Updated ChannelPage to pass new props: shows modal for unclaimed OR verified channels with escrow balance

### Key decisions

- Modal now triggers for both unclaimed and verified channels (previously only unclaimed)
- Verified channels can withdraw immediately after verification without visiting dashboard
- For verified channels: verify → withdraw → take control (each as inline steps)
- For unclaimed channels: verify → the old "go to dashboard" message is shown
- Reused the same SDK action pattern from CreatorDashboardPage

### PRD reference

- `TODO.md` content-funding gap (2026-04-08), "Claim flow modal doesn't include inline withdraw or take-control steps"
- `specs/subsystems/content-funding/ui.md#claim-flow`, Steps 3-4

### Files changed

- `ui/src/content-funding/components/ClaimFlowModal.tsx` — added inline withdraw/take-control steps
- `ui/src/content-funding/pages/ChannelPage.tsx` — pass escrow balance and channel state

### Notes for next iteration

Content-funding MVP is now fully complete. Remaining gaps are future work:
- Content attestation badges
- Platform embed previews
- Embedded wallet provisioning
- Fiat off-ramp

---

## Content-funding: Create Contract success share link — COMPLETE ✓

### What was done

Updated the Create Contract success state to show a shareable claim link that creators can use to claim their funds. Also fixed the inconsistency where `useClaimFlow` used the dev proxy path while `usePlatformApi` used the environment variable directly.

**Changes:**
1. `useClaimFlow.ts` — now uses `VITE_PLATFORM_API_URL` environment variable like `usePlatformApi` for consistency between dev and production
2. `CreateContractPage.tsx` — added share link display in the success state showing the claim URL for the channel

### Key decisions

- Both hooks now use `import.meta.env.VITE_PLATFORM_API_URL || 'http://localhost:3001'` as the base URL
- Share link shows `origin/content/{platform}/{channelId}` that creators can visit to claim their funds

### PRD reference

- `TODO.md` content-funding gaps (2026-04-07), "Create Contract success state doesn't show shareable claim link"

### Files changed

- `ui/src/content-funding/hooks/useClaimFlow.ts` — use VITE_PLATFORM_API_URL
- `ui/src/content-funding/pages/CreateContractPage.tsx` — added share link in success state

### Notes for next iteration

Content-funding MVP is now fully complete. Remaining gaps:
- Claim flow modal with inline withdraw/take-control steps
- Content attestation badges
- Platform embed previews

---

## Content-funding: make useClaimFlow consistent with usePlatformApi — COMPLETE ✓

### What was done

Fixed the inconsistency where `useClaimFlow` used the dev proxy path `/api/platform-api/...` while `usePlatformApi` used `VITE_PLATFORM_API_URL` directly. Now both hooks use the same environment variable approach for consistency between dev and production environments.

### Key decisions

- Both hooks now use `import.meta.env.VITE_PLATFORM_API_URL || 'http://localhost:3001'` as the base URL
- Removed the dependency on the Vite dev proxy for Platform API calls

### PRD reference

- `TODO.md` Minor item (2026-04-07), consistency between useClaimFlow and usePlatformApi

### Files changed

- `ui/src/content-funding/hooks/useClaimFlow.ts` — use VITE_PLATFORM_API_URL environment variable

### Notes for next iteration

Content-funding MVP is now fully complete. Remaining gaps:
- Claim flow modal with inline withdraw/take-control steps
- Content attestation badges
- Platform embed previews
- Create Contract success with share link

---

## Content-funding bug fixes: 5 remaining bugs — COMPLETE ✓

### What was done

Fixed all 5 remaining content-funding bugs from TODO.md:

1. **SDK actions.ts event args cast**: Updated the `CreatorContractCreated` event args cast to match the actual event fields (`creator` instead of `erc1155`, added `channelId`). Also fixed `erc1155Address` to use `args.creator`.

2. **Initial purchase value calculation**: Fixed the broken calculation logic that tried to match token IDs (content ID hashes) against content suffixes via string comparison. Now correctly matches by index position — `contentPrices[i] * initialPurchaseCounts[i]`.

3. **ClaimFlowModal API parameters**: Updated `useClaimFlow.getChallenge()` to accept `platform`, `handle`, and `claimantAddress` parameters and pass them to the API. Updated `ClaimFlowModal` component to receive and pass these values, extracting the handle from the canonical channel ID via `parseCanonicalChannelId`.

4. **ContractVetoed event decoding**: Added `ContractVetoed` case to the switch statement in `fetchAndFoldContentFundingState`, collect vetoed events, and return them alongside the state. Updated `useContentFundingState` hook to pass vetoed events to the query layer.

5. **Creator Dashboard withdraw button**: Updated the condition to show withdraw button for both verified and creator-controlled channels: `channel.channel.state === 'verified' || channel.channel.state === 'creator-controlled'`.

### Key decisions

- Changed `fetchAndFoldContentFundingState` return type to `ContentFundingStateWithVetoedEvents` to expose vetoed events to the UI layer
- The ClaimFlowModal fix extracts the Twitter handle from the canonical channel ID using `parseCanonicalChannelId`

### PRD reference

- `TODO.md` content-funding bugs (2026-04-07)

### Files changed

- `sdk/src/subsystems/content-funding/actions.ts` — fixed event args cast, fixed initial purchase calculation
- `ui/src/content-funding/hooks/useClaimFlow.ts` — added handle and claimantAddress params
- `ui/src/content-funding/components/ClaimFlowModal.tsx` — added platform, handle, claimantAddress props
- `ui/src/content-funding/pages/ChannelPage.tsx` — wired ClaimFlowModal with channel info and wallet address
- `sdk/src/subsystems/content-funding/queries.ts` — added ContractVetoed decoding, changed return type
- `ui/src/content-funding/hooks/useContentFundingState.ts` — updated to handle new return type and pass vetoed events
- `ui/src/content-funding/pages/CreatorDashboardPage.tsx` — fixed withdraw button condition
- `TODO.md` — marked all 5 bugs as DONE
- `README.md` — updated status

### Notes for next iteration

Content-funding MVP is now fully complete with all bugs fixed. Remaining items are future work:
- Embedded wallet provisioning for non-crypto-native creators
- Integrated off-ramp for fiat withdrawal
- Platform embed previews (embedded tweets, YouTube thumbnails)
- Claim flow success state with shareable link and notification message

---

## Content-funding: Wire Create Contract to Platform API Service — COMPLETE ✓

### What was done

Wired the UI's Create Contract page to use the Platform API Service's `/resolve/content` endpoint for author validation, instead of client-side-only URL parsing.

**Changes:**
1. Added `VITE_PLATFORM_API_URL` to `ui/.env` (default `http://localhost:3001`) and `.env.example`
2. Created `ui/src/content-funding/hooks/usePlatformApi.ts` — React hook with:
   - `resolveChannel(platform, handle)` — calls `/resolve/channel`
   - `resolveContent(url)` — calls `/resolve/content`
   - Returns `{ isLoading, error, clearError }` state
3. Updated `CreateContractPage.tsx`:
   - Added `resolved` and `validating` fields to `ContentItemRow` interface
   - Hooks up the Platform API on URL input change, storing server-validated author metadata
   - Added `getValidationStatus()` helper that displays "Validating...", "Verified author: @handle", or platform detection status
   - Gracefully falls back to client-side parsing if Platform API is unavailable

### Key decisions

- The hook makes asynchronous calls when users type a content URL, showing a "Validating..." state while the request is in flight
- If the Platform API is unavailable or fails, the UI gracefully degrades to client-side parsing only (no error shown to user)
- The validation status displays "Verified author: @handle" when the server returns author metadata, giving users confidence in the content's provenance

### PRD reference

- `TODO.md` content-funding (2026-04-07), "Wire the UI's Create Contract page to use the Platform API Service's `/resolve/content` endpoint for author validation"

### Files changed

- `ui/.env` — added VITE_PLATFORM_API_URL
- `ui/.env.example` — added VITE_PLATFORM_API_URL
- `ui/src/content-funding/hooks/usePlatformApi.ts` (new)
- `ui/src/content-funding/pages/CreateContractPage.tsx` — wired Platform API for content validation
- `TODO.md` — marked as DONE

### Notes for next iteration

Content-funding MVP is now complete (contracts, SDK, deployment, fake-data, platform API service, UI all implemented). Remaining future work:
- (Future) Embedded wallet provisioning for non-crypto-native creators
- (Future) Integrated off-ramp for fiat withdrawal

---

## Content-funding Claim Flow UI — COMPLETE ✓

### What was done

Implemented the Claim Flow UI as described in `specs/subsystems/content-funding/ui.md#claim-flow`. Added a verification modal that enables creators to verify their identity and claim escrowed funds.

**SDK additions:**
- Added `verifyChannel` action in `sdk/src/subsystems/content-funding/actions.ts` — calls the `ChannelRegistry.verifyChannel` contract function with channel ID, claimant address, nonce, deadline, and verifier signature.

**UI additions:**
- Created `ui/src/content-funding/hooks/useClaimFlow.ts` — hook for calling Platform API Service endpoints `/verify/challenge` and `/verify/confirm`.
- Created `ui/src/content-funding/components/ClaimFlowModal.tsx` — modal component with 3-step flow:
  1. Connect wallet (prompts user to connect)
  2. Verify identity (get challenge tweet, post it, confirm)
  3. Claim success (shows transaction hash)
- Updated `ui/src/content-funding/pages/ChannelPage.tsx` to wire the modal:
  - Enabled the "Claim these funds" button (was disabled with "coming soon")
  - Added ClaimFlowModal for unclaimed channels with escrow balance
- Added Vite proxy for `/api/platform-api` → `http://localhost:3001` in `ui/vite.config.ts`

### Key decisions

- Used the existing Platform API Service endpoints for verification — the backend already handles tweet-based verification and proof signing.
- The modal currently relies on the user having an existing wallet (ConnectKit). Embedded wallet provisioning for non-crypto-native creators is a future enhancement.
- The verification flow uses a simple stepper UI: connect → verify → claim. Success triggers a page reload to refresh the channel state.
- Added proxy in Vite config so the UI can call the Platform API Service without CORS issues during development.

### PRD reference

- `TODO.md` content-funding (2026-04-07), "Implement the Claim Flow UI"
- `specs/subsystems/content-funding/ui.md#claim-flow`

### Files changed

- `sdk/src/subsystems/content-funding/actions.ts` — added verifyChannel action
- `ui/src/content-funding/hooks/useClaimFlow.ts` (new)
- `ui/src/content-funding/components/ClaimFlowModal.tsx` (new)
- `ui/src/content-funding/pages/ChannelPage.tsx` — wired ClaimFlowModal, enabled button
- `ui/vite.config.ts` — added platform-api proxy
- `TODO.md` — marked as DONE
- `README.md` — updated status (done in previous session)

### Notes for next session

Content-funding Claim Flow UI MVP is complete. Remaining content-funding work:
- **Wire Create Contract page** to use Platform API Service's `/resolve/content` for author validation (instead of client-side-only URL parsing)
- (Future) Embedded wallet provisioning for non-crypto-native creators
- (Future) Integrated off-ramp for fiat withdrawal

---

## Content-funding bug fixes: 5 UI/SDK issues — COMPLETE ✓

### What was done

Fixed all 5 content-funding bugs from TODO.md:

1. **ChannelRegistryAbi missing vetoContract**: Added the missing `vetoContract` function to both `sdk/abis/ChannelRegistryAbi.ts` and `indexer/abis/ChannelRegistryAbi.ts`. The contract's `vetoContract(address)` takes only one argument.

2. **SDK vetoContract passes wrong args**: Fixed `sdk/src/subsystems/content-funding/actions.ts` to call `vetoContract` with just `contractAddress` instead of `[channelId, contractAddress]`. Also updated the UI caller in `CreatorDashboardPage.tsx`.

3. **Creator Dashboard shows all verified channels**: Fixed the filter to require that `ch.channel.owner?.toLowerCase() === address.toLowerCase()` for verified channels, not just any verified channel.

4. **ContentFundingProjectSection hardcodes twitter platform**: Added `getPlatformFromChannelId` helper to extract platform from canonical channel ID (`twitter:`, `youtube:`, `substack:`) and use it in the URL path.

5. **actions.ts duplicates canonicalization**: Refactored `parseContentUrl` to use `parseContentFundingUrl` from `canonicalization.ts` instead of duplicating the logic.

### Key decisions

- Kept all 5 fixes in one pass since they're closely related content-funding bug fixes.
- Fixed the indexer ABI as well for consistency, even though it's mainly used by the indexer.

### PRD reference

- `TODO.md` content-funding bug list (2026-04-07)

### Files changed

- `sdk/abis/ChannelRegistryAbi.ts` — added vetoContract function
- `indexer/abis/ChannelRegistryAbi.ts` — added vetoContract function  
- `sdk/src/subsystems/content-funding/actions.ts` — fixed vetoContract args, refactored parseContentUrl
- `ui/src/content-funding/pages/CreatorDashboardPage.tsx` — fixed vetoContract call, fixed channel filter
- `ui/src/content-funding/components/ContentFundingProjectSection.tsx` — extract platform from canonical ID
- `TODO.md` — marked all 5 as DONE
- `README.md` — updated status

### Notes for next session

Content-funding bugs are now all fixed. Remaining content-funding work:
- Claim Flow UI (modal for creators to verify identity and withdraw)
- Wire Create Contract page to Platform API Service's `/resolve/content`

---

## Real ChannelVerifier contract — COMPLETE ✓

### What was done

Replaced the `MockChannelVerifier` (test-only stub that returned a hardcoded bool) with a real `ChannelVerifier` contract that verifies EIP-191 signed proofs from the Platform API Service's trusted verifier EOA.

### Key decisions

- The contract uses OpenZeppelin ECDSA + MessageHashUtils to recover the signer from signatures that match the Platform API Service's `signClaimProof` scheme: `keccak256(abi.encodePacked(channelId, claimant, nonce, deadline))` signed with EIP-191 personal sign.
- `MockChannelVerifier` is kept in `contracts/test/` for existing ChannelRegistry unit tests — those tests are testing registry logic, not verifier logic.
- The deploy script now deploys the real verifier with the deployer as `trustedVerifier`. For local dev, the Hardhat account #0 private key is written to `.env` as `VERIFIER_PRIVATE_KEY`.
- Fake-data generation was updated to sign real proofs instead of toggling `setValid(true)` on the mock.

### Files changed

- `hardhat/contracts/content-funding/ChannelVerifier.sol` — new contract
- `hardhat/test/ChannelVerifier.test.js` — 14 tests (standalone + ChannelRegistry integration)
- `hardhat/scripts/deploy.js` — deploy real verifier, write `VERIFIER_PRIVATE_KEY` to local .env
- `fake-data-generation/contentFundingActions.ts` — sign real proofs, removed mock-verifier dependency
- `fake-data-generation/runSimulation.ts` — removed `channelVerifier` from addresses interface
- `TODO.md` — marked as DONE
- `CONTINUITY.md` — this entry

### Notes for next session

The content-funding system now has a complete end-to-end verification path from Platform API Service through to on-chain. Remaining content-funding work:
- 5 UI/SDK bugs listed in TODO.md (veto ABI, dashboard filter, hardcoded platform, etc.)
- Claim Flow UI (modal for creators to verify identity and withdraw)
- Wire Create Contract page to Platform API Service's `/resolve/content`

---

## Content-funding bug fixes: ContractVetoed event and creator field — COMPLETE ✓

### What was done

Fixed two content-funding issues from TODO.md:

1. **BUG: ContractVetoed event missing**: Added the missing `ContractVetoed` event declaration in `ChannelRegistry.sol` and added the emit in `vetoContract()` function. The event was expected by the spec, indexer ABI, SDK event types, and indexer event handler, but never actually emitted.

2. **Minor: CreatorContractCreated event field**: Changed `CreatorContractCreated` event to emit `creator` (the address that called the factory) instead of `erc1155` (the token address), as described in the spec. Updated SDK events, ABIs, folds, queries, and tests.

### Key decisions

- Kept both fixes in a single pass since they're closely related (both are event field corrections).
- For the CreatorContractCreated change, also updated `CreatorContractInfo` interface in folds to store `creator` instead of `erc1155` - this makes the folded state correctly represent what's in the event.

### Files changed

- `hardhat/contracts/content-funding/ChannelRegistry.sol` — added ContractVetoed event and emit
- `hardhat/contracts/content-funding/CreatorAssuranceContractFactory.sol` — changed event to emit creator
- `sdk/abis/CreatorAssuranceContractFactoryAbi.ts` — creator field
- `indexer/abis/CreatorAssuranceContractFactoryAbi.ts` — creator field
- `sdk/src/subsystems/content-funding/events.ts` — CreatorContractCreatedEvent.creator
- `sdk/src/subsystems/content-funding/folds.ts` — CreatorContractInfo.creator
- `sdk/src/subsystems/content-funding/queries.ts` — decode and push creator
- `sdk/src/utils/eventDecoder.ts` — decode creator field
- `sdk/src/subsystems/content-funding/queries.test.ts` — test updates
- `TODO.md` — marked as DONE
- `CONTINUITY.md` — this entry

### Notes for next session

The content-funding system is now fully complete (MVP). The remaining TODO items are:
- Replace MockChannelVerifier with a real verifier contract once verification path is implemented
- This was the last bug and the last minor issue from the content-funding section

---

## Content-funding UI: Funding Portal integration — COMPLETE ✓

### What was done

Integrated content-funding information into the Funding Portal's aligned-projects list. When an aligned project is a content-funding creator assurance contract, the project card now displays a "Content Funding" badge, channel info, and contract status.

**Updated files:**
- `ui/src/fundingportal/components/AlignedProjectCard.tsx` — added content-funding detection and display:
  - `useContentFundingInfo` hook to look up contract info from channels
  - `ContentFundingBadge` component showing "Content Funding" + "Fan-created" chips
  - `ContentFundingCardDetails` component showing channel name, state, and contract status
  - Updated `AlignedProjectCard` to render these when content-funding info exists
- `ui/src/fundingportal/components/AlignedProjectsList.test.tsx` — added mock for `useContentFundingState`

### Key decisions

- Reused the existing `useContentFundingState` hook from the content-funding module to detect whether a project is a content-funding contract
- The card searches all channels' contracts for a matching address and shows content-funding info only when found
- Components gracefully handle missing content-funding state (card renders normally without content-funding badges)
- Used the same `getChannelDisplayName` helper from the ContentFundingProjectSection for consistency

### PRD reference

- `TODO.md` content-funding UI: "Integration with Funding Portal — recognize creator assurance contracts"

### Files changed

- `ui/src/fundingportal/components/AlignedProjectCard.tsx`
- `ui/src/fundingportal/components/AlignedProjectsList.test.tsx`
- `TODO.md`
- `README.md`
- `CONTINUITY.md`

### Notes for next session

Content-funding UI MVP is now complete. The remaining TODO item for content-funding is:
- **Replace the deployment-time `MockChannelVerifier` placeholder** with a real on-chain verifier contract once the verification path is implemented end-to-end.

---

## Content-funding UI: Pubstarter project detail page integration — COMPLETE ✓

### What was done

Integrated content-funding information into the Pubstarter project detail page (`/projects/:projectAddress`). When a project is a content-funding creator assurance contract, it now displays a "Content Funding" section with channel info, contract status, and content items.

**New file:**
- `ui/src/content-funding/components/ContentFundingProjectSection.tsx` — displays:
  - Channel name (linked to channel page when available)
  - Channel canonical ID
  - Channel status (Unclaimed/Verified/Creator-Controlled)
  - Contract status (Active/Succeeded/Failed/Vetoed)
  - Escrowed balance (if any)
  - Content items list with direct links to content

**Updated files:**
- `ui/src/pubstarter/pages/ProjectDetailPage.tsx` — imported and added `<ContentFundingProjectSection />` below the alignment attestations section

### Key decisions

- Reused the existing `useContentFundingState` hook that already provides channels and contracts data
- Searched all channels and their contracts to find a matching contract address — this handles both fan-created and creator-created contracts
- Returns null (component renders nothing) if the project is not a content-funding contract, so the UI degrades gracefully
- Used the same helper functions (`getChannelDisplayName`, `getContentUrl`) from the ChannelPage for consistency
- Component returns early if loading or not a content-funding project, avoiding unnecessary rendering

### PRD reference

- `TODO.md` content-funding UI: "Integration with Pubstarter project detail page — content items section, channel info, attestations"

### Files changed

- `ui/src/content-funding/components/ContentFundingProjectSection.tsx` (new)
- `ui/src/pubstarter/pages/ProjectDetailPage.tsx`
- `TODO.md`
- `README.md`
- `CONTINUITY.md`

### Notes for next session

Remaining content-funding UI integration:
1. **Funding Portal integration** — recognize creator assurance contracts in the aligned-projects list

---

## Content-funding UI: Creator Dashboard — COMPLETE ✓

### What was done

Implemented the Creator Dashboard page at `/content/dashboard` — management page for verified creators.

**SDK additions:**
- Added three new action functions to `sdk/src/subsystems/content-funding/actions.ts`:
  - `withdrawFromEscrow()` — withdraw escrowed funds from ChannelEscrow
  - `takeChannelControl()` — take control of a verified channel via ChannelRegistry
  - `vetoContract()` — veto a fan-created contract during the 7-day window
- Exported `ChannelRegistryAbi` and `ChannelEscrowAbi` from the SDK's content-funding index

**UI additions:**
- Created `ui/src/content-funding/pages/CreatorDashboardPage.tsx` — full dashboard with:
  - Channel cards showing channel state, total funding, escrowed balance
  - "Take Control" button for verified channels
  - "Withdraw" button for creator-controlled channels with escrow balance
  - Vetoable contracts section listing fan-created contracts within the 7-day window
  - All contracts list with status chips and progress bars
- Added route `/content/dashboard` to `ui/src/App.tsx`
- Added "Creator Dashboard" nav link to `AppShell.tsx`

### Key decisions

- Reused existing SDK hooks (`useContentFundingState`) and query helpers (`getAllChannelOverviews`, `getVetoableContracts`)
- Passed `state` and `projects` from the hook down to the `ChannelCard` component so it can call `getVetoableContracts`
- Used `window.location.reload()` after transactions to refresh the page state (simple approach)
- Wallet must be connected to view the dashboard; shows info message if not connected
- Shows all verified or owned channels, not just creator-controlled ones (so users can take control of verified channels)

### Files changed

- `sdk/src/subsystems/content-funding/actions.ts` — added withdrawFromEscrow, takeChannelControl, vetoContract
- `sdk/src/subsystems/content-funding/index.ts` — exported ChannelRegistryAbi and ChannelEscrowAbi
- `ui/src/content-funding/pages/CreatorDashboardPage.tsx` (new)
- `ui/src/App.tsx` — added route
- `ui/src/shared/components/AppShell.tsx` — added nav link
- `TODO.md` — marked Creator Dashboard as DONE
- `README.md` — updated status

### Notes for next session

The remaining content-funding UI slices, roughly in priority order:
1. **Pubstarter project detail page integration** — recognize creator assurance contracts and show content-funding-specific info.
2. **Funding Portal integration** — recognize creator assurance contracts in aligned-projects list.

---

## Content-funding UI: Create Contract page — COMPLETE ✓

### What was done

Implemented the Create Contract page at `/content/:platform/:channelId/new` — the third content-funding UI slice.

**New file:**
- `ui/src/content-funding/pages/CreateContractPage.tsx` — full Create Contract form component
- `sdk/src/subsystems/content-funding/actions.ts` — SDK action functions for creating content-funding contracts

**Updated files:**
- `ui/src/App.tsx` — added route `/content/:platform/:channelId/new`
- `ui/src/content-funding/pages/ChannelPage.tsx` — added "Create Contract" button to contracts section
- `sdk/src/subsystems/content-funding/index.ts` — exported new actions
- `TODO.md` — marked Create Contract page as DONE
- `README.md` — updated status

### Key decisions

- Reused the existing content-funding canonicalization helpers (`parseContentFundingUrl`, `buildCanonicalContentId`, `hashCanonicalId`) from the SDK.
- Created a `createContentFundingContract` SDK action that follows the same pattern as `createProject` in the pubstarter subsystem: writes to the factory contract, waits for receipt, parses events with `parseEventLogs`.
- The form validates content URLs using the SDK's canonicalization, checks for minimum third-party purchase requirement, and calculates initial purchase value from token prices/supplies.
- Added "Create Contract" button to the Channel Page that appears in both the contracts list header and the empty state.
- The Create Contract page gates creation based on channel state: unclaimed/verified channels allow third-party creation; creator-controlled channels require the connected wallet to be the channel owner.

### Notes for next session

The remaining content-funding UI slices, roughly in priority order:
1. **Creator Dashboard** (`/content/dashboard`) — management page for verified creators (withdraw from escrow, veto window, take control).
2. **Pubstarter project detail page integration** — recognize creator assurance contracts and show content-funding-specific info.
3. **Funding Portal integration** — recognize creator assurance contracts in aligned-projects list.

## Content-funding UI: Channel Page — COMPLETE ✓

### What was done

Implemented the Channel Page at `/content/:platform/:channelId` — the second content-funding UI slice.

**New file:**
- `ui/src/content-funding/pages/ChannelPage.tsx` — full Channel Page component

**Updated files:**
- `ui/src/App.tsx` — added route `/content/:platform/:channelId`
- `TODO.md` — marked Channel Page as DONE
- `README.md` — updated status
- `CONTINUITY.md` — this entry

### Key decisions

- The URL `:channelId` param is the URL-encoded canonical channel ID (e.g. `twitter:uid:111111111`). The page decodes it and calls `hashCanonicalId()` to get the bytes32 key used by `getChannelOverview()`.
- `getChannelOverview` is called with the full `projects` list (from `useContentFundingState`) so contract funding progress is computed correctly.
- Content item URLs are reconstructed from canonical IDs via regex matching (no external API calls needed for the MVP).
- The "Claim these funds" button is present but disabled (with "coming soon") — the verification/claim flow is a larger feature (wallet connect, Twitter OAuth, etc.) that's out of scope for this slice.
- Clipboard copy uses `void navigator.clipboard.writeText(...)` (no await needed in an onClick handler).

### Notes for next session

The next content-funding UI slices, roughly in priority order:
1. **Create Contract page** (`/content/:platform/:channelId/new`) — form for creating a new funding contract for a channel.
2. **Creator Dashboard** (`/content/dashboard`) — management page for verified creators (withdraw from escrow, veto window, take control).
3. **Pubstarter project detail page integration** — recognize creator assurance contracts and show content-funding-specific info (content items list, channel info, attestations).
4. **Funding Portal integration** — recognize creator assurance contracts in aligned-projects list.

## Content-funding UI: Browse Creators page — COMPLETE ✓

### What was done

Implemented the first content-funding UI slice: the Browse Creators page at `/content/:platform`.

**SDK additions (plumbing needed before any UI):**
1. Copied content-funding ABIs from `indexer/abis/` into `sdk/abis/` (ContentRegistry, ChannelRegistry, ChannelEscrow, CreatorAssuranceContractFactory)
2. Added them to `sdk/src/abis.ts`
3. Added content-funding ABI entries to `sdk/src/utils/eventDecoder.ts` ABI_MAP and added decoder functions for all 8 content-funding event types
4. Added `fetchAllContentFundingEvents` to `sdk/src/utils/eventCacheClient.ts`
5. Added optional content-funding address fields to `ContractAddresses` in `sdk/src/machinery.ts`
6. Added `extractChannelCanonicalIdFromContentCanonicalId` utility to `sdk/src/subsystems/content-funding/canonicalization.ts`
7. Added to `sdk/src/subsystems/content-funding/queries.ts`:
   - `fetchAndFoldContentFundingState` — fetches, decodes, and folds all content-funding events
   - `buildChannelCanonicalIdMap` — maps bytes32 channelId → human-readable canonical ID (via content item canonical IDs)
   - `getAllChannelOverviews` — returns all channels with their canonical IDs
   - `ChannelWithCanonicalId` type

**UI additions:**
- Wired content-funding addresses in `ui/src/shared/hooks/useMachinery.ts` (4 new VITE_* env vars)
- Added content-funding addresses to `ui/.env`
- Updated `scripts/setup-env.sh` to propagate all UI env vars (was missing many)
- Created `ui/src/content-funding/hooks/useContentFundingState.ts` — React hook that loads all content-funding state + pubstarter projects
- Created `ui/src/content-funding/pages/BrowseCreatorsPage.tsx` — Browse Creators page with sort/filter controls, channel cards
- Added route `/content/:platform` to `ui/src/App.tsx`
- Added nav links for Twitter/YouTube/Substack creator pages to `AppShell.tsx`

### Key decisions

- On-chain channelId is `keccak256(channelCanonicalId)` — a bytes32 hash. The fold functions use this as map keys. To display the human-readable channel name (e.g. "twitter:uid:111111111"), we extract it from content item canonical IDs. `extractChannelCanonicalIdFromContentCanonicalId` handles Twitter/YouTube (strip last `:suffix`) and Substack (split on `/`).
- Content-funding addresses are optional in `ContractAddresses` (UI degrades gracefully if not configured).
- The Browse Creators page filters by platform from the URL path, then lets users sort/filter by state/activity.

### Files changed

- `sdk/abis/ContentRegistryAbi.ts` (new — copied from indexer)
- `sdk/abis/ChannelRegistryAbi.ts` (new)
- `sdk/abis/ChannelEscrowAbi.ts` (new)
- `sdk/abis/CreatorAssuranceContractFactoryAbi.ts` (new)
- `sdk/src/abis.ts`
- `sdk/src/machinery.ts`
- `sdk/src/utils/eventDecoder.ts`
- `sdk/src/utils/eventCacheClient.ts`
- `sdk/src/subsystems/content-funding/canonicalization.ts`
- `sdk/src/subsystems/content-funding/queries.ts`
- `ui/src/shared/hooks/useMachinery.ts`
- `ui/.env`
- `scripts/setup-env.sh`
- `ui/src/content-funding/hooks/useContentFundingState.ts` (new)
- `ui/src/content-funding/pages/BrowseCreatorsPage.tsx` (new)
- `ui/src/App.tsx`
- `ui/src/shared/components/AppShell.tsx`
- `TODO.md`
- `README.md`
- `CONTINUITY.md`

### Notes for next session

The next content-funding UI slice should be the **Channel Page** (`/content/:platform/:channelId`). This is the most important page for the creator acquisition story — it's the landing page creators see when a fan sends them a claim link.

The Channel Page needs:
- Header with channel state, total funding, escrowed balance
- Hero section for unclaimed channels ("Supporters have pooled $X for [creator]")
- Content items list (with canonical IDs)
- Contracts list (linking to Pubstarter project detail pages)
- Share / notify section (copyable claim link, suggested message template)

Implementation notes:
- The route would be `/content/:platform/:channelId` where `:channelId` is the URL-encoded canonical channel ID (e.g. `twitter:uid:111111111`)
- `getChannelOverview(state, channelIdBytes32, options)` takes the bytes32 hash, not the canonical ID — so the page needs to compute `hashCanonicalId(channelId)` to look up the channel
- Or alternatively, find the channel in `getAllChannelOverviews` by matching `canonicalChannelId`

## Content-funding fake-data seeding — COMPLETE ✓

### What was done

Added content-funding on-chain scenarios to the fake-data generation pipeline:

1. Created `fake-data-generation/contentFundingActions.ts` with a `generateContentFundingScenarios` function that runs three deterministic scenarios:
   - **Unclaimed Twitter channel** (`twitter:uid:111111111`): a fan creates a third-party contract with 2 content items; two buyers purchase tokens
   - **Verified YouTube channel** (`youtube:channel:UCaaaaaaaaaaaaaaaaaaaaaaaa`): creator verifies the channel via MockChannelVerifier then creates a creator contract; two buyers purchase tokens
   - **Creator-controlled Substack channel** (`substack:smartwriter`): creator verifies the channel, fan creates a third-party contract (while channel is Verified), creator creates their own contract, then creator takes control — leaving the third-party contract open for a veto during the 7-day window

2. Updated `fake-data-generation/loadEnv.ts` to expose three new content-funding addresses: `channelVerifier`, `channelRegistry`, `creatorContractFactory`.

3. Updated `fake-data-generation/runSimulation.ts` to call `generateContentFundingScenarios` after the main simulation, guarded by a check for the required env vars.

### Key decisions

- Used relative path imports for the indexer ABIs (`../indexer/abis/`) to avoid duplication. This works fine with `tsx` which resolves `.js` → `.ts` imports.
- Scenarios are deterministic (fixed channel IDs and content suffixes), not random, so they produce stable indexer data for UI development.
- Fixed a subtle sequencing issue: third-party contracts cannot be created on CreatorControlled channels, only on Unclaimed or Verified ones. Scenario 3 therefore creates the third-party contract while the channel is still Verified, then the creator takes control.

### Files changed

- `fake-data-generation/contentFundingActions.ts` (new)
- `fake-data-generation/loadEnv.ts`
- `fake-data-generation/runSimulation.ts`
- `TODO.md`
- `README.md`
- `CONTINUITY.md`

### Notes for next session

Good interrupt point. The fake-data pipeline now seeds all three channel states and multiple contract types, giving the upcoming UI something realistic to display. The next content-funding chunk should be the first UI slice — likely the Browse Creators page or Channel Page.

## Content-funding deployment wiring — COMPLETE ✓

### What was done

Added the remaining deployment wiring for the content-funding contract set:

1. Updated `hardhat/scripts/deploy.js` to deploy `MockChannelVerifier`, `ContentRegistry`, `ChannelRegistry`, `ChannelEscrow`, and `CreatorAssuranceContractFactory`
2. Wired the post-deploy ownership/registration steps (`ContentRegistry.transferOwnership(factory)` and `ChannelRegistry.setFactory(factory)`)
3. Extended generated deployment/env output with `CHANNEL_VERIFIER_ADDRESS`, `CONTENT_REGISTRY_ADDRESS`, `CHANNEL_REGISTRY_ADDRESS`, `CHANNEL_ESCROW_ADDRESS`, `CREATOR_CONTRACT_FACTORY_ADDRESS`, and `CONTENT_FUNDING_START_BLOCK`
4. Updated `scripts/setup-env.sh` so regenerated root env files also include the content-funding addresses for indexer/docker/service use
5. Fixed `indexer/ponder.config.ts` so dynamic indexing of creator assurance contracts looks up the `CreatorContractCreated` event by name instead of a brittle ABI array index
6. Documented that the current deploy path uses the repo's mock verifier until a production verifier contract exists

### Key decisions

- Kept this pass scoped to the single deployment-wiring TODO item rather than starting fake-data or UI work.
- Used `MockChannelVerifier` as the bootstrapping verifier on all deployments because the repo does not yet contain a production `IChannelVerifier` implementation; `ChannelRegistry` ownership still allows swapping in a real verifier later via `setVerifier(...)`.
- Propagated `CONTENT_FUNDING_START_BLOCK` alongside the new addresses so the indexer can opt into a content-funding-specific start block without extra manual env edits.

### PRD reference

- `TODO.md` content-funding (2026-04-07), deployment wiring for local Hardhat/testnet

### Files changed

- `hardhat/scripts/deploy.js`
- `scripts/setup-env.sh`
- `indexer/ponder.config.ts`
- `DEPLOYMENT.md`
- `TODO.md`
- `README.md`
- `CONTINUITY.md`

### Blockers or notes for next iteration

- The deploy flow is now complete enough for local/testnet address propagation, but the verifier is still a placeholder. Real creator verification on shared networks depends on implementing and deploying a production verifier contract, then updating `ChannelRegistry` to point at it.
- Good interrupt point. The next content-funding chunk should probably be either fake-data seeding or the first UI slice that consumes the now-deployed contract set.

## Content-funding SDK cross-cutting queries — COMPLETE ✓

### What was done

Added the missing SDK-side content-funding query helpers described in `specs/subsystems/content-funding/indexer.md`:

1. `getContractsForChannel(...)`
2. `getChannelOverview(...)`
3. `getContentItemStatus(...)`
4. `getVetoableContracts(...)`

These live in `sdk/src/subsystems/content-funding/queries.ts` and orchestrate across the existing content-funding fold outputs plus folded Pubstarter project data supplied by the caller.

Also added focused coverage in `sdk/src/subsystems/content-funding/queries.test.ts` for funding-progress/status derivation, channel overview aggregation, content-item lookup, and veto-window filtering.

### Key decisions

- Kept this pass scoped to the single SDK query-layer TODO item instead of expanding into event-cache decoding or UI wiring.
- Implemented these as pure fold-orchestration helpers over existing folded state so the future UI can consume them without adding another fetching abstraction first.
- Treated vetoed contracts as event-driven and contract status as a pragmatic derived view (`active`, `successful`, `failed`, `vetoed`, `unknown`) based on folded project totals plus optional `now`.

### PRD reference

- `TODO.md` content-funding (2026-04-07), cross-cutting SDK queries from `specs/subsystems/content-funding/indexer.md`

### Files changed

- `sdk/src/subsystems/content-funding/queries.ts` (new)
- `sdk/src/subsystems/content-funding/queries.test.ts` (new)
- `sdk/src/subsystems/content-funding/index.ts`
- `TODO.md`
- `README.md`
- `CONTINUITY.md`

### Notes for next session

Good interrupt point. The SDK now has the content-funding query helpers the UI spec expects. The next content-funding chunk should probably be either deployment/fake-data wiring or the first actual UI page that consumes these helpers.

## Content-funding indexer integration — COMPLETE ✓

### What was done

Added the indexer integration for content-funding events as described in `specs/subsystems/content-funding/indexer.md`:

1. **Created content-funding ABIs** in `indexer/abis/`:
   - `ContentRegistryAbi.ts` — ContentItemRegistered, ContentItemReleased events
   - `ChannelRegistryAbi.ts` — ChannelVerified, ChannelControlTaken, ContractVetoed events  
   - `ChannelEscrowAbi.ts` — Deposited, Withdrawn events
   - `CreatorAssuranceContractFactoryAbi.ts` — CreatorContractCreated, ThirdPartyMinPurchaseUpdated events

2. **Added content-funding contracts to ponder.config.ts**:
   - Added environment variables: CONTENT_REGISTRY_ADDRESS, CHANNEL_REGISTRY_ADDRESS, CHANNEL_ESCROW_ADDRESS, CREATOR_CONTRACT_FACTORY_ADDRESS
   - Added contract registrations for ContentRegistry, ChannelRegistry, ChannelEscrow, CreatorAssuranceContractFactory
   - Added dynamic factory indexing for CreatorAssuranceContract (child contracts created by the factory)

3. **Registered content-funding event handlers** in `indexer/src/events-cache/index.ts`:
   - ContentRegistry:ContentItemRegistered, ContentItemReleased
   - ChannelRegistry:ChannelVerified, ChannelControlTaken, ContractVetoed
   - ChannelEscrow:Deposited, Withdrawn
   - CreatorAssuranceContractFactory:CreatorContractCreated

4. **Created SDK fold functions** in `sdk/src/subsystems/content-funding/`:
   - `events.ts` — TypeScript interfaces for all content-funding event types with discriminated union
   - `folds.ts` — foldContentRegistry, foldChannelState, foldChannelEscrow, foldCreatorContracts, foldAllContentFundingEvents

### Key decisions

- Reused the existing Pubstarter AssuranceContract ABI for dynamically indexed creator contracts — they're the same contract type, just created by a different factory
- Exported all fold functions from the SDK's content-funding index for easy consumption
- Used `as const` for the factory ABI to match the pattern used by other factory ABIs in the indexer

### PRD reference

- `TODO.md` content-funding (2026-04-07), "Implement the indexer/SDK content-funding event handling described in the spec"
- `specs/subsystems/content-funding/indexer.md`

### Files changed

- `indexer/abis/ContentRegistryAbi.ts` (new)
- `indexer/abis/ChannelRegistryAbi.ts` (new)
- `indexer/abis/ChannelEscrowAbi.ts` (new)
- `indexer/abis/CreatorAssuranceContractFactoryAbi.ts` (new)
- `indexer/ponder.config.ts`
- `indexer/src/events-cache/index.ts`
- `sdk/src/subsystems/content-funding/events.ts` (new)
- `sdk/src/subsystems/content-funding/folds.ts` (new)
- `sdk/src/subsystems/content-funding/index.ts`
- `TODO.md`
- `README.md`
- `CONTINUITY.md`

### Notes for next session

Good interrupt point. Content-funding indexer integration is now complete. Remaining content-funding work:
- On-chain signature-verifier contract path (the ChannelRegistry uses a verifier interface, but the actual verifier contract implementation may need to be created or integrated)
- UI implementation per the spec in `specs/subsystems/content-funding/ui.md`

---

## Platform API service deeper service-level coverage — COMPLETE ✓

### What was done

Expanded `platform-api-service/src/service.test.ts` to cover the remaining service-layer cases called out in `TODO.md`: YouTube channel resolution caching, Twitter and YouTube content-resolution caching, unsupported platform rejection, unconfigured provider failures, and invalid verification inputs.

### Key decisions

- Kept this pass scoped to the single remaining `platform-api-service` coverage task instead of changing runtime behavior.
- Added the missing assertions at the service layer, since route-layer coverage was already in place and the remaining risk was the core orchestration logic around provider selection, caching, and explicit failures.
- Extended the test helpers just enough to override provider configuration and config values so the error paths stay deterministic.

### PRD reference

- `TODO.md` content-funding platform API service follow-up (2026-04-07), deeper service-level YouTube/content-resolution/error-path coverage

### Files changed

- `platform-api-service/src/service.test.ts`
- `TODO.md`
- `README.md`
- `CONTINUITY.md`

### Notes for next session

Good interrupt point. The platform API service MVP coverage follow-up is now closed; the next content-funding chunk should move either to the on-chain signature-verifier contract path or to indexer/UI integration.

## Platform API Express route coverage — COMPLETE ✓

### What was done

Added focused `platform-api-service` route-layer coverage for the Express app: success-path delegation for all four POST endpoints, request-validation failures, `HttpError` and unexpected-error serialization, and separate resolve/verify rate-limit behavior.

### Key decisions

- Kept this pass scoped to the single remaining `platform-api-service` TODO item for Express route coverage.
- Added coverage in `app.test.ts` only, without changing runtime behavior, because the route layer itself was already implemented and the gap was confidence rather than functionality.
- Verified both limiter buckets in one integration-style test so the app-level separation between `/resolve/*` and `/verify/*` routes is covered explicitly.

### PRD reference

- `TODO.md` content-funding platform API service follow-up (2026-04-07), Express route layer coverage

### Files changed

- `platform-api-service/src/app.test.ts`
- `TODO.md`
- `README.md`
- `CONTINUITY.md`

### Notes for next session

Good interrupt point. Remaining `platform-api-service` coverage work is the deeper service-level YouTube/content-resolution/error-path cases.

## Platform API service docker-compose integration — COMPLETE ✓

### What was done

Added `platform-api-service` to the local `docker-compose.yml` stack with a healthcheck, exposed port `3001`, and pass-through environment wiring for platform API credentials and optional verification settings. Also updated the local-start docs/task tracking to reflect that the compose integration TODO item is closed.

### Key decisions

- Kept this pass scoped to the single `platform-api-service` TODO item for docker-compose integration.
- Made the compose service start even when optional Twitter/YouTube/verifier credentials are unset, matching the service's existing `/health` behavior and allowing local startup without secrets.
- Pointed `ETHEREUM_RPC_URL` at the internal `hardhat-node` service by default so optional on-chain verification submission can target the local chain without extra compose edits.

### PRD reference

- `TODO.md` content-funding platform API service follow-up (2026-04-07), add service to docker-compose

### Files changed

- `docker-compose.yml`
- `services.sh`
- `platform-api-service/README.md`
- `TODO.md`
- `README.md`
- `CONTINUITY.md`

### Notes for next session

Good interrupt point. Remaining `platform-api-service` work is broader route/service coverage for YouTube and error paths.

## Platform API rate-limiter stale-entry cleanup — COMPLETE ✓

### What was done

Updated `platform-api-service`'s in-memory rate limiter to lazily sweep expired client entries during requests, and added focused unit coverage for both window reset behavior and stale-entry cleanup.

### Key decisions

- Kept this pass scoped to the single `platform-api-service` TODO item about stale rate-limiter entries.
- Used periodic lazy sweeping inside the existing in-memory limiter instead of timers or background jobs, which keeps the implementation process-local and simple.
- Added a small unit-testable limiter class with injectable time so the cleanup behavior can be verified deterministically.

### PRD reference

- `TODO.md` content-funding platform API service follow-up (2026-04-07), stale rate-limiter entry cleanup

### Files changed

- `platform-api-service/src/rateLimit.ts`
- `platform-api-service/src/rateLimit.test.ts`
- `TODO.md`
- `README.md`
- `CONTINUITY.md`

### Notes for next session

Good interrupt point. Remaining `platform-api-service` work is docker-compose integration plus broader route/service coverage for YouTube and error paths.

## Platform API service CORS support — COMPLETE ✓

### What was done

Added configurable CORS handling to `platform-api-service`, including browser preflight support for the existing JSON POST routes, and added route-layer coverage for wildcard mode, allowlisted origins, and rejected preflights.

### Key decisions

- Kept this pass scoped to the single `platform-api-service` TODO item for CORS support.
- Defaulted `CORS_ALLOWED_ORIGINS` to `*` so the UI can call the service cross-origin out of the box, while still supporting a comma-separated origin allowlist for tighter deployments.
- Implemented CORS directly in the Express app instead of adding another dependency, since the required behavior is small and specific.

### PRD reference

- `TODO.md` content-funding platform API service follow-up (2026-04-07), CORS support for browser clients

### Files changed

- `platform-api-service/src/app.ts`
- `platform-api-service/src/app.test.ts`
- `platform-api-service/src/config.ts`
- `platform-api-service/src/service.test.ts`
- `platform-api-service/README.md`
- `TODO.md`
- `README.md`
- `CONTINUITY.md`

### Notes for next session

Good interrupt point. Remaining `platform-api-service` work is docker-compose integration, broader platform/error-path route coverage, and stale rate-limiter cleanup.

## Platform API channel-cache alias cross-reference — COMPLETE ✓

### What was done

Updated `PlatformApiService` channel caching so handle-keyed cache hits now consult a canonical cache entry keyed by the resolved stable channel ID, and added a regression test covering handle renames that resolve to the same Twitter user.

### Key decisions

- Kept this pass scoped to the single spec-alignment TODO item in `platform-api-service`.
- Reused the existing in-memory cache instead of introducing a second cache type or alias-tracking structure.
- Made cached handle lookups prefer the channel-ID keyed record so older aliases automatically see the most recently resolved handle/display name for the same channel.

### PRD reference

- `TODO.md` content-funding platform API service follow-up (2026-04-07), channel cache cross-reference by resolved ID

### Files changed

- `platform-api-service/src/service.ts`
- `platform-api-service/src/service.test.ts`
- `TODO.md`
- `README.md`
- `CONTINUITY.md`

### Notes for next session

Good interrupt point. Remaining `platform-api-service` work is still the route-layer/test-coverage expansion, CORS support, docker-compose integration, and stale rate-limiter cleanup.

## Content-funding veto-window expiry coverage — COMPLETE ✓

### What was done

Added the missing Hardhat regression test covering a creator trying to veto a third-party content-funding contract after the 7-day veto window has elapsed.

### Key decisions

- Kept this pass scoped to the final open content-funding smart-contract review test gap.
- Reused the existing `Veto flow` coverage pattern so the regression exercises the real `takeChannelControl()` then `vetoContract()` path.
- Asserted both the `VetoWindowExpired` revert and that the failed veto leaves the condition uncancelled with content still registered.

### PRD reference

- `TODO.md` content-funding smart-contract review (2026-04-05), test gap: veto window expiration

### Files changed

- `hardhat/test/ContentFunding.test.js`
- `TODO.md`
- `README.md`
- `CONTINUITY.md`

### Notes for next session

Good interrupt point. The content-funding smart-contract review follow-ups are now fully closed, so the next content-funding chunk should move up-stack into indexer integration or UI support.

## Content-funding cumulative escrow withdrawal coverage — COMPLETE ✓

### What was done

Added the missing Hardhat regression test covering two successful unclaimed-channel contracts depositing into the same escrow balance and the eventual verified channel owner withdrawing the combined total.

### Key decisions

- Kept this pass scoped to one remaining content-funding smart-contract review test gap.
- Exercised the real unclaimed-channel path by creating two separate third-party contracts that each succeed immediately, then calling `withdrawToEscrow()` on both before channel verification.
- Verified the cumulative behavior at the `ChannelEscrow.withdraw()` boundary by asserting the summed withdrawal event amount and final zero escrow balance.

### PRD reference

- `TODO.md` content-funding smart-contract review (2026-04-05), test gap: multiple deposits to escrow with cumulative withdrawal

### Files changed

- `hardhat/test/ContentFunding.test.js`
- `TODO.md`
- `README.md`
- `CONTINUITY.md`

### Notes for next session

Good interrupt point. The remaining content-funding smart-contract review follow-up is the veto-window-expiry regression test, after which the contract-side TODO section should be fully closed.

## Content-funding non-escrow withdrawToEscrow coverage — COMPLETE ✓

### What was done

Added the missing Hardhat regression test for calling `withdrawToEscrow()` on a content-funding contract whose recipient is not the channel escrow.

### Key decisions

- Kept this pass scoped to a single remaining content-funding smart-contract review test gap.
- Covered the revert on a creator-created contract for a verified channel, which exercises the `recipientIsEscrow == false` path without needing extra setup around success conditions.
- Placed the assertion in the existing `CreatorAssuranceContractFactory` coverage where the nearby escrow-routing tests already live.

### PRD reference

- `TODO.md` content-funding smart-contract review (2026-04-05), test gap: `withdrawToEscrow` on non-escrow recipient

### Files changed

- `hardhat/test/ContentFunding.test.js`
- `TODO.md`
- `README.md`
- `CONTINUITY.md`

### Notes for next session

Good interrupt point. Remaining content-funding smart-contract review follow-ups are the two unfilled test gaps around veto-window expiry and cumulative escrow withdrawal.

## Content-funding veto-after-success regression coverage — COMPLETE ✓

### What was done

Added the missing Hardhat coverage for vetoing a third-party content-funding contract after it has already reached its funding threshold and succeeded.

### Key decisions

- Kept this pass strictly to one of the remaining content-funding smart-contract review test gaps instead of bundling the other veto/escrow cases.
- Tested the behavior at the `ChannelRegistry.vetoContract()` entry point rather than calling `CancellableCondition.cancel()` directly, so the regression covers the real creator-control flow.
- Asserted the bubbled `ConditionAlreadySucceeded` error from the wrapped cancellable condition and also verified that the condition remains uncancelled and the content stays registered.

### PRD reference

- `TODO.md` content-funding smart-contract review (2026-04-05), test gap: veto on already-succeeded contract

### Files changed

- `hardhat/test/ContentFunding.test.js`
- `TODO.md`
- `README.md`
- `CONTINUITY.md`

### Notes for next session

Good interrupt point. Remaining content-funding smart-contract review follow-ups are the three unfilled test gaps around veto-window expiry, cumulative escrow withdrawal, and `withdrawToEscrow` on non-escrow recipients.

## Content-funding duplicate-content factory error consistency — COMPLETE ✓

### What was done

Resolved the remaining cosmetic divergence in the content-funding factory so creator-created contracts now reject already-registered content IDs with the factory's `ContentAlreadyRegisteredForContract` error instead of bubbling the registry-level error from `ContentRegistry`.

### Key decisions

- Kept this pass scoped to one TODO item from the content-funding smart-contract review instead of mixing in the remaining test-gap work.
- Moved the duplicate-content preflight check to a shared post-authorization path in `CreatorAssuranceContractFactory`, so third-party and creator-created contracts now validate uniqueness consistently without changing the existing channel-authorization ordering.
- Added a focused Hardhat regression test for the creator-created duplicate path rather than broadening unrelated coverage in the same pass.

### PRD reference

- `TODO.md` content-funding smart-contract review (2026-04-05), minor divergence on creator-created duplicate-content errors

### Files changed

- `hardhat/contracts/content-funding/CreatorAssuranceContractFactory.sol`
- `hardhat/test/ContentFunding.test.js`
- `TODO.md`
- `README.md`
- `CONTINUITY.md`

### Notes for next session

Good interrupt point. Remaining content-funding smart-contract review follow-ups are the four unfilled test gaps around veto-window expiry, veto-after-success, cumulative escrow withdrawal, and `withdrawToEscrow` on non-escrow recipients.

## Content-funding CreatorControlled creator-contract test gap — COMPLETE ✓

### What was done

Added the missing Hardhat coverage for creator-created content-funding contracts on channels that have already moved from `Verified` to `CreatorControlled`.

### Key decisions

- Kept this pass strictly to one TODO item from the content-funding smart-contract review instead of bundling the other test gaps.
- Added the assertion in `CreatorAssuranceContractFactory` coverage, where the verified-channel creator-creation path was already tested, so the two allowed creator states are now covered together.
- Verified the success path by checking both factory bookkeeping and content registration, not just that the transaction avoided reverting.

### PRD reference

- `TODO.md` content-funding smart-contract review (2026-04-05), test gap #5

### Files changed

- `hardhat/test/ContentFunding.test.js`
- `TODO.md`
- `README.md`
- `CONTINUITY.md`

### Notes for next session

Good interrupt point. Remaining content-funding smart-contract review follow-ups are still the four unfilled test gaps around veto-window expiry, veto-after-success, cumulative escrow withdrawal, and `withdrawToEscrow` on non-escrow recipients.

## Subjectiv browser-level e2e attempt — IN PROGRESS / BLOCKED

### What was done

Tried to finish the remaining Subjectiv browser-level e2e pass by adding a real Playwright flow that creates a cause statement, two projects, alignment attestations, and a transitive trust path, then verifies the funding portal before and after adding direct trust in Settings.

### Key decisions

- Reused the existing `ui/e2e` Playwright harness rather than inventing a new test type.
- Added a new spec at `ui/e2e/subjectiv-flow.spec.ts` rather than extending a different subsystem's e2e file.
- Fixed two real harness problems discovered along the way:
  - `ui/e2e/global-setup.ts` now recreates `data/{hardhat,ipfs,ponder}` after clearing Ponder state, so Docker does not recreate the bind-mounted `data/ponder` directory as root and break the non-root indexer container.
  - `ui/e2e/global-setup.ts` now starts only backend Docker services (`hardhat-node`, `hardhat-deploy`, `ipfs`, `indexer`) because Playwright's `webServer` already starts Vite locally; starting the docker-compose `ui` service too caused a port `5173` collision.
- Confirmed that Playwright itself was not the remaining blocker:
  - `npx playwright install chromium` succeeded.
  - `npm run build --workspace=ui` succeeded.
- Fixed one mistake in the new Subjectiv spec itself:
  - alignment actions need `toSubjectId(projectTokenAddress)`, not a raw project/assurance address.

### What is currently blocking progress

The new Playwright Subjectiv spec still fails before reaching the browser assertions because the fresh e2e backend/indexer path never appears to advance past block 0:

- `waitForIndexerToSyncToTxHash()` times out even with a 60s timeout.
- The failure happens immediately after startup while creating the initial Subjectiv scenario, not because of missing Playwright browsers anymore.
- Example failure seen repeatedly: `Indexer did not sync to block 30 within 60000ms. Last seen block: 0`.

So the remaining blocker looks like a Ponder / e2e indexer-startup issue in this path, not a Playwright installation problem and not obviously a Nix/browser issue.

### Likely next steps

- Inspect why the indexer reports healthy but `waitForIndexerToSyncToTxHash()` still sees block 0 forever in the Playwright startup path.
- Compare this e2e startup path with the integration-test path that successfully waits for indexer sync.
- Check whether the issue is:
  - a stale or incorrect GraphQL/status/meta endpoint assumption in `waitForIndexerToSyncToTxHash()`,
  - the indexer starting "healthy" before it is actually reading new blocks,
  - or some mismatch between fresh-anvil startup and Ponder's observed head block in this docker-compose path.
- Once indexer sync is trustworthy, rerun `npm run test:e2e --workspace=ui -- subjectiv-flow.spec.ts` and then decide whether the TODO item can be marked done.

### Files changed during this attempt

- `ui/e2e/subjectiv-flow.spec.ts`
- `ui/e2e/global-setup.ts`
- `ui/e2e/utils/blockchain.ts`

### Notes for next session

This is not a dead end, but it is not finished. The Playwright/browser installation hurdle is cleared; the current problem is the e2e indexer sync path. Start there rather than re-debugging browser installation.

## Subjectiv wording cleanup for Settings and funding portal — COMPLETE ✓

### What was done

Cleaned up the remaining Subjectiv UI copy so the current behavior is easier to understand without knowing the implementation details.

Key decisions:
- Kept this task strictly to wording and expectation-setting, without mixing in new behavior or a browser-level e2e pass.
- Reframed the Settings copy around a personal trust network instead of a single approved attester, which better matches the Subjectiv spec.
- Made the partial-loading alerts in the funding portal and leaderboard explicit that results may still change while more of the network is discovered.
- Added copy for the no-direct-trust case so users are told plainly that alignment pages still show all alignment attestations until they add trust scores.

### PRD reference

- `specs/subsystems/subjectiv/README.md`
- `specs/subsystems/subjectiv/mvp-notes.md`

### Files changed

- `ui/src/conceptspace/components/DirectTrustSettingsSection.tsx`
- `ui/src/conceptspace/components/DirectTrustSettingsSection.test.tsx`
- `ui/src/fundingportal/pages/StatementFundingPortalPage.tsx`
- `ui/src/fundingportal/pages/StatementFundingPortalPage.test.tsx`
- `ui/src/fundingportal/pages/CauseLeaderboardPage.tsx`
- `ui/src/fundingportal/pages/CauseLeaderboardPage.test.tsx`
- `TODO.md`
- `README.md`
- `CONTINUITY.md`

### Notes for next session

Good interrupt point. The remaining Subjectiv follow-up in TODO is the optional true browser-level e2e pass once the flow feels stable enough to avoid churn.

## Subjectiv higher-level UI integration coverage — COMPLETE ✓

### What was done

Added a higher-level Subjectiv UI test pass that exercises how the trusted-set state is surfaced and wired through the app, not just the lower-level worker/cache hooks.

Key decisions:
- Kept this task scoped to integration coverage instead of mixing in wording changes, since the remaining TODOs had cleanly separated those concerns.
- Added direct tests for the Settings direct-trust section rather than only expanding the older implication-attester settings page tests, because Subjectiv behavior now lives in `DirectTrustSettingsSection`.
- Verified funding-portal and leaderboard pages at the page boundary by mocking the heavy child components/queries and asserting that the current trusted set is passed into the trust-aware query/filtering surfaces.
- Kept the new coverage in the existing UI Vitest layer. This gives faster feedback on the Subjectiv flow today, while leaving true browser-level e2e as an optional later follow-up if the UI stabilizes further.

### PRD reference

- `specs/subsystems/subjectiv/README.md`
- `specs/subsystems/subjectiv/mvp-notes.md`

### Files changed

- `ui/src/conceptspace/components/DirectTrustSettingsSection.test.tsx`
- `ui/src/fundingportal/pages/StatementFundingPortalPage.test.tsx`
- `ui/src/fundingportal/pages/CauseLeaderboardPage.test.tsx`
- `TODO.md`
- `README.md`
- `CONTINUITY.md`

### Notes for next session

Good interrupt point. Subjectiv now has stronger coverage both for the lower-level worker/cache infrastructure and for the higher-level UI wiring through Settings and funding-portal pages.

Remaining Subjectiv chunks:
- Decide whether the settings / funding-portal wording needs another pass now that the trust network is surfaced progressively and no longer centers on a single trusted attester.
- If desired later, add a true browser-level e2e test for the Subjectiv flow after the UI text/interaction flow feels stable enough to avoid churn.

## Subjectiv infrastructure test coverage expansion — COMPLETE ✓

### What was done

Added focused UI-side Subjectiv test coverage for the remaining infrastructure plumbing around worker execution and IndexedDB persistence.

Key decisions:
- Kept the scope to one cohesive testing pass instead of mixing in wording/UI changes, since the TODO question was specifically about whether the newer Subjectiv behavior was covered.
- Expanded `subjectivTrustWorkerClient` coverage to include the no-Worker main-thread fallback plus worker crash recovery and re-creation for a subsequent request.
- Added a dedicated `subjectivTrustCache` test file with a tiny in-test IndexedDB fake so cache-key normalization and cache-entry isolation can be verified reliably in the current Vitest environment.
- Narrowed the top-level TODO/README wording from a vague "do we have tests?" prompt to the more honest remaining work: a higher-level integration/e2e Subjectiv review.

### PRD reference

- `specs/subsystems/subjectiv/README.md`
- `specs/subsystems/subjectiv/mvp-notes.md`

### Files changed

- `ui/src/shared/subjectivTrustWorkerClient.test.ts`
- `ui/src/shared/subjectivTrustCache.test.ts`
- `TODO.md`
- `README.md`
- `CONTINUITY.md`

### Notes for next session

Good interrupt point. Subjectiv unit coverage is now stronger around the worker/cache infrastructure.

Remaining Subjectiv chunks:
- Decide whether the settings / funding-portal wording needs another pass now that the UI exposes trust-network progress and no longer centers on a single trusted attester.
- Do a higher-level integration/e2e coverage pass for the full Subjectiv flow across Settings, trust recomputation, and funding-portal filtering.

This is a reasonable point either for a small wording pass or for a broader cross-component review of Subjectiv behavior.

## SDK-dependent workspace build ordering — COMPLETE ✓

### What was done

Added explicit SDK prebuild hooks to the workspaces that compile against `@commonality/sdk` build artifacts so they no longer race stale `sdk/dist` output during local builds or type-checks.

Key decisions:
- Chose the minimal safe fix: `prebuild` / `pretypecheck` hooks (and `predev` where it mattered) instead of a larger monorepo refactor to source-level aliasing.
- Applied the fix to all current SDK-consuming workspaces that compile locally: `ui`, `attester`, `finder`, and `fake-data-generation`.
- Verified the main failure mode directly by deleting `sdk/dist` and rebuilding `ui`; the UI build now rebuilds the SDK first instead of failing on stale types.

### Files changed

- `ui/package.json`
- `attester/package.json`
- `finder/package.json`
- `fake-data-generation/package.json`
- `CONTINUITY.md`

### Notes for next session

This removes the stale-SDK-artifact trap for normal per-workspace builds and type-checks. One tradeoff remains: if you intentionally kick off several SDK-dependent workspace builds in parallel, they will each redundantly rebuild the SDK first. That's inefficient but safe.

## Subjectiv partial-progress UI updates — COMPLETE ✓

### What was done

Added incremental Subjectiv progress updates so trust-aware UI surfaces can start rendering with a partially discovered trusted set before the background recomputation fully finishes.

Key decisions:
- Extended the SDK trust traversal with an optional progress callback that emits snapshots only when the reachable trusted-set membership grows, so the UI gets meaningful updates without excessive chatter.
- Kept IndexedDB persistence final-result-only; partial updates are transient UI state and do not complicate the cache format.
- Reused the existing worker pipeline by adding a lightweight `trustedSetProgress` message instead of introducing a separate streaming API surface.
- Updated the main trust UI copy to surface "accounts found so far" while recomputation is still in flight.

### PRD reference

- `specs/subsystems/subjectiv/README.md`
- `specs/subsystems/subjectiv/mvp-notes.md`

### Files changed

- `sdk/src/subsystems/subjectiv/types.ts`
- `sdk/src/subsystems/subjectiv/queries.ts`
- `sdk/src/subsystems/subjectiv/queries.test.ts`
- `ui/src/shared/subjectivTrust.ts`
- `ui/src/shared/subjectivTrustComputation.ts`
- `ui/src/shared/subjectivTrustComputation.test.ts`
- `ui/src/shared/subjectivTrustWorkerClient.ts`
- `ui/src/shared/subjectivTrustWorkerClient.test.ts`
- `ui/src/shared/workers/subjectivTrustWorker.ts`
- `ui/src/shared/hooks/useTrustedSet.ts`
- `ui/src/shared/hooks/useTrustedSet.test.tsx`
- `ui/src/conceptspace/components/DirectTrustSettingsSection.tsx`
- `ui/src/fundingportal/pages/StatementFundingPortalPage.tsx`
- `ui/src/fundingportal/pages/CauseLeaderboardPage.tsx`
- `specs/subsystems/subjectiv/mvp-notes.md`
- `TODO.md`
- `README.md`
- `CONTINUITY.md`

### Notes for next session

Good interrupt point. Subjectiv now supports worker-based partial trusted-set updates on top of cache rehydration.

Remaining Subjectiv chunks:
- Decide whether the settings / funding-portal wording needs another pass now that the UI exposes trust-network progress and no longer centers on a single trusted attester.
- Broader coverage review for the overall Subjectiv flow beyond the newly added progress-path tests.
- Longer-term freshness / invalidation strategy for cached downstream direct-trust mappings if periodic full refresh still feels too stale.

This is a reasonable point for either a small wording-focused pass or a higher-level review of Subjectiv test coverage.

## Subjectiv per-user direct-trust cache reuse — COMPLETE ✓

### What was done

Extended the Subjectiv IndexedDB cache so refreshes can reuse previously visited users' folded direct-trust mappings instead of refetching the whole known trust neighborhood every time.

Key decisions:
- Kept the cache opportunistic: cached downstream direct-trust mappings are reused, but the connected user's own direct-trust mapping is always refetched first so local edits take effect immediately.
- Reused the SDK traversal's existing in-memory direct-trust cache by allowing callers to seed it, rather than adding a second traversal implementation in the UI.
- Stored cached direct-trust mappings in a structured-clone-friendly object shape so the same payload works for IndexedDB persistence and worker message passing.
- Preserved backward compatibility with existing cached trusted-set snapshots by treating the new direct-trust mapping payload as optional.

### PRD reference

- `specs/subsystems/subjectiv/README.md`
- `specs/subsystems/subjectiv/mvp-notes.md`

### Files changed

- `sdk/src/subsystems/subjectiv/types.ts`
- `sdk/src/subsystems/subjectiv/queries.ts`
- `sdk/src/subsystems/subjectiv/queries.test.ts`
- `ui/src/shared/subjectivTrust.ts`
- `ui/src/shared/subjectivTrustCache.ts`
- `ui/src/shared/subjectivTrustComputation.ts`
- `ui/src/shared/subjectivTrustComputation.test.ts`
- `ui/src/shared/subjectivTrustWorkerClient.ts`
- `ui/src/shared/workers/subjectivTrustWorker.ts`
- `ui/src/shared/hooks/useTrustedSet.ts`
- `ui/src/shared/hooks/useTrustedSet.test.tsx`
- `specs/subsystems/subjectiv/mvp-notes.md`
- `TODO.md`
- `README.md`
- `CONTINUITY.md`

### Notes for next session

Good interrupt point. Subjectiv now persists both the trusted-set snapshot and the visited direct-trust neighborhood cache.

Remaining Subjectiv chunks:
- Partial-progress / incremental UI updates while the worker traversal is still running
- Any wording cleanup in Settings / funding portal now that alignment filtering is trust-graph-based
- Longer-term freshness strategy for downstream cached direct-trust mappings if periodic full refresh still feels too stale

This may be a good point for a higher-level Subjectiv review after the partial-progress pass, since the main MVP infrastructure pieces are now in place.

---

## Subjectiv IndexedDB trusted-set rehydration — COMPLETE ✓

### What was done

Added IndexedDB-backed persistence for the UI's computed Subjectiv trusted set and rehydrated that snapshot on startup before the next recomputation finishes.

Key decisions:
- Kept the public `useTrustedSet()` hook API unchanged and layered persistence underneath it.
- Rehydrated only the final trusted-set snapshot for now, because the current SDK/worker path does not expose the traversal's per-user direct-trust cache as a reusable artifact yet.
- If a refresh fails after startup, the hook now keeps showing the cached trusted set and surfaces the error instead of dropping back to an empty state.
- Treated IndexedDB as an opportunistic cache: failures to read or write it log warnings but do not block fresh computation.

### Files changed
- `ui/src/shared/hooks/useTrustedSet.ts`
- `ui/src/shared/hooks/useTrustedSet.test.tsx`
- `ui/src/shared/subjectivTrustCache.ts`
- `specs/subsystems/subjectiv/mvp-notes.md`
- `TODO.md`
- `README.md`
- `CONTINUITY.md`

### Notes for next session

Good interrupt point. Subjectiv now has worker execution plus trusted-set snapshot rehydration. The remaining chunks are:
- Persist and reuse cached per-user direct trust mappings during recomputation so startup refreshes can avoid re-fetching already-visited users.
- Partial-progress updates so the UI can show the trust network filling in while traversal is underway.
- Any wording cleanup in Settings / funding portal once the behavior feels stable.

The worker bundle is still large because it pulls in the SDK trust-query path directly, and this change does not alter that.

---

## Subjectiv Web Worker execution — COMPLETE ✓

### What was done

Moved Subjectiv trusted-set computation off the main thread for the UI hook that powers funding-portal filtering and the Settings summary.

Key decisions:
- Kept the public `useTrustedSet()` hook API unchanged so the rest of the UI did not need to change.
- Added a dedicated browser worker entrypoint plus a small shared client that sends compute requests and receives trusted-set results.
- Kept a main-thread fallback in the client for environments without `Worker`, so tests and unsupported runtimes still behave correctly.
- Left IndexedDB persistence and partial-progress streaming for a later chunk; this task only changes where the full recomputation runs.

### Files changed
- `ui/src/shared/hooks/useTrustedSet.ts`
- `ui/src/shared/hooks/useTrustedSet.test.tsx`
- `ui/src/shared/subjectivTrust.ts`
- `ui/src/shared/subjectivTrustWorkerClient.ts`
- `ui/src/shared/workers/subjectivTrustWorker.ts`
- `ui/vite.config.ts`
- `specs/subsystems/subjectiv/mvp-notes.md`
- `TODO.md`
- `README.md`
- `CONTINUITY.md`

### Notes for next session

Good interrupt point. The remaining Subjectiv chunks are still:
- IndexedDB persistence / rehydration for the computed network and direct-trust cache
- Partial-progress updates so the UI can show the network filling in while traversal is underway
- Any wording cleanup in Settings / funding portal once the behavior feels stable
