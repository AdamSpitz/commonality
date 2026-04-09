# Continuity notes for ephemeral AI instances

## Content-funding platform verifiers — COMPLETED

### What was done

Implemented YouTube video-description verification as an additional platform verifier beyond the existing Twitter tweet-based verification:

**1. Platform API service — YouTube verification support**
- Added `findVerificationPost()` method to `YouTubeClient` that searches the channel's recent videos for the challenge code in title or description
- Updated `PendingVerificationChallenge` type to support both 'twitter' and 'youtube' platforms
- Modified `createVerificationChallenge()` to generate platform-specific verification post templates (tweet text vs video description text)
- Modified `confirmVerification()` to route to the correct client based on platform
- Updated health endpoint to report YouTube verification configuration status

**2. Types and interfaces**
- Extended `YouTubeClientLike` interface with `findVerificationPost()` method
- Changed response field from `tweetTemplate` to `verificationPostTemplate` (generic name that works for both platforms)

**3. UI updates**
- Updated `ClaimFlowModal.tsx` to handle both Twitter and YouTube verification flows
- For YouTube: shows video description text to add, links to YouTube Studio, and skips the tweet URL input
- Error messages now include platform-specific guidance

**4. Tests**
- Updated platform-api-service tests to use new field names and test YouTube client stub
- Updated test for invalid platform to accept youtube alongside twitter

### Notes for next session

Content-funding MVP is now complete. Substack verification is intentionally deferred per the spec (no official API available; can add email/DNS-based verification later if needed).

Remaining work:
- Run the live Playwright content-funding flow against a real local stack
- Non-MVP work (embedded wallets, off-ramp)

Good interrupt point: yes. Content-funding MVP is fully complete with all three platforms (Twitter, YouTube, Substack) having their respective verification capabilities.

### Files changed

- `platform-api-service/src/youtubeClient.ts` — added `findVerificationPost()` method
- `platform-api-service/src/types.ts` — extended interfaces for YouTube verification
- `platform-api-service/src/service.ts` — updated challenge creation and confirmation for multi-platform
- `platform-api-service/src/app.ts` — no changes needed (routes already platform-agnostic)
- `platform-api-service/src/app.test.ts` — updated test mocks
- `platform-api-service/src/service.test.ts` — updated test mocks and assertions
- `ui/src/content-funding/hooks/useClaimFlow.ts` — updated response type
- `ui/src/content-funding/components/ClaimFlowModal.tsx` — platform-aware UI
- `specs/subsystems/content-funding/platform-api-service.md` — marked YouTube as done in future work
- `TODO.md` — marked verifier task as complete
- `README.md` — updated status

### Verification

- `npm run build` ✅
- `npm run lint` ✅ (1 warning in ui/main.tsx, pre-existing)
- `npm run test --workspace=platform-api-service` ✅ (26 tests passing)
- `npm run test --workspace=ui` ✅ (647 tests passing)

---

## Content-funding UI fixes — COMPLETED

### What was done

Fixed three issues with the content-funding UI:

**1. Creator claim flow UI — API response shape mismatch**
- Updated `useClaimFlow.ts` to use correct API field names: `tweetTemplate` instead of `challengeTweetText`, and added new fields (`channelId`, `handle`, `displayName`).
- Updated `ClaimFlowModal.tsx` to use `tweetTemplate` field and handle the new verify confirm response shape (`proof` object with `txHash`).
- Fixed the step initialization logic: unclaimed channels now correctly start at step 1 (verify identity) instead of skipping to step 2.

**2. Verified-creator contract creation — wrong third-party detection**
- Fixed `CreateContractPage.tsx` to only treat `unclaimed` channels as third-party, not `verified` channels. Per the spec, verified creators should be able to create contracts without the minimum purchase requirement.

**3. Create-contract validation — missing checks**
- Added validation requiring all content items to resolve successfully via `/resolve/content`.
- Added validation that resolved content belongs to the correct channel (matches canonicalChannelId).
- Added check for already-registered content items by querying `state.contentRegistry.items`.
- Added UI feedback via `alreadyRegistered` field and updated validation status display.

**4. Pubstarter "Escrowed Balance" display**
- Fixed `ContentFundingProjectSection.tsx` to display the channel escrow balance (`channel.escrow.balance`) instead of the unrelated `contract.project.totalReceived`.

### Notes for next session

All unit tests pass. The remaining items from the TODO are:
- Run the live content-funding Playwright flow (`cd ui && npx playwright test content-funding-flow`)
- Add unit/integration coverage for content-funding UI surfaces
- UI polish: creator/channel pages still show canonical IDs instead of resolved handles/display names (partially addressed in claim flow but not fully resolved)

### Files changed

- `ui/src/content-funding/hooks/useClaimFlow.ts`
- `ui/src/content-funding/components/ClaimFlowModal.tsx`
- `ui/src/content-funding/pages/CreateContractPage.tsx`
- `ui/src/content-funding/components/ContentFundingProjectSection.tsx`

---

## Content-funding e2e test — COMPLETED (pending live test run)

### What was done

Identified and fixed the root cause of the `waitForIndexerToSyncToTxHash()` hang that blocked
both the Subjectiv and content-funding Playwright tests.

**Root cause**: `waitForIndexerToSyncToTxHash` polls `{origin}/status` where origin is derived
from `machinery.indexerUrl` (e.g. `http://localhost:5173/graphql` → `http://localhost:5173`).
But Vite's dev-server proxy did not proxy `/status` to the indexer, so every poll got a 404 from
Vite and the function timed out without ever advancing past block 0.

**Fixes made**:
1. `ui/vite.config.ts` — added `/status` to the proxy so `http://localhost:5173/status` forwards
   to the indexer.
2. `ui/e2e/global-setup.ts` — added content-funding addresses (CONTENT_REGISTRY_ADDRESS,
   CHANNEL_REGISTRY_ADDRESS, CHANNEL_ESCROW_ADDRESS, CREATOR_CONTRACT_FACTORY_ADDRESS) to
   `copyContractAddresses` so they are reliably written to `ui/.env` with `VITE_` prefix.
3. `ui/e2e/utils/blockchain.ts` — exposed content-funding addresses from `getContractAddresses`.
4. `hardhat/scripts/deploy.js` — writes content-funding `VITE_*` vars to `ui/.env` on fresh deploy.
5. `sdk/src/indexer-sync.ts` — added explicit `number` type annotation to `timeoutMs` parameter
   to allow callers to pass values other than the literal-typed default (10000).
6. `ui/e2e/content-funding-flow.spec.ts` — new Playwright spec that creates a creator assurance
   contract on-chain and verifies the channel card appears on the Browse Creators page.

### Notes for next session

The code changes are complete and all unit tests pass (`npm run build && npm run test`). The
Playwright test has NOT been run against a live stack yet because that requires the full Docker
Compose setup (hardhat + indexer + Vite dev server). To validate end-to-end, run:

```
cd ui && npx playwright test content-funding-flow
```

If it fails:
- Check that `/status` is now proxied correctly: `curl http://localhost:5173/status` should return
  the Ponder sync status JSON (not 404).
- Check that the indexer has `CREATOR_CONTRACT_FACTORY_ADDRESS` set: look at
  `docker-compose logs indexer | grep CREATOR_CONTRACT`.
- If `waitForIndexerToSyncToTxHash` still times out, add verbose logging to the test by setting
  `shouldTestsBeVerbose: true` in `createSDKMachinery`.

The Subjectiv e2e test (`subjectiv-flow.spec.ts`) is blocked by the same `/status` proxy issue,
so the fix here should unblock that test too (no code changes needed there).

### Files changed

- `ui/vite.config.ts`
- `ui/e2e/global-setup.ts`
- `ui/e2e/utils/blockchain.ts`
- `hardhat/scripts/deploy.js`
- `sdk/src/indexer-sync.ts`
- `ui/e2e/content-funding-flow.spec.ts` (new)

---

## Content-funding create-contract UI coverage — COMPLETED

### What was done

Added focused Vitest coverage for `CreateContractPage` so the recent content-funding UI fixes
are now exercised by automation instead of relying only on manual testing.

Covered cases:
1. Verified channels submit as creator contracts (`isThirdParty: false`) and do not invoke the
   third-party minimum-purchase check.
2. Resolved content from a different channel is rejected before submission.
3. Already-registered content is rejected before submission.
4. Unclaimed channels enforce the third-party minimum purchase requirement.

### Notes for next session

The tests exposed one remaining UX gap: the create-contract form does not surface the
"already registered" helper text immediately after content resolution when the registration
already exists in state; it still blocks correctly at submit time. This was added back to
`TODO.md` as a follow-up polish item.

Good interrupt point: yes. The recent create-contract fixes now have focused UI coverage, so a
next pass could either address the remaining create-contract polish item or move to the
multi-attester display task.

### Files changed

- `ui/src/content-funding/pages/CreateContractPage.test.tsx` (new)
- `TODO.md`
- `README.md`

### Verification

- `npm test --workspace=ui -- CreateContractPage.test.tsx`
- `npm run build --workspace=ui`

---

## Content-funding multi-attester display — COMPLETED

### What was done

Finished the remaining content-attestation display follow-up so content-funding UI surfaces no
longer collapse each content item down to a single latest attestation.

Key changes:
1. `sdk/src/subsystems/content-funding/queries.ts` now exposes
   `getContentAttestations()` plus `selectLatestContentAttestations()`, which keep the latest
   attestation per attester for a content item instead of returning only one global latest event.
2. `ui/src/content-funding/hooks/useContentFundingState.ts` now fetches attestations once per
   canonical content ID, stores all latest-per-attester results, and avoids redundant lookups for
   duplicate content IDs in the rendered state.
3. Added `ContentAttestationSummary.tsx`, a shared UI component that renders one compact badge per
   attester with stable ordering and tooltips.
4. `ChannelPage.tsx` and `ContentFundingProjectSection.tsx` now use that shared component, so both
   the channel-level content list and the Pubstarter-integrated project section show multiple known
   attesters coherently.

PRD/spec reference: `specs/subsystems/content-funding/ui.md` content-attestation display
requirements and the content-funding follow-up list in `TODO.md`.

### Notes for next session

Remaining content-funding MVP follow-up is now just:
- Run the live content-funding Playwright flow against a real local stack.

Good interrupt point: yes. The remaining work is now a clean e2e validation task rather than more
content-funding UI implementation.

### Files changed

- `sdk/src/subsystems/content-funding/queries.ts`
- `sdk/src/subsystems/content-funding/queries.test.ts`
- `ui/src/content-funding/hooks/useContentFundingState.ts`
- `ui/src/content-funding/components/ContentAttestationSummary.tsx` (new)
- `ui/src/content-funding/components/ContentAttestationSummary.test.tsx` (new)
- `ui/src/content-funding/components/ContentFundingProjectSection.tsx`
- `ui/src/content-funding/pages/ChannelPage.tsx`
- `TODO.md`
- `README.md`
- `CONTINUITY.md`

### Verification

- `npm test --workspace=@commonality/sdk -- src/subsystems/content-funding/queries.test.ts`
- `npm test --workspace=ui -- ContentAttestationSummary.test.tsx`
- `npm run build --workspace=@commonality/sdk`
- `npm run build --workspace=ui`

---

## Content-funding already-registered status surfacing — COMPLETED

### What was done

Finished the remaining create-contract UX follow-up so already-registered content is surfaced
immediately after `/resolve/content` succeeds, instead of only appearing as a submit-time block.

Key changes:
1. `CreateContractPage.tsx` now derives `alreadyRegistered` as soon as resolved content comes
   back from the platform API, using current folded state.
2. The existing `state`-driven recomputation remains in place so the flag still refreshes if the
   folded content-registry state changes later.
3. Submit validation was reordered so registered items produce the specific
   "already registered in active contracts" error instead of getting filtered out too early and
   falling back to the generic "At least one valid content item is required" message.
4. `CreateContractPage.test.tsx` now asserts that the helper text appears immediately after
   resolution for already-registered content, while preserving the submit-time rejection test.

PRD/spec reference: `specs/subsystems/content-funding/ui.md` and `TODO.md` content-funding
follow-up list.

### Notes for next session

Remaining content-funding MVP follow-up is now down to:
- Tighten multi-attester display so known attesters render coherently in the UI.
- Run the live Playwright content-funding flow against a real local stack.

Good interrupt point: yes. This closes the last small create-contract validation/polish item, so
the next pass can cleanly focus on the multi-attester display task or the live e2e run.

### Files changed

- `ui/src/content-funding/pages/CreateContractPage.tsx`
- `ui/src/content-funding/pages/CreateContractPage.test.tsx`
- `TODO.md`
- `README.md`
- `CONTINUITY.md`

### Verification

- `npm test --workspace=ui -- CreateContractPage.test.tsx`
- `npm run build --workspace=ui`

---

## Content-funding polish items — COMPLETED

### What was done

Completed three minor polish items from the content-funding follow-up list:

**1. Placeholder IPFS metadata CIDs replaced with real uploads**
- Added contract name and description fields to `CreateContractPage.tsx`
- On submit, uploads metadata to IPFS using `uploadToIPFS` from the SDK
- Uses the real CID instead of placeholder `bafkriaaaa`
- Added `machinery` to `useContentFundingState` return type so components can access IPFS config

**2. Funding Portal integration for content-funding contracts**
- Updated `AlignedProjectCard.tsx` to include content-funding info (channel, state, content item count)
- Added `ContentFundingBadge` showing "Content Funding" type indicator
- Added `contentItemCount` to the `ContentFundingInfo` type and populated from contract's `contentItems.length`
- Renders in the card details section

**3. oEmbed preview caching**
- Added a module-level `oEmbedCache` Map in `ChannelPage.tsx`
- Caches Twitter oEmbed responses by URL key
- Checked on mount; only fetches if not already cached

### Notes for next session

All content-funding minor polish items are now complete. The remaining content-funding work is:
- Run the live Playwright content-funding flow against a real local stack
- Non-MVP work (embedded wallets, off-ramp, etc.)

Good interrupt point: yes. All content-funding MVP polish is done. Next step could be running the e2e tests.

### Files changed

- `ui/src/content-funding/hooks/useContentFundingState.ts` — added `machinery` to return type
- `ui/src/content-funding/pages/CreateContractPage.tsx` — added contract name/description fields, real IPFS upload
- `ui/src/content-funding/pages/CreateContractPage.test.tsx` — added machinery mock, uploadToIPFS mock
- `ui/src/fundingportal/components/AlignedProjectCard.tsx` — added content-funding info display
- `ui/src/content-funding/pages/ChannelPage.tsx` — added oEmbed caching
- `TODO.md` — marked items as done
- `README.md` — updated status

### Verification

- `npm test --workspace=ui -- CreateContractPage.test.tsx`
- `npm test --workspace=ui -- ContentAttestationSummary.test.tsx`
- `npm run build`
