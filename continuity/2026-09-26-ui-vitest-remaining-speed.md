# UI Vitest remaining speed experiments — 2026-09-26

## Objective

Try the two speed experiments that were left after the dialog-timeout fix. Keep a change only if it makes the UI Vitest suite faster without hiding real failures or rewriting product behavior. Commit only if Adam asks.

## Already done

Commit `b65a9de5` on branch `misc` ("Disable Material UI transitions in the UI Vitest suite") already did the required items from [2026-09-26-ui-vitest-speed-reliability.md](./2026-09-26-ui-vitest-speed-reliability.md):

- Material UI transitions are disabled in `ui/src/test/setup.ts` (default theme durations are 0; `transitions.create` returns `'none'`).
- The 30s `Successful submission` timeout in `ui/src/lazy-giving/pages/CreateProjectPage.test.tsx` is gone.
- `ui/vitest.config.ts` sets `testTimeout` to 10 seconds. That is load cushion, not a fix. Do not raise it further, and do not copy the 30s timeout in `verifier/checks/quality/line-coverage.mjs`.

The earlier note's "do not repeat" line means do not redo that transition work. It does not forbid the experiments below.

Baseline from that commit, on this machine:

- The two dialog files alone (`CreateProjectPage.test.tsx` and `ClaimFlowModal.test.tsx`): 74 tests, about 24s.
- `npm run ui:test:vitest:raw`: 198 files, 2092 passed, 3 skipped, about 73s wall clock. Vitest reported collect time of about 334s summed across workers.
- Inside that full run, `CreateProjectPage.test.tsx` took about 63s. Its slowest case was about 4.0s, so the original 5s timeouts were no longer firing.

## What to try

Both are worth trying. They were skipped because the timeouts were gone, not because they were rejected.

1. Set `css: false` in `ui/vitest.config.ts`. `css: true` makes jsdom parse Material UI CSS for every UI test file, and almost none of those tests assert computed style. This is the higher-value experiment because it applies to the whole suite.

   If tests fail, distinguish a real assertion about visibility, layout, or computed style from a test that only needed CSS because jsdom was parsing it. Fix or revert the ones that were asserting style. Do not blanket-skip failures. If the suite gets slower or the diff is mostly test rewrites for no gain, revert `css: false`.

2. Only if `CreateProjectPage.test.tsx` is still a large share of the full-run time after (1): narrow `vi.importActual` in that file. The wide barrels are `../../shared`, `@commonality/sdk/lazy-giving`, and `../../content-funding`. Import only the mocked functions the file actually uses. Keep `userEvent` for clicks and other interactions whose accessibility behavior matters. `setFieldValue` is already `fireEvent.change`. Do not switch the file to `userEvent.type`.

## Out of scope

- Do not split or shorten the pre-commit hook. `test:fast:raw` runs docs checks, the SDK, Hardhat, the integration harness, all UI Vitest, then the indexer. Domain scripts such as `ui:test:vitest:lazy-giving` already exist.
- Do not change contract, SDK, or product behavior.
- Do not reopen the `ClaimFlowModal` heading assertion. Step 2 is `Identity verified`, not `Withdraw Funds`.
- Do not re-implement per-project beneficiary proceeds. That decision is `specs/decisions/0015-per-project-beneficiary-proceeds.md`.

## Verify

Compare against the baseline above. Report wall-clock time, not only "tests passed."

- `cd ui && npx vitest run src/lazy-giving/pages/CreateProjectPage.test.tsx src/content-funding/components/ClaimFlowModal.test.tsx`
- `npm run ui:test:vitest:raw` from the repo root, so the number includes full-suite load.
- Say which experiment you kept and which you reverted, with the before/after times.

## Suggested skills

- `thorough-tester` if `css: false` starts failing tests that might have been checking visibility or accessibility rather than incidental CSS.

## Result

Kept `css: false` in `ui/vitest.config.ts`. Reverted the `CreateProjectPage.test.tsx` barrel narrowing.

| Run | Wall | Vitest duration | Collect (summed) | CreateProjectPage in the full run |
| --- | --- | --- | --- | --- |
| Baseline (`css: true`, wide `importActual`) | ~73s | — | ~334s | ~63s |
| `css: false` only | 68.7s | 68.2s | 317s | 58.4s |
| `css: false` plus narrower mocks | 71.9s | 71.4s | 325s | 61.2s |

`css: false` did not fail any test (198 files, 2092 passed, 3 skipped). The two dialog files alone stayed about 24s. Narrower mocks sped the page file up in isolation (about 19s) but not in the saturated full run, so that diff is gone.
