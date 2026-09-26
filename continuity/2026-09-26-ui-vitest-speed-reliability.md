# UI Vitest speed and reliability — 2026-09-26

Done the same day. See CONTINUITY.md. Do not repeat this unless the create-project timeouts come back.

## Objective

Make the UI Vitest suite faster and more reliable under full-suite load. Do not raise per-file timeouts as the fix. The next session should implement the test changes below, then prove the previously flaky create-project tests still pass both alone and inside `npm run ui:test:vitest:raw`.

## Why

Pre-commit `test:fast` (`npm run test:fast:raw`) failed twice on `ui/src/lazy-giving/pages/CreateProjectPage.test.tsx`. Each failure was `Test timed out in 5000ms` inside `describe('Successful submission')`. The same file passed in isolation in about 30 seconds (those cases ~1.2s each).

Cause, from the test comment and the failure mode: after confirm, the Material UI dialog keeps the background `aria-hidden` until its close transition ends. `userEvent.click` retries until the test timeout, not until Testing Library's 1s `findBy` timeout. Under a saturated full run the transition does not finish inside Vitest's default 5s `testTimeout`. `ui/vitest.config.ts` does not override that default.

A real assertion bug was also fixed before the commit: `ClaimFlowModal` step 2 heading is now `Identity verified`, not `Withdraw Funds`. That test is already green. Do not reopen it.

## Already committed

Branch `misc`, commit `bf7164f1` — "Keep beneficiary proceeds in the project that raised them." Working tree was clean after that commit except for whatever this handoff adds.

That commit includes a workaround to remove: `describe('Successful submission', { timeout: 30_000 }, ...)` in `ui/src/lazy-giving/pages/CreateProjectPage.test.tsx`. A stuck dialog now takes 30s to fail. Revert that options object when transitions are disabled.

Product and contract behavior for the proceeds change is in `specs/decisions/0015-per-project-beneficiary-proceeds.md`. Do not re-implement that work.

## Changes to make

1. Disable Material UI transitions in `ui/src/test/setup.ts` so dialogs unmount immediately in jsdom. Prefer a global test-only theme or `transitions.create` returning `'none'`, applied wherever these tests render MUI. Confirm `CreateProjectPage` and `ClaimFlowModal` actually pick it up. If a page creates its own default theme, the setup-file theme will not apply and the timeout will remain.

2. Revert the 30s `Successful submission` timeout.

3. Set a global Vitest `testTimeout` of 10 seconds in `ui/vitest.config.ts`. That is load cushion, not the fix. Do not copy the coverage check's 30s (`verifier/checks/quality/line-coverage.mjs`).

4. If still slow after (1): consider `css: false` in `ui/vitest.config.ts` (`css: true` parses MUI CSS for all ~198 files), and narrow `vi.importActual` barrels in the create-project test (`../../shared`, `@commonality/sdk/lazy-giving`, `../../content-funding`). Keep `userEvent` for the interactions whose accessibility behavior matters. `setFieldValue` is already `fireEvent.change`; do not switch the whole file to `userEvent.type`.

## Out of scope

Do not split or shorten the pre-commit hook. `test:fast:raw` runs docs checks, SDK, Hardhat, the integration harness, all UI Vitest, then the indexer. Domain scripts such as `ui:test:vitest:lazy-giving` already exist. Leave that wall-clock question alone unless the user asks.

Do not change contract, SDK, or product behavior.

## Verify

- `cd ui && npx vitest run src/lazy-giving/pages/CreateProjectPage.test.tsx src/content-funding/components/ClaimFlowModal.test.tsx`
- `npm run ui:test:vitest:raw` from the repo root, so the timeout shows up under full-suite load rather than only in isolation.
- Do not start a commit unless the user asks.

## Suggested skills

- `thorough-tester` if a transition-disable change looks like it could hide a real accessibility failure. The point of the change is to stop jsdom waiting on CSS transitions, not to stop asserting dialog buttons and `aria` state.
