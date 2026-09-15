# Handoff: finish CauseStarter → Commonality cutover

## Objective and settled decisions

Finish the in-progress rename on branch `feature/rename-causestarter-commonality`, then follow the repository's PR/review/release workflow and deploy the testnet site.

The user explicitly settled the product/design choices in this chat:

- Commonality becomes the founder-first primary product; do not resurrect the old generic umbrella-first entry point.
- The current CauseStarter experience is the new Commonality core.
- Retire CauseStarter immediately: no URL redirects and no browser-state migration (there are no meaningful users yet).
- Remove CauseStarter from current UI, docs, source-module names, commands, deployments, and verifier labels.
- Preserve `causestarter.*` only where it is a persisted/public schema or storage compatibility identifier (notably roster/bridge document kinds and existing local-storage keys).
- Dismantle the old generic landing and `/participate` page.
- Keep `/founders` as a concise organizer gateway (exact shape was delegated to implementation judgment), rewrite `/for-organizations` to remove overclaims, and preserve useful deeper vision material.
- Canonical testnet URL: `https://testnet.commonality.works`.
- Remove `commonality.testnet.commonality.works` and `causestarter.testnet.commonality.works` rather than redirecting them.
- Keep sibling hosts such as `civility.testnet.commonality.works`.
- Eventual mainnet primary URL: `https://commonality.works`, alongside sibling hosts such as `civility.commonality.works`.
- Reuse the existing Commonality testnet IPNS identity, not the former CauseStarter IPNS identity.
- User authorized deploying the completed cutover.

Read [`README.md`](../README.md), [`workflow/branching.md`](../workflow/branching.md), and the applicable role links before continuing. The product facts behind the decisions are in the current diff and the existing source-of-truth docs; do not restart the design interview.

## Work completed so far

- Created `feature/rename-causestarter-commonality` from `origin/dev`. The previous clean `misc` branch had four unrelated commits and was deliberately left intact.
- Moved `ui/src/causestarter/` to `ui/src/commonality/`.
- Replaced the old Commonality manifest with the founder-first route set and retained `/founders` plus `/for-organizations`; removed old landing and `/participate` source.
- Removed `causestarter` from `DomainId`, domain manifests, Vite domain/build lists, runtime URL config, and local UI domain inventory.
- Updated cross-domain host resolution so Commonality resolves to the environment apex (`testnet.commonality.works` / `commonality.works`) while siblings remain prefixed.
- Moved Docker/e2e glue from `causestarter/` to `commonality-ui/` and renamed the local deployment script to `scripts/deploy-commonality.sh`.
- Merged the practical end-user docs into `docs/end-user/commonality/`, retaining the vision subtree.
- Replaced the docs index with the practical bulletin-board/two-twists briefing.
- Added a concise founder gateway and tempered the most obvious `/for-organizations` accounting/legal overclaims.
- Removed the separate CauseStarter local IPFS publisher; `ui-ipfs-publisher-commonality` now builds the founder-first Commonality bundle.
- Changed the Cloudflare worker testnet route to `testnet.commonality.works/*`, mapped hostname label `testnet` to `IPNS_COMMONALITY`, removed CauseStarter routing, and changed the planned mainnet route to `commonality.works/*`.
- Removed CauseStarter from `deployments/testnet-names.json` and the non-secret IPNS inventory.
- Mechanically renamed current verifier domain/workflow IDs and files to Commonality.

Validation already run:

- `npm run typecheck --workspace=ui` passed after the domain-removal fixes.
- `npm run cloudflare-gateway:test` passed: 7 UI-gateway tests plus service-gateway tests.
- `bash -n scripts/services.sh scripts/deploy-commonality.sh scripts/setup-env.sh` passed.
- `docker compose config --quiet` passed.

## Important state and risks

There is no commit yet. The worktree contains a large rename diff (roughly 230 files), including mechanical wording/path edits. Preserve it; audit rather than restart.

Some global mechanical replacements were intentionally broad. Review them carefully, especially historical prose in `CONTINUITY.md`, `workflow/testnet-working-plan.md`, and old planning sections. Historical records should not be rewritten misleadingly merely because the current product name changed. ADR files under `specs/decisions/` were excluded from the broad lowercase sweep and should remain historically accurate.

The stable compatibility identifiers must remain spelled `causestarter.*`. Current known examples:

- `causestarter.roster`
- `causestarter.roster-coherence`
- `causestarter.bridge-cluster`
- existing `causestarter.*` local/session-storage keys and the related custom browser event

Add an explanatory compatibility comment where useful, but do not silently change those wire/storage values.

## Remaining implementation work

1. Finish the stale-name/path audit with `rg -n -i "causestarter"`, classifying every occurrence as either:
   - intentional immutable history;
   - intentional persisted/storage compatibility;
   - stale current product/build/deployment naming that must change.
2. Fix known current stale references:
   - `scripts/check-local-config-sync.mjs` still uses CauseStarter variable/path names.
   - `scripts/generate-render-yaml.mjs` was partly fixed; regenerate `render.yaml`/template and verify CORS contains only `https://testnet.commonality.works` for the primary product.
   - `scripts/seed-commonality-vite-env.py`, Dockerfile workspace paths, `hardhat/scripts/deploy-incremental.js`, and local docs were partly fixed; re-audit.
   - `ui/src/docs/DocsPage.tsx` is the generic docs renderer and still knows the removed domain; decide whether to remove that branch (likely yes).
   - `package-lock.json` still showed an extraneous `causestarter` entry at the last inspection; rerun a normal lockfile update after workspace/path cleanup.
   - Cloudflare README table was mechanically edited and needs a readability/accuracy pass.
   - Cloudflare gateway tests now exercise the testnet apex and pass.
3. Verify the product docs accurately state eight sites total (Commonality replaces the ninth CauseStarter build), not “eight plus Commonality” or “ninth domain.” Focus on `specs/product/ui-domains.md`, `specs/tech/ui-domains.md`, root README, glossary, and user-doc inventory.
4. Audit `/for-organizations` plus its deeper docs for remaining unsupported “ledger replaces reporting/compliance” or “no organization needed” claims.
5. Remove the completed rename item from `inbox.md` only when the whole task is actually finished, per that file's instructions. Update the Pinata-origin reminder because the primary origin is now `https://testnet.commonality.works`.
6. Run focused tests, then `npm run lint`, `npm run build`, and `npm run test:fast` (or the repository's proportional verifier commands). Exercise a local Commonality artifact if practical.
7. Review the full diff for accidental semantic changes caused by mechanical replacements.

## Deployment/release work still required

- Determine/create the Cloudflare DNS record for `testnet.commonality.works`. It currently did not resolve; nested hosts did. This apex-under-zone record can coexist with `*.testnet.commonality.works`.
- Deploy the updated Cloudflare UI worker route.
- Publish the Commonality bundle to the existing `IPNS_PRIVATE_KEY_TESTNET_COMMONALITY` identity.
- Update any external CORS configuration (notably the Render platform API) from both old origins to `https://testnet.commonality.works`, then deploy/restart as required by the runbook.
- Remove old CauseStarter/Commonality-prefixed DNS records if credentials/tooling permit and the exact targets have been resolved safely.
- Verify `https://testnet.commonality.works` over HTTPS, app shell, representative deep links, runtime config, and sibling-domain navigation back to Commonality.
- Follow [`workflow/branching.md`](../workflow/branching.md): commit on the feature branch, push, PR to `dev`, perform/post the required review receipt, merge, and promote `dev` to `master` only by `scripts/promote-dev-to-master.sh`. Do not make a release PR to `master`.

Never print or commit secret IPNS, Cloudflare, Pinata, Render, or wallet credentials. The user authorized the deployment but not unrelated account changes.

## Suggested skills

- `review-this-branch` or `pr` for the mandatory review/commit/PR workflow, if the fresh agent is asked to carry the work through merge.
- `browser-driving` for the final live testnet verification after deployment.
- `thorough-tester` if expanding the test plan or investigating edge cases beyond the existing focused checks.

