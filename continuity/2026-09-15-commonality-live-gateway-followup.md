# Commonality live gateway follow-up handoff — 2026-09-15

## Objective

Finish the live verification of the CauseStarter → Commonality cutover by landing and deploying the small Cloudflare UI gateway SPA-fallback fix described below. The main rename release and DNS cutover are already complete.

## Completed state

- The full cutover implementation is in merged PR [#187](https://github.com/AdamSpitz/commonality/pull/187). `origin/dev` and `origin/master` both point to merge commit `b1ced9961d5102a5f66f8ccd85deac4d2c13c636`.
- Commonality was published at CID `QmSJKGVBm6nims9twxk3xFaKXjire4yj7EENJbZf9xPHxN` using the existing Commonality IPNS identity (sequence 14).
- Cloudflare Worker version `eda5eb90-649c-42b2-b43b-ccd2605283fb` was deployed with the canonical eight routes.
- Render platform API deploy `dep-dakqcjuk1f9s73ci693g` is live. `CORS_ALLOWED_ORIGINS` contains exactly eight origins, includes `https://testnet.commonality.works`, and excludes both retired hostnames.
- Cloudflare authoritative DNS now has one proxied record for `testnet.commonality.works` and zero records for:
  - `commonality.testnet.commonality.works`
  - `causestarter.testnet.commonality.works`
- `https://testnet.commonality.works/` resolves and returns HTTP 200 with title `Commonality`.
- The repository-wide rename verification, review findings, and known integration-test limitation are captured in PR #187 and the prior handoff at `continuity/2026-09-15-causestarter-to-commonality-handoff.md`.

## Remaining live defect

Uncached SPA deep links such as `https://testnet.commonality.works/founders` currently return HTTP 429 with the public IPFS gateway's service-worker migration message. Root cause:

1. The dedicated Pinata origin hangs on a nonexistent raw path such as `/ipfs/<cid>/founders`.
2. `fetchFromGateways` tries public fallbacks, whose last response can be 429.
3. `shouldTrySpaFallback` in `cloudflare-ui-gateway/ui-gateway.mjs` previously required exactly 404, so it never fetched `/index.html` after a 429.

There are uncommitted changes that replace the exact-404 condition with `if (response.ok) return false` and add a regression test in `cloudflare-ui-gateway/ui-gateway.test.mjs`.

The new test currently fails because it sets `globalThis.caches = undefined`. `fetchThroughEdgeCache` returns early when no cache exists, before the SPA-fallback block. The existing successful SPA test supplies a mock `caches.default`. Update the new test to use the same cache mock (or, if preferred after review, refactor fallback so it also runs without Cache API). The production Worker does have Cache API; the minimal intended fix is to correct the test setup and verify the changed predicate.

## Working tree / branch caution

- Current local branch is still `feature/rename-causestarter-commonality`, whose commit was already merged.
- Uncommitted files should be limited to:
  - `cloudflare-ui-gateway/ui-gateway.mjs`
  - `cloudflare-ui-gateway/ui-gateway.test.mjs`
  - this handoff document
- Preserve those edits, fetch `origin/dev`, and create a new focused fix branch from the merged tip without discarding the working tree. Read `workflow/branching.md` before doing so.

## Suggested next steps

1. Confirm `git status` and review the two-file Worker diff.
2. Correct the new test's cache setup and run `npm run cloudflare-gateway:test`.
3. Commit the Worker fix and this handoff on a new fix branch, push it, open a PR to `dev`, review/post the required receipt, merge, and promote `dev` to `master` per `workflow/review-gate.md` and `workflow/branching.md`.
4. Deploy with `npx wrangler deploy -c cloudflare-ui-gateway/wrangler.testnet.toml`.
5. Verify `/`, `/founders`, `/for-organizations`, `/docs`, `/causes`, and `/config.js`. Then use a real browser to confirm rendered headings, no CauseStarter branding, and sibling links resolve to canonical testnet hosts.
6. Cloudflare DNS credentials are now in the canonical operator secrets file; do not print or copy their values. No further DNS mutation should be needed.

## Suggested skills

- `pr` — land the focused Worker fix through review, merge, and promotion.
- `browser-driving` — perform the final rendered live-site and navigation verification after deployment.

## Verification notes

- The browser-driving attempt timed out because the broken deep-link requests did not settle; do not interpret that timeout as a separate browser bug until the gateway fallback is redeployed.
- Local recursive DNS may temporarily cache the deleted retired records. Use the Cloudflare API/read-back as authoritative while caches expire.
- The direct Pinata `/index.html` request returned HTTP 200, confirming the published artifact itself is healthy.
